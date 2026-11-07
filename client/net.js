// Links between the client and a Room. OnlineLink talks to the server over WebSockets;
// SoloLink runs the very same Room + Game rules locally in the browser.

import { Room } from './shared/room.js';
import { TICK } from './shared/game.js';

export class SoloLink {
  constructor(handler) {
    this.handler = handler;
    this.online = false;
    this.room = new Room({ code: 'SOLO', solo: true, send: (pid, msg) => this.handler(JSON.parse(JSON.stringify(msg))) , options: soloOptions() });
    this.pid = null;
    this._last = performance.now(); this._acc = 0;
    this.timer = setInterval(() => this._tick(), 1000 * TICK / 2);
  }
  _tick() {
    const now = performance.now();
    this._acc += Math.min(0.25, (now - this._last) / 1000);
    this._last = now;
    while (this._acc >= TICK) { this._acc -= TICK; this.room.tick(TICK); }
  }
  create(name) { const r = this.room.addPlayer(name); this.pid = r.player.id; }
  send(msg) { if (this.pid) this.room.handle(this.pid, msg); }
  close() { clearInterval(this.timer); }
}

function soloOptions() {
  const q = new URLSearchParams(location.search);
  return q.get('nostaff') === '1' ? { staff: false } : {};
}

export class OnlineLink {
  constructor(handler, status) {
    this.handler = handler;
    this.status = status;  // (state, info) -> UI: 'connecting' | 'open' | 'reconnecting' | 'lost'
    this.online = true;
    this.ws = null;
    this.queue = [];
    this.code = null; this.token = null;
    this.closedByUser = false;
    this.retryUntil = 0;
    this.retryTimer = null;
  }

  url() {
    const q = new URLSearchParams(location.search);
    if (q.get('server')) return q.get('server');
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = location.pathname.replace(/[^/]*$/, '');
    return `${proto}//${location.host}${base}ws`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      let settled = false;
      this.status('connecting');
      let ws;
      try { ws = new WebSocket(this.url()); } catch (e) { reject(e); return; }
      this.ws = ws;
      const to = setTimeout(() => { if (!settled) { settled = true; try { ws.close(); } catch { /* */ } reject(new Error('timeout')); } }, 8000);
      ws.onopen = () => {
        clearTimeout(to);
        settled = true;
        this.status('open');
        for (const m of this.queue) ws.send(JSON.stringify(m));
        this.queue = [];
        resolve();
      };
      ws.onmessage = (ev) => {
        let msg; try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.t === 'joined') { this.code = msg.code; this.token = msg.token; this._saveSession(); }
        if (msg.t === 'error' && msg.code === 'expired') this._clearSession();
        this.handler(msg);
      };
      ws.onclose = () => {
        clearTimeout(to);
        if (!settled) { settled = true; reject(new Error('closed')); return; }
        if (this.ws !== ws) return;
        if (this.closedByUser) return;
        if (this.token) this._reconnectLoop();
        else this.status('lost');
      };
      ws.onerror = () => { /* handled by close */ };
    });
  }

  _reconnectLoop() {
    if (!this.retryUntil) this.retryUntil = Date.now() + 40000;
    const left = Math.max(0, Math.ceil((this.retryUntil - Date.now()) / 1000));
    if (left <= 0) { this.retryUntil = 0; this.status('lost'); return; }
    this.status('reconnecting', { left });
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.retryUntil = 0;
        this.ws.send(JSON.stringify({ t: 'resume', code: this.code, token: this.token }));
      } catch {
        this._reconnectLoop();
      }
    }, 1500);
  }

  send(msg) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
    else if (msg.t !== 'in') this.queue.push(msg);
  }

  async create(name) { await this.connect(); this.send({ t: 'create', name }); }
  async join(code, name) { await this.connect(); this.send({ t: 'join', code, name }); }
  async resume(code, token) { this.code = code; this.token = token; await this.connect(); this.send({ t: 'resume', code, token }); }

  /** Test hook: simulate a dropped connection. */
  dropForTest() { if (this.ws) this.ws.close(); }

  close() {
    this.closedByUser = true;
    clearTimeout(this.retryTimer);
    try { this.send({ t: 'leave' }); } catch { /* */ }
    this._clearSession();
    if (this.ws) try { this.ws.close(); } catch { /* */ }
  }

  _saveSession() { try { sessionStorage.setItem('bb-session', JSON.stringify({ code: this.code, token: this.token })); } catch { /* */ } }
  _clearSession() { try { sessionStorage.removeItem('bb-session'); } catch { /* */ } }
  static savedSession() { try { return JSON.parse(sessionStorage.getItem('bb-session') || 'null'); } catch { return null; } }
}
