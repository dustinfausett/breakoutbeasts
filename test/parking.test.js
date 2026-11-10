import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,TICK} from '../shared/game.js';import {ParkingGame,CAR_CONTROLS} from '../shared/parking-game.js';import {Room} from '../shared/room.js';import {ANIMAL_IDS} from '../shared/animals.js';import {canOccupy} from '../shared/physics.js';import {bfs} from '../shared/util.js';import {Autopilot,viewFromGame} from '../shared/bot.js';
const players=n=>ANIMAL_IDS.slice(0,n).map((animal,i)=>({id:'p'+i,name:'Beast '+i,animal}));
const lot=(n=2,staff=false)=>new ParkingGame({players:players(n),options:{staff}});
function board(g,p){const o=g.obj('getaway');p.x=o.stand[0]+.5;p.y=o.stand[1]+.5;g._interact(p);}
function aboard(g){g.activePlayers()[0].cageKeys=1;for(const p of g.activePlayers())board(g,p);}
function setupRoom(n=2){const out=[];const r=new Room({code:'ABCDE',options:{staff:false},send:(id,m)=>out.push({id,...m})});for(const p of players(n)){const a=r.addPlayer(p.name).player;r.handle(a.id,{t:'pick',animal:p.animal});r.handle(a.id,{t:'ready',ready:true});}r.handle(r.hostId,{t:'start'});return {r,out};}

test('keeper pressure scales from six to nine in the zoo and from two to six in the lot',()=>{
 for(let n=1;n<=8;n++){
  const g=new Game({players:players(n)});assert.equal(g.staff.length,[6,6,7,7,8,8,9,9][n-1]);assert.equal(new Set(g.staff.map(s=>s.x+','+s.y)).size,g.staff.length);
  for(const s of g.staff){assert.ok(g._staffPass(Math.floor(s.x),Math.floor(s.y)));for(const target of s.route)assert.ok(bfs(g.w,g.h,Math.floor(s.x),Math.floor(s.y),target,(x,y)=>g._staffPass(x,y)),'connected keeper patrol');}
  const pg=lot(n,true);assert.equal(pg.staff.length,2+Math.floor(n/2));for(const s of pg.staff)for(const target of s.route)assert.ok(bfs(pg.w,pg.h,Math.floor(s.x),Math.floor(s.y),target,(x,y)=>pg._staffPass(x,y)),'reachable parking patrol');
 }
});
test('Continue is host-only after zoo completion and keeps player identity through the shared transition',()=>{
 const {r,out}=setupRoom();r.handle(r.hostId,{t:'continue'});assert.equal(r.game.zooId,'moonleaf');
 r.game.phase='complete';r.tick();assert.equal(r.results.next,'parking');const ids=r.game.activePlayers().map(p=>[p.id,p.name,p.animal]);
 r.handle('p2',{t:'continue'});assert.equal(r.game.zooId,'moonleaf');r.handle(r.hostId,{t:'continue'});assert.equal(r.phase,'playing');assert.equal(r.game.zooId,'parking');assert.deepEqual(r.game.activePlayers().map(p=>[p.id,p.name,p.animal]),ids);
 r.tick();assert.ok(out.some(m=>m.t==='start'&&m.zoo==='parking'));assert.ok(out.some(m=>m.t==='snap'&&m.obj.stage==='parking'&&m.defs));
 const previous=r.game;r.handle(r.hostId,{t:'continue'});assert.equal(r.game,previous);
});
test('a disconnected teammate prevents Continue; parking reconnect gets the correct stage',()=>{
 const {r,out}=setupRoom();r.game.phase='complete';r.tick();const p=r.players.get('p2');r.disconnect(p.id);r.handle(r.hostId,{t:'continue'});assert.equal(r.game.zooId,'moonleaf');r.resume(p.token);r.handle(r.hostId,{t:'continue'});r.disconnect(p.id);r.resume(p.token);r.tick();assert.ok(out.filter(m=>m.id===p.id&&m.t==='start').at(-1).zoo==='parking');
});
test('parking lot has reachable car and hiding islands with room for large animals',()=>{
 const g=lot(8);for(const p of g.activePlayers())assert.ok(bfs(g.w,g.h,Math.floor(p.x),Math.floor(p.y),g.obj('getaway').stand,(x,y)=>canOccupy(g,p.animal,x+.5,y+.5,null)));
 const p=g.activePlayers().find(p=>p.animal==='elephant');p.x=11.5;p.y=12.5;p.grace=0;g._postMove(p,TICK);assert.equal(p.hidden,true);
});
test('animals must actually steal a keeper key before they can unlock the wagon',()=>{
 const g=lot(2,true),p=g.activePlayers()[0];board(g,p);assert.equal(g.vehicle.unlocked,false);assert.equal(p.inVehicle,false);
 const s=g.staff[0];g.staff=[s];s.x=20.5;s.y=5.5;s.dir=0;s.downUntil=100;p.x=19.5;p.y=5.5;p.grace=0;
 g.setInput(p.id,{e:true});for(let i=0;i<23;i++)g.step(TICK);assert.equal(p.cageKeys,1);board(g,p);assert.equal(g.vehicle.unlocked,true);assert.equal(p.inVehicle,true);board(g,g.activePlayers()[1]);assert.equal(g.activePlayers()[1].inVehicle,true);
});
test('capture confiscates parking keys and returns animals to the service exit',()=>{
 const g=lot(),p=g.activePlayers()[0];p.cageKeys=1;g._capture({},p);for(let i=0;i<25;i++)g.step(TICK);assert.equal(p.cageKeys,0);assert.equal(p.capturedT,0);assert.equal(p.inVehicle,false);assert.ok(g.inOwnEnclosure(p));
});
test('car controls enforce ownership, valid values, all aboard, and connected teammates',()=>{
 const g=lot(),[a,b]=g.activePlayers();a.cageKeys=1;board(g,a);g.vehicleAction(a.id,{control:'steering',value:'Straight'});assert.equal(g.vehicle.values.steering,'Left');board(g,b);
 g.vehicleAction(b.id,{control:'steering',value:'Straight'});g.vehicleAction(a.id,{control:'steering',value:'Teleport'});assert.equal(g.vehicle.values.steering,'Left');
 g.setConnected(b.id,false);g.vehicleAction(a.id,{control:'steering',value:'Straight'});assert.equal(g.vehicle.values.steering,'Left');g.setConnected(b.id,true);g.vehicleAction(a.id,{control:'steering',value:'Straight'});assert.equal(g.vehicle.values.steering,'Straight');
 assert.equal(g.personal(a.id).vehicle.controls.length,2);assert.equal(g.personal(b.id).vehicle.controls.length,1);
});
test('one through eight animals can finish their scaled car responsibilities with the autopilot',()=>{
 for(let n=1;n<=8;n++){
  const g=lot(n);aboard(g);const bots=g.activePlayers().map(p=>new Autopilot(p.id));
  assert.equal(new Set(Object.values(g.vehicle.owners)).size,n);
  for(let i=0;i<200&&g.phase==='play';i++){for(const b of bots){const inp=b.update(viewFromGame(g,b.pid),TICK);if(inp.vehicle)g.vehicleAction(b.pid,inp.vehicle);}g.step(TICK);}
  assert.equal(g.phase,'complete','car theft with '+n+' animals');assert.equal(g.results().carStolen,true);
 }
});
test('leaving or disconnecting stops departure; removing a player reassigns every needed control',()=>{
 const g=lot(8);aboard(g);for(const [id,pid] of Object.entries(g.vehicle.owners))g.vehicleAction(pid,{control:id,value:CAR_CONTROLS.find(c=>c.id===id).goal});g.step(1);assert.ok(g.vehicle.progress>0);
 const p=g.activePlayers()[7];g.setConnected(p.id,false);g.step(1);assert.equal(g.vehicle.progress,0);g.removePlayer(p.id);assert.equal(Object.values(g.vehicle.owners).includes(p.id),false);assert.equal(Object.keys(g.vehicle.owners).length,7);
 for(const p of [...g.activePlayers()])g.removePlayer(p.id);assert.doesNotThrow(()=>g.snapshot());
});
test('parking completion has no invented next destination; replay and lobby still work',()=>{
 const {r}=setupRoom();r.game.phase='complete';r.tick();r.handle(r.hostId,{t:'continue'});aboard(r.game);for(const [id,pid] of Object.entries(r.game.vehicle.owners))r.game.vehicleAction(pid,{control:id,value:CAR_CONTROLS.find(c=>c.id===id).goal});for(let i=0;i<65;i++)r.tick();assert.equal(r.phase,'complete');assert.equal(r.results.next,null);r.handle(r.hostId,{t:'replay'});assert.equal(r.game.zooId,'parking');r.handle(r.hostId,{t:'toLobby'});assert.equal(r.game,null);
});

test('Continue cannot start an empty crew after everyone active has left',()=>{const {r}=setupRoom();r.game.phase='complete';r.tick();r.game.players.get(r.hostId).active=false;r.leave('p2');r.handle(r.hostId,{t:'continue'});assert.equal(r.game.zooId,'moonleaf');assert.equal(r.phase,'complete');});
