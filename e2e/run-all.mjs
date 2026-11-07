// Runs every browser end-to-end suite and prints a summary. Usage: npm run test:e2e
import { run as solo } from './solo.mjs';
import { run as multiplayer } from './multiplayer.mjs';
import { run as mobile } from './mobile.mjs';

const suites = [['mobile', () => mobile()], ['multiplayer (2 players)', () => multiplayer({ players: 2 })], ['multiplayer (4 players)', () => multiplayer({ players: 4 })], ['solo', () => solo()]];
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
