import {chromium,startServer,pageErrors,waitFor,Report,SHOTS} from './lib.mjs';

export async function run(){
  const R=new Report('security'),srv=await startServer(),browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=pageErrors(page,'security');
    await page.goto(srv.url);
    // Capture the real solo simulation as a test fixture without adding production hooks.
    await page.evaluate(async()=>{
      const {Game}=await import('/shared/game.js');const step=Game.prototype.step;
      Game.prototype.step=function(...args){window.securityGame=this;return step.apply(this,args);};
    });
    await page.click('[data-act="solo"]');await page.click('[data-animal="elephant"]');await page.click('#animals-go');
    await waitFor(()=>page.evaluate(()=>!!window.securityGame),{what:'solo simulation'});
    await page.evaluate(()=>{
      const g=window.securityGame,p=g.players.values().next().value;
      const gate=g.gate(g.zoo.enclosures[p.enc].mainGate),[x,y]=gate.tiles[0];
      p.prepared=true;p.x=x+.5;p.y=y-.5;
    });
    await page.waitForTimeout(200);
    await page.keyboard.press('Space');await page.waitForTimeout(150);
    R.ok('quick clicks do not damage the gate',await page.evaluate(()=>!(window.securityGame.gates.find(g=>g.kind==='main'&&g.enc===3).hits)));
    await page.keyboard.down('Space');await page.waitForTimeout(2700);await page.keyboard.up('Space');
    R.ok('a held charge lands only one blow and emits a sound caption',(await page.evaluate(()=>window.securityGame.gates.find(g=>g.kind==='main'&&g.enc===3).hits===1)) && (await page.locator('#captions').innerText()).includes('[Bang!]'));
    for(let i=0;i<2;i++){await page.waitForTimeout(100);await page.keyboard.down('Space');await page.waitForTimeout(1400);await page.keyboard.up('Space');}
    R.ok('three distinct charged hits break the original gate',await page.evaluate(()=>window.securityGame.gates.find(g=>g.kind==='main'&&g.enc===3).broken===true));
    await page.evaluate(()=>{const g=window.securityGame,p=g.players.values().next().value;g._returnToEnclosure(p);p.prepared=true;});
    await page.waitForTimeout(150);
    R.ok('capture repairs the gate and raises its requirement to four hits',await page.evaluate(()=>{
      const g=window.securityGame,p=g.players.values().next().value,gate=g.gate(g.zoo.enclosures[p.enc].mainGate);
      return !gate.state&&!gate.broken&&g.fortification.get(p.enc)===1;
    }));
    await page.evaluate(()=>{const g=window.securityGame,p=g.players.values().next().value;g._radio(g.staff[0],p);});
    await waitFor(()=>page.locator('#objectives').innerText().then(t=>t.includes('Zoo alert:')),{what:'alert countdown in HUD'});
    R.ok('three-minute alert and widened vision reach the rendered client',await page.evaluate(()=>{
      const s=window.securityGame.snapshot();return s.security>=179&&s.st.every(g=>g.ar);
    }));
    await page.screenshot({path:`${SHOTS}/security-alert.png`});
    await page.evaluate(()=>{const g=window.securityGame;g.alertUntil=g.time;g.staff=[];const p=g.players.values().next().value;p.x=20.5;p.y=14.5;g.setTile(20,14,7);for(const [x,y]of [[19,14],[21,14],[20,13],[20,15]])g.setTile(x,y,1);g._postMove(p,0);});
    R.ok('elephants cannot hide in a single bush',await page.evaluate(()=>!window.securityGame.players.values().next().value.hidden));
    await page.evaluate(()=>{const g=window.securityGame;g.setTile(21,14,7);g._postMove(g.players.values().next().value,0);});
    R.ok('two adjoining bushes conceal an unwatched elephant',await page.evaluate(()=>window.securityGame.players.values().next().value.hidden));
    await page.waitForTimeout(150);
    R.ok('no browser errors during charge, repair, alert and hiding',errors.length===0,errors.join(' | '));
  }finally{await browser.close();srv.stop();}
  return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run().then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1);});
