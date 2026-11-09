import {createServer} from '../server/index.js';
import {chromium,waitFor,Report,SHOTS,pageErrors} from './lib.mjs';

export async function run(){
 const R=new Report('wild'),srv=await createServer({port:0,host:'127.0.0.1',log:()=>{}}),browser=await chromium.launch();
 try{
  const url=`http://127.0.0.1:${srv.port}/`;
  const hc=await browser.newContext({viewport:{width:1200,height:850}}),gc=await browser.newContext({viewport:{width:1200,height:850}});
  const host=await hc.newPage(),guest=await gc.newPage(),errors=[pageErrors(host,'host'),pageErrors(guest,'invite')];
  await host.goto(url);await host.locator('[data-act="create"]').waitFor();
  R.ok('original pixel logo loads',await host.locator('#title .pixel-logo').evaluate(img=>img.complete&&img.naturalWidth>0));
  await host.screenshot({path:`${SHOTS}/wild-logo.png`});
  await host.fill('#name','Piper');await host.click('[data-act="create"]');
  await host.click('[data-animal="redpanda"]');await host.click('#animals-go');
  await host.locator('#lobby-code').waitFor();const code=(await host.locator('#lobby-code').innerText()).trim();
  await guest.goto(url+'?room='+code);await guest.locator('#join-name').waitFor();
  await guest.fill('#join-name','River');await guest.check('#join-hard');
  await guest.screenshot({path:`${SHOTS}/invite-name.png`});
  await guest.click('[data-act="join-go"]');await guest.click('[data-animal="beaver"]');await guest.click('#animals-go');
  await waitFor(()=>host.evaluate(()=>window.__bb.app.lobby?.players.some(p=>p.name==='River')),{what:'invite name visible to host'});
  R.ok('invite-link player chooses a name and it reaches the shared lobby',true);
  await guest.click('#lobby-ready');await waitFor(()=>host.locator('#lobby-start').isEnabled());await host.click('#lobby-start');
  await waitFor(()=>guest.evaluate(()=>window.__bb.app.inGame&&!!window.__bb.app.world?.snap));
  R.ok('Hard mode is individual to each player',(await guest.evaluate(()=>window.__bb.app.renderer.settings.hard))&&!(await host.evaluate(()=>window.__bb.app.renderer.settings.hard)));
  const room=[...srv.rooms.values()][0],g=room.game,p=g.players.get('p1'),friend=g.players.get('p2');
  const reserve=g.staff[1];g.staff=g.staff.slice(0,1);const keeper=g.staff[0];
  keeper.x=20.5;keeper.y=14.5;keeper.dir=0;keeper.route=[[40,14]];keeper.wp=0;keeper.path=null;
  p.x=18.8;p.y=14.5;p.face='right';p.capturedT=0;p.grace=0;
  await host.waitForTimeout(150);const start=p.x;
  await host.keyboard.down('e');await host.keyboard.down('ArrowRight');await host.waitForTimeout(1050);await host.keyboard.up('ArrowRight');await host.keyboard.up('e');
  R.ok('holding E while walking steals a key in the live online game',p.cageKeys===1&&p.x>start+1,`keys=${p.cageKeys}, animal=${p.x.toFixed(2)}, guard=${keeper.x.toFixed(2)}, hold=${p.hold?.kind||'none'}`);
  await host.waitForTimeout(150);room.queues.clear();p.input={mx:0,my:0,e:false,sp:false,b:false};p.prevB=false;
  keeper.x=20.5;keeper.y=14.5;keeper.dir=0;keeper.route=[[20,14]];keeper.wp=0;keeper.path=[];keeper.state='patrol';
  p.x=19.3;p.y=14.5;p.face='right';p.biteCool=0;p.capturedT=0;p.grace=0;
  await host.keyboard.press('b');await waitFor(()=>keeper.state==='unconscious',{what:'keeper knocked unconscious'});
  R.ok('B knocks a keeper unconscious and enables permanent high alert',g.permanentAlert&&keeper.downUntil>g.time);
  await waitFor(()=>host.locator('#objectives').innerText().then(t=>t.includes('HIGH ALERT')));
  await host.screenshot({path:`${SHOTS}/bitten-keeper.png`});
  reserve.x=30.5;reserve.y=14.5;reserve.dir=0;reserve.route=[[30,14]];reserve.wp=0;reserve.path=[];reserve.state='patrol';g.staff.push(reserve);
  friend.x=34.5;friend.y=14.5;friend.capturedT=0;friend.grace=0;
  await waitFor(()=>friend.muzzled,{what:'tranquilizer hit',timeout:8000});
  await waitFor(()=>friend.capturedT<=0&&g.inOwnEnclosure(friend),{what:'muzzled return to enclosure'});
  R.ok('an awake keeper tranquilizes and muzzles a visible animal',friend.muzzled);
  await guest.screenshot({path:`${SHOTS}/muzzled-beaver.png`});
  await host.bringToFront();await host.waitForTimeout(100);
  p.x=friend.x-1;p.y=friend.y;p.face='right';p.biteCool=0;p.capturedT=0;p.grace=5;
  await host.keyboard.down('b');await host.waitForTimeout(150);await host.keyboard.up('b');await waitFor(()=>!friend.muzzled,{what:'teammate bites off muzzle',timeout:5000}).catch(e=>{console.log('Muzzle fixture',JSON.stringify({p:{x:p.x,y:p.y,mu:p.muzzled,cap:p.capturedT,face:p.face,input:p.input,prevB:p.prevB,biteCool:p.biteCool},friend:{x:friend.x,y:friend.y,cap:friend.capturedT,mu:friend.muzzled}}));throw e;});
  R.ok('a real teammate can bite off the muzzle',true);
  R.ok('minimap and map toggle are absent',await guest.locator('#minimap').count()===0);
  await guest.keyboard.press('m');
  await guest.bringToFront();
  g.staff=[];friend.x=20.5;friend.y=15.5;friend.face='right';friend.input={mx:0,my:0};
  for(let x=15;x<=34;x++)g.setTile(x,15,1);g.setTile(23,15,3);
  await guest.waitForTimeout(250);
  const sample=async(x,y)=>guest.evaluate(([x,y])=>{
    const r=window.__bb.app.renderer,S=r.scale,p=r.ctx.getImageData(Math.round(x*16*S-r.cam.x*S),Math.round(y*16*S-r.cam.y*S),1,1).data;
    return Array.from(p).slice(0,3).join(',');
  },[x,y]);
  R.ok('Hard mode renders the space behind the animal as black',(await sample(17.5,15.5))==='5,11,16');
  R.ok('Hard mode hides space beyond a wall',(await sample(25.5,15.5))==='5,11,16');
  R.ok('Hard mode still shows the wall’s near surface',(await sample(23.5,15.5))!=='5,11,16');
  g.setTile(23,15,1);await guest.waitForTimeout(200);
  R.ok('animal vision extends beyond keeper range',(await sample(32.5,15.5))!=='5,11,16');
  await guest.screenshot({path:`${SHOTS}/hard-vision.png`});
  R.ok('no browser errors in invite, theft, combat or Hard mode',errors.every(e=>e.length===0),errors.flat().join(' | '));
 }finally{await browser.close();await srv.close();}
 return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run().then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1);});
