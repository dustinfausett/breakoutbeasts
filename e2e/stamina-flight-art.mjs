import {createServer} from '../server/index.js';
import {chromium,waitFor,Report,pageErrors,SHOTS} from './lib.mjs';
import {ANIMAL_IDS} from '../shared/animals.js';
export async function run(){
 const R=new Report('stamina and cockpit artwork'),srv=await createServer({port:0,host:'127.0.0.1',roomOptions:{staff:false},log:()=>{}}),browser=await chromium.launch();
 try{
  const url=`http://127.0.0.1:${srv.port}/`,desktop=await browser.newPage({viewport:{width:1200,height:900}}),errors=[pageErrors(desktop,'desktop')];
  await desktop.goto(url);await desktop.click('[data-act=create]');await desktop.click('[data-animal=beaver]');await desktop.click('#animals-go');await desktop.click('#lobby-start');
  const room=[...srv.rooms.values()][0];await waitFor(()=>room.game);const host=room.game.activePlayers()[0];host.stamina=.35;host.staminaYellow=true;host.exhausted=true;
  await waitFor(()=>desktop.locator('.tm.me .tag-stamina.yellow').count().then(n=>n===1));
  R.ok('desktop stamina belongs at the bottom of the player name tag',await desktop.locator('.tm.me .tag-stamina').isVisible()&&await desktop.locator('#stamina').isHidden());
  const {box,bar}=await desktop.evaluate(()=>{const n=document.querySelector('.tm.me');return {box:n.getBoundingClientRect().toJSON(),bar:n.querySelector('.tag-stamina').getBoundingClientRect().toJSON()};});R.ok('name-tag bar stays within the tag',bar.y>box.y&&bar.y+bar.height<=box.y+box.height+1,JSON.stringify({box,bar}));
  await desktop.screenshot({path:SHOTS+'/stamina-desktop.png'});
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});errors.push(pageErrors(phone,'phone'));await phone.goto(url+'?room='+room.code);await phone.click('[data-act=join-go]');await phone.click('[data-animal=flamingo]');await phone.click('#animals-go');await waitFor(()=>phone.locator('#stamina').isVisible());
  for(const [width,height,name] of [[390,844,'portrait'],[844,390,'landscape']]){
   await phone.setViewportSize({width,height});await phone.waitForTimeout(250);const r=await phone.locator('#stamina').boundingBox();
   R.ok('device stamina is an unlabeled bottom strip in '+name,r.y+r.height>=height-30&&r.y+r.height<=height&&await phone.locator('#stamina').innerText()==='');
   await phone.screenshot({path:SHOTS+'/stamina-'+name+'.png'});
  }
  const pilot=await browser.newPage({viewport:{width:1200,height:1000}});errors.push(pageErrors(pilot,'pilot'));await pilot.goto(url+'?nostaff=1');for(const id of ANIMAL_IDS)await pilot.locator(`[data-parade-animal="${id}"]`).click();await pilot.selectOption('#start-at','takeoff');await pilot.click('[data-act=solo]');await pilot.click('[data-animal=beaver]');await pilot.click('#animals-go');await waitFor(()=>pilot.locator('#instruction-current').isVisible());
  const terminal=await pilot.locator('#caller').evaluate(n=>{const s=getComputedStyle(n);return {bg:s.backgroundColor,font:s.fontFamily};});R.ok('instructions use a dark monospace DOS terminal',terminal.bg==='rgb(7, 23, 19)'&&terminal.font.includes('Courier'));
  await pilot.evaluate(()=>{const f=window.__bb.app.link.room.game.rescue.flight;f.values.fuel=0;f.values.left=80;f.values.right=20;});
  await waitFor(()=>pilot.locator('#flight-warning-message').innerText().then(t=>t.includes('Engine thrust does not match.')));R.ok('caller gets a readable warning instead of only a light',await pilot.locator('#flight-warning-screen.alert').isVisible());
  R.ok('generated controls load with transparent sprite artwork',await pilot.evaluate(()=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src='assets/flight-controls.png';})));
  await pilot.evaluate(()=>{const f=window.__bb.app.link.room.game.rescue.flight;f.values.left=0;f.values.right=0;f.targets.left=0;f.targets.right=0;});await pilot.waitForTimeout(200);await pilot.locator('[data-flight-input=left]').scrollIntoViewIfNeeded();const before=await pilot.locator('[data-flight-input=left] canvas').evaluate(c=>c.toDataURL());const lever=await pilot.locator('[data-flight-input=left]').boundingBox();await pilot.mouse.move(lever.x+lever.width/2,lever.y+lever.height*.8);await pilot.mouse.down();await pilot.mouse.move(lever.x+lever.width/2,lever.y+lever.height*.2,{steps:12});await pilot.waitForTimeout(400);await pilot.mouse.up();
  R.ok('dragging a thrust lever animates its generated handle',before!==await pilot.locator('[data-flight-input=left] canvas').evaluate(c=>c.toDataURL()));
  await pilot.screenshot({path:SHOTS+'/flight-new-controls.png'});
  const camera=await pilot.evaluate(async()=>{const {flightCamera}=await import('./flight-art.js');return [flightCamera(0,300),flightCamera(1000,300)];});R.ok('at 1000 feet the ground drops out of frame and the plane rises',camera[1].groundDrop>300*.8&&camera[1].planeY<camera[0].planeY-60);
  await pilot.evaluate(()=>{const g=window.__bb.app.link.room.game,f=g.rescue.flight;Object.assign(f,{altitude:1000,distance:2500,speed:150,angle:10,roll:0});f.values.fuel=100;});await pilot.locator('#flight-view').scrollIntoViewIfNeeded();await pilot.waitForTimeout(150);await pilot.screenshot({path:SHOTS+'/flight-above-clouds.png'});
  R.ok('no browser errors',errors.every(e=>!e.length),errors.flat().join(' | '));
 }finally{await browser.close();await srv.close();}
 return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run().then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1)});
