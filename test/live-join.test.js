import {Autopilot,viewFromGame} from '../shared/bot.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import {Room} from '../shared/room.js';import {ParkingGame} from '../shared/parking-game.js';import {Game} from '../shared/game.js';import {ANIMAL_IDS} from '../shared/animals.js';
const make=(stage='zoo',n=1)=>{const out=[],r=new Room({code:'JOIN',options:{staff:false},send:(pid,m)=>out.push({pid,...m})});for(let i=0;i<n;i++){const p=r.addPlayer('Player '+i).player;r.handle(p.id,{t:'pick',animal:ANIMAL_IDS[i]});r.handle(p.id,{t:'ready',ready:true});}r.handle(r.hostId,{t:'start',startAt:stage});return {r,out};};
test('live joins preserve each stage and create a usable personal snapshot and puzzle slots',()=>{for(const stage of ['zoo','parking','city','takeoff']){const {r}=make(stage),g=r.game;g.time=30;const p=r.addPlayer('Late').player;r.handle(p.id,{t:'pick',animal:'beaver'});assert.equal(r.game,g);r.tick(.05);assert.ok(g.players.get(p.id).active);assert.ok(g.personal(p.id));assert.ok(g.time>=30);if(stage==='zoo'){const part=g.parts.find(pt=>pt.pid===p.id);assert.ok(part);assert.ok(g.obj(g.bayState[part.bay].cage));}if(stage==='takeoff')assert.ok(g.players.get(p.id).inPlane);}});
test('expired reconnects reactivate their animal; full rooms reuse disconnected slots but reject a ninth connected player',()=>{const {r}=make('city',8),p=[...r.players.values()][1],token=p.token;r.disconnect(p.id);r.game.removePlayer(p.id);r.resume(token);assert.ok(r.game.players.get(p.id).active);assert.ok(r.addPlayer('Ninth').error);r.disconnect(p.id);const newcomer=r.addPlayer('Replacement').player;assert.ok(newcomer);r.handle(newcomer.id,{t:'pick',animal:p.animal});assert.equal(r.game.activePlayers().length,8);assert.ok(r.game.order.indexOf(newcomer.id)<8);r.tick(.05);assert.ok(r.game.personal(newcomer.id));});
test('a meerkat cannot take or insert another animal’s fuse even after reaching their bay',()=>{const g=new Game({players:[{id:'a',animal:'meerkat'},{id:'b',animal:'beaver'}],options:{staff:false}}),[a,b]=g.activePlayers(),part=g.parts.find(pt=>pt.pid==='b'),c=g.obj(g.bayState[part.bay].cage);c.state=1;assert.ok(g._objectInteraction(a,c).idle);assert.equal(c.state,1);assert.equal(a.carry,null);const take=g._objectInteraction(b,c);take.run();assert.equal(b.carry,'fuse:'+part.bay);a.carry=b.carry;const socket=g.objects.find(o=>o.kind==='socket');g._objectInteraction(a,socket).run();assert.equal(socket.state,0);assert.ok(!part.inserted);});
test('an uncaptured animal inside the holding cage can brace a wall with captured teammates',()=>{const g=new ParkingGame({players:[{id:'a',animal:'beaver'},{id:'b',animal:'elephant'}],options:{staff:false}}),[a,b]=g.activePlayers();g._returnToEnclosure(a);b.caged=false;b.inVehicle=false;a.x=3.5;a.y=53.1;b.x=5.5;b.y=53.1;for(const p of [a,b]){const target=g.interactTarget(p);assert.ok(target.run);target.run();p.input={e:true};}for(let i=0;i<32;i++)g.step(.05);assert.equal(g.gate('holding-gate').state,1);assert.equal(a.caged,false);assert.equal(b.hold,null);});
test('a zoo can grow to eight players with distinct owned bays and unique station controls',()=>{
 const {r}=make(),g=r.game;
 for(const animal of ANIMAL_IDS.slice(1,8)){
  const p=r.addPlayer(animal).player;r.handle(p.id,{t:'pick',animal});r.tick(.05);
 }
 assert.equal(g.activePlayers().length,8);assert.equal(g.parts.length,8);
 assert.equal(new Set(g.parts.map(p=>p.bay)).size,8);
 const labels=g.activePlayers().flatMap(p=>g.controlRoom.panels[p.id].controls.map(c=>c.label));
 assert.equal(new Set(labels).size,labels.length);
 for(const p of g.activePlayers())assert.ok(g.parts.some(part=>part.pid===p.id));
 const bots=g.activePlayers().map(p=>new Autopilot(p.id));
 while(g.phase==='play'&&g.time<600){
  for(const b of bots){const input=b.update(viewFromGame(g,b.pid),.05);if(input.panel)g.controlAction(b.pid,input.panel);g.setInput(b.pid,input);}
  g.step(.05);g.drainEvents();
 }
 assert.equal(g.phase,'complete','late-joining eight-player crew can finish the zoo');
});
test('joining an active command puzzle preserves completed work and allows the newcomer to power their station',()=>{
 const {r}=make('control'),g=r.game,host=g.activePlayers()[0];
 g.controlRoom.phase='running';g.controlRoom.panels[host.id].done=2;g.controlRoom.panels[host.id].powered=true;
 const p=r.addPlayer('Late').player;r.handle(p.id,{t:'pick',animal:'beaver'});
 assert.equal(g.controlRoom.phase,'waiting');assert.equal(g.controlRoom.panels[host.id].done,2);
 for(const q of g.activePlayers())q.inControlRoom=true;
 r.tick(.05);assert.equal(g.controlRoom.phase,'arming');
 r.handle(p.id,{t:'panel',op:'power'});r.tick(.05);
 assert.equal(g.controlRoom.phase,'running');assert.equal(g.controlRoom.panels[p.id].powered,true);
});
test('a returning player regains a roster position when a newcomer has reused their inactive position',()=>{
 const {r}=make('city',2),p=[...r.players.values()][1];
 r.disconnect(p.id);r.game.removePlayer(p.id);
 const late=r.addPlayer('Late').player;r.handle(late.id,{t:'pick',animal:'beaver'});
 r.resume(p.token);assert.equal(r.game.activePlayers().length,3);
 assert.equal(new Set(r.game.order).size,3);r.tick(.05);assert.ok(r.game.personal(p.id));
});
test('an uncaptured animal inside the Northgate holding cage can brace alongside a captive',()=>{
 const {r}=make('city',2),g=r.game,[a,b]=g.activePlayers();
 for(const p of [a,b]){p.captureOrigin='rescue';g._returnToEnclosure(p);}
 b.caged=false;
 for(const p of [a,b]){const target=g.interactTarget(p);assert.ok(target.run);target.run();p.input={e:true};}
 for(let i=0;i<34;i++)g.step(.05);
 assert.equal(g.gate('rescue-holding').state,1);assert.equal(a.caged,false);assert.equal(b.hold,null);
});
test('a guest choosing an animal can finish joining after the host changes chapters',()=>{
 const {r,out}=make('parking'),p=r.addPlayer('Choosing').player;
 r.phase='complete';r.handle(r.hostId,{t:'continue'});
 assert.equal(r.game.zooId,'city');assert.ok(!out.some(m=>m.pid===p.id&&m.t==='start'));
 r.handle(p.id,{t:'pick',animal:'beaver'});r.tick(.05);
 assert.ok(r.game.personal(p.id));assert.ok(out.some(m=>m.pid===p.id&&m.t==='start'));
});
