// Transport-agnostic room: lobby, animal picks, readiness, mission lifecycle, reconnection.
// The Node server wraps it with WebSockets; solo play wraps it with a direct in-browser link.

import { CityGame } from './city-game.js';
import { ParkingGame } from './parking-game.js';
import { Game, TICK } from './game.js';
import { ANIMAL_IDS, ANIMALS } from './animals.js';

export const MAX_PLAYERS = 8;
export const GRACE_LOBBY = 20;   // seconds a disconnected player keeps their lobby slot
export const GRACE_PLAY = 45;    // seconds before the team automatically continues without them
export const EMOTES = ['Over here!', 'Help me!', 'Wait!', 'Go go go!', 'Keeper nearby!', 'Thanks!'];

let tokenCounter = 0;
function makeToken(rng) {
  tokenCounter++;
  return Array.from({ length: 4 }, () => Math.floor(rng() * 0xffffffff).toString(36)).join('') + tokenCounter.toString(36);
}

export function cleanName(name, fallback) {
  const s = String(name || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 14);
  return s || fallback;
}

export class Room {
  constructor({ code, send, solo = false, zooId = 'moonleaf', options = {}, rng = Math.random, onEmpty = null }) {
    this.code = code;
    this.sendFn = send;          // (pid, msg) => void
    this.solo = solo;
    this.zooId = zooId;
    this.options = options;      // passed to Game (e.g. { staff: false } for tests)
    this.rng = rng;
    this.onEmpty = onEmpty;
    this.players = new Map();
    this.hostId = null;
    this.phase = 'lobby';
    this.game = null;
    this.paused = false;
    this.queues = new Map();
    this.sent = new Map();       // pid -> { tv, dv }
    this.pid = 1;
    this.results = null;
    this.emptySince = null;
    this.maxPlayers = solo ? 1 : MAX_PLAYERS;
    this._pendingEvents = [];
  }

  send(pid, msg) { const p = this.players.get(pid); if (p && p.connected) this.sendFn(pid, msg); }
  broadcast(msg) { for (const p of this.players.values()) this.send(p.id, msg); }
  notice(text) { this.broadcast({ t: 'notice', text }); }

  addPlayer(name) {
    if (this.players.size >= this.maxPlayers) return { error: 'room_full', message: `This room is full (${this.maxPlayers}/${this.maxPlayers} players).` };
    if (this.phase !== 'lobby') return { error: 'in_progress', message: 'This mission has already started. Ask the host to return to the lobby, then join again.' };
    const id = 'p' + (this.pid++);
    const p = { id, name: cleanName(name, 'Player ' + (this.players.size + 1)), animal: null, ready: false, connected: true, token: makeToken(this.rng), joinedAt: this.pid, dcAt: 0, spectator: false };
    this.players.set(id, p);
    if (!this.hostId) this.hostId = id;
    this.emptySince = null;
    this.sendFn(id, { t: 'joined', code: this.code, you: id, token: p.token, solo: this.solo });
    this.broadcastLobby();
    return { player: p };
  }

  resume(token) {
    const p = [...this.players.values()].find((q) => q.token === token);
    if (!p) return { error: 'expired', message: 'Your spot in this room has expired.' };
    p.connected = true; p.dcAt = 0;
    this.emptySince = null;
    if (this.game) this.game.setConnected(p.id, true);
    this.sent.delete(p.id);
    this.sendFn(p.id, { t: 'joined', code: this.code, you: p.id, token: p.token, solo: this.solo, resumed: true });
    if (!this.hostId || !this.players.get(this.hostId)?.connected) this._migrateHost(p.id);
    this.broadcastLobby();
    if (this.game && this.phase !== 'lobby') this._sendStart(p.id);
    if (this.phase === 'complete' && this.results) this.send(p.id, { t: 'end', results: this.results });
    this.notice(`${p.name} reconnected.`);
    return { player: p };
  }

  disconnect(pid) {
    const p = this.players.get(pid);
    if (!p) return;
    p.connected = false; p.dcAt = 0;
    if (this.game) this.game.setConnected(pid, false);
    if (this.hostId === pid) this._migrateHost();
    this.broadcastLobby();
    this.notice(`${p.name} lost connection. Waiting for them to come back…`);
    this._checkEmpty();
  }

  leave(pid) {
    const p = this.players.get(pid);
    if (!p) return;
    this.players.delete(pid);
    this.queues.delete(pid);
    if (this.game && this.game.players.get(pid)?.active) this.game.removePlayer(pid);
    if (this.hostId === pid) this._migrateHost();
    this.broadcastLobby();
    this.notice(`${p.name} left the room.`);
    this._checkEmpty();
  }

  _checkEmpty() {
    if (![...this.players.values()].some((p) => p.connected)) { if (!this.emptySince) this.emptySince = 0; }
  }

  _migrateHost(prefer) {
    const old = this.hostId;
    const cands = [...this.players.values()].filter((p) => p.connected).sort((a, b) => a.joinedAt - b.joinedAt);
    const next = prefer ? this.players.get(prefer) : cands[0];
    this.hostId = next ? next.id : (this.players.size ? [...this.players.keys()][0] : null);
    if (this.hostId && this.hostId !== old && next) this.notice(`${next.name} is now the host.`);
  }

  lobbyState() {
    return {
      t: 'lobby', code: this.code, hostId: this.hostId, phase: this.phase, solo: this.solo, max: this.maxPlayers, zoo: this.zooId,
      players: [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => ({ id: p.id, name: p.name, animal: p.animal, ready: p.ready, connected: p.connected, host: p.id === this.hostId, spectator: p.spectator })),
    };
  }
  broadcastLobby() { this.broadcast(this.lobbyState()); }

  error(pid, code, message) { this.send(pid, { t: 'error', code, message }); }

  handle(pid, msg) {
    const p = this.players.get(pid);
    if (!p || !msg || typeof msg.t !== 'string') return;
    switch (msg.t) {
      case 'name': p.name = cleanName(msg.name, p.name); this.broadcastLobby(); break;
      case 'pick': {
        if (this.phase !== 'lobby') return;
        const a = msg.animal;
        if (a !== null && !ANIMAL_IDS.includes(a)) return this.error(pid, 'bad_animal', 'Unknown animal.');
        if (a && [...this.players.values()].some((q) => q.id !== pid && q.animal === a)) return this.error(pid, 'animal_taken', `${ANIMALS[a].name} is already taken by a teammate. Pick another animal.`);
        p.animal = a; p.ready = false;
        this.broadcastLobby();
        break;
      }
      case 'ready':
        if (this.phase !== 'lobby') return;
        if (!p.animal) return this.error(pid, 'no_animal', 'Choose an animal first.');
        p.ready = !!msg.ready; this.broadcastLobby(); break;
      case 'start': {
        if (pid !== this.hostId) return this.error(pid, 'not_host', 'Only the host can start the mission.');
        if (this.phase !== 'lobby') return;
        const list = [...this.players.values()];
        const missing = list.filter((q) => !q.animal);
        if (missing.length) return this.error(pid, 'not_ready', `Waiting for ${missing.map((q) => q.name).join(', ')} to choose an animal.`);
        const notReady = list.filter((q) => q.id !== this.hostId && !q.ready);
        if (notReady.length) return this.error(pid, 'not_ready', `Waiting for ${notReady.map((q) => q.name).join(', ')} to be ready.`);
        const offline = list.filter((q) => !q.connected);
        if (offline.length) return this.error(pid, 'not_ready', `Waiting for ${offline.map((q) => q.name).join(', ')} to reconnect.`);
        this.startMission(['zoo','control','parking','driving','city'].includes(msg.startAt)?msg.startAt:'zoo');
        break;
      }
      case 'continue': {
        if(pid!==this.hostId)return this.error(pid,'not_host','Only the host can continue the team to the parking lot.');
        if(this.phase!=='complete'||!['moonleaf','parking'].includes(this.game?.zooId))return;
        const remaining=[...this.players.values()].filter(p=>this.game.players.get(p.id)?.active&&!p.spectator);
        if(!remaining.length)return this.error(pid,'no_crew','Return to the lobby to choose a new crew.');
        if(remaining.some(p=>!p.connected))return this.error(pid,'waiting','Wait for your teammates to reconnect before continuing.');
        this.startMission(this.game.zooId==='parking'?'city':'parking');break;
      }
      case 'rescue': if(this.phase==='playing')this.game?.rescueAction?.(pid,msg);break;
      case 'city': if(this.phase==='playing')this.game?.cityAction?.(pid,msg);break;
      case 'vehicle': if(this.phase==='playing')this.game?.vehicleAction?.(pid,msg);break;
      case 'panel': this.game?.controlAction(pid,msg);break;
      case 'chat': {
        const now=Date.now();if(now-(p.lastChat||0)<100)return;p.lastChat=now;
        const text=String(msg.text||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,180);
        if(text&&this.game)this._pendingEvents.push({k:'chat',pid,name:p.name,text});
        break;
      }
      case 'in': {
        if (!this.game || this.phase !== 'playing') return;
        let q = this.queues.get(pid);
        if (!q) { q = []; this.queues.set(pid, q); }
        q.push({ mx: +msg.mx || 0, my: +msg.my || 0, sp: !!msg.sp, e: !!msg.e, b:!!msg.b, seq: +msg.s || 0 });
        while (q.length > 4) q.shift();
        break;
      }
      case 'emote': {
        if (!this.game) return;
        const i = msg.i | 0;
        if (i < 0 || i >= EMOTES.length) return;
        const now = Date.now();
        if (p.lastEmote && now - p.lastEmote < 800) return;
        p.lastEmote = now;
        this._pendingEvents.push({ k: 'emote', pid, name: p.name, text: EMOTES[i] });
        break;
      }
      case 'continueWithout': {
        if (!this.game || this.phase !== 'playing') return;
        const target = this.players.get(msg.pid);
        const gp = this.game.players.get(msg.pid);
        if (!target || !gp || !gp.active || target.connected) return;
        this._dropFromMission(target);
        break;
      }
      case 'pause':
        if (this.solo && this.phase === 'playing') { this.paused = !!msg.on; }
        break;
      case 'replay':
        if (pid !== this.hostId) return this.error(pid, 'not_host', 'Only the host can restart the mission.');
        if (this.phase === 'lobby') return;
        this.startMission(['parking','city'].includes(this.game?.zooId)?this.game.zooId:'zoo');
        break;
      case 'toLobby':
        if (pid !== this.hostId) return this.error(pid, 'not_host', 'Only the host can return everyone to the lobby.');
        this.toLobby();
        break;
      case 'leave': this.leave(pid); break;
      case 'ping': this.send(pid, { t: 'pong', c: msg.c }); break;
    }
  }

  _dropFromMission(target) {
    this.game.removePlayer(target.id);
    target.spectator = true;
    this.notice(`Continuing without ${target.name}. Their finished work is kept and remaining tasks were adjusted.`);
    this.broadcastLobby();
  }

  startMission(stage='zoo') {
    const checkpoint=stage;stage=stage==='control'?'zoo':stage==='driving'?'parking':stage;
    const continuing=(stage==='parking'&&this.game?.zooId==='moonleaf')||(stage==='city'&&this.game?.zooId==='parking');
    const carColor=this.game?.vehicle?.colorIndex;
    const eligible=continuing?new Set(this.game.activePlayers().map(p=>p.id)):null;
    for (const p of this.players.values()) { p.spectator = false; }
    const list = [...this.players.values()].filter((p) => p.animal && p.connected && (!eligible||eligible.has(p.id))).sort((a, b) => a.joinedAt - b.joinedAt);
    const seed = Math.floor(this.rng() * 1e9);
    this.game = new (stage==='city'?CityGame:stage==='parking'?ParkingGame:Game)({previousCarSlot:this.lastCarSlot,carColor:stage==='city'?carColor:null,zooId: this.zooId, players: list.map((p) => ({ id: p.id, name: p.name, animal: p.animal })), seed, options: this.options });
    if(checkpoint==='control'){
      const g=this.game;for(const part of g.parts)part.inserted=true;g.stats.rescued=g.requiredRescues;
      for(const o of g.objects)if(o.kind==='socket')o.state=1;
      for(const p of g.activePlayers()){const door=g.objects.find(o=>o.kind==='controlDoor'&&o.index===g.controlRoom.panels[p.id].doorIndex);p.escaped=true;p.x=door.stand[0]+.5;p.y=door.stand[1]+.5;p.safe=[p.x,p.y];p.grace=5;}
    }
    if(checkpoint==='driving'){
      const g=this.game,crew=g.activePlayers();if(crew[0]){crew[0].cageKeys=1;g.vehicleAction(crew[0].id,{op:'unlock'});}for(const p of crew){p.inVehicle=true;p.x=g.vehicle.x;p.y=g.vehicle.y;}
    }
    for (const p of this.players.values()) if (!list.includes(p)) p.spectator = true;
    if(stage==='parking')this.lastCarSlot=this.game.vehicle.slot;
    this.phase = 'playing';
    this.paused = false;
    this.results = null;
    this.queues.clear();
    this.sent.clear();
    this._pendingEvents = [];
    this.broadcastLobby();
    for (const p of this.players.values()) this._sendStart(p.id);
  }

  _sendStart(pid) {
    this.send(pid, { t: 'start', zoo: this.game.zooId, solo: this.solo, team: this.game.order.length });
    this.sent.delete(pid);
  }

  toLobby() {
    this.phase = 'lobby';
    this.game = null;
    this.results = null;
    for (const p of this.players.values()) { p.ready = false; p.spectator = false; if (!p.connected) p.dcAt = 0; }
    this.broadcastLobby();
  }

  /** Advance one tick: grace timers, simulation, snapshots. */
  tick(dt = TICK) {
    // grace timers
    for (const p of [...this.players.values()]) {
      if (p.connected) continue;
      p.dcAt += dt;
      const limit = this.phase === 'playing' ? GRACE_PLAY : GRACE_LOBBY;
      if (p.dcAt >= limit) {
        if (this.phase === 'playing' && this.game?.players.get(p.id)?.active) {
          this._dropFromMission(p);
          p.dcAt = -1e9; // keep slot as spectator until they come back or room ends
        } else if (this.phase !== 'playing') {
          this.players.delete(p.id);
          if (this.hostId === p.id) this._migrateHost();
          this.broadcastLobby();
        }
      }
    }
    if (this.emptySince !== null) {
      this.emptySince += dt;
      if (this.emptySince > GRACE_PLAY + 5 && this.onEmpty) this.onEmpty(this);
    }
    if (!this.game || this.phase !== 'playing' || this.paused) return;
    // inputs
    for (const [pid, q] of this.queues) {
      if (q.length) this.game.setInput(pid, q.shift());
    }
    this.game.step(dt);
    const events = this._pendingEvents.concat(this.game.drainEvents());
    this._pendingEvents = [];
    const snap = this.game.snapshot();
    const waiting = [...this.players.values()].filter((p) => !p.connected && this.game.players.get(p.id)?.active)
      .map((p) => ({ id: p.id, name: p.name, left: Math.max(0, Math.ceil(GRACE_PLAY - p.dcAt)) }));
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      const s = this.sent.get(p.id) || { tv: -1, dv: -1 };
      const msg = { t: 'snap', ...snap, me: this.game.personal(p.id), ev: events.filter((e) => e.k !== 'msg' || e.pid === p.id), waiting };
      if (s.tv !== this.game.tileVersion) { msg.tm = [...this.game.tileMods.entries()]; msg.tv = this.game.tileVersion; }
      if (s.dv !== this.game.defsVersion) { msg.defs = this.game.defs(); msg.dv = this.game.defsVersion; }
      this.sent.set(p.id, { tv: this.game.tileVersion, dv: this.game.defsVersion });
      this.sendFn(p.id, msg);
    }
    if (this.game.phase === 'complete') {
      this.phase = 'complete';
      this.results = {...this.game.results(),stage:this.game.zooId==='city'?'city':this.game.zooId==='parking'?'parking':'zoo',next:this.game.zooId==='moonleaf'?'parking':this.game.zooId==='parking'?'city':null};
      this.broadcast({ t: 'end', results: this.results });
      this.broadcastLobby();
    }
  }
}
