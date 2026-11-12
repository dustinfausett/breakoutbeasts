import {createServer} from '../server/index.js';
import {chromium,waitFor,Report,SHOTS,pageErrors} from './lib.mjs';
const animals=['redpanda','elephant','monkey','beaver','giraffe','penguin','zebra','meerkat'];

export async function run(){
 const R=new Report('control house'),srv=await createServer({port:0,host:'127.0.0.1',roomOptions:{staff:false},log:()=>{}}),browser=await chromium.launch();
 try{
  const url=`http://127.0.0.1:${srv.port}/`,pages=[],errors=[];
  for(let i=0;i<8;i++){
   const context=await browser.newContext({viewport:{width:1200,height:850}}),p=await context.newPage();pages.push(p);errors.push(pageErrors(p,'operator'+i));
   await p.goto(i?url+'?room='+([...srv.rooms.keys()][0]):url);
   if(!i){await p.fill('#name','Beast 1');await p.click('[data-act="create"]');}
   else {await p.fill('#join-name','Beast '+(i+1));await p.click('[data-act="join-go"]');}
   await p.click(`[data-animal="${animals[i]}"]`);await p.click('#animals-go');
   if(i)await p.click('#lobby-ready');
  }
  const host=pages[0];await host.bringToFront();await waitFor(()=>host.locator('#lobby-start').isEnabled());
  R.ok('eight real browser clients join the same room',await host.locator('#lobby-players li:not(.empty)').count()===8);
  await host.screenshot({path:`${SHOTS}/eight-player-lobby.png`});
  const extra=await browser.newPage();await extra.goto(url+'?room='+[...srv.rooms.keys()][0]);await extra.click('[data-act="join-go"]');
  await waitFor(()=>extra.locator('#join-msg').innerText().then(t=>t.includes('full')));R.ok('a ninth browser cannot join',true);await extra.close();
  await host.click('#lobby-start');await waitFor(()=>pages.every(p=>true)&&[...srv.rooms.values()][0]?.game);
  const room=[...srv.rooms.values()][0],g=room.game;
  await waitFor(async()=>{for(const p of pages)if(!(await p.evaluate(()=>!!window.__bb.app.world?.snap)))return false;return true;});
  R.ok('mouse action buttons are available on desktop',await host.locator('#tbtn-e').isVisible()&&await host.locator('#tbtn-b').isVisible());
  for(const part of g.parts)part.inserted=true;g.stats.rescued=g.requiredRescues;
  async function enterAll(){
   for(let i=0;i<8;i++){
    const page=pages[i],p=g.players.get('p'+(i+1)),door=g.objects.find(o=>o.kind==='controlDoor'&&o.index===(i===0?7:g.controlRoom.panels[p.id].doorIndex));
    await page.bringToFront();p.x=door.stand[0]+.5;p.y=door.stand[1]+.5;p.input={mx:0,my:0};p.prevE=false;p.capturedT=0;p.escaped=true;room.queues.clear();
    await page.waitForTimeout(100);await page.click('#tbtn-e');await waitFor(()=>!!p.inControlRoom,{what:'separate entrance '+i});
    await waitFor(()=>page.locator('#control-room').isVisible());
    if(!i)R.ok('power stays disabled until everyone enters',await page.locator('#panel-power').isDisabled());
   }
  }
  await enterAll();await waitFor(()=>g.controlRoom.phase==='arming');
  R.ok('animals choose free rooms and each operator occupies a separate room',new Set(Object.values(g.controlRoom.entered)).size===8);
  await waitFor(()=>host.locator('#panel-power').getAttribute('class').then(c=>c.includes('flashing')));
  R.ok('red power buttons flash when the entire team is in place',true);
  await host.fill('#panel-chat-input','Tell me what your screen says!');await host.locator('#panel-chat-form button').click();
  await waitFor(()=>pages[7].locator('#panel-chat-log').innerText().then(t=>t.includes('Tell me what')));
  R.ok('players can communicate manually inside the control room',true);
  g.controlRoom.remaining=8;await host.waitForTimeout(200);await host.screenshot({path:`${SHOTS}/control-house-break-in.png`});
  g.controlRoom.remaining=.01;await waitFor(()=>g.controlRoom.attempt===1);
  R.ok('timer expiry captures the whole team and resets the attempt',g.activePlayers().every(p=>p.capturedT>0&&!p.inControlRoom));
  await waitFor(()=>g.activePlayers().every(p=>p.capturedT===0));
  R.ok('captured animals return to reinforced enclosures without losing generator progress',g.activePlayers().every(p=>g.inOwnEnclosure(p)&&g.fortification.get(p.enc)===1)&&g.powerDone());
  await enterAll();for(const p of pages){await p.bringToFront();await p.click('#panel-power');}
  await waitFor(()=>g.controlRoom.phase==='running');await host.screenshot({path:`${SHOTS}/control-house-running.png`});
  const privateClues=await Promise.all(pages.map(p=>p.evaluate(()=>window.__bb.app.world.snap.me.control.instruction)));
  R.ok('every screen displays only an action for an anonymous station',privateClues.every(c=>/^(Set|Raise|Lower|Press|Release) /.test(c.text)));
  // The test acts as the players' spoken conversation: read a clue from one
  // browser and operate only the referenced controls in the other browser.
  let attempts=0;while(g.controlRoom.phase!=='complete'&&attempts++<100){for(let reader=0;reader<8&&g.controlRoom.phase!=='complete';reader++){
   const clue=await pages[reader].evaluate(()=>window.__bb.app.world.snap.me.control?.instruction);if(clue?.control==null||g.controlRoom.panels[clue.target].done!==clue.index)continue;
   const index=Number(clue.target.slice(1))-1,page=pages[index];await page.bringToFront();
   const control=g.controlRoom.panels[clue.target].controls[clue.control];
   if(control.kind!=='dial'){await page.locator(`[data-slot="${clue.control}"] button`).click();}
   else while(control.value!==clue.value){const current=control.value;await waitFor(async()=>(await page.locator(`[data-slot="${clue.control}"] output`).innerText())===String(current));const expected=(current+1)%(control.max+1);await page.locator(`[data-control="${clue.control}"][data-delta="1"]`).click();await waitFor(async()=>g.controlRoom.phase==='complete'||(await page.locator(`[data-slot="${clue.control}"] output`).innerText())===String(expected),{what:'dial display update'});}
   await waitFor(()=>g.controlRoom.panels[clue.target].done>clue.index,{what:'communicated task '+clue.index});
  }}
  await waitFor(()=>g.controlRoom.phase==='complete');
  R.ok('all eight operators complete five tasks and unlock the front gate',Object.values(g.controlRoom.panels).every(p=>p.done===5)&&g.gate(g.zoo.exitGate).state===1);
  await waitFor(()=>host.locator('#control-room').isHidden());
  R.ok('panels return to the zoo view after success',await host.locator('#control-room').isHidden());
  for(const p of g.activePlayers()){p.x=78.5;p.y=27.5;}
  await waitFor(()=>room.phase==='complete');R.ok('the team can leave through the opened front gate',true);
  R.ok('no browser errors in the eight-player puzzle',errors.every(e=>!e.length),errors.flat().join(' | '));
 }finally{await browser.close();await srv.close();}
 return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run().then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1);});
