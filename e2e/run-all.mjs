// Runs every browser end-to-end suite and prints a summary. Usage: npm run test:e2e
import { run as checkpoints } from './checkpoints.mjs';
import { run as fuses } from './fuses.mjs';
import { run as parking } from './parking.mjs';
import { run as animation } from './animation.mjs';
import { run as controlHouse } from './control-room.mjs';
import { run as wild } from './wild.mjs';
import { run as security } from './security.mjs';
import { run as solo } from './solo.mjs';
import { run as multiplayer } from './multiplayer.mjs';
import { run as mobile } from './mobile.mjs';

const suites = [['secret chapters', () => checkpoints()], ['fuses (6 players)', () => fuses({players:6})], ['fuses (8 players)', () => fuses({players:8})], ['parking (mobile)', () => parking({players:2,mobile:true})], ['parking (2 players)', () => parking({players:2})], ['parking (8 players)', () => parking({players:8})], ['animation', () => animation()], ['control house', () => controlHouse()], ['wild', () => wild()], ['security', () => security()], ['mobile', () => mobile()], ['multiplayer (2 players)', () => multiplayer({ players: 2 })], ['multiplayer (4 players)', () => multiplayer({ players: 4 })], ['solo', () => solo()]];
const only = process.argv[2];
let failed = 0; const summary = [];
for (const [name, fn] of suites) {
  if (only && !name.startsWith(only)) continue;
  console.log(`\n=== ${name} ===`);
  try { const r = await fn(); failed += r.failed; summary.push(`${name}: ${r.rows.length - r.failed}/${r.rows.length} passed`); }
  catch (e) { failed++; summary.push(`${name}: ERROR ${e.message}`); console.error(e); }
}
console.log('\n' + summary.join('\n'));
console.log('Screenshots: e2e/screenshots/');
process.exit(failed ? 1 : 0);
