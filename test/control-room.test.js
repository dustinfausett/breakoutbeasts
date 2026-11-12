import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,TICK} from '../shared/game.js';
import {ANIMAL_IDS} from '../shared/animals.js';
import {controlPersonal} from '../shared/control-room.js';
import {bfs} from '../shared/util.js';
import {canOccupy} from '../shared/physics.js';

function ready(n=2){
 const g=new Game({players:ANIMAL_IDS.slice(0,n).map((animal,i)=>({id:'p'+i,animal,name:'Beast '+i})),options:{staff:false},seed:22});
 for(const part of g.parts)part.inserted=true;g.stats.rescued=g.requiredRescues;return g;
}
function enter(g,p){const index=g.controlRoom.panels[p.id].doorIndex,o=g.objects.find(o=>o.kind==='controlDoor'&&o.index===index);p.x=o.stand[0]+.5;p.y=o.stand[1]+.5;g._interact(p);}
function power(g){for(const p of g.activePlayers())enter(g,p);g.step(TICK);for(const p of g.activePlayers())g.controlAction(p.id,{op:'power'});g.step(TICK);}

test('a stolen key opens multiple enclosures, stays in inventory, and is confiscated on capture',()=>{
 const g=ready(),p=g.players.get('p0');p.cageKeys=1;
 const locks=g.objects.filter(o=>o.keeper&&o.enc!==p.enc).slice(0,2);
 for(const lock of locks){g._activate(p,lock);assert.equal(p.cageKeys,1);assert.equal(g.gate(lock.action.open).state,1);}
 assert.equal(g.enclosureChecks.length,2);g._capture({},p);assert.equal(p.cageKeys,0);
});

test('a keeper is dispatched to inspect an enclosure opened with a reusable key',()=>{
 const g=new Game({players:[{id:'p',animal:'redpanda'}]}),p=g.players.get('p');p.cageKeys=1;
 const lock=g.objects.find(o=>o.keeper&&o.enc!==p.enc);g._activate(p,lock);g._stepEnclosureChecks();
 const check=g.enclosureChecks[0];assert.ok(check.guard!==null);const s=g.staff.find(s=>s.id===check.guard);
 assert.equal(s.state,'investigate');assert.ok(s.goal);assert.equal(p.cageKeys,1);
});

test('each of eight players has a unique, reachable assigned doorway and a maintenance bay',()=>{
 const g=ready(8),doors=g.objects.filter(o=>o.kind==='controlDoor');assert.equal(doors.length,8);assert.equal(g.parts.length,8);
 for(const p of g.activePlayers()){
  const index=g.controlRoom.panels[p.id].doorIndex,door=doors.find(o=>o.index===index);
  assert.ok(bfs(g.w,g.h,60,28,door.stand,(x,y)=>canOccupy(g,p.animal,x+.5,y+.5,null)),'reachable door '+index);

  enter(g,p);assert.equal(p.inControlRoom,true);
 }
 assert.equal(new Set(Object.values(g.controlRoom.entered)).size,8);
});

test('panels wait for every animal, then all power buttons must be pressed',()=>{
 const g=ready(),[a,b]=g.activePlayers();enter(g,a);g.step();assert.equal(g.controlRoom.phase,'waiting');
 g.controlAction(a.id,{op:'power'});assert.equal(g.controlRoom.panels[a.id].powered,false);
 enter(g,b);g.step();assert.equal(g.controlRoom.phase,'arming');
 g.controlAction(a.id,{op:'power'});g.step();assert.equal(g.controlRoom.phase,'arming');
 g.controlAction(b.id,{op:'power'});g.step();assert.equal(g.controlRoom.phase,'running');
});

test('multiplayer instructions contain only actions for anonymously assigned unique panels',()=>{
 const g=ready(8);power(g);
 for(const p of g.activePlayers()){
  const personal=controlPersonal(g,p.id);assert.match(personal.instruction.text,/^(Set|Raise|Lower|Press|Release) /);
  assert.equal(personal.tasks,undefined);assert.ok(personal.controls.length>=4);
 }
 const publicData=g.snapshot();assert.equal(JSON.stringify(publicData).includes('flavor'),false);
 assert.equal(publicData.obj.control.team.length,8);
});

test('five tasks per operator unlock the front gate, which still requires everyone to leave',()=>{
 const g=ready(8);power(g);
 for(let round=0;round<5;round++){
  const clues=g.activePlayers().map(p=>controlPersonal(g,p.id).instruction);
  for(const clue of clues)g.controlAction(clue.target,{op:'set',control:clue.control,value:clue.value});
  g.step();if(round<4)assert.equal(g.gate(g.zoo.exitGate).state,0);
 }
 assert.equal(g.controlRoom.phase,'complete');assert.equal(g.gate(g.zoo.exitGate).state,1);
 assert.ok(Object.values(g.controlRoom.panels).every(p=>p.done===5));assert.equal(g.phase,'play');
});

test('invalid, unpowered, out-of-room and wrong-value panel operations cannot complete tasks',()=>{
 const g=ready(),p=g.activePlayers()[0];g.controlAction(p.id,{op:'set',control:0,value:1});assert.equal(g.controlRoom.panels[p.id].done,0);
 power(g);const panel=g.controlRoom.panels[p.id],task=panel.tasks[0];
 for(const msg of [{control:-1,value:0},{control:0,value:999},{control:0,value:NaN},{control:0.5,value:0}])g.controlAction(p.id,{op:'set',...msg});
 assert.equal(panel.done,0);g.controlAction(p.id,{op:'set',control:task.control,value:(task.value+1)%(panel.controls[task.control].max+1)});assert.equal(panel.done,0);
});

test('break-in timeout captures all players, removes keys, resets panels, and preserves rescued animals and power',()=>{
 const g=ready(8);power(g);for(const p of g.activePlayers())p.cageKeys=1;
 const rescued=g.stats.rescued;g.controlRoom.remaining=.01;g.step(.05);
 assert.equal(g.controlRoom.phase,'waiting');assert.equal(g.controlRoom.attempt,1);assert.equal(g.stats.rescued,rescued);assert.equal(g.powerDone(),true);
 for(const p of g.activePlayers()){assert.ok(p.capturedT>0);assert.equal(p.cageKeys,0);assert.equal(p.inControlRoom,false);}
 for(let i=0;i<24;i++)g.step(TICK);
 assert.ok(g.activePlayers().every(p=>g.inOwnEnclosure(p)&&g.fortification.get(p.enc)===1));
});

test('a disconnected operator pauses the timer; continuing without them preserves others’ progress and door identities',()=>{
 const g=ready(8);power(g);const [a,b,...rest]=g.activePlayers();g.controlRoom.panels[a.id].done=2;
 const door=g.controlRoom.panels[rest.at(-1).id].doorIndex,t=g.controlRoom.remaining;
 g.setConnected(b.id,false);g.step(1);assert.equal(g.controlRoom.remaining,t);
 g.removePlayer(b.id);g.step();assert.equal(g.controlRoom.panels[a.id].done,2);assert.equal(g.controlRoom.panels[rest.at(-1).id].doorIndex,door);
 assert.equal(g.objectives().keys.need,7);assert.equal(g.objectives().keys.keys.length,7);
 assert.ok(controlPersonal(g,a.id).instruction.target!==b.id);
});

test('solo radio-partner mode provides five valid tasks without needing another human',()=>{
 const g=ready(1);power(g);const p=g.activePlayers()[0];
 for(let i=0;i<5;i++){const clue=controlPersonal(g,p.id).instruction;assert.match(clue.text,/^(Set|Raise|Lower|Press|Release) /);g.controlAction(p.id,{op:'set',control:clue.control,value:clue.value});g.step();}
 assert.equal(g.controlRoom.phase,'complete');
});

test('any animal may choose an unoccupied room but cannot share an occupied room',()=>{const g=ready(2),[a,b]=g.activePlayers(),doors=g.objects.filter(o=>o.kind==='controlDoor'),door=doors[1];for(const p of [a,b]){p.x=door.stand[0]+.5;p.y=door.stand[1]+.5;g._objectInteraction(p,door).run?.();}assert.equal(a.inControlRoom,true);assert.equal(!!b.inControlRoom,false);enter(g,b);assert.equal(b.inControlRoom,true);assert.notEqual(g.controlRoom.panels[a.id].doorIndex,g.controlRoom.panels[b.id].doorIndex);});

test('leaving a waiting room frees that same entrance for another animal',()=>{const g=ready(2),[a,b]=g.activePlayers();enter(g,a);const door=g.objects.find(o=>o.kind==='controlDoor'&&o.index===g.controlRoom.entered[a.id]);g.controlAction(a.id,{op:'leave'});assert.equal(door.state,0);b.x=door.stand[0]+.5;b.y=door.stand[1]+.5;g._interact(b);assert.equal(b.inControlRoom,true);assert.equal(g.controlRoom.entered[b.id],door.index);});
