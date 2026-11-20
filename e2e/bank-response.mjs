import {createServer} from '../server/index.js';
import {TICK} from '../shared/game.js';
import {chromium,waitFor,Report,pageErrors} from './lib.mjs';
export async function run(){
 const R=new Report('bank response timers'),srv=await createServer({port:0,host:'127.0.0.1',roomOptions:{staff:false},log:()=>{}}),browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=pageErrors(page,'bank-response');
  await page.goto(`http://127.0.0.1:${srv.port}/`);
  for(const id of ['redpanda','elephant','monkey','beaver','giraffe','penguin','zebra','meerkat','tortoise','flamingo'])await page.locator(`[data-parade-animal="${id}"]`).click();
  await page.selectOption('#start-at','city');await page.click('[data-act=create]');await page.click('[data-animal=beaver]');await page.click('#animals-go');await page.click('#lobby-start');
  const room=[...srv.rooms.values()][0];await waitFor(()=>room.game?.zooId==='city');const g=room.game,p=g.activePlayers()[0],n=g.humans.find(n=>n.scene==='bank');
  p.inVehicle=false;p.vehicleId=null;g._enter(p,'bank');p.x=14.7;p.y=145.5;p.face='right';p.grace=99999;n.x=15.5;n.y=145.5;n.wait=999;n.path=null;n.carId=null;g.humans=[n];g.staff=[];
  await waitFor(()=>page.evaluate(()=>window.__bb.app.world?.snap?.phase==='play'&&!window.__bb.app.overlay));await page.locator('#game').click({position:{x:450,y:300}});await page.keyboard.press('KeyB');await waitFor(()=>n.asleep,{what:'bank customer bitten'});
  await waitFor(()=>page.locator('#control-countdown progress').getAttribute('max').then(v=>v==='120'));
  R.ok('biting starts the displayed two-minute bank timer',g.controlAlarm>118&&g.localControl.length===0);
  for(let i=0;i<13/TICK;i++)g.step(TICK);
  R.ok('no keepers or police arrive through the old twelve-second shortcut',!g.staff.some(s=>s.scene==='bank')&&!g.controlArrived);
  const [wx,wy]=g.zoo.bankLayout.wheel;p.x=wx+.5;p.y=wy+.5;await page.waitForTimeout(250);await page.keyboard.down('KeyE');await waitFor(()=>g.gate('city-vault').state);await page.keyboard.up('KeyE');
  await waitFor(()=>page.locator('#control-countdown progress').getAttribute('max').then(v=>v==='30'));
  R.ok('opening the vault switches the live display to thirty seconds',g.controlKind==='police'&&g.controlAlarm>28&&!g.staff.some(s=>s.scene==='bank'));
  while(g.controlAlarm>.5)g.step(TICK);
  R.ok('the bank stays clear until the police countdown expires',!g.controlArrived&&!g.staff.some(s=>s.scene==='bank'));
  for(let i=0;i<1/TICK;i++)g.step(TICK);
  R.ok('police arrive when the thirty-second timer finishes',g.controlArrived&&g.staff.filter(s=>s.scene==='bank'&&s.police).length===2);
  R.ok('bank interaction and timer display have no browser errors',errors.length===0,errors.join(' | '));
 }finally{await browser.close();await srv.close();}return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run().then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1);});
