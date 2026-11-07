// Power-bay templates for the cooperative generator puzzle.
// Every bay shares one footprint; the doorway is rebuilt to suit the animal assigned to it,
// so each player gets a part that needs *their* ability. "crank" is the universal fallback
// used when the assigned player leaves.

import { T } from './tiles.js';

const OPEN_LABEL = {
  redpanda: (n) => `Climb the striped fence into Bay ${n}`,
  beaver: (n) => `Chew through Bay ${n}'s wooden door`,
  zebra: (n) => `Kick down Bay ${n}'s loose planks`,
  elephant: (n) => `Shove the crate out of Bay ${n}'s doorway`,
  monkey: (n) => `Reach through the bars to Bay ${n}'s lever`,
  giraffe: (n) => `Flip Bay ${n}'s high switch`,
  penguin: (n) => `Slide through the low duct into Bay ${n}`,
  meerkat: (n) => `Dig a tunnel into Bay ${n}`,
  tortoise: (n) => `Jam Bay ${n}'s snapping gate with your shell`,
  flamingo: (n) => `Wade down Bay ${n}'s flooded corridor`,
  crank: (n) => `Turn the crank to open Bay ${n} (anyone)`,
};

export function bayStepsFor(part, team) {
  const n = part.bay + 1;
  const steps = [{ label: (OPEN_LABEL[part.template] || OPEN_LABEL.crank)(n), done: part.opened }];
  if (team) steps.push({ label: 'Flip the breaker inside', done: part.breaker });
  steps.push({ label: 'Grab the fuse', done: part.fuse || part.inserted });
  steps.push({ label: 'Plug it into the generator', done: part.inserted });
  return steps;
}

export function revertBay(game, bay) {
  const z = game.zoo;
  for (let y = bay.y; y <= bay.y + 7; y++) {
    for (let x = bay.x; x <= bay.x + 4; x++) game.setTile(x, y, z.tiles[y * z.w + x]);
  }
  for (const id of bay.created.gates) game._removeGate(id);
  for (const id of bay.created.objects) game._removeObject(id);
  game.crates = game.crates.filter((c) => !bay.created.crates.includes(c.id));
  game.burrows = game.burrows.filter((b) => !bay.created.burrows.includes(b.id));
  bay.created = { gates: [], objects: [], crates: [], burrows: [] };
  bay.template = null;
  game.defsVersion++;
  game.rebuildBlock();
}

export function applyBayTemplate(game, bay, template) {
  const [dx, dy] = bay.door;
  const c = bay.corridor;
  const label = `Bay ${bay.index + 1} door`;
  const addGate = (vis, kind = 'bay') => { const g = game._addGate({ kind, vis, tiles: [[dx, dy]], label }); bay.created.gates.push(g.id); return g; };
  const addObj = (o) => { const ob = game._addObject(o); bay.created.objects.push(ob.id); return ob; };
  bay.template = template;
  switch (template) {
    case 'redpanda': game.setTile(dx, dy, T.CLIMB); break;
    case 'beaver': game.setTile(dx, dy, T.WOOD); break;
    case 'zebra': game.setTile(dx, dy, T.LOOSE); break;
    case 'elephant': {
      const id = game.newId('c');
      game.crates.push({ id, x: dx, y: dy, home: [dx, dy] });
      bay.created.crates.push(id);
      break;
    }
    case 'monkey': {
      const g = addGate('bars');
      game.setTile(bay.barsWindow[0], bay.barsWindow[1], T.FENCE);
      addObj({ kind: 'lever', reach: 'bars', hold: 0, x: bay.barsSwitch[0], y: bay.barsSwitch[1], action: { open: g.id }, label: 'Bay lever' });
      break;
    }
    case 'giraffe': {
      const g = addGate('solid');
      addObj({ kind: 'lever', reach: 'high', hold: 0, x: bay.highSpot[0], y: bay.highSpot[1], action: { open: g.id }, label: 'High switch' });
      break;
    }
    case 'penguin': game.setTile(dx, dy, T.LOW); game.setTile(c[0][0], c[0][1], T.LOW); break;
    case 'meerkat': {
      game.setTile(dx, dy, T.WALL);
      const a = c[1];
      const b = [bay.x + 2, bay.y + 2];
      game.setTile(a[0], a[1], T.SOIL);
      game.setTile(b[0], b[1], T.SOILX);
      const id = game.newId('b');
      game.burrows.push({ id, a: [...a], b, dug: false });
      bay.created.burrows.push(id);
      break;
    }
    case 'tortoise': {
      const g = addGate('solid', 'timed');
      addObj({ kind: 'lever', reach: 'normal', hold: 0, x: bay.sidePanel[0], y: bay.sidePanel[1], action: { timed: g.id, dur: 1.3 }, label: 'Gate lever' });
      break;
    }
    case 'flamingo': for (const [x, y] of c) game.setTile(x, y, T.POND); break;
    case 'crank':
    default: {
      const g = addGate('solid');
      addObj({ kind: 'crank', hold: 3.0, x: bay.sidePanel[0], y: bay.sidePanel[1], action: { open: g.id }, label: 'Crank' });
      break;
    }
  }
  game.defsVersion++;
  game.rebuildBlock();
}

/** Autopilot steps to get into the bay room (world coordinates). */
export function bayEnterSteps(bay, template) {
  const X = bay.x + 2, Y = bay.y;
  switch (template) {
    case 'redpanda': return [{ go: [X, Y + 5] }, { face: 'up' }, { space: 1 }, { wait: 0.6 }];
    case 'beaver': return [{ go: [X, Y + 5] }, { face: 'up' }, { holdSpace: 2.1 }, { go: [X, Y + 3] }];
    case 'zebra': return [{ go: [X, Y + 5] }, { face: 'up' }, { space: 1 }, { go: [X, Y + 3] }];
    case 'elephant': return [{ go: [X, Y + 5] }, { face: 'up' }, { space: 1 }, { wait: 0.2 }, { go: [X, Y + 4] }, { face: 'up' }, { space: 1 }, { wait: 0.2 }, { go: [X, Y + 3] }];
    case 'monkey': return [{ go: [X, Y + 6] }, { face: 'right' }, { space: 1 }, { wait: 0.3 }, { go: [X, Y + 3] }];
    case 'giraffe': return [{ go: [X, Y + 5] }, { space: 1 }, { wait: 0.3 }, { go: [X, Y + 3] }];
    case 'penguin': return [{ go: [X, Y + 6] }, { face: 'up' }, { space: 1 }, { wait: 0.8 }];
    case 'meerkat': return [{ go: [X, Y + 6] }, { holdSpace: 2.6 }, { e: 1 }, { wait: 1.0 }];
    case 'tortoise': return [{ go: [X, Y + 6] }, { e: 1 }, { moveFor: ['up', 0.9] }, { space: 1 }, { wait: 1.4 }, { space: 1 }, { go: [X, Y + 3] }];
    case 'flamingo': return [{ go: [X, Y + 3] }];
    default: return [{ go: [X, Y + 6] }, { holdE: 3.3 }, { go: [X, Y + 3] }];
  }
}

/** Autopilot steps to leave the bay room back to its entrance. */
export function bayExitSteps(bay, template) {
  const X = bay.x + 2, Y = bay.y;
  switch (template) {
    case 'redpanda': return [{ go: [X, Y + 3] }, { face: 'down' }, { space: 1 }, { wait: 0.6 }];
    case 'penguin': return [{ go: [X, Y + 3] }, { face: 'down' }, { space: 1 }, { wait: 0.8 }];
    case 'meerkat': return [{ go: [X, Y + 2] }, { e: 1 }, { wait: 1.0 }];
    default: return [];
  }
}
