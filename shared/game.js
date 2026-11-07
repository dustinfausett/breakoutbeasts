// Authoritative game simulation for one mission. Runs on the server for online rooms and in the
// browser for solo play, so both modes share exactly the same rules.

import { T, tileBlocksVision, animalCanEnter, staffCanEnter, npcCanEnter, crateCanEnter, DIRS, DIR_LIST } from './tiles.js';
import { ANIMALS } from './animals.js';
import { getZoo } from './zoos/index.js';
import { canOccupy, moveBody, walkStep, overlapsTile, overlapsTileType, tileAt, HALF, facingFrom } from './physics.js';
import { bfs, lineOfSight, mulberry32, dist, angleDiff, rayDistance } from './util.js';
import { applyBayTemplate, revertBay, bayStepsFor } from './bays.js';
export { bayEnterSteps, bayExitSteps } from './bays.js';

export const TICK = 0.05;
const INTERACT_RANGE = 1.15;
const GRACE = 5;

// player status bit flags (for compact snapshots)
export const PF = { HIDDEN: 1, SHELL: 2, SLIDE: 4, SPRINT: 8, GRACE: 16, CAUGHT: 32, UNDER: 64, HOP: 128, HOLD: 256, LOOKOUT: 512, WOBBLE: 1024, IN_ENC: 2048, ESCAPED: 4096, EXIT: 8192 };
export const STAFF_STATES = ['patrol', 'suspicious', 'chase', 'investigate', 'return', 'cheer'];

export class Game {
  constructor({ zooId = 'moonleaf', players, seed = 1, options = {} }) {
    this.zoo = getZoo(zooId);
    const z = this.zoo;
    this.zooId = zooId;
    this.options = { staff: true, ...options };
    this.rng = mulberry32(seed);
    this.w = z.w; this.h = z.h;
    this.tiles = new Uint8Array(z.tiles);
    this.tileMods = new Map();
    this.tileVersion = 1;
    this.defsVersion = 1;
    this.gates = z.gates.map((g) => ({ ...g, tiles: g.tiles.map((t) => [...t]), state: 0, timer: 0 }));
    this.objects = z.objects.map((o) => ({ ...o, state: 0, cool: 0 }));
    this.plates = z.plates.map((p) => ({ ...p }));
    this.crates = z.crates.map((c) => ({ ...c, home: [...c.home] }));
    this.burrows = z.burrows.map((b) => ({ ...b, dug: false }));
    this.entSolid = new Uint8Array(this.w * this.h);
    this.entVis = new Uint8Array(this.w * this.h);
    this.chew = new Map();
    this.events = [];
    this.time = 0;
    this.tick = 0;
    this.phase = 'play';
    this.stats = { captures: 0, rescued: 0 };
    this.keysT = 0;
    this.nid = 1000;

    // players
    this.players = new Map();
    this.order = [];
    const usedEnc = new Set();
    for (const pd of players) {
      const enc = z.enclosures.find((e) => e.animal === pd.animal);
      if (!enc) throw new Error('No enclosure for ' + pd.animal);
      usedEnc.add(enc.index);
      const p = this._newPlayer(pd, enc);
      this.players.set(p.id, p);
      this.order.push(p.id);
    }
    // caged NPC friends in the remaining enclosures
    this.npcs = z.enclosures.filter((e) => !usedEnc.has(e.index)).map((e, i) => ({
      animal: e.animal, enc: e.index, x: e.spawn[0] + 0.5, y: e.spawn[1] + 0.5, state: 'caged', path: null, wait: 1 + i * 0.3, spot: null, face: 'down',
    }));
    this.requiredRescues = Math.min(z.requiredRescues, this.npcs.length);

    // staff
    this.staff = this.options.staff ? z.staffRoutes.map((r, i) => {
      const [sx, sy] = r.route[r.start];
      return { id: i, x: sx + 0.5, y: sy + 0.5, dir: 0, route: r.route, wp: r.start, state: 'patrol', alert: 0, target: null, path: null, repath: 0, lastSeen: null, lost: 0, look: 0, suspect: null, cheer: 0, stuck: 0 };
    }) : [];

    // cooperative power puzzle, scaled to team size
    this.team = this.order.length >= 2;
    this.parts = [];
    this.bayState = z.bays.map((b) => ({ ...b, used: false, part: -1, created: { gates: [], objects: [], crates: [], burrows: [] }, template: null }));
    this.order.forEach((pid, i) => {
      const p = this.players.get(pid);
      const bay = this.bayState[i];
      bay.used = true; bay.part = i;
      this.parts.push({ index: i, bay: i, pid, animal: p.animal, template: p.animal, opened: false, breaker: !this.team, fuse: false, inserted: false, socket: -1 });
      applyBayTemplate(this, bay, p.animal);
    });
    for (const bay of this.bayState) {
      if (!bay.used) this._sealBay(bay);
      else if (!this.team) this._removeObject(bay.breaker);
    }
    // cages: solo starts unlocked
    for (const bay of this.bayState) {
      const cage = this.obj(bay.cage);
      if (cage) cage.state = this.team ? 0 : 1;
    }
    this.rebuildBlock();
  }

  _newPlayer(pd, enc) {
    return {
      id: pd.id, name: pd.name || ANIMALS[pd.animal].name, animal: pd.animal, enc: enc.index,
      x: enc.spawn[0] + 0.5, y: enc.spawn[1] + 0.5, face: 'down', active: true, connected: true,
      input: { mx: 0, my: 0, sp: false, e: false }, prevSp: false, prevE: false, lastSeq: 0,
      carry: null, shell: false, slide: null, sprintT: 0, noiseT: 0, cd: 0, cdMax: 1, grace: 0, capturedT: 0,
      under: null, hop: null, hold: null, lookout: 0, wobble: 0, onBeam: false, safe: null,
      escaped: false, hidden: false, inExit: false, moving: false, msgCool: 0, everCaught: 0,
    };
  }

  // ---------- helpers ----------
  idx(x, y) { return y * this.w + x; }
  tileAt(x, y) { return tileAt(this, x, y); }
  setTile(x, y, t) {
    const i = this.idx(x, y);
    if (this.tiles[i] === t) return;
    this.tiles[i] = t;
    if (this.zoo.tiles[i] === t) this.tileMods.delete(i); else this.tileMods.set(i, t);
    this.tileVersion++;
  }
  obj(id) { return this.objects.find((o) => o.id === id); }
  gate(id) { return this.gates.find((g) => g.id === id); }
  objAt(x, y) { return this.objects.find((o) => o.x === x && o.y === y); }
  crateAt(x, y) { return this.crates.find((c) => c.x === x && c.y === y); }
  newId(prefix) { return prefix + (this.nid++); }
  emit(ev) { this.events.push(ev); }
  msg(p, text) { if (p.msgCool <= 0 || p.lastMsg !== text) { this.events.push({ k: 'msg', pid: p.id, text }); p.msgCool = 1.2; p.lastMsg = text; } }
  drainEvents() { const e = this.events; this.events = []; return e; }
  activePlayers() { return this.order.map((id) => this.players.get(id)).filter((p) => p.active); }

  _removeObject(id) {
    const i = this.objects.findIndex((o) => o.id === id);
    if (i >= 0) { this.objects.splice(i, 1); this.defsVersion++; }
  }
  _addObject(o) { o.id = o.id || this.newId('o'); o.state = o.state || 0; o.cool = 0; this.objects.push(o); this.defsVersion++; return o; }
  _addGate(g) { g.id = g.id || this.newId('g'); g.state = 0; g.timer = 0; this.gates.push(g); this.defsVersion++; return g; }
  _removeGate(id) { const i = this.gates.findIndex((g) => g.id === id); if (i >= 0) { this.gates.splice(i, 1); this.defsVersion++; } }

  _sealBay(bay) {
    revertBay(this, bay);
    this.setTile(bay.door[0], bay.door[1], T.WALL);
    this._removeObject(bay.cage);
    this._removeObject(bay.breaker);
    bay.used = false; bay.part = -1;
    this.defsVersion++;
  }

  rebuildBlock() {
    this.entSolid.fill(0); this.entVis.fill(0);
    for (const g of this.gates) {
      if (g.state !== 0) continue;
      for (const [x, y] of g.tiles) { const i = this.idx(x, y); this.entSolid[i] = 1; if (g.vis === 'solid') this.entVis[i] = 1; }
    }
    for (const o of this.objects) this.entSolid[this.idx(o.x, o.y)] = 1;
    for (const c of this.crates) { const i = this.idx(c.x, c.y); this.entSolid[i] = 1; this.entVis[i] = 1; }
  }

  visionBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    const i = this.idx(tx, ty);
    return this.entVis[i] === 1 || tileBlocksVision(this.tiles[i]);
  }

  ptile(p) { return [Math.floor(p.x), Math.floor(p.y)]; }
  dirOrder(p) { return [p.face, ...DIR_LIST.filter((d) => d !== p.face)]; }
  inRect(x, y, r) { return x >= r[0] && x < r[2] + 1 && y >= r[1] && y < r[3] + 1; }
  inOwnEnclosure(p) { return this.inRect(p.x, p.y, this.zoo.enclosures[p.enc].rect); }

  // ---------- input ----------
  setInput(pid, inp) {
    const p = this.players.get(pid);
    if (!p) return;
    const mx = Number.isFinite(inp.mx) ? Math.max(-1, Math.min(1, inp.mx)) : 0;
    const my = Number.isFinite(inp.my) ? Math.max(-1, Math.min(1, inp.my)) : 0;
    p.input = { mx, my, sp: !!inp.sp, e: !!inp.e };
    if (Number.isFinite(inp.seq)) p.lastSeq = inp.seq;
  }

  setConnected(pid, c) {
    const p = this.players.get(pid);
    if (!p) return;
    p.connected = c;
    if (!c) { p.input = { mx: 0, my: 0, sp: false, e: false }; p.hold = null; }
  }

  /** Continue without a player: removes them and adapts remaining puzzles, keeping progress. */
  removePlayer(pid) {
    const p = this.players.get(pid);
    if (!p || !p.active) return;
    this._dropCarry(p);
    p.active = false; p.hold = null; p.shell = false;
    const part = this.parts.find((pt) => pt.pid === pid && !pt.inserted);
    if (part) {
      const remaining = this.activePlayers().length;
      const started = part.opened || part.fuse;
      const incomplete = this.parts.filter((pt) => !pt.inserted).length;
      if (!started && this.parts.length > remaining && remaining > 0) {
        // drop the untouched part entirely
        const bay = this.bayState[part.bay];
        this._sealBay(bay);
        this.parts = this.parts.filter((pt) => pt !== part);
      } else {
        part.pid = null;
        if (!part.opened) {
          const bay = this.bayState[part.bay];
          revertBay(this, bay);
          applyBayTemplate(this, bay, 'crank');
          part.template = 'crank';
        }
      }
      void incomplete;
    }
    this.emit({ k: 'adapt', pid });
    this.defsVersion++;
    this.rebuildBlock();
  }

  // ---------- main step ----------
  step(dt = TICK) {
    if (this.phase !== 'play') return;
    this.time += dt; this.tick++;
    for (const pid of this.order) this._stepPlayer(this.players.get(pid), dt);
    this._stepGates(dt);
    this._stepParts();
    for (const s of this.staff) this._stepStaff(s, dt);
    for (const n of this.npcs) this._stepNpc(n, dt);
    for (const o of this.objects) if (o.cool > 0) o.cool -= dt;
    this._stepKeysAndExit(dt);
  }

  // ---------- players ----------
  _stepPlayer(p, dt) {
    if (!p.active) return;
    const inp = p.connected ? p.input : { mx: 0, my: 0, sp: false, e: false };
    const spEdge = inp.sp && !p.prevSp;
    const eEdge = inp.e && !p.prevE;
    p.prevSp = inp.sp; p.prevE = inp.e;
    p.cd = Math.max(0, p.cd - dt);
    p.grace = Math.max(0, p.grace - dt);
    p.lookout = Math.max(0, p.lookout - dt);
    p.sprintT = Math.max(0, p.sprintT - dt);
    p.msgCool -= dt;
    p.moving = false;

    if (p.capturedT > 0) {
      p.capturedT -= dt;
      if (p.capturedT <= 0) this._returnToEnclosure(p);
      return;
    }
    if (p.under) {
      p.under.t += dt;
      if (p.under.t >= p.under.dur) { p.x = p.under.to[0]; p.y = p.under.to[1]; p.under = null; this.emit({ k: 'tunnel', x: p.x, y: p.y }); this._unstick(p); }
      return;
    }
    if (p.hop) {
      p.hop.t += dt;
      const k = Math.min(1, p.hop.t / p.hop.dur);
      p.x = p.hop.from[0] + (p.hop.to[0] - p.hop.from[0]) * k;
      p.y = p.hop.from[1] + (p.hop.to[1] - p.hop.from[1]) * k;
      if (k >= 1) { p.hop = null; this._unstick(p); }
      return;
    }
    if (p.slide) { this._stepSlide(p, dt); this._postMove(p, dt); return; }

    // continue holds
    if (p.hold) this._continueHold(p, inp, dt);

    if (!p.hold) {
      if (spEdge) this._useAbility(p);
      if (eEdge) this._interact(p);
    }

    // movement
    const wants = Math.hypot(inp.mx, inp.my) > 0.15;
    if (p.hold && wants) {
      if (p.hold.kind === 'chew') this.chew.set(p.hold.key, p.hold.t);
      p.hold = null;
    }
    if (!p.shell && !p.hold && !p.slide && !p.hop && !p.under && wants) {
      const steady = p.animal === 'flamingo' && inp.sp;
      const bx = p.x, by = p.y;
      walkStep(this, p, inp.mx, inp.my, dt, steady);
      const moved = Math.hypot(p.x - bx, p.y - by);
      p.moving = moved > 0.001;
      if (p.sprintT > 0 && p.moving) {
        p.noiseT -= dt;
        if (p.noiseT <= 0) { this.noise(p.x, p.y, 5, p); p.noiseT = 0.5; }
      }
      // flamingo balance
      if (p.onBeam && p.moving) {
        p.wobble += (steady ? 0.25 : 1.9) * dt;
      }
    } else if (wants) {
      p.face = facingFrom(inp.mx, inp.my, p.face);
    }
    this._postMove(p, dt);
  }

  _postMove(p, dt) {
    const [tx, ty] = this.ptile(p);
    const t = this.tileAt(tx, ty);
    // beam
    const onBeam = t === T.BEAM;
    if (onBeam && !p.onBeam) { p.onBeam = true; }
    if (!onBeam) { p.onBeam = false; p.wobble = Math.max(0, p.wobble - 2 * dt); if (t !== T.WATER && !p.slide) p.safe = [p.x, p.y]; }
    if (onBeam && !p.moving) p.wobble = Math.max(0, p.wobble - 1.0 * dt);
    if (p.onBeam && p.wobble >= 1) {
      p.wobble = 0; p.onBeam = false;
      const to = p.safe || [p.x, p.y];
      p.hop = { from: [p.x, p.y], to: [...to], t: 0, dur: 0.5, kind: 'fall' };
      this.emit({ k: 'splash', x: p.x, y: p.y });
      this.msg(p, 'Whoa! Too wobbly. Hold Space to steady yourself on beams.');
    }
    p.hidden = t === T.BUSH && !p.slide;
    const inEnc = this.inOwnEnclosure(p);
    if (!inEnc && !p.escaped) { p.escaped = true; this.emit({ k: 'escaped', pid: p.id, name: p.name }); }
    p.inExit = this.inRect(p.x, p.y, this.zoo.exitZone);
  }

  _stepSlide(p, dt) {
    const s = p.slide;
    s.t += dt;
    const sp = 9 * dt;
    const before = [p.x, p.y];
    moveBody(this, p, s.dx * sp, s.dy * sp, { slide: true });
    const moved = Math.hypot(p.x - before[0], p.y - before[1]) > 0.001;
    const inLow = overlapsTileType(this, p.x, p.y, T.LOW);
    if (!moved) {
      if (inLow) { s.dx = -s.dx; s.dy = -s.dy; s.t = 0; return; }
      p.slide = null; return;
    }
    if (s.t >= s.max && !inLow) p.slide = null;
  }

  _continueHold(p, inp, dt) {
    const h = p.hold;
    const held = h.btn === 'sp' ? inp.sp : inp.e;
    if (!held) {
      if (h.kind === 'chew') this.chew.set(h.key, h.t);
      p.hold = null; return;
    }
    h.t += dt;
    if (h.kind === 'key') {
      const key = this.obj(h.obj);
      if (!key || !this.keysActive()) p.hold = null;
      return;
    }
    if (h.t >= h.need) {
      p.hold = null;
      if (h.kind === 'chew') {
        this.chew.delete(h.key);
        this.setTile(h.x, h.y, T.DEBRIS);
        this.emit({ k: 'chewed', x: h.x, y: h.y });
        this.rebuildBlock();
      } else if (h.kind === 'dig') {
        const b = this.burrows.find((bb) => bb.id === h.burrow);
        if (b && !b.dug) {
          b.dug = true;
          this.setTile(b.a[0], b.a[1], T.BURROW);
          this.setTile(b.b[0], b.b[1], T.BURROW);
          this.emit({ k: 'dug', x: b.a[0], y: b.a[1], to: b.b });
          this.msg(p, 'Tunnel dug! Press E to travel through it.');
        }
      } else if (h.kind === 'lever' || h.kind === 'crank') {
        const o = this.obj(h.obj);
        if (o) this._activate(p, o);
      }
    }
  }

  // ---------- abilities ----------
  /** Determine what Space would do right now. Returns {text, run} or {text} or null. */
  abilityTarget(p) {
    const [px, py] = this.ptile(p);
    const a = p.animal;
    const dirs = this.dirOrder(p);
    const nb = (d, n = 1) => [px + DIRS[d][0] * n, py + DIRS[d][1] * n];
    if (p.capturedT > 0 || p.under || p.hop || p.slide) return null;
    switch (a) {
      case 'redpanda': {
        for (const d of dirs) {
          const [cx, cy] = nb(d);
          if (this.tileAt(cx, cy) !== T.CLIMB) continue;
          const [lx, ly] = nb(d, 2);
          if (!canOccupy(this, a, lx + 0.5, ly + 0.5, null)) continue;
          return { text: 'Climb over', run: () => { p.hop = { from: [p.x, p.y], to: [lx + 0.5, ly + 0.5], t: 0, dur: 0.45, kind: 'climb' }; p.face = d; this.emit({ k: 'climb', x: cx, y: cy, pid: p.id }); } };
        }
        return { text: 'Climb (find a striped fence)', idle: true };
      }
      case 'elephant': {
        for (const d of dirs) {
          const [cx, cy] = nb(d);
          const c = this.crateAt(cx, cy);
          if (!c) continue;
          const [dx, dy] = nb(d, 2);
          if (this._crateFree(dx, dy)) {
            return { text: 'Push crate', run: () => { c.x = dx; c.y = dy; p.face = d; this.rebuildBlock(); this.emit({ k: 'push', x: dx, y: dy }); } };
          }
          return { text: "Crate won't budge (try pulling with E)", idle: true };
        }
        return { text: 'Push (face a crate)', idle: true };
      }
      case 'monkey': {
        for (const d of dirs) {
          const [x1, y1] = nb(d); const [x2, y2] = nb(d, 2);
          let o = this.objAt(x1, y1);
          if (o && o.kind === 'lever' && (o.reach === 'normal' || o.reach === 'bars')) return this._reachRun(p, o, d, 'Reach lever');
          if (this.tileAt(x1, y1) === T.FENCE || this._barsGateAt(x1, y1)) {
            o = this.objAt(x2, y2);
            if (o && o.kind === 'lever' && (o.reach === 'normal' || o.reach === 'bars')) return this._reachRun(p, o, d, 'Reach through the bars');
          }
        }
        return { text: 'Reach (stand by bars with a lever behind)', idle: true };
      }
      case 'beaver': {
        if (p.carry === 'wood') {
          for (const d of dirs) {
            const [x1, y1] = nb(d);
            if (this.tileAt(x1, y1) === T.BRIDGE_SPOT) return { text: 'Build bridge', run: () => { this.setTile(x1, y1, T.BRIDGE); p.carry = null; p.face = d; this.emit({ k: 'build', x: x1, y: y1 }); } };
          }
        }
        for (const d of dirs) {
          const [x1, y1] = nb(d);
          if (this.tileAt(x1, y1) === T.WOOD) {
            const key = this.idx(x1, y1);
            return { text: 'Hold to chew', run: () => { p.face = d; p.hold = { kind: 'chew', btn: 'sp', key, x: x1, y: y1, t: this.chew.get(key) || 0, need: 1.8 }; this.emit({ k: 'chew', x: x1, y: y1 }); } };
          }
        }
        return { text: p.carry === 'wood' ? 'Build (find bridge posts)' : 'Chew (find marked wood)', idle: true };
      }
      case 'giraffe': {
        let best = null, bd = 2.7;
        for (const o of this.objects) {
          if (o.kind !== 'lever' || o.reach !== 'high') continue;
          const d = dist(p.x, p.y, o.x + 0.5, o.y + 0.5);
          if (d < bd) { bd = d; best = o; }
        }
        if (best) return { text: 'Reach high switch', run: () => { this.emit({ k: 'reach', x: best.x, y: best.y, pid: p.id }); this._activate(p, best); } };
        if (p.cd > 0) return { text: 'Lookout recharging', idle: true };
        return { text: 'Look out over the walls', run: () => { p.lookout = 6; p.cd = 10; p.cdMax = 10; this.emit({ k: 'lookout', pid: p.id, name: p.name }); } };
      }
      case 'penguin': {
        if (p.cd > 0) return { text: 'Slide recharging', idle: true };
        return { text: 'Belly slide', run: () => { const [dx, dy] = DIRS[p.face]; p.slide = { dx, dy, t: 0, max: 0.45 }; p.cd = 1.0; p.cdMax = 1.0; this.emit({ k: 'slide', pid: p.id, x: p.x, y: p.y }); } };
      }
      case 'zebra': {
        for (const d of dirs) {
          const [x1, y1] = nb(d);
          if (this.tileAt(x1, y1) === T.LOOSE) return { text: 'Kick planks', run: () => { p.face = d; this.setTile(x1, y1, T.DEBRIS); this.rebuildBlock(); this.emit({ k: 'kick', x: x1, y: y1 }); this.noise(x1 + 0.5, y1 + 0.5, 6, p); } };
        }
        if (p.cd > 0) return { text: 'Sprint recharging', idle: true };
        return { text: 'Sprint (noisy!)', run: () => { p.sprintT = 1.6; p.cd = 5; p.cdMax = 5; p.noiseT = 0.5; this.emit({ k: 'sprint', pid: p.id }); this.noise(p.x, p.y, 5, p); } };
      }
      case 'meerkat': {
        const tryTile = (x, y, d) => {
          if (this.tileAt(x, y) !== T.SOIL) return null;
          const b = this.burrows.find((bb) => !bb.dug && bb.a[0] === x && bb.a[1] === y);
          if (!b) return null;
          return { text: 'Hold to dig', run: () => { if (d) p.face = d; p.hold = { kind: 'dig', btn: 'sp', burrow: b.id, t: 0, need: 2.2 }; this.emit({ k: 'dig', x, y }); } };
        };
        const here = tryTile(px, py, null);
        if (here) return here;
        for (const d of dirs) { const [x1, y1] = nb(d); const r = tryTile(x1, y1, d); if (r) return r; }
        return { text: 'Dig (find marked soil)', idle: true };
      }
      case 'tortoise': {
        if (p.cd > 0) return { text: p.shell ? 'Pop out' : 'Tuck in', idle: true };
        return { text: p.shell ? 'Pop out of shell' : 'Tuck into shell', run: () => { p.shell = !p.shell; p.cd = 0.3; p.cdMax = 0.3; this.emit({ k: 'shell', pid: p.id, on: p.shell }); } };
      }
      case 'flamingo': {
        for (const d of dirs) {
          const [x1, y1] = nb(d); const [x2, y2] = nb(d, 2);
          let o = this.objAt(x1, y1);
          if (o && o.kind === 'lever' && (o.reach === 'water' || o.reach === 'normal')) return this._reachRun(p, o, d, 'Stretch to switch');
          const t1 = this.tileAt(x1, y1);
          if (t1 === T.WATER || t1 === T.POND) {
            o = this.objAt(x2, y2);
            if (o && o.kind === 'lever' && (o.reach === 'water' || o.reach === 'normal')) return this._reachRun(p, o, d, 'Stretch across the water');
          }
        }
        if (p.onBeam) return { text: 'Hold to steady yourself', idle: true };
        return { text: 'Stretch (face water with a switch beyond)', idle: true };
      }
    }
    return null;
  }

  _reachRun(p, o, d, text) {
    return { text, run: () => { p.face = d; this.emit({ k: 'reach', x: o.x, y: o.y, pid: p.id }); this._activate(p, o); } };
  }

  _barsGateAt(x, y) {
    return this.gates.some((g) => g.state === 0 && g.vis === 'bars' && g.tiles.some(([gx, gy]) => gx === x && gy === y));
  }

  _crateFree(x, y) {
    if (!crateCanEnter(this.tileAt(x, y))) return false;
    if (this.entSolid[this.idx(x, y)]) return false;
    for (const p of this.players.values()) if (p.active && overlapsTile(p.x, p.y, x, y)) return false;
    return true;
  }

  _useAbility(p) {
    if (p.shell && p.animal !== 'tortoise') p.shell = false;
    const t = this.abilityTarget(p);
    if (!t) return;
    if (t.run) t.run();
    else if (t.idle) this.msg(p, t.text);
  }

  // ---------- interaction (E) ----------
  interactTarget(p) {
    if (p.capturedT > 0 || p.under || p.hop || p.slide) return null;
    const [px, py] = this.ptile(p);
    // tunnels
    if (this.tileAt(px, py) === T.BURROW) {
      const b = this.burrows.find((bb) => bb.dug && ((bb.a[0] === px && bb.a[1] === py) || (bb.b[0] === px && bb.b[1] === py)));
      if (b) {
        if (p.animal === 'giraffe' || p.animal === 'elephant') return { text: 'Too big for the tunnel', idle: true };
        const to = (b.a[0] === px && b.a[1] === py) ? b.b : b.a;
        return { text: 'Crawl through tunnel', run: () => { p.under = { t: 0, dur: 0.7, to: [to[0] + 0.5, to[1] + 0.5] }; p.shell = false; this.emit({ k: 'tunnel', x: p.x, y: p.y }); } };
      }
    }
    // nearest object
    let best = null, bd = INTERACT_RANGE;
    for (const o of this.objects) {
      const d = dist(p.x, p.y, o.x + 0.5, o.y + 0.5);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) {
      const r = this._objectInteraction(p, best);
      if (r) return r;
    }
    // elephant trunk pull
    if (p.animal === 'elephant') {
      for (const d of this.dirOrder(p)) {
        const [cx, cy] = [px + DIRS[d][0], py + DIRS[d][1]];
        const c = this.crateAt(cx, cy);
        if (!c) continue;
        const [bx, by] = [px - DIRS[d][0], py - DIRS[d][1]];
        if (crateCanEnter(this.tileAt(px, py)) && canOccupy(this, 'elephant', bx + 0.5, by + 0.5, null)) {
          return { text: 'Pull crate with trunk', run: () => { c.x = px; c.y = py; p.x = bx + 0.5; p.y = by + 0.5; p.face = d; this.rebuildBlock(); this.emit({ k: 'push', x: px, y: py }); } };
        }
        return { text: 'No room to pull', idle: true };
      }
    }
    return null;
  }

  _objectInteraction(p, o) {
    switch (o.kind) {
      case 'lever': {
        if (o.reach === 'high' && p.animal !== 'giraffe') return { text: 'Too high to reach — a giraffe could!', idle: true };
        if (o.reach === 'water' && p.animal !== 'flamingo') return { text: 'Out of reach across the water', idle: true };
        if (o.reach === 'bars' && p.animal !== 'monkey') return { text: 'Behind bars — a monkey could reach it', idle: true };
        const g = o.action.open ? this.gate(o.action.open) : null;
        if (g && g.state !== 0 && !o.action.timed) return { text: o.keeper ? 'Gate already open' : 'Already switched on', idle: true };
        if (o.hold > 0) return { text: `Hold to pull ${o.label.toLowerCase()}`, run: () => { p.hold = { kind: 'lever', btn: 'e', obj: o.id, t: 0, need: o.hold }; } };
        return { text: `Pull ${o.label.toLowerCase()}`, run: () => this._activate(p, o) };
      }
      case 'crank':
        if (this.gate(o.action.open)?.state) return { text: 'Already open', idle: true };
        return { text: 'Hold to turn the crank', run: () => { p.hold = { kind: 'crank', btn: 'e', obj: o.id, t: 0, need: o.hold }; this.emit({ k: 'crank', x: o.x, y: o.y }); } };
      case 'logpile':
        if (p.animal !== 'beaver') return { text: 'Only a beaver knows what to do with these logs', idle: true };
        if (p.carry) return { text: 'Paws full', idle: true };
        return { text: 'Pick up a log', run: () => { p.carry = 'wood'; this.emit({ k: 'pickup', pid: p.id }); this.msg(p, 'Got a log! Press Space at bridge posts to build.'); } };
      case 'cage': {
        const part = this._partForBay(o.bay);
        if (!part) return { text: 'Empty', idle: true };
        if (o.state === 0) return { text: 'Locked — flip the breaker first', idle: true };
        if (o.state === 2) return { text: 'Empty — the fuse is already out', idle: true };
        if (p.carry) return { text: 'Paws full', idle: true };
        return { text: 'Take the fuse', run: () => { o.state = 2; p.carry = 'fuse:' + o.bay; part.fuse = true; this.emit({ k: 'pickup', pid: p.id }); this.msg(p, 'Fuse in paw! Plug it into the generator in the yard.'); } };
      }
      case 'breaker': {
        const part = this._partForBay(o.bay);
        if (!part) return null;
        if (o.state === 1) return { text: 'Breaker already on', idle: true };
        return { text: 'Flip the breaker', run: () => { o.state = 1; part.breaker = true; const cage = this.obj(this.bayState[o.bay].cage); if (cage && cage.state === 0) cage.state = 1; this.emit({ k: 'unlock', x: o.x, y: o.y }); } };
      }
      case 'socket': {
        if (o.state === 1) return { text: 'Socket powered', idle: true };
        if (!p.carry || !p.carry.startsWith('fuse:')) return { text: 'Needs a fuse from a bay', idle: true };
        if (o.index >= this.parts.length && !this.parts.some((pt) => pt.socket < 0 && !pt.inserted)) return { text: 'Not needed tonight', idle: true };
        return {
          text: 'Plug in the fuse', run: () => {
            const bay = Number(p.carry.split(':')[1]);
            const part = this._partForBay(bay);
            p.carry = null; o.state = 1;
            if (part) { part.inserted = true; part.socket = o.index; }
            this.emit({ k: 'socket', x: o.x, y: o.y });
            if (this.powerDone()) this.emit({ k: 'power' });
          },
        };
      }
      case 'key': {
        const K = this.keyCount();
        if (o.index >= K) return { text: 'Not needed tonight', idle: true };
        if (!this.keysActive()) return { text: this.powerDone() ? `Rescue ${this.requiredRescues} animals first` : 'No power yet', idle: true };
        const holder = this.activePlayers().find((q) => q !== p && q.hold && q.hold.obj === o.id);
        if (holder) return { text: `${holder.name} is holding this key`, idle: true };
        return { text: 'Hold to turn the key', run: () => { p.hold = { kind: 'key', btn: 'e', obj: o.id, t: 0, need: Infinity }; this.emit({ k: 'keyturn', x: o.x, y: o.y }); } };
      }
      case 'can':
        if (o.cool > 0) return { text: 'Rattled — wait a moment', idle: true };
        return { text: 'Rattle the bin (distract keepers)', run: () => { o.cool = 6; this.noise(o.x + 0.5, o.y + 0.5, 9, p); this.emit({ k: 'rattle', x: o.x, y: o.y }); } };
    }
    return null;
  }

  _interact(p) {
    if (p.shell) { this.msg(p, 'Pop out of your shell first (Space)'); return; }
    const t = this.interactTarget(p);
    if (!t) return;
    if (t.run) t.run(); else if (t.idle) this.msg(p, t.text);
  }

  _partForBay(bay) { return this.parts.find((pt) => pt.bay === bay); }

  _activate(p, o) {
    const a = o.action || {};
    if (a.open) {
      const g = this.gate(a.open);
      if (g && g.state === 0) this.openGate(g, p);
    } else if (a.timed) {
      const g = this.gate(a.timed);
      if (g && g.state === 0) { this.openGate(g, p); g.timer = a.dur; }
      else if (g && g.state === 1) g.timer = a.dur;
    }
    o.state = 1;
    this.emit({ k: 'lever', x: o.x, y: o.y });
  }

  openGate(g, by) {
    g.state = 1;
    this.rebuildBlock();
    const [x, y] = g.tiles[0];
    this.emit({ k: 'gate', x, y, open: true });
    if (g.kind === 'main') {
      const npc = this.npcs.find((n) => n.enc === g.enc && n.state === 'caged');
      if (npc) {
        npc.state = 'leaving'; npc.path = null;
        this.stats.rescued++;
        this.emit({ k: 'rescue', animal: npc.animal, by: by ? by.name : null });
      }
    }
  }

  closeGate(g) {
    if (g.state === 0) return;
    g.state = 0; g.timer = 0;
    this.rebuildBlock();
    // gently push anyone in the gateway out
    for (const p of this.players.values()) {
      if (!p.active) continue;
      if (g.tiles.some(([x, y]) => overlapsTile(p.x, p.y, x, y))) this._unstick(p);
    }
    for (const s of this.staff) {
      if (g.tiles.some(([x, y]) => Math.floor(s.x) === x && Math.floor(s.y) === y)) {
        const path = bfs(this.w, this.h, Math.floor(s.x), Math.floor(s.y), (x, y) => this._staffPass(x, y), () => true, 400);
        if (path && path.length) { const [x, y] = path[path.length - 1]; s.x = x + 0.5; s.y = y + 0.5; }
      }
    }
    const [x, y] = g.tiles[0];
    this.emit({ k: 'gate', x, y, open: false });
  }

  _unstick(p) {
    if (canOccupy(this, p.animal, p.x, p.y, null)) return;
    const sx = Math.floor(p.x), sy = Math.floor(p.y);
    // prefer staying on the side of the gate the body centre is on: search nearest free tile centre
    let best = null, bd = Infinity;
    for (let r = 0; r <= 4 && !best; r++) {
      for (let y = sy - r; y <= sy + r; y++) for (let x = sx - r; x <= sx + r; x++) {
        if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) !== r) continue;
        if (!canOccupy(this, p.animal, x + 0.5, y + 0.5, null)) continue;
        const d = dist(p.x, p.y, x + 0.5, y + 0.5);
        if (d < bd) { bd = d; best = [x + 0.5, y + 0.5]; }
      }
    }
    if (best) { p.x = best[0]; p.y = best[1]; }
    else { const e = this.zoo.enclosures[p.enc]; p.x = e.spawn[0] + 0.5; p.y = e.spawn[1] + 0.5; }
  }

  // ---------- gates, plates, parts ----------
  _stepGates(dt) {
    // plates
    for (const pl of this.plates) {
      const weighted = this.crates.some((c) => c.x === pl.x && c.y === pl.y) ||
        [...this.players.values()].some((p) => p.active && Math.floor(p.x) === pl.x && Math.floor(p.y) === pl.y && (p.animal === 'elephant' || (p.animal === 'tortoise' && p.shell) || !pl.heavy));
      if (weighted !== !!pl.down) { pl.down = weighted; this.emit({ k: 'plate', x: pl.x, y: pl.y, down: weighted }); }
      const g = pl.gate && this.gate(pl.gate);
      if (!g || g.state === 2) continue;
      if (weighted && g.state === 0) this.openGate(g);
      else if (!weighted && g.state === 1) this.closeGate(g);
    }
    // timed gates
    for (const g of this.gates) {
      if (g.state !== 1 || !(g.timer > 0)) continue;
      g.timer -= dt;
      if (g.timer <= 0) {
        const near = (p, x, y) => p.x + HALF + 0.2 > x && p.x - HALF - 0.2 < x + 1 && p.y + HALF + 0.2 > y && p.y - HALF - 0.2 < y + 1;
        const tort = [...this.players.values()].find((p) => p.active && p.animal === 'tortoise' && p.shell && g.tiles.some(([x, y]) => near(p, x, y)));
        if (tort) {
          g.state = 2; g.timer = 0;
          this.emit({ k: 'jam', x: g.tiles[0][0], y: g.tiles[0][1] });
          this.msg(tort, 'Your shell jammed the gate open!');
        } else this.closeGate(g);
      }
    }
    // crate corner reset — elephants can always pull, but keep stray crates tidy
  }

  _stepParts() {
    for (const part of this.parts) {
      const bay = this.bayState[part.bay];
      if (!part.opened) {
        if (this.activePlayers().some((p) => this.inRect(p.x, p.y, bay.room))) {
          part.opened = true;
          this.emit({ k: 'bayopen', bay: bay.index });
        }
      }
    }
  }

  powerDone() { return this.parts.length > 0 && this.parts.every((pt) => pt.inserted); }
  keyCount() { return Math.max(1, Math.min(4, this.activePlayers().length)); }
  keysActive() { return this.powerDone() && this.stats.rescued >= this.requiredRescues; }

  _stepKeysAndExit(dt) {
    const exit = this.gate(this.zoo.exitGate);
    if (exit.state === 0) {
      if (!this.keysActive()) { this.keysT = 0; return; }
      const K = this.keyCount();
      const keys = this.objects.filter((o) => o.kind === 'key' && o.index < K);
      const allHeld = keys.every((k) => this.activePlayers().some((p) => p.connected && p.hold && p.hold.kind === 'key' && p.hold.obj === k.id));
      for (const k of keys) k.state = this.activePlayers().some((p) => p.hold && p.hold.obj === k.id) ? 1 : 0;
      if (allHeld) {
        this.keysT += dt;
        if (this.keysT >= 1.0) {
          this.openGate(exit);
          for (const p of this.players.values()) if (p.hold && p.hold.kind === 'key') p.hold = null;
          for (const k of keys) k.state = 2;
          this.emit({ k: 'exitOpen' });
        }
      } else this.keysT = 0;
      return;
    }
    const act = this.activePlayers();
    if (act.length && act.every((p) => p.connected && p.inExit)) {
      this.phase = 'complete';
      this.emit({ k: 'complete' });
    }
  }

  // ---------- noise & staff ----------
  noise(x, y, r, src) {
    this.emit({ k: 'noise', x, y, r });
    for (const s of this.staff) {
      if (s.state === 'chase' || s.state === 'cheer') continue;
      if (dist(s.x, s.y, x, y) <= r) {
        const tx = Math.floor(x), ty = Math.floor(y);
        const goal = this._nearestStaffTile(tx, ty);
        if (!goal) continue;
        s.state = 'investigate'; s.goal = goal; s.path = null; s.look = 0; s.alert = Math.max(s.alert, 0.2);
        this.emit({ k: 'investigate', id: s.id });
      }
    }
    void src;
  }

  _nearestStaffTile(tx, ty) {
    if (this._staffPass(tx, ty)) return [tx, ty];
    for (let r = 1; r <= 4; r++) for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (this._staffPass(x, y)) return [x, y];
    return null;
  }

  _staffPass(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const i = this.idx(x, y);
    if (this.zoo.staffMask[i] || this.entSolid[i]) return false;
    if (!staffCanEnter(this.tiles[i])) return false;
    for (const p of this.players.values()) if (p.active && p.shell && Math.floor(p.x) === x && Math.floor(p.y) === y) return false;
    return true;
  }

  canSee(s, p) {
    const d = dist(s.x, s.y, p.x, p.y);
    const cfg = this.zoo.staff;
    if (d > cfg.range) return false;
    if (d > 1.1) {
      const ang = Math.atan2(p.y - s.y, p.x - s.x);
      if (Math.abs(angleDiff(ang, s.dir)) > cfg.halfAngle) return false;
    }
    return lineOfSight(s.x, s.y, p.x, p.y, (tx, ty) => this.visionBlocked(tx, ty));
  }

  detectable(p) {
    return p.active && p.connected && !p.hidden && !p.shell && p.grace <= 0 && p.capturedT <= 0 && !p.under && !p.inExit && !this.inOwnEnclosure(p);
  }

  _stepStaff(s, dt) {
    const cfg = this.zoo.staff;
    if (s.state === 'cheer') { s.cheer -= dt; if (s.cheer <= 0) { s.state = 'return'; s.path = null; } return; }
    // vision
    let seen = null, sd = Infinity;
    for (const p of this.players.values()) {
      if (!this.detectable(p)) continue;
      if (this.canSee(s, p)) { const d = dist(s.x, s.y, p.x, p.y); if (d < sd) { sd = d; seen = p; } }
    }
    if (s.state === 'chase') {
      const t = this.players.get(s.target);
      const visible = t && this.detectable(t) && this.canSee(s, t);
      if (visible) { s.lastSeen = [t.x, t.y]; s.lost = 0; } else s.lost += dt;
      if (!t || !this.detectable(t) || s.lost > 2.0) {
        const ls = s.lastSeen ? this._nearestStaffTile(Math.floor(s.lastSeen[0]), Math.floor(s.lastSeen[1])) : null;
        s.state = ls ? 'investigate' : 'return'; s.goal = ls; s.path = null; s.look = 0; s.target = null; s.alert = 0.5;
        return;
      }
      s.repath -= dt;
      if (s.repath <= 0 || !s.path) {
        s.repath = 0.35;
        const tx = Math.floor((visible ? t.x : s.lastSeen[0])), ty = Math.floor((visible ? t.y : s.lastSeen[1]));
        s.path = bfs(this.w, this.h, Math.floor(s.x), Math.floor(s.y), [tx, ty], (x, y) => this._staffPass(x, y), 6000);
        if (s.path && s.path.length && !this._staffPass(tx, ty)) s.path.pop();
      }
      if (visible && dist(s.x, s.y, t.x, t.y) < 1.2) {
        // close enough: move directly
        this._staffMoveDirect(s, t.x, t.y, cfg.chaseSpeed * dt);
      } else this._followPath(s, cfg.chaseSpeed * dt);
      if (t && dist(s.x, s.y, t.x, t.y) < 0.75) this._capture(s, t);
      return;
    }
    // suspicion meter
    if (seen) {
      const rate = cfg.detectRate * (0.55 + 1.3 * (1 - sd / cfg.range));
      s.alert = Math.min(1, s.alert + rate * dt);
      s.suspect = seen.id;
      const ang = Math.atan2(seen.y - s.y, seen.x - s.x);
      s.dir += angleDiff(ang, s.dir) * Math.min(1, dt * 4);
      if (s.alert >= 1) {
        s.state = 'chase'; s.target = seen.id; s.lastSeen = [seen.x, seen.y]; s.lost = 0; s.path = null; s.repath = 0;
        this.emit({ k: 'alert', id: s.id, pid: seen.id, x: s.x, y: s.y });
        return;
      }
      if (s.alert > 0.15) { if (s.state !== 'suspicious') { s.prevState = s.state; s.state = 'suspicious'; this.emit({ k: 'suspicious', id: s.id }); } return; }
    } else {
      s.alert = Math.max(0, s.alert - 0.45 * dt);
      if (s.state === 'suspicious' && s.alert < 0.1) { s.state = s.prevState === 'investigate' ? 'investigate' : 'return'; s.path = null; }
      if (s.state === 'suspicious') { return; }
    }
    if (s.state === 'suspicious') return;

    if (s.state === 'investigate') {
      if (!s.goal) { s.state = 'return'; s.path = null; return; }
      if (!s.path) s.path = bfs(this.w, this.h, Math.floor(s.x), Math.floor(s.y), s.goal, (x, y) => this._staffPass(x, y), 6000) || [];
      if (s.path.length) this._followPath(s, cfg.investigateSpeed * dt);
      else {
        s.look += dt;
        s.dir += dt * 1.6;
        if (s.look > 2.6) { s.state = 'return'; s.path = null; }
      }
      return;
    }
    // patrol / return
    const wp = s.route[s.wp];
    if (!s.path) {
      s.path = bfs(this.w, this.h, Math.floor(s.x), Math.floor(s.y), wp, (x, y) => this._staffPass(x, y), 8000);
      if (!s.path) { s.stuck += dt; s.path = null; if (s.stuck > 1) { s.wp = (s.wp + s.route.length - 1) % s.route.length; s.stuck = 0; } return; }
    }
    if (s.path.length === 0) {
      if (s.state === 'return') s.state = 'patrol';
      s.wp = (s.wp + 1) % s.route.length;
      s.path = null;
      return;
    }
    // shelled tortoise in the way: turn around
    const [nx, ny] = s.path[0];
    if (!this._staffPass(nx, ny)) {
      s.path = null; s.wp = (s.wp + s.route.length - 1) % s.route.length;
      this.emit({ k: 'blocked', id: s.id, x: nx, y: ny });
      return;
    }
    this._followPath(s, (s.state === 'return' ? cfg.investigateSpeed : cfg.patrolSpeed) * dt);
  }

  _staffMoveDirect(s, tx, ty, step) {
    const dx = tx - s.x, dy = ty - s.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-3) return;
    const k = Math.min(1, step / d);
    s.x += dx * k; s.y += dy * k;
    s.dir = Math.atan2(dy, dx);
  }

  _followPath(s, step) {
    while (step > 0 && s.path && s.path.length) {
      const [nx, ny] = s.path[0];
      if (!this._staffPass(nx, ny)) { s.path = null; return; }
      const tx = nx + 0.5, ty = ny + 0.5;
      const dx = tx - s.x, dy = ty - s.y;
      const d = Math.hypot(dx, dy);
      if (d > 1e-3) {
        const target = Math.atan2(dy, dx);
        s.dir += angleDiff(target, s.dir) * 0.35;
      }
      if (d <= step) { s.x = tx; s.y = ty; step -= d; s.path.shift(); }
      else { s.x += dx / d * step; s.y += dy / d * step; step = 0; }
    }
  }

  _capture(s, p) {
    p.capturedT = 1.1;
    p.hold = null; p.slide = null; p.shell = false; p.sprintT = 0;
    this._dropCarry(p);
    p.everCaught++;
    this.stats.captures++;
    s.state = 'cheer'; s.cheer = 1.8; s.target = null; s.alert = 0; s.path = null;
    this.emit({ k: 'capture', pid: p.id, name: p.name, x: p.x, y: p.y });
  }

  _dropCarry(p) {
    if (p.carry && p.carry.startsWith('fuse:')) {
      const bay = Number(p.carry.split(':')[1]);
      const cage = this.obj(this.bayState[bay].cage);
      if (cage) cage.state = 1;
      const part = this._partForBay(bay);
      if (part) part.fuse = false;
      this.emit({ k: 'fusereturn', bay });
    }
    p.carry = null;
  }

  _returnToEnclosure(p) {
    const e = this.zoo.enclosures[p.enc];
    p.x = e.spawn[0] + 0.5; p.y = e.spawn[1] + 0.5;
    p.grace = GRACE;
    p.wobble = 0; p.onBeam = false; p.safe = [p.x, p.y];
    const g = this.gate(e.mainGate);
    if (g && g.state === 1) this.closeGate(g);
    this._unstick(p);
    this.msg(p, 'Caught! You were returned to your enclosure. Escape again, or ask a teammate to pull your keeper lever.');
  }

  // ---------- NPCs ----------
  _npcPass(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const i = this.idx(x, y);
    if (this.entSolid[i]) return false;
    return npcCanEnter(this.tiles[i]);
  }

  _stepNpc(n, dt) {
    if (n.state === 'caged') {
      n.wait -= dt;
      if (n.path && n.path.length) { this._npcFollow(n, 1.1 * dt); return; }
      if (n.wait <= 0) {
        n.wait = 2 + this.rng() * 3;
        const r = this.zoo.enclosures[n.enc].rect;
        for (let tries = 0; tries < 6; tries++) {
          const x = r[0] + 1 + Math.floor(this.rng() * (r[2] - r[0] - 1));
          const y = r[1] + 1 + Math.floor(this.rng() * (r[3] - r[1] - 1));
          if (!this._npcPass(x, y)) continue;
          const path = bfs(this.w, this.h, Math.floor(n.x), Math.floor(n.y), [x, y], (xx, yy) => this._npcPass(xx, yy) && this.inRect(xx + 0.5, yy + 0.5, r), 500);
          if (path && path.length <= 8) { n.path = path; break; }
        }
      }
      return;
    }
    if (n.state === 'leaving') {
      if (!n.spot) {
        const used = new Set(this.npcs.filter((m) => m.spot).map((m) => m.spot.join(',')));
        n.spot = this.zoo.hideout.find((h) => !used.has(h.join(','))) || this.zoo.hideout[0];
      }
      if (!n.path) {
        n.path = bfs(this.w, this.h, Math.floor(n.x), Math.floor(n.y), n.spot, (x, y) => this._npcPass(x, y), 8000);
        if (!n.path) { n.x = n.spot[0] + 0.5; n.y = n.spot[1] + 0.5; n.state = 'free'; return; }
      }
      if (n.path.length) this._npcFollow(n, 3.4 * dt);
      else n.state = 'free';
    }
  }

  _npcFollow(n, step) {
    while (step > 0 && n.path && n.path.length) {
      const [nx, ny] = n.path[0];
      const tx = nx + 0.5, ty = ny + 0.5;
      const dx = tx - n.x, dy = ty - n.y;
      const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.01) n.face = dx > 0 ? 'right' : 'left';
      if (d <= step) { n.x = tx; n.y = ty; step -= d; n.path.shift(); }
      else { n.x += dx / d * step; n.y += dy / d * step; step = 0; }
    }
  }

  // ---------- objectives & serialisation ----------
  objectives() {
    const act = this.activePlayers();
    const exit = this.gate(this.zoo.exitGate);
    const K = this.keyCount();
    const keys = this.objects.filter((o) => o.kind === 'key' && o.index < K).sort((a, b) => a.index - b.index).map((k) => {
      const holder = act.find((p) => p.hold && p.hold.obj === k.id);
      return { i: k.index, x: k.x, y: k.y, holder: holder ? holder.name : null };
    });
    const waiting = act.filter((p) => !p.connected).map((p) => p.name);
    return {
      escape: { done: act.every((p) => p.escaped), players: act.map((p) => ({ name: p.name, animal: p.animal, escaped: p.escaped })) },
      rescue: { n: this.stats.rescued, need: this.requiredRescues, total: this.npcs.length, done: this.stats.rescued >= this.requiredRescues },
      power: {
        done: this.powerDone(), team: this.team,
        parts: this.parts.map((pt) => {
          const who = pt.pid ? this.players.get(pt.pid) : null;
          const steps = bayStepsFor(pt, this.team);
          return { i: pt.index, pid: pt.pid, bay: pt.bay + 1, who: who ? who.name : null, animal: who ? who.animal : null, template: pt.template, steps, step: steps.findIndex((s) => !s.done), done: pt.inserted, waiting: !!(who && !who.connected) };
        }),
      },
      keys: { active: this.keysActive(), need: K, keys, done: exit.state !== 0 },
      exit: { open: exit.state !== 0, inZone: act.filter((p) => p.inExit).length, need: act.length, done: this.phase === 'complete' },
      waiting,
    };
  }

  defs() {
    return {
      gates: this.gates.map((g) => ({ id: g.id, kind: g.kind, vis: g.vis, tiles: g.tiles, label: g.label })),
      objects: this.objects.map((o) => ({ id: o.id, kind: o.kind, x: o.x, y: o.y, reach: o.reach, label: o.label, index: o.index, bay: o.bay, keeper: !!o.keeper, enc: o.enc })),
      plates: this.plates.map((p) => ({ id: p.id, x: p.x, y: p.y, heavy: p.heavy })),
      burrows: this.burrows.map((b) => ({ id: b.id, a: b.a, b: b.b })),
      bays: this.bayState.map((b) => ({ index: b.index, used: b.used, x: b.x, y: b.y, room: b.room, part: b.part, template: b.template })),
    };
  }

  playerFlags(p) {
    let f = 0;
    if (p.hidden) f |= PF.HIDDEN; if (p.shell) f |= PF.SHELL; if (p.slide) f |= PF.SLIDE; if (p.sprintT > 0) f |= PF.SPRINT;
    if (p.grace > 0) f |= PF.GRACE; if (p.capturedT > 0) f |= PF.CAUGHT; if (p.under) f |= PF.UNDER; if (p.hop) f |= PF.HOP;
    if (p.hold) f |= PF.HOLD; if (p.lookout > 0) f |= PF.LOOKOUT; if (p.wobble > 0.05) f |= PF.WOBBLE;
    if (this.inOwnEnclosure(p)) f |= PF.IN_ENC; if (p.escaped) f |= PF.ESCAPED; if (p.inExit) f |= PF.EXIT;
    return f;
  }

  snapshot() {
    const r2 = (v) => Math.round(v * 100) / 100;
    const lookout = [...this.players.values()].some((p) => p.active && p.lookout > 0);
    return {
      tick: this.tick, time: r2(this.time), phase: this.phase,
      g: this.gates.map((g) => g.state).join(''),
      os: this.objects.map((o) => o.state),
      cr: this.crates.map((c) => [c.x, c.y]),
      bu: this.burrows.map((b) => (b.dug ? 1 : 0)),
      pd: this.plates.map((p) => (p.down ? 1 : 0)),
      pl: this.order.map((id) => {
        const p = this.players.get(id);
        return { id, n: p.name, a: p.animal, x: r2(p.x), y: r2(p.y), f: p.face, s: this.playerFlags(p), c: p.carry, act: p.active, con: p.connected, wb: r2(p.wobble), mv: p.moving ? 1 : 0, hp: p.hop ? p.hop.kind : null, hk: p.hold ? p.hold.kind : null };
      }),
      st: this.staff.map((s) => ({ x: r2(s.x), y: r2(s.y), d: r2(s.dir), s: STAFF_STATES.indexOf(s.state), al: r2(s.alert) })),
      np: this.npcs.map((n) => ({ a: n.animal, x: r2(n.x), y: r2(n.y), s: n.state, f: n.face })),
      lookout,
      obj: this.objectives(),
      kt: r2(this.keysT),
    };
  }

  personal(pid) {
    const p = this.players.get(pid);
    if (!p || !p.active) return null;
    const e = this.interactTarget(p);
    const sp = this.abilityTarget(p);
    return {
      id: pid, x: p.x, y: p.y, seq: p.lastSeq,
      pe: e ? { t: e.text, ok: !!e.run } : null,
      ps: sp ? { t: sp.text, ok: !!sp.run } : null,
      hold: p.hold ? { k: p.hold.kind, p: p.hold.need === Infinity ? -1 : Math.min(1, p.hold.t / p.hold.need) } : null,
      cd: p.cdMax ? Math.round((p.cd / p.cdMax) * 100) / 100 : 0,
      grace: Math.round(p.grace * 10) / 10,
      special: !!(p.slide || p.hop || p.under || p.capturedT > 0 || p.shell || p.hold || p.sprintT > 0 || p.onBeam),
    };
  }

  results() {
    return {
      time: Math.round(this.time),
      rescued: this.stats.rescued, total: this.npcs.length,
      captures: this.stats.captures,
      players: this.order.map((id) => { const p = this.players.get(id); return { name: p.name, animal: p.animal, caught: p.everCaught, active: p.active }; }),
      zoo: this.zoo.name,
    };
  }
}

// exported for the client (vision cones)
export function visionPolygon(world, s, cfg, rays = 18) {
  const pts = [[s.x, s.y]];
  for (let i = 0; i <= rays; i++) {
    const a = s.d - cfg.halfAngle + (2 * cfg.halfAngle * i) / rays;
    const d = rayDistance(s.x, s.y, a, cfg.range, (tx, ty) => world.visionBlocked(tx, ty));
    pts.push([s.x + Math.cos(a) * d, s.y + Math.sin(a) * d]);
  }
  return pts;
}

export { HALF, animalCanEnter };
