import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,TICK} from '../shared/game.js';import {ParkingGame,CAR_CONTROLS} from '../shared/parking-game.js';import {Room} from '../shared/room.js';import {ANIMAL_IDS} from '../shared/animals.js';import {canOccupy} from '../shared/physics.js';import {bfs} from '../shared/util.js';import {Autopilot,viewFromGame} from '../shared/bot.js';
const players=n=>ANIMAL_IDS.slice(0,n).map((animal,i)=>({id:'p'+i,name:'Beast '+i,animal}));
const lot=(n=2,staff=false)=>new ParkingGame({players:players(n),options:{staff}});
function board(g,p){const o=g.obj('getaway');p.x=o.stand[0]+.5;p.y=o.stand[1]+.5;g._interact(p);}
function aboard(g){g.activePlayers()[0].cageKeys=1;g.vehicleAction(g.activePlayers()[0].id,{op:'unlock'});for(const p of g.activePlayers())board(g,p);}
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
 const p=g.activePlayers().find(p=>p.animal==='elephant');p.x=11.5;p.y=15.5;p.grace=0;g._postMove(p,TICK);assert.equal(p.hidden,true);
});
test('animals must actually steal a keeper key before they can unlock the wagon',()=>{
 const g=lot(2,true),p=g.activePlayers()[0];board(g,p);assert.equal(g.vehicle.unlocked,false);assert.equal(p.inVehicle,false);
 const s=g.staff[0];g.staff=[s];s.x=20.5;s.y=5.5;s.dir=0;s.downUntil=100;p.x=19.5;p.y=5.5;p.grace=0;
 g.setInput(p.id,{e:true});for(let i=0;i<23;i++)g.step(TICK);assert.equal(p.cageKeys,1);g.vehicleAction(p.id,{op:'unlock'});board(g,p);assert.equal(g.vehicle.unlocked,true);assert.equal(p.inVehicle,true);board(g,g.activePlayers()[1]);assert.equal(g.activePlayers()[1].inVehicle,true);
});
test('capture confiscates parking keys and returns multiplayer animals to the holding cage',()=>{
 const g=lot(),p=g.activePlayers()[0];p.cageKeys=1;g._capture({},p);for(let i=0;i<25;i++)g.step(TICK);assert.equal(p.cageKeys,0);assert.equal(p.capturedT,0);assert.equal(p.inVehicle,false);assert.ok(g.inOwnEnclosure(p));
});
function prepare(g){for(const [id,pid] of Object.entries(g.vehicle.owners)){const c=CAR_CONTROLS.find(c=>c.id===id);if(c.kind==='select'||c.kind==='gear')g.vehicleAction(pid,{control:id,value:c.goal,held:true});}}
function drive(g,step=()=>g.step(TICK)){
 const bots=g.activePlayers().map(p=>new Autopilot(p.id));
 for(let i=0;i<1000&&g.phase==='play';i++){for(const b of bots){const inp=b.update(viewFromGame(g,b.pid),TICK);if(inp.vehicle)g.vehicleAction(b.pid,inp.vehicle);}step();}
}
test('car controls enforce ownership, finite ranges, held input, all aboard and connected teammates',()=>{
 const g=lot(),[a,b]=g.activePlayers();a.cageKeys=1;g.vehicleAction(a.id,{op:'unlock'});board(g,a);
 g.vehicleAction(a.id,{control:'steering',value:1,held:true});assert.equal(g.vehicle.values.steering,0);board(g,b);
 g.vehicleAction(b.id,{control:'steering',value:1,held:true});g.vehicleAction(a.id,{control:'steering',value:NaN,held:true});g.vehicleAction(a.id,{control:'steering',value:5,held:true});assert.equal(g.vehicle.values.steering,0);
 g.setConnected(b.id,false);g.vehicleAction(a.id,{control:'steering',value:1,held:true});assert.equal(g.vehicle.values.steering,0);g.setConnected(b.id,true);g.vehicleAction(a.id,{control:'steering',value:1,held:true});assert.equal(g.vehicle.values.steering,1);
 assert.equal(g.personal(a.id).vehicle.controls.length,2);assert.equal(g.personal(b.id).vehicle.controls.length,2);
});
test('one through eight animals can drive through the lot opening with their own car controls',()=>{
 for(let n=1;n<=8;n++){const g=lot(n);aboard(g);assert.equal(new Set(Object.values(g.vehicle.owners)).size,n);drive(g);assert.equal(g.phase,'complete','driving with '+n+' animals');assert.ok(g.vehicle.y>36.5);assert.ok(g.vehicle.y>=60);assert.equal(g.results().carStolen,true);}
});
test('disconnecting stops motion and removing a player reassigns every needed control',()=>{
 const g=lot(8);aboard(g);prepare(g);g.vehicleAction(g.vehicle.owners.gas,{control:'gas',value:1,held:true});g.step(TICK);assert.ok(g.vehicle.speed>0);
 const p=g.activePlayers()[7],x=g.vehicle.x;g.setConnected(p.id,false);g.step(TICK);assert.equal(g.vehicle.speed,0);assert.equal(g.vehicle.x,x);g.removePlayer(p.id);assert.equal(Object.values(g.vehicle.owners).includes(p.id),false);assert.equal(Object.keys(g.vehicle.owners).length,7);
 for(const p of [...g.activePlayers()])g.removePlayer(p.id);assert.doesNotThrow(()=>g.snapshot());
});
test('parking completion offers the city; replay and lobby still work',()=>{
 const {r}=setupRoom();r.game.phase='complete';r.tick();r.handle(r.hostId,{t:'continue'});aboard(r.game);drive(r.game,()=>r.tick());assert.equal(r.phase,'complete');assert.equal(r.results.next,'city');r.handle(r.hostId,{t:'replay'});assert.equal(r.game.zooId,'parking');r.handle(r.hostId,{t:'toLobby'});assert.equal(r.game,null);
});
test('the getaway car occupies a normal stall; only a stolen fob can flash or sound its alarm',()=>{
 const g=lot(2,true),[a,b]=g.activePlayers(),v=g.vehicle;assert.equal(g.zoo.getaway.stall.length,4);assert.equal(g.zoo.decor.filter(d=>d.kind==='parkedCar').length,24);
 g.vehicleAction(b.id,{op:'unlock'});assert.equal(v.unlocked,false);g.vehicleAction(b.id,{op:'panic'});assert.equal(v.alarmUntil,0);
 a.cageKeys=1;assert.equal(g.personal(a.id).fob,true);assert.equal(g.personal(b.id).fob,false);g.vehicleAction(a.id,{op:'unlock'});assert.equal(v.unlocked,true);assert.ok(v.lightsUntil>g.time);g.vehicleAction(a.id,{op:'panic'});g.step(TICK);assert.ok(v.alarmUntil>g.time);assert.ok(g.staff.some(s=>s.state==='investigate'));assert.ok(g.drainEvents().some(e=>e.k==='caralarm'));
 g._capture({},a);g.vehicleAction(a.id,{op:'unlock'});assert.equal(g.personal(a.id).fob,false);
});
test('gas and steering release on button-up or lost heartbeat, and brake stops a moving car',()=>{
 const g=lot(2);aboard(g);prepare(g);const gas=g.vehicle.owners.gas,steer=g.vehicle.owners.steering;
 for(let i=0;i<8;i++){g.vehicleAction(gas,{control:'gas',value:1,held:true});g.step(TICK);}assert.ok(g.vehicle.speed>0);
 g.vehicleAction(steer,{control:'steering',value:.8,held:true});g.step(TICK);assert.ok(g.vehicle.angle>0);g.vehicleAction(steer,{control:'steering',value:.8,held:false});assert.equal(g.vehicle.values.steering,0);
 g.vehicleAction(gas,{control:'gas',value:0,held:false});assert.equal(g.vehicle.values.gas,0);for(let i=0;i<12;i++){g.vehicleAction(gas,{control:'brake',value:1,held:true});g.step(TICK);}assert.equal(g.vehicle.speed,0);
 g.vehicleAction(gas,{control:'gas',value:1,held:true});for(let i=0;i<10;i++)g.step(TICK);assert.equal(g.vehicle.values.gas,0);
});
test('Reverse moves backward and parked-car collisions cannot be driven through',()=>{
 const g=lot();aboard(g);g.vehicleAction(g.vehicle.owners.gear,{control:'gear',value:'Reverse',held:true});
 for(let i=0;i<80;i++){g.vehicleAction(g.vehicle.owners.gas,{control:'gas',value:1,held:true});g.step(TICK);}
 assert.ok(g.vehicle.y<g.zoo.getaway.y);assert.ok(g._carFits(g.vehicle.x,g.vehicle.y,g.vehicle.angle));assert.equal(g.phase,'play');
});
test('Continue cannot start an empty crew after everyone active has left',()=>{const {r}=setupRoom();r.game.phase='complete';r.tick();r.game.players.get(r.hostId).active=false;r.leave('p2');r.handle(r.hostId,{t:'continue'});assert.equal(r.game.zooId,'moonleaf');assert.equal(r.phase,'complete');});

test('driver sight faces the car heading and sees ahead without seeing through other cars',async()=>{
 const {animalCanSee}=await import('../shared/vision.js'),{vehicleCells}=await import('../shared/driving.js'),{tileBlocksVision}=await import('../shared/tiles.js');
 const g=lot(),car=g.vehicle,own=new Set(vehicleCells(car,g.w,g.h)),world={w:g.w,h:g.h,visionBlocked:(x,y)=>own.has(y*g.w+x)?tileBlocksVision(g.tiles[y*g.w+x]):g.visionBlocked(x,y)};
 assert.equal(animalCanSee(world,car,car.x,car.y+5),true);assert.equal(animalCanSee(world,car,car.x,car.y-5),false);
 const observer={...car,angle:Math.PI};assert.equal(animalCanSee(world,observer,car.x+6,car.y),false);
});

test('multiplayer captures use the holding cage and a free teammate can release everyone',()=>{
 const g=lot(2),[a,b]=g.activePlayers();g._capture({},a);for(let i=0;i<25;i++)g.step(TICK);assert.equal(a.caged,true);assert.equal(g.gate('holding-gate').state,0);assert.equal(g.abilityTarget(a).idle,true);
 const door=g.obj('holding-door');b.x=door.stand[0]+.5;b.y=door.stand[1]+.5;g._interact(b);assert.equal(a.caged,false);assert.equal(g.gate('holding-gate').state,1);assert.ok(canOccupy(g,a.animal,8.5,55.5,null));
});
test('all captured crews of two through eight can grab separate walls to open the cage',()=>{
 for(let n=2;n<=8;n++){const g=lot(n);for(const p of g.activePlayers())g._returnToEnclosure(p);for(const p of g.activePlayers())g.setInput(p.id,{e:true});for(let i=0;i<40;i++)g.step(TICK);assert.equal(g.gate('holding-gate').state,1,'crew '+n);assert.ok(g.activePlayers().every(p=>!p.caged));}
});
test('a partial wall grab cannot free the cage and solo play has no holding cage',()=>{
 const g=lot(2);for(const p of g.activePlayers())g._returnToEnclosure(p);g.setInput('p0',{e:true});for(let i=0;i<50;i++)g.step(TICK);assert.equal(g.gate('holding-gate').state,0);assert.equal(lot(1).holdingCage,undefined);
});
test('the next parking visit chooses a different car and uses multiple paint colors',()=>{const g=lot(),h=new ParkingGame({players:players(2),seed:1,previousCarSlot:g.vehicle.slot,options:{staff:false}});assert.notEqual(h.vehicle.slot,g.vehicle.slot);assert.ok(new Set(g.zoo.decor.filter(d=>d.kind==='parkedCar').map(d=>d.colorIndex)).size>1);});
test('running over a keeper leaves them permanently unconscious',()=>{const g=lot(2,true),s=g.staff[0];g.vehicle.speed=3;s.x=g.vehicle.x;s.y=g.vehicle.y;g._hitKeepers();assert.equal(s.permanentDown,true);g.time+=10000;g._stepStaff(s,TICK);assert.equal(s.state,'unconscious');});
test('parking Continue loads a shared city with roads, stores and three zoos',()=>{const {r}=setupRoom();r.game.phase='complete';r.tick();r.handle(r.hostId,{t:'continue'});const color=r.game.vehicle.colorIndex;r.game.phase='complete';r.tick();r.handle(r.hostId,{t:'continue'});assert.equal(r.game.zooId,'city');assert.equal(r.game.vehicle.colorIndex,color);assert.ok(r.game.w>=150);assert.equal(r.game.zoo.destinations.filter(d=>/Zoo/.test(d.name)).length,3);assert.ok(r.game.activePlayers().every(p=>p.inVehicle));});
