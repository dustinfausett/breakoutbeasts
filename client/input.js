// Keyboard and touch input. Every control is released on blur, visibility change,
// pointer cancel or lost capture so nothing stays stuck "pressed".

export class Input {
  constructor() {
    this.keys = new Set();
    this.biteQueued=false;this.actionQueued={e:false,sp:false};
    this.touch = { mx: 0, my: 0, sp: false, e: false, b:false };
    this.enabled = false;
    this.onKey = null; // (code, event) -> handled?
    window.addEventListener('keydown', (e) => {
      if (this.onKey && this.onKey(e.code, e)) { e.preventDefault(); return; }
      if (!this.enabled) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyB'].includes(e.code)) e.preventDefault();
      if(e.code==='KeyB'&&!e.repeat)this.biteQueued=true;
      if(!e.repeat&&e.code==='KeyE')this.actionQueued.e=true;
      if(!e.repeat&&e.code==='Space')this.actionQueued.sp=true;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    const clear = () => this.releaseAll();
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    window.addEventListener('pagehide', clear);
  }

  releaseAll() {
    this.keys.clear();
    this.biteQueued=false;this.actionQueued={e:false,sp:false};
    this.touch = { mx: 0, my: 0, sp: false, e: false, b:false };
    if (this.stick) this.stick.reset();
    document.querySelectorAll('.tbtn.down').forEach((b) => b.classList.remove('down'));
  }

  state() {
    const k = this.keys;
    let mx = 0, my = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) my -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) my += 1;
    if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
    const t = this.touch;
    if (Math.hypot(t.mx, t.my) > 0.15) { mx = t.mx; my = t.my; }
    const bite=k.has('KeyB')||t.b||this.biteQueued;this.biteQueued=false;
    const e=k.has('KeyE')||t.e||this.actionQueued.e,sp=k.has('Space')||t.sp||this.actionQueued.sp;this.actionQueued={e:false,sp:false};
    return {mx,my,sp,e,b:bite};
  }

  attachTouch(root) {
    const stickEl = root.querySelector('#stick'), knob = root.querySelector('#knob');
    let active = null, cx = 0, cy = 0, R = 50;
    const reset = () => { active = null; this.touch.mx = 0; this.touch.my = 0; knob.style.transform = 'translate(-50%,-50%)'; };
    this.stick = { reset };
    stickEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const r = stickEl.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2;
      active = e.pointerId; try { stickEl.setPointerCapture(e.pointerId); } catch { /* synthetic or already-ended pointer */ }
      move(e);
    });
    const move = (e) => {
      if (e.pointerId !== active) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const nx = dx / R, ny = dy / R;
      this.touch.mx = Math.abs(nx) < 0.2 ? 0 : nx; this.touch.my = Math.abs(ny) < 0.2 ? 0 : ny;
    };
    stickEl.addEventListener('pointermove', move);
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) stickEl.addEventListener(ev, (e) => { if (e.pointerId === active) reset(); });
    const btn = (id, key) => {
      const b = root.querySelector(id);
      const up = () => { this.touch[key] = false; b.classList.remove('down'); };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* ignore */ } this.touch[key] = true; if(key==='b')this.biteQueued=true;else this.actionQueued[key]=true; b.classList.add('down'); });
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, up);
      b.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();this.touch[key]=true;if(key==='b')this.biteQueued=true;else this.actionQueued[key]=true;}});
      b.addEventListener('keyup',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();up();}});
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    btn('#tbtn-e', 'e');
    btn('#tbtn-b','b');
    btn('#tbtn-sp', 'sp');
  }
}
