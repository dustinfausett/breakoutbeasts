import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, TICK } from '../shared/game.js';
import { ANIMAL_IDS } from '../shared/animals.js';
import { T, animalCanEnter } from '../shared/tiles.js';
import { canOccupy } from '../shared/physics.js';
import { bfs } from '../shared/util.js';
import { Autopilot, viewFromGame } from '../shared/bot.js';
import { runMission } from './helpers.js';

const solo = (animal, opts = {}) => new Game({ players: [{ id: 'p1', name: 'Solo', animal }], seed: 3, options: { staff: false, ...opts } });

function runScript(game, pid, steps, maxTime = 30) {
  const bot = new Autopilot(pid);
  bot.setScript('test', steps);
  bot._plan = () => {}; // run only the scripted steps
  const events = [];
  const t0 = game.time;
  while (game.time - t0 < maxTime) {
    const inp = bot.script ? bot.update(viewFromGame(game, pid), TICK) : { mx: 0, my: 0, sp: false, e: false };
    game.setInput(pid, inp);
    game.step(TICK);
    events.push(...game.drainEvents());
    if (!bot.script) break;
  }
  return events;
}

test('every enclosure starts sealed for every animal (no walking out without an ability)', () => {
  const g = solo('redpanda');
  for (const enc of g.zoo.enclosures) {
    for (const animal of ANIMAL_IDS) {
      const [sx, sy] = enc.spawn;
      const r = enc.rect;
      const path = bfs(g.w, g.h, sx, sy, (x, y) => x < r[0] || x > r[2] || y < r[1] || y > r[3], (x, y) => canOccupy(g, animal, x + 0.5, y + 0.5, null));
      assert.equal(path, null, `${animal} could walk out of ${enc.name}`);
    }
  }
});

const SIGNATURE = {
  redpanda: ['climb'], elephant: ['push', 'plate'], monkey: ['reach'], beaver: ['build', 'chewed'], giraffe: ['reach'],
  penguin: ['slide'], zebra: ['kick'], meerkat: ['dug', 'tunnel'], tortoise: ['jam'], flamingo: ['reach'],
};

for (const animal of ANIMAL_IDS) {
  test(`${animal}: initial escape works using its own ability`, () => {
    const g = solo(animal);
    const enc = g.zoo.enclosures.find((e) => e.animal === animal);
    const events = runScript(g, 'p1', enc.solution, 40);
    const p = g.players.get('p1');
    assert.ok(p.escaped, `${animal} did not escape (at ${p.x.toFixed(2)},${p.y.toFixed(2)})`);
    const kinds = new Set(events.map((e) => e.k));
    for (const k of SIGNATURE[animal]) assert.ok(kinds.has(k), `${animal} escape should produce '${k}' (got ${[...kinds].join(',')})`);
  });
}

test('abilities produce distinct environmental effects and do nothing for other animals', () => {
  // beaver chews wood -> debris; zebra cannot chew
  const z = solo('zebra');
  const wood = [57, 24];
  assert.equal(z.tileAt(...wood), T.WOOD);
  const zp = z.players.get('p1'); zp.x = 56.5; zp.y = 24.5; zp.face = 'right';
  z.setInput('p1', { mx: 0, my: 0, sp: true, e: false }); for (let i = 0; i < 60; i++) z.step(TICK);
  assert.equal(z.tileAt(...wood), T.WOOD, 'zebra must not chew wood');
  const b = solo('beaver');
  const bp = b.players.get('p1'); bp.x = 56.5; bp.y = 24.5; bp.face = 'right';
  b.setInput('p1', { mx: 0, my: 0, sp: true, e: false }); for (let i = 0; i < 50; i++) b.step(TICK);
  assert.equal(b.tileAt(...wood), T.DEBRIS, 'beaver chews wood into debris');
  // zebra kicks loose planks, beaver cannot
  const loose = [57, 35];
  const b2 = solo('beaver'); const b2p = b2.players.get('p1'); b2p.x = 56.5; b2p.y = 35.5; b2p.face = 'right';
  b2.setInput('p1', { mx: 0, my: 0, sp: true, e: false }); for (let i = 0; i < 50; i++) b2.step(TICK);
  assert.equal(b2.tileAt(...loose), T.LOOSE);
  zp.x = 56.5; zp.y = 35.5; zp.face = 'right';
  z.setInput('p1', { mx: 0, my: 0, sp: false, e: false }); z.step(TICK);
  z.setInput('p1', { mx: 0, my: 0, sp: true, e: false }); z.step(TICK);
  assert.equal(z.tileAt(...loose), T.DEBRIS, 'zebra kicks planks down');
  assert.ok(z.drainEvents().some((e) => e.k === 'noise'), 'kicking is noisy');
  // red panda hops climb fence; elephant cannot
  const r = solo('redpanda'); const rp = r.players.get('p1'); rp.x = 56.5; rp.y = 22.5; rp.face = 'right';
  r.setInput('p1', { sp: true }); for (let i = 0; i < 15; i++) r.step(TICK);
  assert.ok(rp.x > 58, 'red panda climbed into the plaza');
  const e = solo('elephant'); const ep = e.players.get('p1'); ep.x = 56.5; ep.y = 22.5; ep.face = 'right';
  e.setInput('p1', { sp: true }); for (let i = 0; i < 15; i++) e.step(TICK);
  assert.ok(ep.x < 57, 'elephant cannot climb');
  // narrow gaps block elephants only
  assert.equal(animalCanEnter('elephant', T.NARROW), false);
  assert.equal(animalCanEnter('zebra', T.NARROW), true);
  // giraffe & elephant can't use burrows
  const m = solo('giraffe');
  m.burrows[m.burrows.length - 1].dug = true; m.setTile(32, 35, T.BURROW); m.setTile(59, 37, T.BURROW);
  const mp = m.players.get('p1'); mp.x = 32.5; mp.y = 35.5;
  const t = m.interactTarget(mp);
  assert.ok(t && !t.run, 'giraffe is too tall for tunnels');
});

test('players cannot walk through walls or closed gates', () => {
  const g = solo('zebra');
  const enc = g.zoo.enclosures.find((e) => e.animal === 'zebra');
  const p = g.players.get('p1');
  const gate = g.gate(enc.mainGate);
  const [gx, gy] = gate.tiles[0];
  p.x = gx + 0.5; p.y = gy - 0.5; // just inside the gate
  g.setInput('p1', { mx: 0, my: 1, sp: false, e: false });
  for (let i = 0; i < 80; i++) g.step(TICK);
  assert.ok(p.y < gy, 'stopped by the closed gate');
  // wall
  p.x = enc.rect[0] + 1.5; p.y = enc.rect[1] + 1.5;
  g.setInput('p1', { mx: -1, my: -1 });
  for (let i = 0; i < 80; i++) g.step(TICK);
  assert.ok(p.x >= enc.rect[0] + 1 + 0.29 && p.y >= enc.rect[1] + 1 + 0.29, 'stopped by the wall corner');
  // over-sized inputs are clamped (no speed hacks)
  p.x = 40.5; p.y = 14.5;
  g.setInput('p1', { mx: 50, my: 0 });
  g.step(TICK);
  assert.ok(p.x - 40.5 <= 4.6 * TICK + 1e-6, 'movement speed is validated');
});

test('staff vision: blocked by walls/hedges, sees through bars, misses hidden animals', () => {
  const g = new Game({ players: [{ id: 'p1', animal: 'zebra' }], options: { staff: true } });
  const s = g.staff[0];
  const p = g.players.get('p1');
  // open promenade in front of staff
  s.x = 20.5; s.y = 14.5; s.dir = 0;
  p.x = 24.5; p.y = 14.5;
  assert.ok(g.canSee(s, p), 'sees across open path');
  // behind the maintenance yard wall
  s.x = 24.5; s.y = 29.5; s.dir = Math.PI; p.x = 20.5; p.y = 29.5;
  g.setTile(23, 29, T.WALL); g.rebuildBlock();
  assert.ok(!g.canSee(s, p), 'wall blocks sight');
  // bars do not block sight
  const tilesFence = new Game({ players: [{ id: 'p1', animal: 'zebra' }] });
  tilesFence.setTile(22, 14, T.FENCE);
  const s2 = tilesFence.staff[0]; const p2 = tilesFence.players.get('p1');
  s2.x = 20.5; s2.y = 14.5; s2.dir = 0; p2.x = 24.5; p2.y = 14.5;
  assert.ok(tilesFence.canSee(s2, p2), 'bars do not block sight');
  tilesFence.setTile(22, 14, T.HEDGE);
  assert.ok(!tilesFence.canSee(s2, p2), 'hedges block sight');
  // facing away
  s2.dir = Math.PI; tilesFence.setTile(22, 14, T.PATH);
  assert.ok(!tilesFence.canSee(s2, p2), 'cannot see behind');
  // hidden in a bush
  tilesFence.setTile(24, 14, T.BUSH); s2.dir = 0;
  tilesFence._postMove(p2, 0);
  assert.ok(!p2.hidden, 'entering cover in view does not hide an animal');
  s2.dir=Math.PI;tilesFence.setTile(25,14,T.BUSH);tilesFence._postMove(p2,0);
  assert.ok(p2.hidden && !tilesFence.detectable(p2),'unwatched cover conceals animals');
});

test('immediate radio alert, chase, capture, grace and keyed teammate release', () => {
  const g = new Game({ players: [{ id: 'a', name: 'A', animal: 'zebra' }, { id: 'b', name: 'B', animal: 'monkey' }], options: { staff: true } });
  g.staff.slice(1).forEach((s) => { s.x = 2.5; s.y = 2.5; s.route = [[2, 2]]; s.wp = 0; }); // park other keepers out of the way
  const s = g.staff[0];
  s.route = [[50, 14]]; s.wp = 0; s.x = 50.5; s.y = 14.5; s.dir = Math.PI;
  const a = g.players.get('a'); a.escaped = true; a.x = 46.5; a.y = 14.5;
  const b = g.players.get('b'); b.escaped = true; b.x = 30.5; b.y = 28.5;
  const evs = [];
  g.step(TICK);evs.push(...g.drainEvents());
  assert.ok(g.staff.every(guard=>guard.state==='chase'&&guard.target==='a'),'all guards converge immediately');
  for (let i = 0; i < 200 && a.capturedT <= 0; i++) {
    g.step(TICK); const e = g.drainEvents(); evs.push(...e);
  }
  assert.ok(evs.some((e) => e.k === 'alert'), 'alert raised before capture');
  assert.ok(evs.some((e) => e.k === 'capture' && e.pid === 'a'), 'zebra captured');
  for (let i = 0; i < 30; i++) g.step(TICK);
  const enc = g.zoo.enclosures.find((e) => e.animal === 'zebra');
  assert.ok(g.inOwnEnclosure(a), 'returned to enclosure');
  assert.ok(a.grace > 0, 'grace period active');
  assert.ok(a.escaped, 'escape progress kept');
  assert.equal(g.gate(enc.mainGate).state, 0, 'enclosure gate closed');
  // Key use is checked separately; here validate capture recovery with a keyed teammate.
  b.cageKeys=1;
  // teammate releases via cage lock
  const lever = g.obj(enc.keeper);
  b.x = lever.x + 1.5; b.y = lever.y + 0.5; b.face = 'left';
  g.setInput('b', { e: true });
  for (let i = 0; i < 30; i++) g.step(TICK);
  assert.equal(g.gate(enc.mainGate).state, 1, 'teammate opened the gate');
});

test('shelled tortoise is ignored by keepers and blocks their path', () => {
  const g = new Game({ players: [{ id: 't', animal: 'tortoise' }], options: { staff: true } });
  const s = g.staff[0]; const t = g.players.get('t');
  s.x = 40.5; s.y = 14.5; s.dir = 0; t.x = 43.5; t.y = 14.5;
  assert.ok(g.detectable(t));
  t.shell = true;
  assert.ok(!g.detectable(t), 'keepers think the shell is a rock');
  assert.ok(!g._staffPass(43, 14), 'shell blocks staff movement');
});

test('noise sends keepers to investigate', () => {
  const g = new Game({ players: [{ id: 'z', animal: 'zebra' }], options: { staff: true } });
  const s = g.staff[1];
  g.noise(s.x + 3, s.y, 6);
  assert.equal(s.state, 'investigate');
});

for (const animal of ANIMAL_IDS) {
  test(`solo ${animal} can finish Moonleaf Zoo`, () => {
    const { game } = runMission([animal], { maxTime: 600 });
    assert.equal(game.phase, 'complete');
  });
}

test('puzzle parts and keys scale with player count and use the team\'s own abilities', () => {
  const teams = [['penguin'], ['penguin', 'giraffe'], ['penguin', 'giraffe', 'beaver'], ['penguin', 'giraffe', 'beaver', 'tortoise']];
  for (const team of teams) {
    const g = new Game({ players: team.map((a, i) => ({ id: 'p' + i, animal: a })), options: { staff: false } });
    assert.equal(g.parts.length, team.length, 'one power part per player');
    assert.deepEqual(g.parts.map((p) => p.template).sort(), [...team].sort(), 'each part needs a team member\'s ability');
    assert.equal(g.keyCount(), team.length, 'one key per player');
    const steps = g.objectives().power.parts[0].steps.length;
    assert.equal(steps, team.length === 1 ? 3 : 4, 'team parts have an extra step');
    assert.equal(g.bayState.filter((b) => b.used).length, team.length, 'unused bays sealed');
  }
});

test('mission completion requires every active player at the exit', () => {
  const { game } = runMission(['zebra', 'monkey'], { maxTime: 600, onTick: (g) => {
    // freeze the monkey outside once the gate is open
    if (g.gate(g.zoo.exitGate).state === 1) { const m = g.players.get('p2'); if (!m.frozen) { m.frozen = true; m.x = 70.5; m.y = 30.5; } else if (!m.released) { m.x = 70.5; m.y = 30.5; } }
  } });
  assert.equal(game.phase, 'play', 'not complete while one active player is outside');
  assert.ok(game.players.get('p1').inExit);
  const m = game.players.get('p2'); m.released = true;
  m.x = 78.5; m.y = 30.5;
  game.step(TICK);
  assert.equal(game.phase, 'complete');
});

test('disconnect: untouched part is dropped, started part becomes a universal crank, progress kept', () => {
  const g = new Game({ players: [{ id: 'a', animal: 'zebra' }, { id: 'b', animal: 'meerkat' }, { id: 'c', animal: 'flamingo' }], options: { staff: false } });
  assert.equal(g.parts.length, 3);
  // zebra made progress: kicked its bay open and flipped the breaker
  const zb = g.bayState[g.parts[0].bay]; g.setTile(zb.door[0], zb.door[1], T.DEBRIS);
  g.parts[0].opened = true; g.parts[0].breaker = true; g.obj(zb.cage).state = 1;
  g.stats.rescued = 2;
  g.removePlayer('b'); // untouched part
  assert.equal(g.parts.length, 2, 'untouched part removed');
  assert.equal(g.keyCount(), 2, 'keys adapt to remaining players');
  g.removePlayer('a'); // started part
  const part = g.parts.find((p) => p.animal === 'zebra');
  assert.ok(part && part.pid === null && part.opened && part.breaker, 'progress preserved and part reassigned to anyone');
  assert.equal(g.stats.rescued, 2, 'rescues preserved');
  assert.equal(g.keyCount(), 1);
  // remaining flamingo can still finish everything
  const bot = new Autopilot('c');
  while (g.phase === 'play' && g.time < 600) { const input=bot.update(viewFromGame(g,'c'),TICK); if(input.panel)g.controlAction('c',input.panel); g.setInput('c',input); g.step(TICK); g.drainEvents(); }
  assert.equal(g.phase, 'complete', 'remaining player can finish after adaptation');
});

test('a part whose bay was not opened yet converts to a crank anyone can turn', () => {
  const g = new Game({ players: [{ id: 'a', animal: 'monkey' }, { id: 'b', animal: 'giraffe' }], options: { staff: false } });
  g.parts[1].fuse = true; // giraffe was carrying its fuse? simulate started-but-not-opened edge
  g.parts[1].opened = false;
  g.removePlayer('b');
  const part = g.parts.find((p) => p.animal === 'giraffe');
  assert.equal(part.template, 'crank');
  assert.ok(g.objects.some((o) => o.kind === 'crank'), 'crank placed');
});

test('tortoise cannot outrun the snapping gate without its shell', () => {
  const g = solo('tortoise');
  const enc = g.zoo.enclosures.find((e) => e.animal === 'tortoise');
  const steps = enc.solution.slice(0, 2).concat([{ moveFor: ['up', 3] }]);
  runScript(g, 'p1', steps, 10);
  for (let i = 0; i < 40; i++) g.step(TICK);
  const p = g.players.get('p1');
  assert.ok(!p.escaped, 'walking alone is too slow — the shell is required');
  assert.equal(g.gate(enc.sideGate).state, 0, 'gate snapped shut');
});
