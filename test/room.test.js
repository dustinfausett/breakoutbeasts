import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room, GRACE_PLAY, GRACE_LOBBY } from '../shared/room.js';
import { TICK } from '../shared/game.js';

function makeRoom(opts = {}) {
  const out = new Map();
  const room = new Room({ code: 'TEST1', send: (pid, msg) => { if (!out.has(pid)) out.set(pid, []); out.get(pid).push(msg); }, options: { staff: false }, ...opts });
  const last = (pid, t) => [...(out.get(pid) || [])].reverse().find((m) => m.t === t);
  return { room, out, last };
}

test('room enforces eight players and rejects a ninth', () => {
  const { room } = makeRoom();
  for (let i = 0; i < 8; i++) assert.ok(room.addPlayer('P' + i).player);
  const r = room.addPlayer('Fifth');
  assert.equal(r.error, 'room_full');
});

test('duplicate animal picks are rejected', () => {
  const { room, last } = makeRoom();
  const a = room.addPlayer('A').player, b = room.addPlayer('B').player;
  room.handle(a.id, { t: 'pick', animal: 'beaver' });
  room.handle(b.id, { t: 'pick', animal: 'beaver' });
  assert.equal(last(b.id, 'error').code, 'animal_taken');
  assert.equal(room.players.get(b.id).animal, null);
});

test('only the host starts, and only when everyone picked and is ready', () => {
  const { room, last } = makeRoom();
  const a = room.addPlayer('A').player, b = room.addPlayer('B').player;
  room.handle(a.id, { t: 'pick', animal: 'zebra' });
  room.handle(b.id, { t: 'start' });
  assert.equal(last(b.id, 'error').code, 'not_host');
  room.handle(a.id, { t: 'start' });
  assert.equal(last(a.id, 'error').code, 'not_ready');
  room.handle(b.id, { t: 'pick', animal: 'monkey' });
  room.handle(a.id, { t: 'start' });
  assert.equal(room.phase, 'lobby', 'B not ready yet');
  room.handle(b.id, { t: 'ready', ready: true });
  room.handle(a.id, { t: 'start' });
  assert.equal(room.phase, 'playing');
  assert.equal(room.game.parts.length, 2);
  assert.ok(last(b.id, 'start'));
});

test('joining a mission in progress is refused', () => {
  const { room } = makeRoom();
  const a = room.addPlayer('A').player;
  room.handle(a.id, { t: 'pick', animal: 'zebra' });
  room.handle(a.id, { t: 'start' });
  assert.equal(room.addPlayer('Late').error, 'in_progress');
});

test('host migrates when the host leaves or disconnects', () => {
  const { room } = makeRoom();
  const a = room.addPlayer('A').player, b = room.addPlayer('B').player;
  assert.equal(room.hostId, a.id);
  room.disconnect(a.id);
  assert.equal(room.hostId, b.id);
  room.resume(a.token);
  assert.equal(room.hostId, b.id, 'returning player does not steal host');
  room.leave(b.id);
  assert.equal(room.hostId, a.id);
});

test('reconnecting within the grace period resumes the same animal mid-mission', () => {
  const { room, last } = makeRoom();
  const a = room.addPlayer('A').player, b = room.addPlayer('B').player;
  room.handle(a.id, { t: 'pick', animal: 'zebra' }); room.handle(b.id, { t: 'pick', animal: 'giraffe' }); room.handle(b.id, { t: 'ready', ready: true });
  room.handle(a.id, { t: 'start' });
  for (let i = 0; i < 20; i++) room.tick(TICK);
  room.disconnect(b.id);
  for (let i = 0; i < 40; i++) room.tick(TICK);
  const snap = last(a.id, 'snap');
  assert.equal(snap.waiting.length, 1, 'teammates see who they are waiting for');
  assert.equal(room.game.players.get(b.id).connected, false);
  const r = room.resume(b.token);
  assert.ok(r.player);
  assert.equal(room.game.players.get(b.id).connected, true);
  assert.equal(room.game.players.get(b.id).active, true);
  room.tick(TICK);
  const s2 = last(b.id, 'snap');
  assert.ok(s2.defs && s2.tm, 'resumed client gets full definitions and tiles');
});

test('after the grace period the team continues without the missing player', () => {
  const { room } = makeRoom();
  const a = room.addPlayer('A').player, b = room.addPlayer('B').player;
  room.handle(a.id, { t: 'pick', animal: 'zebra' }); room.handle(b.id, { t: 'pick', animal: 'giraffe' }); room.handle(b.id, { t: 'ready', ready: true });
  room.handle(a.id, { t: 'start' });
  room.disconnect(b.id);
  const ticks = Math.ceil((GRACE_PLAY + 1) / TICK);
  for (let i = 0; i < ticks; i++) room.tick(TICK);
  assert.equal(room.game.players.get(b.id).active, false);
  assert.equal(room.game.parts.length, 1);
  assert.equal(room.game.keyCount(), 1);
});

test('a teammate can choose to continue without a disconnected player right away', () => {
  const { room } = makeRoom();
  const a = room.addPlayer('A').player, b = room.addPlayer('B').player;
  room.handle(a.id, { t: 'pick', animal: 'zebra' }); room.handle(b.id, { t: 'pick', animal: 'giraffe' }); room.handle(b.id, { t: 'ready', ready: true });
  room.handle(a.id, { t: 'start' });
  room.handle(a.id, { t: 'continueWithout', pid: b.id });
  assert.equal(room.game.players.get(b.id).active, true, 'cannot drop a connected player');
  room.disconnect(b.id);
  room.handle(a.id, { t: 'continueWithout', pid: b.id });
  assert.equal(room.game.players.get(b.id).active, false);
});

test('lobby slots are freed after the lobby grace period', () => {
  const { room } = makeRoom();
  room.addPlayer('A'); const b = room.addPlayer('B').player;
  room.disconnect(b.id);
  for (let i = 0; i < Math.ceil((GRACE_LOBBY + 1) / TICK); i++) room.tick(TICK);
  assert.equal(room.players.size, 1);
});

test('replay and return-to-lobby are host controlled', () => {
  const { room, last } = makeRoom();
  const a = room.addPlayer('A').player, b = room.addPlayer('B').player;
  room.handle(a.id, { t: 'pick', animal: 'zebra' }); room.handle(b.id, { t: 'pick', animal: 'giraffe' }); room.handle(b.id, { t: 'ready', ready: true });
  room.handle(a.id, { t: 'start' });
  room.handle(b.id, { t: 'toLobby' });
  assert.equal(last(b.id, 'error').code, 'not_host');
  room.handle(a.id, { t: 'replay' });
  assert.equal(room.phase, 'playing');
  room.handle(a.id, { t: 'toLobby' });
  assert.equal(room.phase, 'lobby');
  assert.equal(room.players.get(b.id).ready, false);
});

test('names are sanitised', () => {
  const { room } = makeRoom();
  const p = room.addPlayer('<b>Very long name that goes on</b>').player;
  assert.ok(!p.name.includes('<'));
  assert.ok(p.name.length <= 14);
});
