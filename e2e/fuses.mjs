import {createServer} from '../server/index.js';import {chromium,waitFor,Report,SHOTS,pageErrors} from './lib.mjs';
const animals=['redpanda','elephant','monkey','beaver','giraffe','penguin','zebra','meerkat'];
export async function run({players=6}={}){
 const R=new Report('fuses '+players),srv=await createServer({port:0,host:'127.0.0.1',roomOptions:{staff:false},log:()=>{}}),browser=await chromium.launch();
 try{
  const url='http://127.0.0.1:'+srv.port+'/',pages=[],errors=[];
  for(let i=0;i<players;i++){
   const p=await browser.newPage({viewport:{width:1200,height:850}});pages.push(p);errors.push(pageErrors(p,'fuse operator '+i));await p.goto(i?url+'?room='+[...srv.rooms.keys()][0]:url);
   if(!i){await p.fill('#name','Beast 1');await p.click('[data-act="create"]');}else{await p.fill('#join-name','Beast '+(i+1));await p.click('[data-act="join-go"]');}
   await p.click(`[data-animal="${animals[i]}"]`);await p.click('#animals-go');if(i)await p.click('#lobby-ready');
  }
  const host=pages[0];await host.click('#lobby-start');const room=[...srv.rooms.values()][0];await waitFor(()=>room.game);const g=room.game;
  await waitFor(async()=>{for(const p of pages)if(!(await p.evaluate(()=>!!window.__bb.app.world?.snap?.me)))return false;return true;});
  R.ok('every player has a separate real fuse cage',g.parts.length===players&&new Set(g.parts.map(p=>g.bayState[p.bay].cage)).size===players&&g.objects.filter(o=>o.kind==='cage').length===players);
  R.ok('generator has eight separate sockets',g.objects.filter(o=>o.kind==='socket').length===8);
  await host.click('#objectives-toggle');
  R.ok('the HUD shows every assigned fuse and the workshop route',(await host.locator('#objectives').innerText()).includes(players+' assigned bays')&&(await host.locator('#objectives').innerText()).includes('FUSE WORKSHOP'));
  await host.click('#objectives-toggle');
  const guest=pages[4],animal=g.players.get('p5'),down=g.objects.find(o=>o.kind==='fusePassage'&&o.y<50),up=g.objects.find(o=>o.kind==='fusePassage'&&o.y>50);
  // Place the escaped animal at the stairs; transitions use real E input.
  for(const [passage,below] of [[down,true],[up,false]]){
   await guest.bringToFront();animal.x=passage.stand[0]+.5;animal.y=passage.stand[1]+.5;animal.input={};animal.prevE=false;room.queues.clear();await guest.waitForTimeout(150);await guest.click('#tbtn-e');await waitFor(()=>below?animal.y>60:animal.y<50);
   if(below){await guest.waitForTimeout(150);await guest.screenshot({path:`${SHOTS}/fuse-workshop-${players}p.png`});}
  }
  R.ok('the workshop is directly accessible from the generator yard in both directions',true);
  // Isolate the fuse mission without pre-opening, awarding or inserting fuses.
  for(const [i,p] of g.activePlayers().entries()){p.x=12.5+i%3;p.y=35.5+Math.floor(i/3);p.input={};p.prevE=false;p.escaped=true;p.grace=1000;}room.queues.clear();
  await host.waitForTimeout(200);
  for(const p of pages)await p.evaluate(async()=>{const {Autopilot}=await import('./shared/bot.js');window.__bb.app.bot=new Autopilot(window.__bb.app.myId);});
  try{await waitFor(()=>g.powerDone(),{timeout:90000,what:players+' collected and inserted fuses'});}catch(error){console.log('Fuse state',g.parts.map(p=>({bay:p.bay+1,opened:p.opened,breaker:p.breaker,fuse:p.fuse,inserted:p.inserted})));console.log('Players',g.activePlayers().map(p=>({id:p.id,x:p.x,y:p.y,carry:p.carry})));console.log('Browser plans',await Promise.all(pages.map(p=>p.evaluate(()=>window.__bb.botState()))));throw error;}
  for(const p of pages)await p.evaluate(()=>window.__bb.app.bot=null);
  R.ok('every animal solves a bay and delivers its fuse to the generator',g.parts.every(p=>p.opened&&p.breaker&&p.inserted));
  R.ok('the generator receives one fuse per active player',g.objects.filter(o=>o.kind==='socket'&&o.state===1).length===players);
  await waitFor(async()=>{for(const p of pages)if(!(await p.evaluate(()=>window.__bb.app.world.snap.obj.power.done)))return false;return true;});
  R.ok('power completion synchronizes to every browser',true);
  const h=g.players.get('p1');h.x=12.5;h.y=35.5;h.input={};room.queues.clear();await host.waitForTimeout(200);await host.screenshot({path:`${SHOTS}/powered-generator-${players}p.png`});
  R.ok('no browser errors during the larger-team fuse mission',errors.every(e=>!e.length),errors.flat().join(' | '));
 }finally{await browser.close();await srv.close();}return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run({players:Number(process.argv[2])||6}).then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1)});
