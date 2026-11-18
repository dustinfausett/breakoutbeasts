import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../shared/game.js';
import {CityGame} from '../shared/city-game.js';
import {stepStamina,groundSpot,nearDigLock} from '../shared/mobility.js';
import {makeKeepers} from '../shared/staff.js';
import {prepareTakeoff,stepRunway,flightPersonal} from '../shared/runway.js';
const make=animal=>new Game({players:[{id:'a',animal}],options:{staff:false}});
test('stamina drains 25 percent faster; stopping yellow locks running until above 75 percent',()=>{
 const p={stamina:1,sprintT:1,running:true};stepStamina(p,1,true);assert.equal(p.stamina,.6875);assert.ok(!p.staminaYellow);
 stepStamina(p,1,true);assert.equal(p.stamina,.375);assert.equal(p.staminaYellow,true);assert.ok(!p.exhausted,'can keep using yellow stamina');
 stepStamina(p,.05,false);assert.equal(p.exhausted,true);assert.equal(p.sprintT,0);
 while(p.stamina<.72)stepStamina(p,.05,false);assert.equal(p.exhausted,true);assert.equal(p.staminaYellow,true);
 while(p.stamina<=.75)stepStamina(p,.05,false);assert.equal(p.exhausted,false);assert.equal(p.staminaYellow,false);
});
test('stamina colors and values reach teammates as well as the local player',()=>{
 const g=make('beaver'),p=g.players.get('a');p.stamina=.4;p.staminaYellow=true;p.exhausted=true;
 assert.equal(g.snapshot().pl[0].stamina,.4);assert.equal(g.snapshot().pl[0].staminaYellow,true);assert.equal(g.personal('a').staminaYellow,true);
});
test('flamingo throws its voice fifteen tiles in each facing direction, drawing guards to the sound',()=>{
 for(const [face,dx,dy] of [['right',1,0],['left',-1,0],['up',0,-1],['down',0,1]]){
  const g=make('flamingo'),p=g.players.get('a');p.x=40.5;p.y=30.5;p.face=face;
  g.staff=makeKeepers([{route:[[40+dx*15,30+dy*15]],start:0}],1);
  g._nearestStaffTile=(x,y)=>[x,y];g.abilityTarget(p).run();
  const e=g.drainEvents().find(e=>e.k==='ventriloquism');assert.equal(e.x,p.x+15*dx);assert.equal(e.y,p.y+15*dy);
  assert.equal(g.staff[0].state,'investigate');assert.deepEqual(g.staff[0].goal,[40+15*dx,30+15*dy]);assert.ok(g.abilityTarget(p).idle);
 }
});
test('meerkat cannot start or finish a free dig directly beside lock fixtures',()=>{
 const g=new CityGame({players:[{id:'a',animal:'meerkat'}],options:{staff:false}}),p=g.players.get('a');p.inVehicle=false;p.location='bank';p.x=20.5;p.y=141.5;
 assert.equal(nearDigLock(g,p,20,141),true);assert.equal(groundSpot(g,p,20,141),false);assert.ok(g.abilityTarget(p).idle);
 p.x=18.5;p.y=138.5;g.abilityTarget(p).run();assert.ok(p.digChoice);g.digAction('a',{op:'choose',x:22,y:141});assert.ok(p.digChoice);assert.equal(p.digTarget,null);
});
test('tunneling into the closed vault calls police with a full response delay and does not reset it',()=>{
 const g=new CityGame({players:[{id:'a',animal:'meerkat'}],options:{staff:false}}),p=g.players.get('a');p.inVehicle=false;p.location='bank';p.x=18.5;p.y=138.5;p.grace=100;
 g.abilityTarget(p).run();g.digAction('a',{op:'choose',x:27,y:138});assert.equal(p.digChoice,null);assert.ok(p.digTarget);
 g.abilityTarget(p).run();for(let i=0;i<45&&p.hold;i++)g._continueHold(p,{sp:true},.05);assert.ok(p.under);
 for(let i=0;i<16;i++)g.step(.05);
 assert.equal(p.x,27.5);assert.equal(g.controlKind,'police');assert.ok(g.controlAlarm>29&&g.controlAlarm<30);assert.ok(!g.staff.some(s=>s.police&&s.scene==='bank'));
 const left=g.controlAlarm;for(let i=0;i<20;i++)g.step(.05);assert.ok(g.controlAlarm<left-.9);assert.equal(g.gate('city-vault').state,0);
});
test('caller warnings describe the problem, remain private, and clear when corrected',()=>{
 const g=new CityGame({players:[{id:'a',animal:'beaver'},{id:'b',animal:'elephant'}],options:{staff:false}});prepareTakeoff(g);stepRunway(g,.05);
 const f=g.rescue.flight,caller=g.players.get(f.reader),other=g.activePlayers().find(p=>p!==caller);f.values.fuel=100;f.values.left=80;f.values.right=45;
 assert.ok(flightPersonal(g,caller).warnings.includes('Engine thrust does not match.'));assert.deepEqual(flightPersonal(g,other).warnings,[]);
 f.values.right=80;f.damage=0;assert.deepEqual(flightPersonal(g,caller).warnings,[]);
});
test('releasing Run while yellow locks immediately, including the lingering sprint animation',()=>{
 const g=make('beaver'),p=g.players.get('a');p.x=30.5;p.y=28.5;p.stamina=.4;p.staminaYellow=true;p.running=true;p.sprintT=.1;
 g.setInput('a',{mx:1,my:0,run:false});g.step(.05);assert.equal(p.exhausted,true);assert.equal(p.running,false);
 g.setInput('a',{mx:1,my:0,run:true});g.step(.05);assert.equal(p.running,false);assert.equal(p.exhausted,true);
});
