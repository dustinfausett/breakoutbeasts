// Autopilot: plays an animal through the mission using only player inputs.
// Used by automated tests (headless, against the real simulation) and by the browser
// test mode (?autopilot=1) so end-to-end tests drive the real client and network path.

import { controlPersonal } from './control-room.js';
import { canOccupy } from './physics.js';
import { bfs, dist, angleDiff, lineOfSight } from './util.js';
import { bayEnterSteps, bayExitSteps } from './bays.js';
import { PF, staffProfile } from './game.js';

const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Build the bot's view straight from an authoritative Game (headless tests). */
export function viewFromGame(game, pid) {
  const p = game.players.get(pid);
  return {
    panel:controlPersonal(game,pid),
    teamClues:p.inControlRoom?game.activePlayers().map(q=>controlPersonal(game,q.id)?.instruction).filter(Boolean):[],
    world: game, zoo: game.zoo, staff:game.staff.map(s=>({x:s.x,y:s.y,d:s.dir,ar:game.time<game.alertUntil})),
    me: { id: pid, x: p.x, y: p.y, animal: p.animal, face: p.face, flags: game.playerFlags(p), carry: p.carry, materials: p.materials, enc: p.enc },
    obj: game.objectives(),
    objects: game.objects.map((o) => ({ id: o.id, kind: o.kind, x: o.x, y: o.y, index: o.index, bay: o.bay, keeper: o.keeper, enc: o.enc, state: o.state, stand:o.stand })),
    gates: game.gates.map((g) => ({ id: g.id, state: g.state, enc: g.enc, kind: g.kind })),
    npcs: game.npcs.map((n) => ({ enc: n.enc, state: n.state })),
    activeIds: game.activePlayers().map((q) => q.id),
    bays: game.bayState.map((b) => ({ index: b.index, x: b.x, y: b.y, template: b.template, room: b.room, part: b.part })),
  };
}

export class Autopilot {
  constructor(pid) {
    this.pid = pid;
    this.script = null; this.si = 0; this.st = 0; this.scriptName = '';
    this.path = null; this.pathGoal = null; this.stuckT = 0; this.lastPos = null;
    this.release = false;
    this.log = [];
  }

  setScript(name, steps) {
    if (this.scriptName === name && this.script) return;
    this.scriptName = name; this.script = steps; this.si = 0; this.st = 0; this.path = null;
    this.log.push(name);
  }

  update(v, dt) {
    const me = v.me;
    const idle = { mx: 0, my: 0, sp: false, e: false };
    if(v.panel){
      if(v.panel.ready&&!v.panel.powered&&v.panel.phase==='arming')return {...idle,panel:{op:'power'}};
      const clue=(v.teamClues||[]).find(c=>c.target===me.id&&c.index===v.panel.done);
      if(v.panel.phase==='running'&&clue)return {...idle,panel:{op:'set',control:clue.control,value:clue.value}};
      return idle;
    }
    if (me.flags & (PF.CAUGHT | PF.HOP | PF.UNDER | PF.SLIDE)) {
      if (me.flags & PF.CAUGHT) { this.script = null; this.scriptName = ''; }
      // keep running a script's waits while hopping/sliding
      if (this.script && this.script[this.si] && this.script[this.si].wait != null) return this._runStep(v, dt) || idle;
      return idle;
    }
    if (this.release) { this.release = false; return idle; }
    this._plan(v);
    if (!this.script) return idle;
    return this._runStep(v, dt) || idle;
  }

  _plan(v) {
    const me = v.me;
    const enc = v.zoo.enclosures[me.enc];
    const inEnc = !!(me.flags & PF.IN_ENC);
    // 1) escape
    if (inEnc) {
      if (this.scriptName.startsWith('escape')) return;
      const out = this._pathTo(v, (x, y) => !(x >= enc.rect[0] && x <= enc.rect[2] && y >= enc.rect[1] && y <= enc.rect[3]));
      if (out) return this.setScript('escape-walk', [{ goTo: out[out.length - 1] }]);
      return this.setScript('escape', enc.solution);
    }
    if (this.scriptName.startsWith('escape') && this.script && this.si < this.script.length) {
      // finish any trailing steps of an escape script
      if (this.scriptName === 'escape') { this.script = null; this.scriptName = ''; }
    }
    // 4) exit open -> go to exit
    if (v.obj.exit.open) {
      const order = v.activeIds.indexOf(me.id);
      const z = v.zoo.exitZone;
      return this.setScript('exit', [{ go: [z[0] + Math.max(0,order)%3, z[1] + 2 + Math.floor(Math.max(0,order)/3) * 2] }, { wait: 999 }]);
    }
    // 2) my part
    const part = v.obj.power.parts.find((pt) => pt.pid === me.id && !pt.done) || v.obj.power.parts.find((pt) => !pt.done && !pt.pid);
    const carryingFuse = me.carry && me.carry.startsWith('fuse:');
    if (carryingFuse) {
      const bayIdx = Number(me.carry.split(':')[1]);
      const bay = v.bays[bayIdx];
      const inRoom = this._inRect(me.x, me.y, bay.room);
      const socket = v.objects.filter((o) => o.kind === 'socket' && o.state === 0).sort((a, b) => a.index - b.index)[0];
      const steps = [];
      if (inRoom) steps.push(...bayExitSteps(bay, bay.template));
      if (socket) steps.push({ go: socket.stand || [socket.x, socket.y + 1] }, { face: socket.stand && socket.stand[1]<socket.y?'down':'up' }, { e: 1 }, { wait: 0.2 });
      return this.setScript('socket-' + bayIdx + (inRoom ? 'r' : ''), steps);
    }
    if (part && !part.done && !(part.waiting)) {
      const bay = v.bays[part.bay - 1];
      const inRoom = this._inRect(me.x, me.y, bay.room);
      const step = part.steps[part.step];
      if (part.step === 0 && !inRoom) return this.setScript('bay-enter-' + bay.index + '-' + bay.template, bayEnterSteps(bay, bay.template));
      if (step && step.label.startsWith('Flip')) {
        if (!inRoom) return this.setScript('bay-enter-' + bay.index + '-' + bay.template, bayEnterSteps(bay, bay.template));
        return this.setScript('breaker-' + bay.index, [{ go: [bay.x + 3, bay.y + 2] }, { face: 'up' }, { e: 1 }, { wait: 0.2 }]);
      }
      if (step && step.label.startsWith('Grab')) {
        if (!inRoom) return this.setScript('bay-enter-' + bay.index + '-' + bay.template, bayEnterSteps(bay, bay.template));
        return this.setScript('fuse-' + bay.index, [{ go: [bay.x + 1, bay.y + 2] }, { face: 'up' }, { e: 1 }, { wait: 0.2 }]);
      }
    }
    // 3) rescues
    if (!v.obj.rescue.done) {
      const caged = v.npcs.map((n, i) => ({ ...n, i })).filter((n) => n.state === 'caged');
      if (caged.length) {
        // Keep a chosen rescue route until it finishes or another player frees that cage.
        // Re-ranking distances every snapshot made clients oscillate between two cages.
        if (this.script && this.si < this.script.length) {
          if (this.scriptName.startsWith('supplies-')) return;
          if (this.scriptName.startsWith('rescue-')) {
            const target = v.objects.find(o => o.id === this.scriptName.slice(7));
            if (target && caged.some(n => n.enc === target.enc)) return;
          }
        }
        const order = Math.max(0, v.activeIds.indexOf(me.id));
        // Choose a nearby ramp and spread teammates across the remaining cages.
        const ramps = caged.map(n=>v.objects.find(o=>o.kind==='escapeBuild' && o.enc===n.enc)).filter(Boolean);
        ramps.sort((a,b)=>dist(me.x,me.y,a.x,a.y)-dist(me.x,me.y,b.x,b.y));
        const ramp=ramps[order % ramps.length];
        const enc=v.zoo.enclosures[ramp.enc], front=enc.front==='down'?1:-1;
        if((me.materials||0)<2){
          const bench=v.objects.filter(o=>o.kind==='supplies' && (o.y===13||o.y===43)).sort((a,b)=>dist(me.x,me.y,a.x,a.y)-dist(me.x,me.y,b.x,b.y))[0];
          return this.setScript('supplies-'+bench.id+'-'+(me.materials||0),[{go:[bench.x,bench.y+(bench.y===13?1:-1)]},{holdE:1.1},{wait:.1}]);
        }
        return this.setScript('rescue-'+ramp.id,[{go:[ramp.x,ramp.y+front]},{holdE:2.3},{wait:.2}]);
      }
    }
    // Each operator approaches a distinct control-house entrance.
    if(v.obj.keys.active&&!v.obj.keys.done){
      const order=v.obj.control.team.find(p=>p.id===me.id)?.doorIndex??v.activeIds.indexOf(me.id),door=v.objects.find(o=>o.kind==='controlDoor'&&o.index===order);
      if(door)return this.setScript('control-door-'+door.id,[{go:door.stand},{e:1},{wait:.2}]);
    }
    if (!this.script || this.si >= this.script.length) {
      // nothing to do: wander to the plaza and wait
      return this.setScript('wait-plaza', [{ go: [66, 30 + Math.max(0, v.activeIds.indexOf(me.id))] }, { wait: 3 }]);
    }
  }

  _inRect(x, y, r) { return x >= r[0] && x < r[2] + 1 && y >= r[1] && y < r[3] + 1; }

  _danger(v,x,y) {
    const enc=v.zoo.enclosures[v.me.enc];
    if(this._inRect(x+.5,y+.5,enc.rect))return false;
    return (v.staff||[]).some(s=>{
      const dx=x+.5-s.x,dy=y+.5-s.y,d=Math.hypot(dx,dy);
      const cfg=staffProfile(v.zoo.staff,s.ar);
      return d<=cfg.range+.6 && (d<1.4||Math.abs(angleDiff(Math.atan2(dy,dx),s.d))<cfg.halfAngle+.15) &&
        lineOfSight(s.x,s.y,x+.5,y+.5,(a,b)=>v.world.visionBlocked(a,b));
    });
  }

  _pathTo(v, goalFn) {
    const me = v.me;
    return bfs(v.world.w, v.world.h, Math.floor(me.x), Math.floor(me.y), goalFn,
      (x, y) => !this._danger(v,x,y) && canOccupy(v.world, me.animal, x + 0.5, y + 0.5, null), 8000);
  }

  _runStep(v, dt) {
    const s = this.script[this.si];
    if (!s) { this.script = null; this.scriptName = ''; return null; }
    const me = v.me;
    const next = () => { this.si++; this.st = 0; this.path = null; };
    this.st += dt;
    if (s.go || s.goTo) {
      const [gx, gy] = s.go || s.goTo;
      const cx = gx + 0.5, cy = gy + 0.5;
      if (dist(me.x, me.y, cx, cy) < 0.12) { next(); return null; }
      if (!this.path || this.pathGoal !== gx + ',' + gy) {
        this.path = this._pathTo(v, [gx, gy]);
        this.pathGoal = gx + ',' + gy;
        this.stuckT = 0;
        if (!this.path) {
          // A guard may temporarily block the safe route. Wait rather than skipping
          // the waypoint and trying to hold a distant switch forever.
          return null;
        }
      }
      // pop reached nodes
      while (this.path.length && dist(me.x, me.y, this.path[0][0] + 0.5, this.path[0][1] + 0.5) < 0.12) this.path.shift();
      const tgt = this.path.length ? this.path[0] : [gx, gy];
      if(this._danger(v,...tgt)){this.path=null;return null;}
      const dx = tgt[0] + 0.5 - me.x, dy = tgt[1] + 0.5 - me.y;
      const d = Math.hypot(dx, dy) || 1;
      // stuck detection
      if (this.lastPos && dist(this.lastPos[0], this.lastPos[1], me.x, me.y) < 0.002) this.stuckT += dt; else this.stuckT = 0;
      this.lastPos = [me.x, me.y];
      if (this.stuckT > 0.8) { this.path = null; this.stuckT = 0; }
      const k = d < 0.3 ? Math.max(0.35, d / 0.3) : 1;
      // flamingos steady themselves on balance beams
      const onBeam = me.animal === 'flamingo' && (v.world.tiles[Math.floor(me.y) * v.world.w + Math.floor(me.x)] === 20 || v.world.tiles[tgt[1] * v.world.w + tgt[0]] === 20);
      return { mx: dx / d * k, my: dy / d * k, sp: onBeam, e: false };
    }
    if (s.face) {
      if (this.st > 0.05) { next(); this.release = true; }
      const [x, y] = DIRV[s.face];
      return { mx: x * 0.3, my: y * 0.3, sp: false, e: false };
    }
    if (s.space) { next(); this.release = true; return { mx: 0, my: 0, sp: true, e: false }; }
    if (s.e) { next(); this.release = true; return { mx: 0, my: 0, sp: false, e: true }; }
    if (s.holdSpace != null) { if (this.st >= s.holdSpace) { next(); this.release = true; } return { mx: 0, my: 0, sp: true, e: false }; }
    if (s.holdE != null) { if (this.st >= s.holdE) { next(); this.release = true; } return { mx: 0, my: 0, sp: false, e: true }; }
    if (s.wait != null) { if (this.st >= s.wait) next(); return { mx: 0, my: 0, sp: false, e: false }; }
    if (s.moveFor) {
      const [d, t] = s.moveFor;
      if (this.st >= t) { next(); return null; }
      const [x, y] = DIRV[d];
      return { mx: x, my: y, sp: false, e: false };
    }
    if (s.beam) {
      const [d, target] = s.beam;
      const [x, y] = DIRV[d];
      const reached = x !== 0 ? (x > 0 ? Math.floor(me.x) >= target : Math.floor(me.x) <= target) : (y > 0 ? Math.floor(me.y) >= target : Math.floor(me.y) <= target);
      if (reached || this.st > 8) { next(); return null; }
      return { mx: x, my: y, sp: true, e: false };
    }
    next();
    return null;
  }
}
