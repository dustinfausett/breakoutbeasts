// Canvas renderer: crisp integer-scaled pixel art, night lighting, vision cones, effects.

import { IMAGES, atlasDraw, objectArt, carArt } from './assets.js';
import { SPRITES, drawTile } from './sprites.js';
import { T, tileBlocksVision } from './shared/tiles.js';
import { vehicleCells } from './shared/driving.js';
import { animalCanSee } from './shared/vision.js';
import { PF, visionPolygon } from './shared/game.js';
import { lerp, lerpAngle } from './world.js';
import { ANIMALS } from './shared/animals.js';

const TS = 16;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');
    this.map = null;
    this.world = null;
    this.fx = [];
    this.bubbles = [];
    this.scale = 3;
    this.cam = { x: 0, y: 0 };
    this.settings = { reducedMotion: false };
    this.resize();
  }

  resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const width=window.visualViewport?.width||innerWidth,height=window.visualViewport?.height||innerHeight;
    const W = Math.floor(width * dpr), H = Math.floor(height * dpr);
    this.canvas.width = W; this.canvas.height = H;
    this.canvas.style.width = width + 'px'; this.canvas.style.height = height + 'px';
    this.dpr = dpr;
    const landscape = W >= H;
    const tx = landscape ? (this.settings.compactHUD?22:24) : 13, ty = landscape ? (this.settings.compactHUD?11:14) : 20;
    this.scale = Math.max(1, Math.floor(Math.min(W / (TS * tx), H / (TS * ty))));
    this.light.width = Math.ceil(W / 2); this.light.height = Math.ceil(H / 2);
  }

  setWorld(world) {
    this.world = world;
    const z = world.zoo;
    this.map = document.createElement('canvas');
    this.map.width = z.w * TS * (z.id==='city'?1:3); this.map.height = z.h * TS * (z.id==='city'?1:3);
    this.mctx = this.map.getContext('2d');this.mctx.scale(z.id==='city'?1:3,z.id==='city'?1:3);this.mctx.imageSmoothingEnabled=false;
    this.redrawAll();
    this.fx = []; this.bubbles = [];
  }

  redrawAll() {
    const w = this.world, z = w.zoo;
    for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) this._drawTile(x, y);
    this._drawStaticDecor();
    w.changedTiles = []; w.dirtyTiles = false;
  }

  _drawTile(x, y) {
    const w = this.world, z = w.zoo;
    const i = y * z.w + x;
    drawTile(this.mctx, w.tiles[i], x, y, x * TS, y * TS, z.themes[z.theme[i]], null);
  }

  _drawStaticDecor() {
    const g = this.mctx;
    for (const d of this.world.zoo.decor) {
      const ox = d.x * TS, oy = d.y * TS;
      if(d.kind==='cityBuilding'){g.fillStyle='#263b43';g.fillRect(ox-3,oy-3,d.w*16+6,d.h*16+6);g.fillStyle=d.color;g.fillRect(ox,oy,d.w*16,d.h*16);g.fillStyle=d.zoo?'#739166':'#baae8b';g.fillRect(ox+5,oy+5,d.w*16-10,12);g.fillStyle='#345464';for(let x=12;x<d.w*16-12;x+=24)for(let y=25;y<d.h*16-24;y+=28)g.fillRect(ox+x,oy+y,14,17);g.fillStyle='#e1c884';g.font='bold 12px monospace';g.textAlign='center';g.fillText(d.text,ox+d.w*8,oy+d.h*16-12);continue;}
      if(d.kind==='street'){g.fillStyle='#dddaa8';g.font='bold 5px monospace';g.textAlign='center';g.fillText(d.text,ox,oy);continue;}
      if(d.kind==='lotExit'){g.fillStyle='#375d51';g.fillRect(ox,oy,d.w*16,d.h*16);g.strokeStyle='#d4d6a4';g.lineWidth=2;g.strokeRect(ox+1,oy+1,d.w*16-2,d.h*16-2);g.fillStyle='#efe7b0';g.font='bold 12px monospace';g.textAlign='center';g.fillText('EXIT',ox+d.w*8,oy+d.h*8+4);continue;}
      if(d.kind==='parkedCar'){
        for(let y=0;y<d.h;y++)for(let x=0;x<d.w;x++)drawTile(g,T.PATH,d.x+x,d.y+y,ox+x*16,oy+y*16,'outside',null);
        g.strokeStyle='#b7b99a';g.lineWidth=1;g.strokeRect(ox-2,oy-3,d.w*16+4,d.h*16+6);
        if(!d.getaway){g.save();g.translate(ox+d.w*8,oy+d.h*8);g.rotate(d.angle||0);carArt(g,-32,-24,64,48,d.colorIndex||0);g.restore();}continue;
      }
      if(d.kind==='controlHouse'&&!IMAGES.terrain){g.fillStyle='#394d59';g.fillRect(ox,oy,d.w*16,d.h*16);g.fillStyle='#57717c';for(let y=0;y<d.h;y++)g.fillRect(ox,oy+y*16,d.w*16,2);continue;}
      if(d.kind==='controlHouse'){for(let y=0;y<d.h;y++)for(let x=0;x<d.w;x++)atlasDraw(g,IMAGES.terrain,13,4,4,ox+x*16,oy+y*16,16,16);continue;}
      const prop={bench:6,lamp:5,sign:7}[d.kind];if(prop!==undefined&&objectArt(g,prop,ox-2,oy-8,20,24))continue;
      if (d.kind === 'flowers') { for (let i = 0; i < 4; i++) { g.fillStyle = ['#f2c63a', '#f08aa8', '#ffffff', '#b08af0'][i]; g.fillRect(ox + 2 + i * 3, oy + 10 + (i % 2) * 2, 2, 2); } }
      if (d.kind === 'bench') { g.fillStyle = '#7a4a24'; g.fillRect(ox + 1, oy + 7, 14, 3); g.fillStyle = '#5a3418'; g.fillRect(ox + 2, oy + 10, 2, 4); g.fillRect(ox + 12, oy + 10, 2, 4); }
      if (d.kind === 'statue') { g.fillStyle = '#c8c8d0'; g.fillRect(ox - 4, oy - 10, 24, 22); g.fillStyle = '#a0a0aa'; g.fillRect(ox - 2, oy - 14, 20, 6); g.fillStyle = '#e8e8f0'; g.fillRect(ox + 4, oy - 8, 8, 8); }
    }
  }

  updateTiles() {
    const w = this.world;
    if (!w.changedTiles.length) return;
    const set = new Set();
    for (const i of w.changedTiles) { const x = i % w.w, y = (i / w.w) | 0; set.add(x + ',' + y); }
    for (const k of set) { const [x, y] = k.split(',').map(Number); this._drawTile(x, y); }
    w.changedTiles = [];
  }

  // ---------- effects ----------
  addEvent(ev, nameOf) {
    const rm = this.settings.reducedMotion;
    const at = (x, y) => [x + 0.5, y + 0.5];
    const burst = (x, y, color, n = 10, spd = 2.5) => {
      for (let i = 0; i < (rm ? 3 : n); i++) {
        const a = Math.random() * Math.PI * 2, s = (0.5 + Math.random()) * spd;
        this.fx.push({ kind: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 0.6 + Math.random() * 0.4, t: 0, color });
      }
    };
    switch (ev.k) {
      case 'chewed': case 'chew': burst(...at(ev.x, ev.y), '#c8904e', ev.k === 'chewed' ? 16 : 5); break;
      case 'kick': burst(...at(ev.x, ev.y), '#d0b080', 18, 4); this.fx.push({ kind: 'ring', x: ev.x + 0.5, y: ev.y + 0.5, t: 0, life: 0.6, r: 2, color: '#ffffff' }); break;
      case 'build': burst(...at(ev.x, ev.y), '#9a6a3a', 10); break;
      case 'dig': case 'dug': burst(...at(ev.x, ev.y), '#8a6034', ev.k === 'dug' ? 18 : 6); break;
      case 'tunnel': burst(ev.x, ev.y, '#8a6034', 8); break;
      case 'push': burst(...at(ev.x, ev.y), '#c8b090', 6); break;
      case 'splash': burst(ev.x, ev.y, '#8ac0f0', 14, 3); break;
      case 'slide': burst(ev.x, ev.y, '#e8f4ff', 8); break;
      case 'gate': this.fx.push({ kind: 'spark', x: ev.x + 0.5, y: ev.y + 0.5, t: 0, life: 0.8 }); break;
      case 'jam': this.fx.push({ kind: 'text', x: ev.x + 0.5, y: ev.y, text: 'JAMMED!', t: 0, life: 1.6, color: '#9aff7a' }); break;
      case 'noise': if (!rm) this.fx.push({ kind: 'ring', x: ev.x, y: ev.y, t: 0, life: 0.9, r: ev.r, color: '#ffd23a' }); else this.fx.push({ kind: 'text', x: ev.x, y: ev.y - 1, text: 'NOISE', t: 0, life: 1, color: '#ffd23a' }); break;
      case 'reach': this.fx.push({ kind: 'spark', x: ev.x + 0.5, y: ev.y + 0.5, t: 0, life: 0.6 }); break;
      case 'socket': case 'unlock': this.fx.push({ kind: 'spark', x: ev.x + 0.5, y: ev.y + 0.5, t: 0, life: 1 }); burst(ev.x + 0.5, ev.y + 0.5, '#ffe36a', 12); break;
      case 'capture': this.fx.push({ kind: 'text', x: ev.x, y: ev.y - 1, text: 'CAUGHT!', t: 0, life: 1.5, color: '#ff7a6a' }); break;
      case 'rattle': this.fx.push({ kind: 'text', x: ev.x + 0.5, y: ev.y - 0.5, text: 'CLANG!', t: 0, life: 1.2, color: '#ffd23a' }); break;
      case 'emote': this.bubbles.push({ pid: ev.pid, text: ev.text, t: 0, life: 3 }); break;
      case 'lookout': this.fx.push({ kind: 'ring', x: null, pid: ev.pid, t: 0, life: 1.2, r: 8, color: '#ffe36a' }); break;
    }
    void nameOf;
  }

  _stepFx(dt) {
    for (const f of this.fx) {
      f.t += dt;
      if (f.kind === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 6 * dt; }
    }
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const b of this.bubbles) b.t += dt;
    this.bubbles = this.bubbles.filter((b) => b.t < b.life);
  }

  // ---------- main draw ----------
  draw(now, dt, view) {
    const ctx = this.ctx, w = this.world;
    if (!w || !w.snap || !w.defs) return;
    if(w.dirtyDecor){this.redrawAll();w.dirtyDecor=false;}
    if (w.dirtyTiles) { this.updateTiles(); w.dirtyTiles = false; }
    this._stepFx(dt);
    const S = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    const ip = w.interp(now);
    const sA = ip.a, sB = ip.b, k = ip.k;
    const snap = w.snap;
    // positions
    let players = sB.pl.map((pb) => {
      const pa = sA.pl.find((q) => q.id === pb.id) || pb;
      let x = lerp(pa.x, pb.x, k), y = lerp(pa.y, pb.y, k);
      if (pb.id === w.myId && view.local) { x = view.local.x; y = view.local.y; }
      return { ...pb, x, y, f: pb.id === w.myId && view.local ? view.local.face : pb.f };
    }).filter((p) => p.act);
    let staff = sB.st.map((sb, i) => { const sa = sA.st[i] || sb; return { ...sb, mv:Math.hypot(sb.x-sa.x,sb.y-sa.y)>.005, x: lerp(sa.x, sb.x, k), y: lerp(sa.y, sb.y, k), d: lerpAngle(sa.d, sb.d, k) }; });
    let npcs = sB.np.map((nb, i) => { const na = sA.np[i] || nb; return { ...nb, mv:Math.hypot(nb.x-na.x,nb.y-na.y)>.005, x: lerp(na.x, nb.x, k), y: lerp(na.y, nb.y, k) }; });
    const crates = sB.cr.map((cb, i) => { const ca = sA.cr[i] || cb; return [lerp(ca[0], cb[0], Math.min(1, k * 1.5)), lerp(ca[1], cb[1], Math.min(1, k * 1.5))]; });

    // camera
    const me = players.find((p) => p.id === w.myId) || players[0] || { x: 40, y: 28 };
    const viewW = W / S, viewH = H / S;
    let cx = me.x * TS - viewW / 2, cy = me.y * TS - viewH / 2;
    cx = Math.max(0, Math.min(w.w * TS - viewW, cx)); cy = Math.max(0, Math.min(w.h * TS - viewH, cy));
    if (viewW > w.w * TS) cx = (w.w * TS - viewW) / 2;
    if (viewH > w.h * TS) cy = (w.h * TS - viewH) / 2;
    cx = Math.round(cx); cy = Math.round(cy);
    this.cam = { x: cx, y: cy };
    const toS = (x, y) => [Math.round((x * TS - cx) * S), Math.round((y * TS - cy) * S)];

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#050b10';ctx.fillRect(0,0,W,H);
    ctx.setTransform(S, 0, 0, S, -cx * S, -cy * S);
    ctx.save();
    const drivenCar=me.car?snap.obj.parking?.car:null,ownCarCells=drivenCar?new Set(vehicleCells(drivenCar,w.w,w.h)):null;
    const visionWorld=drivenCar?{w:w.w,h:w.h,visionBlocked:(x,y)=>ownCarCells.has(y*w.w+x)?tileBlocksVision(w.tiles[y*w.w+x]):w.visionBlocked(x,y)}:w;
    const observer=drivenCar?{x:me.x,y:me.y,angle:drivenCar.angle}:{x:me.x,y:me.y,face:me.f};
    const visible=(x,y)=>!this.settings.hard || animalCanSee(visionWorld,observer,x,y);
    if(this.settings.hard){
      ctx.beginPath();
      const lx=Math.max(0,Math.floor(cx/TS)-1), ly=Math.max(0,Math.floor(cy/TS)-1);
      const hx=Math.min(w.w-1,Math.ceil((cx+viewW)/TS)), hy=Math.min(w.h-1,Math.ceil((cy+viewH)/TS));
      for(let y=ly;y<=hy;y++)for(let x=lx;x<=hx;x++){
        if((Math.floor(me.x)===x&&Math.floor(me.y)===y)||visible(x+.5,y+.5))ctx.rect(x*TS,y*TS,TS,TS);
      }
      ctx.clip();
      players=players.filter(p=>p.id===me.id||visible(p.x,p.y));
      staff=staff.filter(s=>visible(s.x,s.y));
      npcs=npcs.filter(n=>visible(n.x,n.y));
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.map, 0, 0,w.w*TS,w.h*TS);

    const x0 = Math.max(0, Math.floor(cx / TS) - 1), y0 = Math.max(0, Math.floor(cy / TS) - 1);
    const x1 = Math.min(w.w - 1, Math.ceil((cx + viewW) / TS) + 1), y1 = Math.min(w.h - 1, Math.ceil((cy + viewH) / TS) + 1);
    // water shimmer
    if (!this.settings.reducedMotion) {
      const ph = now / 600;
      ctx.fillStyle = 'rgba(200,230,255,0.25)';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const t = w.tiles[y * w.w + x];
        if (t === T.WATER || t === T.POND) { const o = Math.floor((Math.sin(ph + x * 1.7 + y) + 1) * 5); ctx.fillRect(x * TS + o + 2, y * TS + 6 + ((x + y) % 2) * 4, 3, 1); }
      }
    }
    const inView = (x, y, m = 2) => x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m;

    // plates
    w.defs.plates.forEach((p, i) => {
      const down = snap.pd[i];
      ctx.fillStyle = down ? '#4a7a3a' : '#7a6a4a'; ctx.fillRect(p.x * TS + 2, p.y * TS + 2, 12, 12);
      ctx.fillStyle = down ? '#8ae06a' : '#c8a060'; ctx.fillRect(p.x * TS + 4, p.y * TS + (down ? 5 : 4), 8, 7);
      if (p.heavy) { ctx.fillStyle = '#2a1a0a'; ctx.fillRect(p.x * TS + 6, p.y * TS + 6, 4, 1); ctx.fillRect(p.x * TS + 7, p.y * TS + 7, 2, 3); }
    });
    // gates
    w.defs.gates.forEach((g, i) => this._drawGate(ctx, g, Number(snap.g[i])));
    // objects
    const keyActive = snap.obj.keys.active; const keyNeed = snap.obj.keys.need;
    w.defs.objects.forEach((o, i) => { if (inView(o.x, o.y)) this._drawObject(ctx, o, snap.os[i], { keyActive, keyNeed, now }); });
    // decor lamps / signs
    for (const d of w.zoo.decor) {
      if (!inView(d.x, d.y)) continue;
      if (d.kind === 'lamp') { ctx.fillStyle = '#2a2a32'; ctx.fillRect(d.x * TS + 7, d.y * TS - 6, 2, 20); ctx.fillStyle = '#fff3b0'; ctx.fillRect(d.x * TS + 5, d.y * TS - 9, 6, 4); }
      if (d.kind === 'sign') { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(d.x * TS + 7, d.y * TS + 6, 2, 9); ctx.fillStyle = '#c89a5a'; ctx.fillRect(d.x * TS + 1, d.y * TS + 1, 14, 7); ctx.fillStyle = '#7a5a2a'; ctx.fillRect(d.x * TS + 3, d.y * TS + 3, 10, 1); ctx.fillRect(d.x * TS + 3, d.y * TS + 5, 7, 1); }
    }
    // crates
    for (const [x, y] of crates) {
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x * TS + 1, y * TS + 1, 14, 14);
      ctx.fillStyle = '#b07a3a'; ctx.fillRect(x * TS + 2, y * TS + 2, 12, 12);
      ctx.fillStyle = '#6a4220'; ctx.fillRect(x * TS + 2, y * TS + 7, 12, 2); ctx.fillRect(x * TS + 7, y * TS + 2, 2, 12);
      ctx.fillStyle = '#f2c63a'; ctx.fillRect(x * TS + 3, y * TS + 3, 2, 2);
    }

    // vision cones
    const cfg = w.zoo.staff;
    this._cones = staff.map((s) => ({ s, poly: visionPolygon(w, s, cfg, 16) }));
    for (const { s, poly } of this._cones) {
      ctx.beginPath(); poly.forEach(([x, y], j) => (j ? ctx.lineTo(x * TS, y * TS) : ctx.moveTo(x * TS, y * TS))); ctx.closePath();
      ctx.fillStyle = s.s === 2 ? 'rgba(255,80,60,0.28)' : s.s === 1 ? 'rgba(255,170,60,0.26)' : 'rgba(255,240,150,0.18)';
      ctx.fill();
    }

    const car=snap.obj.parking?.car;
    if(car&&visible(car.x,car.y)){
      ctx.save();ctx.translate(car.x*TS,car.y*TS);ctx.rotate(car.angle);carArt(ctx,-32,-24,64,48,car.colorIndex||0);ctx.restore();
    }
    // characters sorted by y
    const ents = [];
    for (const n of npcs) ents.push({ y: n.y, draw: () => this._drawAnimal(ctx, n.a, n.x, n.y, n.f || 'down', n.mv, 0, now, { npc: true, state: n.s }) });
    for (const p of players) {
      if (p.car || (p.s & PF.UNDER)) continue;
      ents.push({ y: p.y, draw: () => this._drawPlayer(ctx, p, now) });
    }
    for (const s of staff) ents.push({ y: s.y, draw: () => this._drawStaff(ctx, s, now) });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.draw();

    for(const d of snap.darts||[])if(visible(d.x,d.y)){
      ctx.strokeStyle='#c5ff6b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(d.x*TS,d.y*TS);ctx.lineTo((d.x-d.dx*.3)*TS,(d.y-d.dy*.3)*TS);ctx.stroke();
    }
    // particles
    for (const f of this.fx) {
      const a = 1 - f.t / f.life;
      if (f.kind === 'p') { ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.fillRect(Math.round(f.x * TS), Math.round(f.y * TS), 2, 2); ctx.globalAlpha = 1; }
      if (f.kind === 'ring') {
        let fx = f.x, fy = f.y;
        if (f.pid) { const p = players.find((q) => q.id === f.pid); if (!p) continue; fx = p.x; fy = p.y; }
        ctx.strokeStyle = f.color; ctx.globalAlpha = a * 0.8; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(fx * TS, fy * TS, (f.t / f.life) * f.r * TS, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (f.kind === 'spark') { ctx.fillStyle = `rgba(255,240,140,${a})`; const r = 2 + f.t * 10; ctx.fillRect(f.x * TS - r, f.y * TS - 0.5, r * 2, 1); ctx.fillRect(f.x * TS - 0.5, f.y * TS - r, 1, r * 2); }
    }

    // lighting
    this._drawLighting(players, staff, toS, now);

    if(car&&visible(car.x,car.y)&&(car.lightsUntil>snap.time||car.alarmUntil>snap.time)&&Math.floor(now/220)%2===0){
      ctx.setTransform(S,0,0,S,-cx*S,-cy*S);ctx.save();ctx.translate(car.x*TS,car.y*TS);ctx.rotate(car.angle);
      ctx.fillStyle='rgba(255,237,153,.25)';ctx.beginPath();ctx.moveTo(26,-12);ctx.lineTo(77,-23);ctx.lineTo(77,23);ctx.lineTo(26,12);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff5b2';ctx.fillRect(26,-13,6,7);ctx.fillRect(26,6,6,7);ctx.fillStyle='#ff584a';ctx.fillRect(-31,-12,4,6);ctx.fillRect(-31,6,4,6);ctx.restore();
    }
    // screen-space labels
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fs = Math.max(11, Math.round(5.5 * S));
    ctx.font = `bold ${fs}px "Trebuchet MS", Verdana, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const label = (text, x, y, color = '#fff', bg = 'rgba(10,14,30,0.75)') => {
      const m = ctx.measureText(text); const pw = m.width + fs * 0.6, ph = fs * 1.25;
      ctx.fillStyle = bg; ctx.fillRect(Math.round(x - pw / 2), Math.round(y - ph), Math.round(pw), Math.round(ph));
      ctx.fillStyle = color; ctx.fillText(text, Math.round(x), Math.round(y - fs * 0.12));
    };
    // signs near the player
    for (const d of w.zoo.decor) {
      if (d.kind !== 'sign' || !visible(d.x+.5,d.y+.5)) continue;
      const dd = Math.hypot(d.x + 0.5 - me.x, d.y + 0.5 - me.y);
      if (dd > 5) continue;
      const [sx, sy] = toS(d.x + 0.5, d.y);
      label(d.text, sx, sy - 2 * S, '#ffe9b0');
    }
    for(const o of w.defs.objects){
      if(!['supplies','escapeBuild','escapeDig'].includes(o.kind)||Math.hypot(o.x+.5-me.x,o.y+.5-me.y)>3)continue;
      const [sx,sy]=toS(o.x+.5,o.y);
      label(o.kind==='supplies'?'Salvage · hold E':o.kind==='escapeBuild'?'Ramp site · hold E':'Soil site · hold E',sx,sy-3*S,'#ffe9b0');
    }
    for(const passage of w.defs.objects.filter(o=>o.kind==='fusePassage')){
      if(Math.hypot(passage.x+.5-me.x,passage.y+.5-me.y)>7||!visible(passage.x+.5,passage.y+.5))continue;
      const [sx,sy]=toS(passage.x+.5,passage.y);label(passage.label,sx,sy-3*S,'#ffe29a');
    }
    for(const bay of w.defs.bays){
      const entrance=w.zoo.bays[bay.index].entrance;
      if(Math.hypot(entrance[0]+.5-me.x,entrance[1]+.5-me.y)>11||!visible(entrance[0]+.5,entrance[1]+.5))continue;
      const mine=snap.obj.power.parts.some(p=>p.pid===me.id&&p.bay===bay.index+1),[sx,sy]=toS(entrance[0]+.5,entrance[1]+.5);
      label(bay.used?`FUSE ${bay.index+1}${mine?' · YOURS':''}`:`Unused bay ${bay.index+1}`,sx,sy, bay.used?'#ffe29a':'#98a59f');
    }
    for (const p of players) {
      if (p.car || (p.s & PF.UNDER)) continue;
      if(this.settings.hard && p.id===me.id)continue;
      const [sx, sy] = toS(p.x, p.y);
      const top = sy - 18 * S;
      const mine = p.id === w.myId;
      let tag = p.n;
      if (p.s & PF.CAUGHT) tag += ' — caught!';
      else if (p.s & PF.HIDDEN) tag += ' (hidden)';
      else if (p.s & PF.SHELL) tag += ' (shell)';
      else if (!p.con) tag += ' (offline)';
      label(tag, sx, top, mine ? '#ffe36a' : '#ffffff');
      if(p.mu)label('MUZZLED',sx,top-fs*1.35,'#ffb796');
      if (p.c&&!this.settings.compactHUD) label(p.c === 'wood' ? 'carrying log' : 'carrying fuse', sx, top - fs * 1.35, '#ffd27a');
      if (mine&&!this.settings.compactHUD) label(this.world.zoo.id==='parking'?`Car keys: ${p.ck||0}`:`Cage keys: ${p.ck || 0} · Bundles: ${p.supplies || 0}/2`, sx, top - fs * 2.7, '#ffe36a');
    }
    for (const b of this.bubbles) {
      const p = players.find((q) => q.id === b.pid); if (!p) continue;
      const [sx, sy] = toS(p.x, p.y);
      label('“' + b.text + '”', sx, sy - 18 * S - fs * 2.8, '#1a1a2a', 'rgba(255,255,255,0.92)');
    }
    for (const s of staff) {
      const [sx, sy] = toS(s.x, s.y);
      if (s.s === 2) label('!', sx, sy - 16 * S, '#fff', '#d8342a');
      else if (s.s === 5) label('Gotcha!', sx, sy - 16 * S, '#fff', '#8a2a8a');
      else if(s.s===6)label('Zzz',sx,sy-10*S,'#b8e7ff');
      else if (s.ar) label('ALERT', sx, sy - 16 * S, '#1a1a1a', '#ffad48');
      else if (s.al > 0.05 || s.s === 1 || s.s === 3) {
        const icon = s.s === 3 ? '?' : '?';
        label(icon + ' ' + Math.round(s.al * 100) + '%', sx, sy - 16 * S, '#1a1a1a', s.al > 0.6 ? '#ff9a3a' : '#ffd23a');
      }
    }
    for (const f of this.fx) {
      if (f.kind !== 'text') continue;
      const [sx, sy] = toS(f.x, f.y - f.t * 0.6);
      ctx.globalAlpha = 1 - f.t / f.life; label(f.text, sx, sy, f.color); ctx.globalAlpha = 1;
    }
    // hold progress for me
    const pm = snap.me;
    if (pm && pm.hold && pm.hold.p >= 0) {
      const meP = players.find((p) => p.id === w.myId);
      if (meP) {
        const [sx, sy] = toS(meP.x, meP.y);
        const r = 7 * S;
        ctx.lineWidth = Math.max(3, S * 1.3);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(sx, sy - 8 * S, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#7aff8a'; ctx.beginPath(); ctx.arc(sx, sy - 8 * S, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pm.hold.p); ctx.stroke();
      }
    }
    ctx.restore();
    if(this.settings.hard){
      ctx.setTransform(S,0,0,S,-cx*S,-cy*S);
      this._drawPlayer(ctx,me,now);
      ctx.setTransform(1,0,0,1,0,0);
      const [sx,sy]=toS(me.x,me.y);
      label(me.n+(me.mu?' · MUZZLED':''),sx,sy-18*S,'#ffe36a');
      if(!this.settings.compactHUD)label(this.world.zoo.id==='parking'?`Car keys: ${me.ck||0}`:`Cage keys: ${me.ck||0} · Bundles: ${me.supplies||0}/2`,sx,sy-18*S-fs*1.4,'#ffe36a');
    }
    ctx.setTransform(1,0,0,1,0,0);
  }

  _drawGate(ctx, g, state) {
    for (const [x, y] of g.tiles) {
      const ox = x * TS, oy = y * TS;
      if(IMAGES.objects){if(state===0)objectArt(ctx,0,ox-1,oy-5,18,22);else {ctx.fillStyle='#74bd88';ctx.fillRect(ox,oy,1,16);ctx.fillRect(ox+15,oy,1,16);}continue;}
      if (state === 0) {
        if (g.vis === 'bars') {
          ctx.fillStyle = '#2a2a32'; ctx.fillRect(ox, oy + 1, 16, 2); ctx.fillRect(ox, oy + 13, 16, 2);
          ctx.fillStyle = '#9aa0ac'; for (let i = 1; i < 16; i += 3) ctx.fillRect(ox + i, oy, 2, 16);
        } else {
          ctx.fillStyle = g.kind === 'exit' ? '#3a2a5a' : '#5a3a20'; ctx.fillRect(ox, oy, 16, 16);
          ctx.fillStyle = g.kind === 'exit' ? '#6a5aa0' : '#8a5a30'; ctx.fillRect(ox + 1, oy + 1, 14, 14);
          ctx.fillStyle = g.kind === 'exit' ? '#c8b0ff' : '#3a2410'; ctx.fillRect(ox + 1, oy + 7, 14, 2);
          if (g.kind === 'timed') { ctx.fillStyle = '#f2c63a'; for (let i = 0; i < 16; i += 4) ctx.fillRect(ox + i, oy, 2, 2); }
        }
      } else {
        ctx.fillStyle = '#3a3a44'; ctx.fillRect(ox, oy, 2, 16); ctx.fillRect(ox + 14, oy, 2, 16);
        if (state === 2) { ctx.fillStyle = '#5f8a3a'; ctx.fillRect(ox + 4, oy, 8, 3); }
      }
    }
    // lock icon on first tile when closed
    if (state === 0) {
      const [x, y] = g.tiles[Math.floor(g.tiles.length / 2)];
      const ox = x * TS + 5, oy = y * TS + 5;
      ctx.fillStyle = '#f2c63a'; ctx.fillRect(ox, oy + 2, 6, 5); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(ox + 2, oy + 4, 2, 2);
      ctx.strokeStyle = '#f2c63a'; ctx.lineWidth = 1; ctx.strokeRect(ox + 1.5, oy - 0.5, 3, 3);
    }
  }

  _drawObject(ctx, o, state, ctxs) {
    const ox = o.x * TS, oy = o.y * TS;
    const sprite={lever:10,crank:9,logpile:1,cage:0,breaker:10,socket:13,can:4,supplies:14,escapeBuild:1,controlDoor:8}[o.kind];
    if(sprite!==undefined&&objectArt(ctx,sprite,ox-1,oy-4,18,20)){
      if(o.kind==='controlDoor'){ctx.fillStyle='#fff1ad';ctx.font='bold 5px sans-serif';ctx.textAlign='center';ctx.fillText(String.fromCharCode(65+o.index),ox+8,oy+4);}
      if(state){ctx.fillStyle='#8affae';ctx.fillRect(ox+12,oy+10,2,2);}return;
    }
    switch (o.kind) {
      case 'vehicle': break;
      case 'fusePassage': ctx.fillStyle='#172538';ctx.fillRect(ox,oy,16,16);for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#b9a96d':'#dbc78d';ctx.fillRect(ox+2+i*3,oy+11-i*3,12-i*3,3);}ctx.strokeStyle='#ffe29a';ctx.strokeRect(ox,oy,16,16);break;
      case 'controlDoor':
        ctx.fillStyle=state?'#182b29':'#745737';ctx.fillRect(ox+1,oy,14,16);ctx.strokeStyle='#bba56b';ctx.strokeRect(ox+1,oy,14,16);ctx.fillStyle='#ffe4a0';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText(String.fromCharCode(65+o.index),ox+8,oy+10);break;
      case 'supplies':
        ctx.fillStyle=state?'#443c35':'#89542e';ctx.fillRect(ox+1,oy+6,14,8);
        ctx.fillStyle=state?'#a18c69':'#e4b773';ctx.fillRect(ox,oy+(state?0:4),16,3);
        ctx.fillStyle='#c6d6d0';ctx.fillRect(ox+5,oy,2,7);break;
      case 'escapeBuild':
        ctx.fillStyle=state?'#c49757':'#8d774e';
        for(let i=0;i<(state?4:1);i++)ctx.fillRect(ox+i*3,oy+12-i*3,15-i*3,3);
        ctx.strokeStyle='#ffe36a';ctx.strokeRect(ox,oy,16,16);break;
      case 'escapeDig':
        ctx.fillStyle=state?'#25221b':'#80603c';ctx.fillRect(ox+2,oy+6,12,8);
        ctx.fillStyle='#d2ab70';ctx.fillRect(ox+10,oy+1,2,10);break;
      case 'lever': {
        if (o.keeper) {
          ctx.fillStyle = '#4a4a52'; ctx.fillRect(ox+2,oy+4,12,12);
          ctx.strokeStyle = state ? '#78dc89' : '#f2c63a'; ctx.lineWidth=2;
          ctx.strokeRect(ox+5,oy+1,6,7);
          ctx.fillStyle = state ? '#78dc89' : '#f2c63a';ctx.fillRect(ox+4,oy+7,8,7);
          ctx.fillStyle='#24242b';ctx.fillRect(ox+7,oy+9,2,4);
          break;
        }
        const on = state === 1;
        if (o.reach === 'high') { ctx.fillStyle = '#3a3a44'; ctx.fillRect(ox + 3, oy - 6, 10, 10); ctx.fillStyle = '#f2c63a'; ctx.fillRect(ox + 6, oy - 10, 4, 3); }
        else if (o.reach === 'water') { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(ox + 6, oy + 4, 4, 12); ctx.fillStyle = '#3a3a44'; ctx.fillRect(ox + 3, oy + 1, 10, 7); }
        else { ctx.fillStyle = '#4a4a52'; ctx.fillRect(ox + 4, oy + 6, 8, 9); ctx.fillStyle = '#2a2a32'; ctx.fillRect(ox + 3, oy + 14, 10, 2); }
        const hy = o.reach === 'high' ? oy - 4 : oy + (o.reach === 'water' ? 2 : 7);
        ctx.fillStyle = '#c8c8d0'; ctx.fillRect(ox + 7, on ? hy + 1 : hy - 4, 2, 5);
        ctx.fillStyle = on ? '#6aff7a' : '#ff5a4a'; ctx.fillRect(ox + 7, on ? hy + 5 : hy - 6, 2, 2);
        if (o.keeper) { ctx.fillStyle = '#f2c63a'; ctx.fillRect(ox + 5, oy + 10, 6, 2); }
        break;
      }
      case 'crank': ctx.fillStyle = '#4a4a52'; ctx.fillRect(ox + 2, oy + 2, 12, 12); ctx.strokeStyle = '#d0d0d8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox + 8, oy + 8, 4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#f2c63a'; ctx.fillRect(ox + 11, oy + 7, 3, 2); break;
      case 'logpile': for (let i = 0; i < 3; i++) { ctx.fillStyle = '#7a4a24'; ctx.fillRect(ox + 1, oy + 3 + i * 4, 14, 4); ctx.fillStyle = '#c8905a'; ctx.fillRect(ox + 1, oy + 4 + i * 4, 3, 2); } break;
      case 'cage': {
        ctx.fillStyle = '#3a3a44'; ctx.fillRect(ox + 1, oy + 1, 14, 14);
        if (state !== 2) { ctx.fillStyle = '#ffd23a'; ctx.fillRect(ox + 6, oy + 4, 4, 8); ctx.fillStyle = '#a88a1a'; ctx.fillRect(ox + 6, oy + 7, 4, 1); }
        ctx.fillStyle = '#9aa0ac'; for (let i = 2; i < 15; i += 3) ctx.fillRect(ox + i, oy + 1, 1, 14);
        if (state === 0) { ctx.fillStyle = '#ff5a4a'; ctx.fillRect(ox + 10, oy + 10, 4, 4); }
        if (state === 1) { ctx.fillStyle = '#6aff7a'; ctx.fillRect(ox + 10, oy + 10, 4, 4); }
        break;
      }
      case 'breaker': ctx.fillStyle = '#5a6068'; ctx.fillRect(ox + 2, oy + 1, 12, 14); ctx.fillStyle = '#2a2e34'; ctx.fillRect(ox + 5, oy + 4, 6, 8); ctx.fillStyle = state ? '#6aff7a' : '#ff5a4a'; ctx.fillRect(ox + 6, state ? oy + 9 : oy + 5, 4, 2); break;
      case 'socket': ctx.fillStyle = '#2a2e34'; ctx.fillRect(ox + 3, oy + 1, 10, 14); ctx.fillStyle = state ? '#ffe36a' : '#4a4e56'; ctx.fillRect(ox + 6, oy + 4, 4, 8); if (state) { ctx.fillStyle = 'rgba(255,240,120,0.5)'; ctx.fillRect(ox + 1, oy, 14, 16); } break;
      case 'key': {
        const used = o.index < ctxs.keyNeed;
        ctx.fillStyle = used ? '#6a5a8a' : '#3a3a40'; ctx.fillRect(ox + 2, oy + 6, 12, 10);
        ctx.fillStyle = !used ? '#555' : state === 2 ? '#7aff8a' : state === 1 ? '#ffe36a' : ctxs.keyActive ? '#f2c63a' : '#8a8a8a';
        ctx.fillRect(ox + 6, oy + 1, 4, 4); ctx.fillRect(ox + 7, oy + 4, 2, 6);
        if (state === 1) { ctx.fillStyle = 'rgba(255,240,120,0.35)'; ctx.fillRect(ox - 2, oy - 2, 20, 20); }
        break;
      }
      case 'can': ctx.fillStyle = '#6a7a84'; ctx.fillRect(ox + 3, oy + 3, 10, 12); ctx.fillStyle = '#8a9aa4'; ctx.fillRect(ox + 2, oy + 2, 12, 3); ctx.fillStyle = '#4a5a64'; ctx.fillRect(ox + 5, oy + 6, 1, 8); ctx.fillRect(ox + 9, oy + 6, 1, 8); break;
    }
  }

  _sprite(id, face, moving, now, action='walk') {
    const set = SPRITES[id];
    const direction=face==='left'?'l':'r',frames=(set[action]||set)[direction];
    if((!moving&&action!=='bite')||this.settings.reducedMotion)return set.idle?.[direction]||frames[0];
    const interval=action==='bite'?100:action==='run'?(id==='tortoise'?150:90):id==='tortoise'?200:id==='staff'?115:140;
    return frames[Math.floor(now/interval)%frames.length];
  }

  _drawAnimal(ctx, animal, x, y, face, moving, wobble, now, opts = {}) {
    const img = this._sprite(animal, face, moving, now,opts.action);
    const bob = !moving && !this.settings.reducedMotion ? (Math.floor(now / 500 + x) % 2) : 0;
    const iw=IMAGES.actors?24:16,ih=iw;
    const dx = Math.round(x * TS - iw / 2), dy = Math.round(y * TS - ih + 6 - bob);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(x * TS - 5), Math.round(y * TS + 4), 10, 2);
    if (wobble) { ctx.save(); ctx.translate(x * TS, y * TS + 6); ctx.rotate(Math.sin(now / 90) * 0.25 * wobble); ctx.drawImage(img, -iw/2, -ih,iw,ih); ctx.restore(); }
    else ctx.drawImage(img, dx, dy,iw,ih);
    if (opts.npc && opts.state === 'free') { ctx.fillStyle = '#ffe36a'; ctx.fillRect(Math.round(x * TS) - 1, dy - 4, 2, 2); }
  }

  _drawPlayer(ctx, p, now) {
    let id = p.a;
    if (p.s & PF.SHELL) id = 'shell';
    if (p.a === 'penguin' && (p.s & PF.SLIDE)) id = 'penguinSlide';
    const face = p.f === 'left' ? 'left' : p.f === 'right' ? 'right' : (this._lastFace?.[p.id] || 'right');
    this._lastFace = this._lastFace || {}; if (p.f === 'left' || p.f === 'right') this._lastFace[p.id] = p.f;
    let y = p.y;
    if (p.s & PF.HOP) y -= Math.abs(Math.sin(now / 120)) * 0.5;
    const blink = (p.s & PF.GRACE) && Math.floor(now / 150) % 2 === 0;
    ctx.globalAlpha = (p.s & PF.HIDDEN) ? 0.55 : blink ? 0.4 : !p.con ? 0.45 : 1;
    // ring marker under each player (colour per animal)
    ctx.strokeStyle = ANIMALS[p.a].color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(p.x * TS, p.y * TS + 5, 7, 3, 0, 0, Math.PI * 2); ctx.stroke();
    this._drawAnimal(ctx, id, p.x, y, face, p.mv || (p.s & PF.SPRINT), (p.s & PF.WOBBLE) ? Math.min(1, p.wb * 1.5) : 0, now,{action:p.ba?'bite':p.mv?'run':'walk'});
    ctx.globalAlpha = 1;
    if(p.mu&&!objectArt(ctx,15,Math.round(p.x*TS+(face==='left'?-10:0)),Math.round(y*TS-7),10,9)){ctx.fillStyle='#aeb8b9';ctx.fillRect(p.x*TS+(face==='left'?-7:1),y*TS-5,6,4);}
    if (p.s & PF.HIDDEN) { ctx.fillStyle = 'rgba(46,122,58,0.7)'; ctx.fillRect(Math.round(p.x * TS - 8), Math.round(p.y * TS - 2), 16, 8); }
    if (p.s & PF.CAUGHT) { ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 0.5; for (let i = -8; i <= 8; i += 3) { ctx.beginPath(); ctx.moveTo(p.x * TS + i, p.y * TS - 12); ctx.lineTo(p.x * TS + i + 4, p.y * TS + 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x * TS - 8, p.y * TS - 10 + i + 8); ctx.lineTo(p.x * TS + 8, p.y * TS - 12 + i + 8); ctx.stroke(); } }
    if ((p.s & PF.SPRINT) && !this.settings.reducedMotion) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(p.x * TS - 12 - i * 3), Math.round(p.y * TS - 6 + i * 3), 6, 1); }
    if (p.c) { ctx.fillStyle = p.c === 'wood' ? '#9a6a3a' : '#ffd23a'; ctx.fillRect(Math.round(p.x * TS + 4), Math.round(p.y * TS - 14), 5, 4); }
    if (p.hk === 'chew' || p.hk === 'dig') { if (Math.floor(now / 100) % 2) { ctx.fillStyle = p.hk === 'chew' ? '#c8904e' : '#8a6034'; ctx.fillRect(Math.round(p.x * TS + (Math.random() * 12 - 6)), Math.round(p.y * TS - 2), 2, 2); } }
  }

  _drawStaff(ctx, s, now) {
    if(s.s===6){const image=SPRITES.staffDown.r[0];ctx.drawImage(image,s.x*TS-16,s.y*TS-14,32,22);return;}
    this._drawAnimal(ctx,'staff',s.x,s.y,Math.cos(s.d)<0?'left':'right',s.mv,0,now,{action:s.s===2?'run':'walk'});
  }

  _drawLighting(players, staff, toS, now) {
    if(this.world.zoo.daylight)return;
    const L = this.lctx, lw = this.light.width, lh = this.light.height;
    const S = this.scale, f = 0.5; // light canvas is half resolution
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, lw, lh);
    L.fillStyle = 'rgba(10,14,44,0.58)';
    L.fillRect(0, 0, lw, lh);
    L.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, strength = 1) => {
      const [sx, sy] = toS(x, y);
      const R = r * TS * S * f;
      const gx = sx * f, gy = sy * f;
      if (gx + R < 0 || gy + R < 0 || gx - R > lw || gy - R > lh) return;
      const gr = L.createRadialGradient(gx, gy, 0, gx, gy, R);
      gr.addColorStop(0, `rgba(0,0,0,${strength})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = gr; L.beginPath(); L.arc(gx, gy, R, 0, Math.PI * 2); L.fill();
    };
    for (const d of this.world.zoo.decor) if (d.kind === 'lamp') hole(d.x + 0.5, d.y - 0.3, 3.5, 0.8);
    for (const p of players) hole(p.x, p.y, p.id === this.world.myId ? 4.5 : 3, 0.85);
    hole(78.5, 28.5, 4, 0.7);
    for (const { poly } of this._cones || []) {
      L.fillStyle = 'rgba(0,0,0,0.75)';
      L.beginPath(); poly.forEach(([x, y], j) => { const [sx, sy] = toS(x, y); if (j) L.lineTo(sx * f, sy * f); else L.moveTo(sx * f, sy * f); }); L.closePath(); L.fill();
    }
    void staff; void now;
    L.globalCompositeOperation = 'source-over';
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.light, 0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = false;
  }
}
