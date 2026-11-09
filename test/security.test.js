import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,TICK,ALERT_SECONDS,staffProfile,visionPolygon} from '../shared/game.js';
import {T} from '../shared/tiles.js';
import {ANIMALS} from '../shared/animals.js';

function setup(animal='elephant',staff=true){const g=new Game({players:[{id:'p',animal}],options:{staff}});return [g,g.players.get('p')];}
function charge(g,p){g._useAbility(p);for(let n=0;n<26;n++)if(p.hold)g._continueHold(p,{sp:true},TICK);}

test('alert extends vision, lasts 180 seconds after the last sighting, then expires',()=>{
 const [g,p]=setup('redpanda');for(let y=13;y<=20;y++)for(let x=19;x<=29;x++)g.setTile(x,y,T.PATH);const s=g.staff[0];s.x=20.5;s.y=14.5;s.dir=0;p.x=26.5;p.y=14.5;
 assert.equal(g.canSee(s,p),false);
 g._raiseAlert();assert.equal(g.alertUntil,ALERT_SECONDS);assert.equal(g.canSee(s,p),true);
 p.x=24.5;p.y=18.5;assert.equal(g.canSee(s,p),true,'alert widens the cone');
 g.time=179;g._radio(s,p);assert.equal(g.alertUntil,359);
 g.time=358.9;assert.ok(g.snapshot().security>0);
 g.time=359;assert.equal(g.snapshot().security,0);assert.equal(g.canSee(s,p),false);
});

test('alert walking is faster and pursuit runs faster still; most animals outrun pursuit',()=>{
 const [g]=setup();const cfg=g.zoo.staff,alert=staffProfile(cfg,true);
 assert.ok(alert.patrolSpeed>cfg.patrolSpeed);assert.ok(cfg.chaseSpeed>alert.patrolSpeed);
 assert.ok(Object.values(ANIMALS).filter(a=>a.speed>cfg.chaseSpeed).length>=8);
 const s=g.staff[0];s.route=[[30,14]];s.wp=0;s.x=20.5;s.y=14.5;s.path=[[21,14]];
 g._stepStaff(s,.1);const normal=s.x-20.5;s.x=20.5;s.y=14.5;s.path=[[21,14]];
 g._raiseAlert();g._stepStaff(s,.1);assert.ok(s.x-20.5>normal);
 const points=visionPolygon(g,{x:20.5,y:14.5,d:0,ar:true},cfg,2);
 assert.ok(points[2][0]>20.5+cfg.range,'rendered cone uses alert range');
});

test('short clicks and interrupted charges cannot damage a gate; sustained press hits once',()=>{
 const [g,p]=setup('elephant',false);p.prepared=true;const gate=g.gate(g.zoo.enclosures[p.enc].mainGate);const [x,y]=gate.tiles[0];p.x=x+.5;p.y=y-.5;
 g._useAbility(p);g._continueHold(p,{sp:true},.3);g._continueHold(p,{sp:false},TICK);assert.equal(gate.hits||0,0);
 g._useAbility(p);g._continueHold(p,{sp:true,mx:1},1.3);assert.equal(gate.hits||0,0);
 g.setInput('p',{});g.step();g.setInput('p',{sp:true});for(let i=0;i<70;i++)g.step();
 assert.equal(gate.hits,1,'holding continuously never repeats hits');
 g.setInput('p',{});g.step();g.setInput('p',{sp:true});for(let i=0;i<30;i++)g.step();assert.equal(gate.hits,2);
 assert.ok(g.drainEvents().some(e=>e.k==='gatehit'));
});

test('each charged blow schedules a quicker real investigation',()=>{
 const [g,p]=setup();p.prepared=true;const gate=g.gate(g.zoo.enclosures[p.enc].mainGate);const [x,y]=gate.tiles[0];p.x=x+.5;p.y=y-.5;
 g.staff=g.staff.slice(0,1);const s=g.staff[0];s.x=p.x;s.y=p.y+3;s.dir=0;s.route=[[s.x|0,s.y|0]];s.wp=0;
 const delays=[];for(let i=0;i<3;i++){charge(g,p);delays.push(g.checks.at(-1).due-g.time);}
 assert.deepEqual(delays,[4,2.5,1]);assert.equal(s.state,'patrol');
 g.time=1;g.step();assert.equal(s.state,'investigate');
});

test('discovering a broken gate raises alert only when an escape is known',()=>{
 const [g,p]=setup();p.prepared=true;const gate=g.gate(g.zoo.enclosures[p.enc].mainGate);const [x,y]=gate.tiles[0];p.x=x+.5;p.y=y-.5;
 for(let i=0;i<3;i++)charge(g,p);
 const s=g.staff[0];s.x=x+.5;s.y=y+3;s.dir=-Math.PI/2;
 g._stepStaff(s,TICK);assert.equal(g.alertUntil,0,'damage alone is not a confirmed escape');
 p.escaped=true;p.x=40.5;p.y=30.5;p.hidden=true;s.dir=-Math.PI/2;
 g._stepStaff(s,TICK);assert.equal(g.alertUntil,180);
 assert.ok(g.drainEvents().some(e=>e.k==='damagefound'));
 g.time=181;g._stepStaff(s,TICK);assert.equal(g.alertUntil,180,'same damage does not renew the alert forever');
});

test('capture repairs enclosure terrain, tunnels, ramps, crates and latches; gate strength escalates',()=>{
 const [g,p]=setup('elephant',false);const e=g.zoo.enclosures[p.enc];p.prepared=true;
 const gate=g.gate(e.mainGate);const [x,y]=gate.tiles[0];p.x=x+.5;p.y=y-.5;for(let i=0;i<3;i++)charge(g,p);assert.equal(gate.state,1);
 const ramp=g.objects.find(o=>o.kind==='escapeBuild'&&o.enc===p.enc);ramp.state=1;g.setTile(...ramp.wall,T.PATH);
 const crate=g.crates.find(c=>g.inRect(c.home[0]+.5,c.home[1]+.5,e.rect));crate.x++;
 g.parts[0].inserted=true;g._returnToEnclosure(p);
 assert.equal(gate.state,0);assert.equal(gate.hits,0);assert.equal(gate.broken,false);assert.equal(p.prepared,false);
 assert.equal(g.obj(ramp.id).state,0);assert.equal(g.tileAt(...ramp.wall),g.zoo.tiles[g.idx(...ramp.wall)]);
 assert.equal(crate.x,crate.home[0]);assert.equal(g.parts[0].inserted,true,'outside mission progress survives');
 p.prepared=true;p.x=x+.5;p.y=y-.5;for(let i=0;i<3;i++)charge(g,p);assert.equal(gate.state,0);
 charge(g,p);assert.equal(gate.state,1);g._returnToEnclosure(p);assert.equal(g.fortification.get(p.enc),2);
});

test('repair restores a removed monkey latch and a dug meerkat tunnel',()=>{
 const [g,p]=setup('monkey',false);const latch=g.objects.find(o=>o.enc===p.enc&&o.oneShot);g._activate(p,latch);assert.equal(g.obj(latch.id),undefined);
 g._returnToEnclosure(p);assert.ok(g.obj(latch.id));assert.equal(g.gate(latch.action.open).state,0);
 const [m,q]=setup('meerkat',false);const b=m.burrows.find(b=>m.inRect(b.a[0]+.5,b.a[1]+.5,m.zoo.enclosures[q.enc].rect));b.dug=true;m.setTile(...b.a,T.BURROW);m.setTile(...b.b,T.BURROW);
 m._returnToEnclosure(q);assert.equal(b.dug,false);assert.equal(m.tileAt(...b.b),T.SOILX);
});

test('small animals hide in one bush, large animals require two adjoining bushes and must be unwatched',()=>{
 for(const animal of ['redpanda','elephant','giraffe','zebra']){
  const [g,p]=setup(animal,false);p.x=20.5;p.y=14.5;g.setTile(20,14,T.BUSH);g.setTile(21,14,T.PATH);g.setTile(19,14,T.PATH);g.setTile(20,13,T.PATH);g.setTile(20,15,T.PATH);
  g._postMove(p,0);assert.equal(p.hidden,animal==='redpanda');
  g.setTile(21,15,T.BUSH);g._postMove(p,0);assert.equal(p.hidden,animal==='redpanda','diagonal bushes do not count');
  g.setTile(21,14,T.BUSH);g._postMove(p,0);assert.equal(p.hidden,true);
 }
});
