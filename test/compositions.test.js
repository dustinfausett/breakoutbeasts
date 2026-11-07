// Deadlock sweep: every possible team of 1–4 different animals (385 teams) must be able to
// finish the mission. Autopilots play each team headlessly against the real rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIMAL_IDS } from '../shared/animals.js';
import { runMission } from './helpers.js';

const combos = [];
(function rec(start, cur) {
  if (cur.length) combos.push([...cur]);
  if (cur.length === 4) return;
  for (let i = start; i < ANIMAL_IDS.length; i++) { cur.push(ANIMAL_IDS[i]); rec(i + 1, cur); cur.pop(); }
})(0, []);

test(`all ${combos.length} team compositions can complete the mission (no deadlocks)`, () => {
  const failed = [];
  for (const team of combos) {
    const { game } = runMission(team, { maxTime: 600 });
    if (game.phase !== 'complete') failed.push(team.join('+'));
  }
  assert.deepEqual(failed, []);
});

test('a team still finishes with keepers patrolling (captures happen, progress survives)', () => {
  const { game } = runMission(['redpanda', 'elephant'], { staff: true, maxTime: 900 });
  assert.equal(game.phase, 'complete');
});
