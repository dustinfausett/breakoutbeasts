import { vehicleCells } from './shared/driving.js';
// Client-side mirror of the authoritative world, built from snapshots, with interpolation
// for remote entities and prediction for the local player's plain walking.

import { getZoo } from './shared/zoos/index.js';
import { tileBlocksVision } from './shared/tiles.js';
import { walkStep } from './shared/physics.js';
import { TICK, PF } from './shared/game.js';

const INTERP_DELAY = 110; // ms

export class ClientWorld {
  constructor(zooId) {
    this.zoo = {...getZoo(zooId),decor:[...getZoo(zooId).decor]};
    this.w = this.zoo.w; this.h = this.zoo.h;
    this.tiles = new Uint8Array(this.zoo.tiles);
    this.entSolid = new Uint8Array(this.w * this.h);
    this.entVis = new Uint8Array(this.w * this.h);
    this.defs = null;
    this.snap = null;
    this.buffer = [];
    this.dirtyTiles = true;
    this.changedTiles = [];
    this.myId = null;
    this.pred = null; this.prevPred = null; this.pending = []; this.predTime = 0;
  }

  applySnap(msg, now) {
    if (msg.tm) {
      const old = this.tiles;
      const next = new Uint8Array(this.zoo.tiles);
      for (const [i, t] of msg.tm) next[i] = t;
      for (let i = 0; i < next.length; i++) if (next[i] !== old[i]) this.changedTiles.push(i);
      this.tiles = next;
      this.dirtyTiles = true;
    }
    if (msg.defs){this.defs=msg.defs;if(msg.defs.decor){this.zoo.decor=msg.defs.decor;this.dirtyDecor=true;}}
    this.snap = msg;
    this.rebuildBlock();
    this.buffer.push({ t: now, s: msg });
    while (this.buffer.length > 30) this.buffer.shift();
    this._reconcile(msg);
  }

  rebuildBlock() {
    const s = this.snap, d = this.defs;
    this.entSolid.fill(0); this.entVis.fill(0);
    if (!s || !d) return;
    d.gates.forEach((g, i) => {
      if (s.g[i] !== '0') return;
      for (const [x, y] of g.tiles) { const k = y * this.w + x; this.entSolid[k] = 1; if (g.vis === 'solid') this.entVis[k] = 1; }
    });
    for (const o of d.objects) if (!o.walkable&&!['escapeBuild','escapeDig','supplies','vehicle','holdingCageDoor'].includes(o.kind)) this.entSolid[o.y * this.w + o.x] = 1;
    for(const car of s.cars||[s.obj?.parking?.car])if(car)for(const i of vehicleCells(car,this.w,this.h)){this.entSolid[i]=1;this.entVis[i]=1;}
    for (const [x, y] of s.cr) { const k = y * this.w + x; this.entSolid[k] = 1; this.entVis[k] = 1; }
  }

  visionBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    const i = ty * this.w + tx;
    return this.entVis[i] === 1 || tileBlocksVision(this.tiles[i]);
  }

  gateState(i) { return this.snap ? Number(this.snap.g[i]) : 0; }

  // ---------- local prediction ----------
  me() { return this.snap?.pl.find((p) => p.id === this.myId) || null; }

  _reconcile(msg) {
    const me = msg.me;
    const pl = this.me();
    if (!me || !pl) { this.pred = null; return; }
    this.pending = this.pending.filter((i) => i.seq > me.seq);
    const special = me.special || (pl.s & (PF.CAUGHT | PF.HOP | PF.UNDER | PF.SLIDE | PF.SHELL | PF.HOLD)) || !pl.act;
    const base = { x: me.x, y: me.y, animal: pl.a, face: pl.f, sprintT: 0 };
    if (special) { this.pending = []; this.pred = base; this.prevPred = { ...base }; return; }
    for (const inp of this.pending) walkStep(this, base, inp.mx, inp.my, TICK, false);
    if (!this.pred) { this.pred = base; this.prevPred = { ...base }; return; }
    // smooth small corrections, snap large ones
    const err = Math.hypot(base.x - this.pred.x, base.y - this.pred.y);
    if (err > 1.5) { this.pred = base; this.prevPred = { ...base }; }
    else { this.pred.x += (base.x - this.pred.x) * 0.5; this.pred.y += (base.y - this.pred.y) * 0.5; this.pred.face = base.face; }
  }

  predictStep(inp) {
    if (!this.pred) return;
    this.prevPred = { ...this.pred };
    this.predTime = performance.now();
    this.pending.push(inp);
    if (this.pending.length > 40) this.pending.shift();
    const me = this.snap?.me;
    if (me && me.special) return;
    walkStep(this, this.pred, inp.mx, inp.my, TICK, false);
  }

  localPos(now) {
    if (!this.pred) return null;
    const a = Math.min(1, (now - this.predTime) / (TICK * 1000));
    return { x: this.prevPred.x + (this.pred.x - this.prevPred.x) * a, y: this.prevPred.y + (this.pred.y - this.prevPred.y) * a, face: this.pred.face };
  }

  // ---------- interpolation ----------
  interp(now) {
    const rt = now - INTERP_DELAY;
    const b = this.buffer;
    if (!b.length) return null;
    let i = b.length - 1;
    while (i > 0 && b[i - 1].t > rt) i--;
    const s1 = b[i], s0 = b[Math.max(0, i - 1)];
    if (s0 === s1 || s1.t <= s0.t) return { a: s1.s, b: s1.s, k: 1 };
    const k = Math.max(0, Math.min(1, (rt - s0.t) / (s1.t - s0.t)));
    return { a: s0.s, b: s1.s, k };
  }
}

export function lerp(a, b, k) { return a + (b - a) * k; }
export function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
