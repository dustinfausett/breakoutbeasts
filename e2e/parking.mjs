import {createServer} from '../server/index.js';import {chromium,waitFor,Report,SHOTS,pageErrors} from './lib.mjs';
const animals=['redpanda','elephant','monkey','beaver','giraffe','penguin','zebra','meerkat'];
export async function run({players=2,mobile=false,hard=false,landscape=false}={}){
 const R=new Report('parking '+players),srv=await createServer({port:0,host:'127.0.0.1',log:()=>{}}),browser=await chromium.launch();
 try{
  const url='http://127.0.0.1:'+srv.port+'/',pages=[],errors=[];
  for(let i=0;i<players;i++){
   const page=await browser.newPage({viewport:mobile?(landscape?{width:844,height:390}:{width:390,height:844}):{width:1200,height:850},isMobile:mobile,hasTouch:mobile});pages.push(page);errors.push(pageErrors(page,'crew'+i));await page.goto(i?url+'?room='+[...srv.rooms.keys()][0]:url);
   if(hard)await page.locator(i?'#join-hard':'#title #title-hard').check();
   if(!i){await page.fill('#name','Crew 1');await page.click('[data-act="create"]');}else{await page.fill('#join-name','Crew '+(i+1));await page.click('[data-act="join-go"]');}
   await page.click(`[data-animal="${animals[i]}"]`);await page.click('#animals-go');if(i)await page.click('#lobby-ready');
  }
  const host=pages[0];await host.bringToFront();await host.click('#lobby-start');const room=[...srv.rooms.values()][0];await waitFor(()=>room.game);
  R.ok('keeper count scales with the crew',room.game.staff.length===[6,6,7,7,8,8,9,9][players-1]);
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
  if(players>1){
   for(const p of g.activePlayers())g._returnToEnclosure(p);
   await Promise.all(pages.map(p=>p.keyboard.down('KeyE')));
   await waitFor(()=>g.activePlayers().every(p=>!p.caged),{what:'whole crew wall escape'});
   await Promise.all(pages.map(p=>p.keyboard.up('KeyE')));R.ok('every captured animal can grab a separate wall to open the cage',g.gate('holding-gate').state===1);
   const caught=g.activePlayers()[0],rescuer=g.activePlayers()[1];g._returnToEnclosure(caught);rescuer.x=9.5;rescuer.y=55.5;await pages[1].waitForTimeout(200);await pages[1].keyboard.press('KeyE');await waitFor(()=>!caught.caged,{what:'uncaptured teammate opens cage'});R.ok('an uncaptured teammate can open the cage without keys',!rescuer.cageKeys);
  }
  const a=g.activePlayers()[0],guard=g.staff[0];
  // Freeze one keeper and move other keepers away to make real hold-E theft
  // repeatable; the actual game key check and hold completion are unchanged.
  for(const s of g.staff){s.x=60.5;s.y=38.5;s.state='cheer';s.cheer=100;}
  guard.x=20.5;guard.y=5.5;guard.dir=0;guard.state='cheer';guard.cheer=100;guard.downUntil=0;
  a.x=19;a.y=5.5;room.queues.clear();await host.waitForTimeout(150);await host.keyboard.down('KeyE');await waitFor(()=>a.cageKeys===1,{what:'real parking key theft'});await host.keyboard.up('KeyE');
  await waitFor(()=>host.locator('#key-fob').isVisible());R.ok('only the animal with stolen keys receives a fob',await pages[1].locator('#key-fob').isHidden());
  await host.locator('.fob-toggle').click();await host.locator('[data-fob="unlock"]').click();await waitFor(()=>g.vehicle.unlocked);R.ok('fob unlock flashes the car lights without boarding',g.vehicle.lightsUntil>g.time&&!a.inVehicle);
  await host.locator('[data-fob="panic"]').click();await waitFor(()=>g.vehicle.alarmUntil>g.time);R.ok('panic starts the real car alarm',true);
  await host.locator('.fob-toggle').click();
  R.ok('holding E behind an unwatched keeper steals real parking keys',a.cageKeys===1);
  a.x=48.5;a.y=21.5;await host.waitForTimeout(150);await host.screenshot({path:`${SHOTS}/parking-lot-${players}${mobile?'-mobile':''}p.png`});
  async function enter(i){const p=g.activePlayers()[i],page=pages[i];await page.bringToFront();const door=g._door();p.x=door[0];p.y=door[1];p.prevE=false;p.input={};room.queues.clear();await page.waitForTimeout(150);await page.click('#tbtn-e');await waitFor(()=>p.inVehicle,{what:'car entry '+i});await waitFor(()=>page.locator('#vehicle-panel').isVisible());}
  await enter(0);R.ok('stolen keys unlock the getaway wagon',g.vehicle.unlocked);
  if(players>1)R.ok('controls wait until the crew is aboard',await host.locator('[data-hold-control],[data-car-control]').first().isDisabled());
  for(let i=1;i<players;i++)await enter(i);
  await host.screenshot({path:`${SHOTS}/getaway-controls-${players}${mobile?'-mobile':''}p.png`});
  if(hard){const pixels=await host.evaluate(()=>{const a=window.__bb.app,r=a.renderer,c=a.world.snap.obj.parking.car,ctx=r.canvas.getContext('2d');return [4,-4].map(d=>{const x=Math.round(((c.x+d)*16-r.cam.x)*r.scale),y=Math.round((c.y*16-r.cam.y)*r.scale);return [...ctx.getImageData(x,y,1,1).data].slice(0,3).reduce((a,b)=>a+b,0);});});R.ok('Hard-mode windshield keeps the map visible ahead and behind',pixels[0]>45&&pixels[1]>45,pixels.join(','));}
  const ownership=[];
  for(let i=0;i<players;i++){
   const page=pages[i];await waitFor(()=>page.locator('#vehicle-panel button:not([data-car-leave])').first().isEnabled());
   const controls=await page.evaluate(()=>window.__bb.app.world.snap.me.vehicle.controls);ownership.push(...controls.map(c=>c.id));
   for(const c of controls.filter(c=>c.kind==='gear')){const knob=page.locator('[data-gear-handle]'),b=await knob.boundingBox(),track=await page.locator('.gear-gate').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,track.y+track.height-12);await page.mouse.up();}
   for(const c of controls.filter(c=>c.kind==='select'))await page.locator(`[data-car-control="${c.id}"][data-car-value="${c.goal}"]`).click();
  }
  R.ok('players have separate continuous driving jobs',new Set(ownership).size===Math.max(4,players));
  R.ok('cockpit leaves the live parking lot visible',await host.locator('#vehicle-panel').evaluate(e=>e.getBoundingClientRect().height<innerHeight*.55));
  const pageFor=role=>pages[Number(g.vehicle.owners[role].slice(1))-1],driver=pageFor('steering'),gas=pageFor('gas'),brake=pageFor('brake');
  const wheel=driver.locator('[data-hold-control="steering"]'),box=await wheel.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
  await driver.mouse.move(cx,cy);await driver.mouse.down();
  await gas.locator('[data-hold-control="gas"]').hover();await gas.mouse.down();await waitFor(()=>g.vehicle.speed>1,{what:'hold gas accelerates'});
  R.ok('holding the gas pedal makes the car move',g.vehicle.speed>0);
  await gas.mouse.up();await waitFor(()=>g.vehicle.values.gas===0);await brake.locator('[data-hold-control="brake"]').hover();await brake.mouse.down();await waitFor(()=>g.vehicle.speed<.1,{what:'hold brake stops'});await brake.mouse.up();
  R.ok('holding the brake pedal stops the moving car',Math.abs(g.vehicle.speed)<.1);
  await driver.mouse.move(cx+45,cy);await waitFor(()=>g.vehicle.values.steering>.4);await driver.mouse.up();await waitFor(()=>g.vehicle.values.steering===0);R.ok('wheel drag steers while held and releasing clears steering',true);await driver.mouse.move(cx,cy);await driver.mouse.down();
  let gasDown=false,brakeDown=false,waypoint=0;const deadline=Date.now()+35000;
  while(room.phase!=='complete'&&Date.now()<deadline){
   const car=g.vehicle,route=g.objectives().parking.route;if(waypoint<route.length-1&&Math.hypot(car.x-route[waypoint][0],car.y-route[waypoint][1])<1.5)waypoint++;const target=route[waypoint],distance=99;
   let error=Math.atan2(target[1]-car.y,target[0]-car.x)-car.angle;while(error>Math.PI)error-=Math.PI*2;while(error< -Math.PI)error+=Math.PI*2;const turn=Math.max(-1,Math.min(1,error*1.8));
   await driver.mouse.move(cx+turn*90,cy);
   const wantGas=distance>1.5&&Math.abs(car.speed)<3.2,wantBrake=distance<=1.5||Math.abs(car.speed)>3.8;
   if(gasDown!==wantGas){await gas.locator('[data-hold-control="gas"]').focus();await gas.keyboard[wantGas?'down':'up']('Space');gasDown=wantGas;}
   if(brakeDown!==wantBrake){await brake.locator('[data-hold-control="brake"]').focus();await brake.keyboard[wantBrake?'down':'up']('Space');brakeDown=wantBrake;}
   await host.waitForTimeout(100);
  }
  await driver.mouse.up();await gas.keyboard.up('Space');await brake.keyboard.up('Space');
  await waitFor(()=>room.phase==='complete',{what:'cooperative car theft'});
  await waitFor(()=>host.locator('#complete-h').innerText().then(s=>s==='Parking lot escaped!'));
  R.ok('correct shared controls steal the car and show the next result',room.results.carStolen&&room.results.stage==='parking');
  await host.locator('[data-act="continue"]').click();await waitFor(()=>room.game.zooId==='city');await waitFor(()=>host.evaluate(()=>window.__bb.app.world?.zoo.id==='city'));R.ok('Continue loads the large shared city driving map',room.game.zoo.destinations.length===9);await host.waitForTimeout(250);await host.screenshot({path:`${SHOTS}/city-driving-${players}${mobile?'-mobile':''}p.png`});
  R.ok('new stage has no browser errors',errors.every(e=>!e.length),errors.flat().join(' | '));
 }finally{await browser.close();await srv.close();}return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run({players:Number(process.argv[2])||2,mobile:['mobile','landscape'].includes(process.argv[3]),landscape:process.argv[3]==='landscape',hard:process.argv[3]==='hard'}).then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1)});
