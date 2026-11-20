import {run as multiplayerPerformance} from './performance.mjs';
import {run as teamCapture} from './team-capture.mjs';
import {run as uniforms} from './uniforms.mjs';
import {run as monsters} from './monsters.mjs';
import {run as dragging} from './dragging.mjs';
import {run as airport} from './airport.mjs';
import {run as staminaFlightArt} from './stamina-flight-art.mjs';
import {run as liveJoin} from './live-join.mjs';
import {run as flightChapter} from './flight-chapter.mjs';
import {run as vehiclePolice} from './vehicle-police.mjs';
import {run as policePrison} from './police-prison.mjs';
import {run as secretCompletion} from './secret-completion.mjs';
import {run as scoring} from './scoring.mjs';
import {run as mobility} from './mobility.mjs';
// Runs every browser end-to-end suite and prints a summary. Usage: npm run test:e2e
import {run as groupSaves} from './group-saves.mjs';
import {run as carPushing} from './car-pushing.mjs';
import {run as compactCity} from './compact-city.mjs';
import { run as rescueChapter } from './rescue-chapter.mjs';
import { run as city } from './city.mjs';
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

const suites = [['multiplayer performance',()=>multiplayerPerformance()], ['team capture',()=>teamCapture()], ['uniforms and phone status',()=>uniforms()], ['secret monsters and airport crowd',()=>monsters()], ['dragging and flashlights',()=>dragging()], ['airport terminal',()=>airport()], ['stamina and flight art',()=>staminaFlightArt()], ['live joins and app icon',()=>liveJoin()], ['flight chapter',()=>flightChapter()], ['vehicle police',()=>vehiclePolice()], ['police prison',()=>policePrison()], ['secret mission completion',()=>secretCompletion()], ['round scores',()=>scoring()], ['running and wild abilities',()=>mobility()], ['group saves',()=>groupSaves()], ['car pushing',()=>carPushing()], ['compact city',()=>compactCity()], ['rescue chapter', () => rescueChapter()], ['city', () => city()], ['secret chapters', () => checkpoints()], ['fuses (6 players)', () => fuses({players:6})], ['fuses (8 players)', () => fuses({players:8})], ['parking (mobile)', () => parking({players:2,mobile:true})], ['parking (2 players)', () => parking({players:2})], ['parking (8 players)', () => parking({players:8})], ['animation', () => animation()], ['control house', () => controlHouse()], ['wild', () => wild()], ['security', () => security()], ['mobile', () => mobile()], ['multiplayer (2 players)', () => multiplayer({ players: 2 })], ['multiplayer (4 players)', () => multiplayer({ players: 4 })], ['solo', () => solo()]];
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
