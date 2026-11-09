// Multiplayer over real WebSockets against the real server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createServer } from '../server/index.js';

let srv;
before(async () => { srv = await createServer({ port: 0, host: '127.0.0.1', roomOptions: { staff: false }, log: () => {} }); });
after(async () => { await srv.close(); });

class Client {
  constructor() { this.msgs = []; this.waiters = []; }
  open() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(`ws://127.0.0.1:${srv.port}/ws`);
      this.ws.on('open', res); this.ws.on('error', rej);
      this.ws.on('message', (d) => { const m = JSON.parse(d.toString()); this.msgs.push(m); this.waiters = this.waiters.filter((w) => !w(m)); });
    });
  }
  send(m) { this.ws.send(JSON.stringify(m)); }
  wait(pred, ms = 3000) {
    const found = this.msgs.find(pred);
    if (found) return Promise.resolve(found);
    return new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('timeout waiting')), ms);
      this.waiters.push((m) => { if (pred(m)) { clearTimeout(to); res(m); return true; } return false; });
    });
  }
  next(pred, ms) { this.msgs = []; return this.wait(pred, ms); }
  close() { this.ws.close(); }
}

async function makeRoom(n) {
  const host = new Client(); await host.open();
  host.send({ t: 'create', name: 'Host' });
  const joined = await host.wait((m) => m.t === 'joined');
  const clients = [host];
  for (let i = 1; i < n; i++) {
    const c = new Client(); await c.open();
    c.send({ t: 'join', code: joined.code, name: 'P' + i });
    await c.wait((m) => m.t === 'joined');
    clients.push(c);
  }
  return { code: joined.code, clients };
}

test('serves the client and health endpoint', async () => {
  const r = await fetch(`http://127.0.0.1:${srv.port}/`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Breakout Beasts!/);
  const h = await (await fetch(`http://127.0.0.1:${srv.port}/healthz`)).json();
  assert.equal(h.ok, true);
  const s = await fetch(`http://127.0.0.1:${srv.port}/shared/game.js`);
  assert.equal(s.status, 200);
  const bad = await fetch(`http://127.0.0.1:${srv.port}/..%2fpackage.json`);
  assert.notEqual(bad.status, 200);
});

test('create, join with code, lobby shows everyone; a ninth player is refused', async () => {
  const { code, clients } = await makeRoom(8);
  const lobby = await clients[0].wait((m) => m.t === 'lobby' && m.players.length === 8);
  assert.equal(lobby.players.length, 8);
  assert.equal(lobby.hostId, lobby.players[0].id);
  const fifth = new Client(); await fifth.open();
  fifth.send({ t: 'join', code, name: 'Five' });
  const err = await fifth.wait((m) => m.t === 'error');
  assert.equal(err.code, 'room_full');
  const missing = new Client(); await missing.open();
  missing.send({ t: 'join', code: 'ZZZZZ', name: 'X' });
  assert.equal((await missing.wait((m) => m.t === 'error')).code, 'not_found');
  [...clients, fifth, missing].forEach((c) => c.close());
});

test('two clients see the same authoritative world; movement is server-validated', async () => {
  const { clients: [a, b] } = await makeRoom(2);
  a.send({ t: 'pick', animal: 'zebra' });
  b.send({ t: 'pick', animal: 'zebra' });
  assert.equal((await b.wait((m) => m.t === 'error')).code, 'animal_taken');
  b.send({ t: 'pick', animal: 'penguin' });
  b.send({ t: 'ready', ready: true });
  await a.wait((m) => m.t === 'lobby' && m.players.every((p) => p.animal && (p.host || p.ready)));
  a.send({ t: 'start' });
  await a.wait((m) => m.t === 'start'); await b.wait((m) => m.t === 'start');
  // A walks (with an illegal oversized input), B idles
  for (let i = 0; i < 20; i++) { a.send({ t: 'in', s: i + 1, mx: 9, my: 0, sp: 0, e: 0 }); await new Promise((r) => setTimeout(r, 50)); }
  const sa = await a.next((m) => m.t === 'snap');
  const sb = await b.wait((m) => m.t === 'snap' && m.tick === sa.tick, 2000).catch(() => null) || await b.next((m) => m.t === 'snap');
  const za = sa.pl.find((p) => p.a === 'zebra');
  assert.ok(za.x > 72.5, 'zebra moved');
  assert.ok(za.x < 72.5 + 4.6 * 1.2 + 0.1, 'speed limited by the server');
  // both clients agree on everything shared at the same tick
  const sb2 = b.msgs.find((m) => m.t === 'snap' && m.tick === sa.tick) || sb;
  if (sb2.tick === sa.tick) {
    assert.deepEqual(sb2.pl, sa.pl);
    assert.equal(sb2.g, sa.g);
    assert.deepEqual(sb2.obj, sa.obj);
  }
  // personal prompt data is per player
  assert.notEqual(sa.me.id, (sb2.me || {}).id);
  a.close(); b.close();
});

test('disconnect and resume within the grace period, others see the waiting state', async () => {
  const { code, clients: [a, b] } = await makeRoom(2);
  a.send({ t: 'pick', animal: 'beaver' });
  b.send({ t: 'pick', animal: 'flamingo' }); b.send({ t: 'ready', ready: true });
  await a.wait((m) => m.t === 'lobby' && m.players.every((p) => p.animal && (p.host || p.ready)));
  a.send({ t: 'start' });
  await b.wait((m) => m.t === 'start');
  const token = b.msgs.find((m) => m.t === 'joined').token;
  b.close();
  const w = await a.next((m) => m.t === 'snap' && m.waiting && m.waiting.length === 1);
  assert.equal(w.waiting[0].name, 'P1');
  assert.ok(w.obj.waiting.includes('P1'));
  // join attempts during the mission are refused
  const late = new Client(); await late.open();
  late.send({ t: 'join', code, name: 'Late' });
  assert.equal((await late.wait((m) => m.t === 'error')).code, 'in_progress');
  late.close();
  // resume
  const b2 = new Client(); await b2.open();
  b2.send({ t: 'resume', code, token });
  const j = await b2.wait((m) => m.t === 'joined');
  assert.equal(j.resumed, true);
  await b2.wait((m) => m.t === 'start');
  const s = await b2.wait((m) => m.t === 'snap' && m.defs);
  assert.equal(s.me.id, j.you);
  const back = await a.next((m) => m.t === 'snap' && m.waiting.length === 0);
  assert.ok(back.pl.every((p) => p.con));
  a.close(); b2.close();
});

test('host leaving hands the room to the next player', async () => {
  const { clients: [a, b] } = await makeRoom(2);
  const first = await b.wait((m) => m.t === 'lobby' && m.players.length === 2);
  a.send({ t: 'leave' });
  const l = await b.next((m) => m.t === 'lobby' && m.players.length === 1);
  assert.equal(l.hostId, first.players[1].id);
  a.close(); b.close();
});

test('an online team completes the mission through the server', async () => {
  const { clients: [a, b] } = await makeRoom(2);
  a.send({ t: 'pick', animal: 'redpanda' });
  b.send({ t: 'pick', animal: 'elephant' }); b.send({ t: 'ready', ready: true });
  await a.wait((m) => m.t === 'lobby' && m.players.every((p) => p.animal && (p.host || p.ready)));
  // drive both players with server-side autopilots by reading the room's game directly
  const room = [...srv.rooms.values()].find((r) => [...r.players.values()].some((p) => p.animal === 'elephant'));
  a.send({ t: 'start' });
  await a.wait((m) => m.t === 'start');
  const { Autopilot, viewFromGame } = await import('../shared/bot.js');
  const bots = [...room.game.players.keys()].map((id) => new Autopilot(id));
  const ws = { [room.game.order[0]]: a, [room.game.order[1]]: b };
  let seq = 0;
  const end = await new Promise((resolve, reject) => {
    const to = setTimeout(() => { const g = room.game; reject(new Error('mission did not complete: ' + JSON.stringify({ phase: room.phase, t: g && g.time, logs: bots.map((b) => b.log.slice(-4).join('|')), pl: g && [...g.players.values()].map((p) => [p.animal, p.x.toFixed(1), p.y.toFixed(1)]) }))); }, 110000);
    const iv = setInterval(() => {
      if (!room.game || room.phase !== 'playing') return;
      seq++;
      for (const bot of bots) {
        const inp = bot.update(viewFromGame(room.game, bot.pid), 0.05);
        if(inp.panel)ws[bot.pid].send({t:'panel',...inp.panel});
        ws[bot.pid].send({ t: 'in', s: seq, mx: inp.mx, my: inp.my, sp: inp.sp ? 1 : 0, e: inp.e ? 1 : 0 });
      }
    }, 50);
    a.wait((m) => m.t === 'end', 111000).then((m) => { clearTimeout(to); clearInterval(iv); resolve(m); }, reject);
  });
  assert.equal(end.results.players.length, 2);
  const bEnd = await b.wait((m) => m.t === 'end');
  assert.deepEqual(bEnd.results, end.results);
  a.close(); b.close();
});
