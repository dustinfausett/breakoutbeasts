import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,TICK} from '../shared/game.js';
import {ANIMAL_IDS} from '../shared/animals.js';
import {T} from '../shared/tiles.js';
import {canOccupy} from '../shared/physics.js';
import {bfs} from '../shared/util.js';
import {Autopilot,viewFromGame} from '../shared/bot.js';

function setup(animal='redpanda',staff=false){const g=new Game({players:[{id:'p',animal}],options:{staff}});return [g,g.players.get('p')];}
function hold(g,p,o,seconds){const front=g.zoo.enclosures[o.enc].front==='down'?1:-1;p.x=o.x+.5;p.y=o.y+.5+front;g.setInput(p.id,{});g.step(TICK);g.setInput(p.id,{e:true});for(let i=0;i<seconds/TICK;i++)g.step(TICK);g.setInput(p.id,{});g.step(TICK);}

for(const animal of ANIMAL_IDS)test(`${animal} can find supplies and build a second escape route`,()=>{
 const [g,p]=setup(animal),enc=g.zoo.enclosures[p.enc];
 const bench=g.objects.find(o=>o.kind==='supplies'&&o.enc===p.enc&&!o.public);
 p.x=bench.x+.5;p.y=bench.y+.5;
 for(let n=0;n<3;n++){g.setInput('p',{});g.step(TICK);g.setInput('p',{e:true});for(let t=0;t<22;t++)g.step(TICK);}
 assert.equal(p.materials,2);assert.equal(bench.remaining,0);
 const ramp=g.objects.find(o=>o.kind==='escapeBuild'&&o.enc===p.enc);
 const insideY=ramp.y+(enc.front==='down'?-1:1);
 assert.ok(bfs(g.w,g.h,enc.spawn[0],enc.spawn[1],[ramp.x,insideY],(x,y)=>canOccupy(g,animal,x+.5,y+.5,null)), 'ramp materials can be delivered from the starting position');
 hold(g,p,ramp,2.3);assert.equal(ramp.state,1);assert.equal(p.materials,0);assert.equal(g.gate(enc.mainGate).state,0,'ramp does not unlock gate');
 assert.ok(bfs(g.w,g.h,Math.floor(p.x),Math.floor(p.y),(x,y)=>!g.inRect(x+.5,y+.5,enc.rect),(x,y)=>canOccupy(g,animal,x+.5,y+.5,null)),'ramp provides a walkable way out');
});

test('small animals craft a stick, dig, and use a tunnel; large animals cannot',()=>{
 const [g,p]=setup('beaver');p.prepared=true;p.materials=2;
 const o=g.objects.find(o=>o.kind==='escapeDig'&&o.enc===p.enc);hold(g,p,o,3.3);assert.equal(o.state,1);
 g._interact(p);assert.ok(p.under);assert.deepEqual(p.under.to,o.outside.map(v=>v+.5));
 const [big,e]=setup('elephant');e.prepared=true;e.materials=2;const soil=big.objects.find(o=>o.kind==='escapeDig'&&o.enc===e.enc);
 assert.equal(big._objectInteraction(e,soil).idle,true);
 soil.state=1;assert.equal(big._objectInteraction(e,soil).idle,true,'large animals cannot use a teammate’s finished tunnel');
});

test('three separate heavy gate hits escalate noise and guard attention',()=>{
 const [g,p]=setup('elephant',true);p.prepared=true;const gate=g.gate(g.zoo.enclosures[p.enc].mainGate);const [x,y]=gate.tiles[0];p.x=x+.5;p.y=y-.5;
 const guard=g.staff[0];guard.x=p.x;guard.y=p.y+3;guard.dir=Math.PI/2;
 const levels=[],radii=[];
 for(let i=0;i<3;i++){g.time+=1.3;g._useAbility(p);for(let n=0;n<26;n++)if(p.hold)g._continueHold(p,{sp:true},TICK);levels.push(guard.alert);radii.push(g.drainEvents().find(e=>e.k==='noise').r);}
 assert.equal(gate.state,1);assert.ok(levels[0]<levels[1]&&levels[1]<levels[2]);assert.ok(radii[0]<radii[1]&&radii[1]<radii[2]);
});

test('steal a key from behind, spend it at a locked cage, and reject a watched theft',()=>{
 const [g,p]=setup('redpanda',true);g.staff=g.staff.slice(0,1);const s=g.staff[0];s.x=40.5;s.y=14.5;s.dir=0;p.x=39.1;p.y=14.5;
 assert.ok(g._canSteal(p,s));s.dir=Math.PI;assert.equal(g._canSteal(p,s),false);s.dir=0;
 const lock=g.obj(g.zoo.enclosures.find(e=>e.animal==='zebra').keeper);
 assert.equal(g._objectInteraction(p,lock).idle,true,'no key means no switch shortcut');
 g._interact(p);for(let i=0;i<22;i++)if(p.hold)g._continueHold(p,{e:true},TICK);
 assert.equal(p.cageKeys,1);assert.equal(g._canSteal(p,s),false,'key theft has a replenishment delay');
 p.x=lock.x+1.5;p.y=lock.y+.5;g._interact(p);for(let i=0;i<22;i++)if(p.hold)g._continueHold(p,{e:true},TICK);
 assert.equal(p.cageKeys,1);assert.equal(g.gate(lock.action.open).state,1);
});

test('a failed theft is cancelled when the guard turns or walks away',()=>{
 const [g,p]=setup('redpanda',true);g.staff=g.staff.slice(0,1);const s=g.staff[0];s.x=40.5;s.y=14.5;s.dir=0;p.x=39.1;p.y=14.5;g._interact(p);s.dir=Math.PI;
 for(let i=0;i<22;i++)if(p.hold)g._continueHold(p,{e:true},TICK);assert.equal(p.cageKeys,0);
});

test('a teammate can build an outside ramp to rescue an NPC without using a gate key',()=>{
 const [g,p]=setup();p.prepared=true;p.materials=2;const o=g.objects.find(o=>o.kind==='escapeBuild'&&o.enc!==p.enc);
 hold(g,p,o,2.3);assert.equal(g.stats.rescued,1);assert.equal(g.gate(g.zoo.enclosures[o.enc].mainGate).state,0);
});

test('two teammates finishing the same cage lock keep their universal keys',()=>{
 const g=new Game({players:[{id:'a',animal:'redpanda'},{id:'b',animal:'monkey'}],options:{staff:false}});
 const a=g.players.get('a'),b=g.players.get('b');a.cageKeys=b.cageKeys=1;
 const lock=g.obj(g.zoo.enclosures.find(e=>e.animal==='zebra').keeper);
 g._activate(a,lock);g._activate(b,lock);
 assert.equal(a.cageKeys,1);assert.equal(b.cageKeys,1);assert.equal(g.stats.rescued,1);
});

test('hiding in view fails, breaking sight enables cover, and guards search the last seen location',()=>{
 const [g,p]=setup('redpanda',true);g.staff=g.staff.slice(0,1);const s=g.staff[0];
 s.x=20.5;s.y=14.5;s.dir=0;p.x=24.5;p.y=14.5;g.setTile(24,14,T.BUSH);
 g._postMove(p,0);assert.equal(p.hidden,false);g._stepStaff(s,TICK);assert.equal(s.state,'chase');
 const last=[...s.lastSeen];g.setTile(22,14,T.HEDGE);g._postMove(p,0);assert.equal(p.hidden,true);
 p.x=25.5;for(let i=0;i<45;i++)g._stepStaff(s,TICK);
 assert.deepEqual(s.lastSeen,last,'radio does not reveal positions through cover');assert.equal(s.target,null);assert.equal(s.state,'investigate');
});

test('test players keep their selected rescue route as relative distances change',()=>{
 const [g,p]=setup();p.escaped=true;p.prepared=true;p.materials=2;p.x=40.5;p.y=14.5;
 for(const part of g.parts)part.inserted=true;
 const bot=new Autopilot(p.id);bot._plan(viewFromGame(g,p.id));
 const chosen=bot.scriptName;assert.match(chosen,/^rescue-/);
 p.x=70.5;p.y=42.5;bot._plan(viewFromGame(g,p.id));
 assert.equal(bot.scriptName,chosen,'keep the same destination until it is rescued');
 const ramp=g.objects.find(o=>o.id===chosen.slice(7));g._rescueEnclosure(ramp.enc,p);
 bot._plan(viewFromGame(g,p.id));assert.notEqual(bot.scriptName,chosen,'replan if a teammate finishes that rescue');
});

test('a temporarily blocked safe route never skips ahead to a distant interaction',()=>{
 const [g,p]=setup();const bot=new Autopilot(p.id);
 bot.setScript('test',[{go:[61,22]},{holdE:999}]);bot._pathTo=()=>null;
 for(let i=0;i<100;i++)bot._runStep(viewFromGame(g,p.id),TICK);
 assert.equal(bot.si,0,'wait for a safe path before attempting the interaction');
});
