import {createServer} from '../server/index.js';import {chromium,waitFor,Report,SHOTS,pageErrors} from './lib.mjs';
const animals=['redpanda','elephant','monkey','beaver','giraffe','penguin','zebra','meerkat'];
export async function run({players=2,mobile=false}={}){
 const R=new Report('parking '+players),srv=await createServer({port:0,host:'127.0.0.1',log:()=>{}}),browser=await chromium.launch();
 try{
  const url='http://127.0.0.1:'+srv.port+'/',pages=[],errors=[];
  for(let i=0;i<players;i++){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1200,height:850},isMobile:mobile,hasTouch:mobile});pages.push(page);errors.push(pageErrors(page,'crew'+i));await page.goto(i?url+'?room='+[...srv.rooms.keys()][0]:url);
   if(!i){await page.fill('#name','Crew 1');await page.click('[data-act="create"]');}else{await page.fill('#join-name','Crew '+(i+1));await page.click('[data-act="join-go"]');}
   await page.click(`[data-animal="${animals[i]}"]`);await page.click('#animals-go');if(i)await page.click('#lobby-ready');
  }
  const host=pages[0];await host.bringToFront();await host.click('#lobby-start');const room=[...srv.rooms.values()][0];await waitFor(()=>room.game);
  R.ok('keeper count scales with the crew',room.game.staff.length===4+Math.max(0,players-2));
  // Isolate the new stage transition; the complete zoo mission is covered by
  // the composition sweep and existing WebSocket integration tests.
  room.game.phase='complete';await waitFor(()=>host.locator('#complete.show').isVisible());
  R.ok('zoo results include Continue',await host.locator('[data-act="continue"]').isVisible());
  if(players>1)R.ok('teammates wait for the host to Continue',await pages[1].locator('[data-act="continue"]').isDisabled());
  await host.screenshot({path:`${SHOTS}/parking-results-${players}${mobile?'-mobile':''}p.png`});await host.click('[data-act="continue"]');
  await waitFor(()=>room.game.zooId==='parking');const g=room.game;
  await waitFor(async()=>{for(const p of pages)if(!(await p.evaluate(()=>window.__bb.app.world?.zoo.id==='parking'&&window.__bb.app.world.snap?.obj.stage==='parking')))return false;return true;});
  R.ok('Continue transfers every client to the same parking lot',g.activePlayers().length===players);
  R.ok('parking lot adds rows of cars, large hiding islands and searching keepers',g.zoo.decor.filter(d=>d.kind==='parkedCar').length>=20&&g.staff.length===2+Math.floor(players/2));
  for(const p of g.activePlayers())p.grace=100;
  const a=g.activePlayers()[0],guard=g.staff[0];
  // Freeze one keeper and move other keepers away to make real hold-E theft
  // repeatable; the actual game key check and hold completion are unchanged.
  for(const s of g.staff){s.x=60.5;s.y=38.5;s.state='cheer';s.cheer=100;}
  guard.x=20.5;guard.y=5.5;guard.dir=0;guard.state='cheer';guard.cheer=100;guard.downUntil=0;
  a.x=19;a.y=5.5;room.queues.clear();await host.waitForTimeout(150);await host.keyboard.down('KeyE');await waitFor(()=>a.cageKeys===1,{what:'real parking key theft'});await host.keyboard.up('KeyE');
  R.ok('holding E behind an unwatched keeper steals real parking keys',a.cageKeys===1);
  a.x=34.5;a.y=24.5;await host.waitForTimeout(150);await host.screenshot({path:`${SHOTS}/parking-lot-${players}${mobile?'-mobile':''}p.png`});
  async function enter(i){const p=g.activePlayers()[i],page=pages[i];await page.bringToFront();p.x=48.5;p.y=21.5;p.prevE=false;p.input={};room.queues.clear();await page.waitForTimeout(150);await page.click('#tbtn-e');await waitFor(()=>p.inVehicle,{what:'car entry '+i});await waitFor(()=>page.locator('#vehicle-panel').isVisible());}
  await enter(0);R.ok('stolen keys unlock the getaway wagon',g.vehicle.unlocked);
  if(players>1)R.ok('controls wait until the crew is aboard',await host.locator('[data-car-control]').first().isDisabled());
  for(let i=1;i<players;i++)await enter(i);
  await host.screenshot({path:`${SHOTS}/getaway-controls-${players}${mobile?'-mobile':''}p.png`});
  const ownership=[];
  for(let i=0;i<players;i++){
   const page=pages[i];await page.bringToFront();await waitFor(()=>page.locator('[data-car-control]').first().isEnabled());
   const controls=await page.evaluate(()=>window.__bb.app.world.snap.me.vehicle.controls);ownership.push(...controls.map(c=>c.id));
   for(const c of controls)await page.locator(`[data-car-control="${c.id}"][data-car-value="${c.goal}"]`).click();
  }
  R.ok('all animals receive distinct responsibilities, combined only for smaller crews',new Set(ownership).size===Math.max(3,players));
  await waitFor(()=>room.phase==='complete',{what:'cooperative car theft'});
  await waitFor(()=>host.locator('#complete-h').innerText().then(s=>s==='Car stolen!'));
  R.ok('correct shared controls steal the car and show the next result',room.results.carStolen&&room.results.stage==='parking');
  R.ok('unfinished future destinations are not offered as playable levels',await host.locator('[data-act="continue"]').isHidden());
  R.ok('new stage has no browser errors',errors.every(e=>!e.length),errors.flat().join(' | '));
 }finally{await browser.close();await srv.close();}return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run({players:Number(process.argv[2])||2,mobile:process.argv[3]==='mobile'}).then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1)});
