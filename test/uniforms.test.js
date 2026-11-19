import {grabSleepingStaff,followDraggedStaff} from '../shared/dragging.js';
import {Room} from '../shared/room.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../shared/game.js';
import {CityGame} from '../shared/city-game.js';
import {uniformTarget,uniformHold,uniformHoldCrime,wearUniform,uniformCrime,compromiseUniform,transferUniforms} from '../shared/uniforms.js';
import {isDisguised} from '../shared/wardrobe.js';
import {policeExpose} from '../shared/police.js';
import {captureCheckpoint,encodeCheckpoint,decodeCheckpoint,applyCheckpoint} from '../shared/checkpoints.js';
const players=[{id:'p',animal:'beaver'},{id:'q',animal:'elephant'}];
function fixture(city=false){const g=new (city?CityGame:Game)({players,options:{staff:false}}),p=g.players.get('p');p.inVehicle=false;p.location='street';p.x=20.5;p.y=14.5;const s={id:'body',x:21.5,y:14.5,scene:'street',police:city,downUntil:30,state:'unconscious',dir:0};g.staff=[s];g.humans=[];g.visionBlocked=()=>false;return {g,p,s};}
function hold(g,p){const t=uniformTarget(g,p);assert.ok(t);t.run();uniformHold(g,p,{e:true},2);}
test('sleeping staff give keys, then wallet, then uniform on separate actions; the body cannot be looted twice',()=>{for(const city of [false,true]){const {g,p,s}=fixture(city);assert.match(uniformTarget(g,p).text,/keys first/);hold(g,p);assert.equal(p.cageKeys,1);assert.equal(s.keysLooted,true);assert.equal(p.uniform,null);assert.match(uniformTarget(g,p).text,/wallet/);assert.equal(g.personal(p.id).pe,null,'wallet action has no discovery-spoiling prompt');hold(g,p);assert.equal(p.money,20);assert.equal(p.uniform,null);assert.match(uniformTarget(g,p).text,/uniform/);assert.equal(g.personal(p.id).pe,null,'clothes action has no discovery-spoiling prompt');hold(g,p);assert.equal(p.uniform,city?'police':'keeper');assert.ok(isDisguised(p));assert.equal(s.uniformTaken,true);assert.equal(uniformTarget(g,p),null);assert.equal(g.personal('p').uniforms.wearing,p.uniform);assert.equal(g.snapshot().pl.find(q=>q.id===p.id).uniform,p.uniform);}});
test('uniform theft cancels if the body wakes, the animal leaves, releases E, or another player takes it first',()=>{for(const mutate of [(g,p,s)=>s.downUntil=0,(g,p)=>p.x=40,(g,p,s)=>s.uniformTaken=true]){const {g,p,s}=fixture();s.keysLooted=true;s.walletLooted=true;uniformTarget(g,p).run();mutate(g,p,s);uniformHold(g,p,{e:true},2);assert.equal(p.uniform,null);assert.equal(p.hold,null);}const {g,p,s}=fixture();s.keysLooted=true;s.walletLooted=true;uniformTarget(g,p).run();uniformHold(g,p,{e:false},2);assert.equal(p.uniform,null);});
test('a stolen police car key remains usable after taking the uniform',()=>{const {g,p,s}=fixture(true);const car=g.cars[1];s.carId=car.id;hold(g,p);assert.ok(p.carKeys.includes(car.id));hold(g,p);assert.equal(p.money,20);hold(g,p);assert.ok(p.carKeys.includes(car.id));assert.equal(p.uniform,'police');});
test('witnessing a crime compromises all uniforms of that role, including future copies, but not the other role',()=>{const {g,p,s}=fixture(),q=g.players.get('q');for(const a of [p,q]){a.uniformsOwned=['police','keeper'];wearUniform(g,a,'police');}assert.equal(uniformCrime(g,p),false,'sleeping victim is not a witness');g.staff.push({...s,id:'witness',downUntil:0});g.canSee=()=>true;assert.equal(uniformCrime(g,p),true);assert.equal(isDisguised(q),false);wearUniform(g,q,'keeper');assert.equal(isDisguised(q),true);wearUniform(g,p,'police');assert.equal(isDisguised(p),false,'a fresh copy does not reset discovery');});
test('a witness behind an obstacle or in a different room cannot burn a uniform',()=>{const {g,p,s}=fixture();p.uniformsOwned=['keeper'];wearUniform(g,p,'keeper');g.staff=[];g.humans=[{x:21.5,y:14.5,angle:Math.PI,scene:'bank'}];assert.equal(uniformCrime(g,p),false);g.humans[0].scene='street';g.visionBlocked=()=>true;assert.equal(uniformCrime(g,p),false);g.visionBlocked=()=>false;assert.equal(uniformCrime(g,p),true);});
test('police recognition compromises police disguises for the whole group',()=>{const {g,p}=fixture(true),q=g.players.get('q');for(const a of [p,q]){a.uniformsOwned=['police'];wearUniform(g,a,'police');}policeExpose(g,p);assert.equal(g.uniforms.compromised.police,true);assert.equal(isDisguised(q),false);});
test('safe checkpoints and chapter transitions preserve uniform inventory and compromised types',()=>{const {g,p}=fixture(true);p.uniformsOwned=['police','keeper'];wearUniform(g,p,'keeper');compromiseUniform(g,'police');const data=decodeCheckpoint(encodeCheckpoint(captureCheckpoint(g,p.id)));const next=new CityGame({players,options:{staff:false}});applyCheckpoint(next,data);const q=next.players.get('p');assert.deepEqual(q.uniformsOwned,p.uniformsOwned);assert.equal(q.uniform,'keeper');assert.equal(isDisguised(q),true);assert.equal(next.uniforms.compromised.police,true);const chapter=new Game({players,options:{staff:false}});transferUniforms(next,chapter);assert.deepEqual(chapter.players.get('p').uniformsOwned,p.uniformsOwned);assert.equal(chapter.players.get('p').uniform,'keeper');assert.equal(chapter.uniforms.compromised.police,true);});
test('changing back to ordinary clothes removes the full uniform',()=>{const {g,p}=fixture();p.uniformsOwned=['keeper'];wearUniform(g,p,'keeper');assert.ok(isDisguised(p));g.uniformAction(p.id,{op:'wear',uniform:null});assert.equal(p.uniform,null);assert.equal(isDisguised(p),false);});
test('biting a lone keeper does not reveal the uniform; a second watching keeper does',()=>{for(const seen of [false,true]){const {g,p,s}=fixture();p.face='right';p.uniformsOwned=['keeper'];wearUniform(g,p,'keeper');s.downUntil=0;s.state='patrol';if(seen)g.staff.push({...s,id:'watcher',x:23.5,dir:Math.PI});g._bite(p);assert.ok(s.downUntil>g.time);assert.equal(g.uniforms.compromised.keeper,seen);}});
test('witnessed money theft burns a uniform, while looting an isolated sleeping victim does not',()=>{for(const seen of [false,true]){const {g,p,s}=fixture(true);p.uniformsOwned=['police'];wearUniform(g,p,'police');g.humans=[{id:'wallet',x:21.5,y:14.5,scene:'street',asleep:true,wallet:20}];if(seen){s.downUntil=0;s.dir=Math.PI;}p.hold={kind:'citySteal',human:'wallet',btn:'e',t:0,need:.9};g._continueHold(p,{e:true},2);assert.equal(p.money,20);assert.equal(g.uniforms.compromised.police,seen);}});
test('police capture confiscates uniforms and compromises the captured disguise',()=>{const {g,p,s}=fixture(true);p.uniformsOwned=['police','keeper'];wearUniform(g,p,'police');g._capture(s,p);assert.equal(p.uniform,null);assert.deepEqual(p.uniformsOwned,[]);assert.equal(g.uniforms.compromised.police,true);});

test('wallet money earned in the zoo survives the parking lot and city transitions',()=>{const r=new Room({code:'LOOT',send:()=>{},options:{staff:false}}),p=r.addPlayer('Tester').player;r.handle(p.id,{t:'pick',animal:'beaver'});r.startMission('zoo');r.game.players.get(p.id).money=20;r.startMission('parking');assert.equal(r.game.players.get(p.id).money,20);r.game.players.get(p.id).money+=20;r.startMission('city');assert.equal(r.game.players.get(p.id).money,40);});
test('unlocking a cage in view exposes all matching uniforms and immediately radios an alert',()=>{
 const {g,p,s}=fixture(),q=g.players.get('q');s.downUntil=0;s.x=24.5;s.dir=Math.PI;
 for(const a of [p,q]){a.uniformsOwned=['keeper'];wearUniform(g,a,'keeper');}
 const o=g.objects.find(o=>o.keeper&&o.action?.open&&g.gate(o.action.open)?.state===0),gate=g.gate(o.action.open);p.cageKeys=1;
 g._objectInteraction(p,o).run();if(p.hold)g._continueHold(p,{e:true},o.hold+.1);
 assert.equal(gate.state,1);assert.equal(isDisguised(p),false);assert.equal(isDisguised(q),false);assert.ok(g.alertUntil>g.time);assert.equal(s.state,'chase');assert.equal(s.target,p.id);
});
test('a cage opened out of sight does not expose a uniform, and an already open gate does not count as a crime',()=>{
 for(const reason of ['wall','behind','asleep','other-room','open']){
  const {g,p,s}=fixture();s.downUntil=0;s.x=24.5;s.dir=Math.PI;p.uniformsOwned=['keeper'];wearUniform(g,p,'keeper');const gate=g.gates.find(a=>a.kind==='main'&&!a.state);
  if(reason==='wall')g.visionBlocked=()=>true;if(reason==='behind')s.dir=0;if(reason==='asleep')s.downUntil=30;if(reason==='other-room')s.scene='bank';if(reason==='open')gate.state=1;
  g.openGate(gate,p);assert.equal(isDisguised(p),true,reason);assert.equal(g.uniforms.compromised.keeper,false,reason);
 }
});
test('a keeper arriving while the animal holds a gate lever exposes the disguise before the hold completes',()=>{
 const {g,p,s}=fixture();s.downUntil=0;s.x=24.5;s.dir=0;p.uniformsOwned=['keeper'];wearUniform(g,p,'keeper');
 p.hold={kind:'lever',btn:'e',t:0,need:10};g._continueHold(p,{e:true},.1);assert.equal(isDisguised(p),true);
 s.dir=Math.PI;g._continueHold(p,{e:true},.1);assert.equal(isDisguised(p),false);assert.ok(p.hold.t<10);assert.ok(g.alertUntil>g.time);assert.equal(s.target,p.id);
});
test('held rescue work, smashing and vault work expose uniforms when seen, but shopping does not',()=>{
 for(const kind of ['rescueUnlock','rescueTeam','ram','terrainHit','groundDig','cityVault','vaultCash','prisonLock','shopTake']){
  const {g,p,s}=fixture(true);s.downUntil=0;s.x=24.5;s.dir=Math.PI;p.uniformsOwned=['police'];wearUniform(g,p,'police');const n=g.staff.length;
  p.hold={kind,btn:'e',t:0,need:10};uniformHoldCrime(g,p,{e:true});
  assert.equal(g.uniforms.compromised.police,kind!=='shopTake',kind);assert.equal(g.staff.length,n,'witnessing a crime does not spawn officers');
 }
});

test('dragging an unconscious keeper past a watching keeper exposes the uniform',()=>{
 const {g,p,s}=fixture();p.face='right';p.input={b:true};p.uniformsOwned=['keeper'];wearUniform(g,p,'keeper');assert.equal(grabSleepingStaff(g,p),true);assert.equal(isDisguised(p),true);
 const watcher={...s,id:'watcher',downUntil:0,permanentDown:false,x:24.5,dir:Math.PI};g.staff.push(watcher);followDraggedStaff(g,p,[p.x,p.y]);assert.equal(isDisguised(p),false);assert.equal(watcher.target,p.id);assert.ok(g.alertUntil>g.time);
});
