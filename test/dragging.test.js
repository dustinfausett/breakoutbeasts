import {ANIMALS} from '../shared/animals.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../shared/game.js';
import {CityGame} from '../shared/city-game.js';
import {ParkingGame} from '../shared/parking-game.js';
import {makeKeepers} from '../shared/staff.js';
import {staffFlashlight} from '../shared/dragging.js';
import {T} from '../shared/tiles.js';
const create=(GameType=Game,n=1)=>{
 const g=new GameType({players:Array.from({length:n},(_,i)=>({id:'p'+i,animal:i?'monkey':'beaver'})),options:{staff:false},seed:7});
 const p=g.activePlayers()[0];for(let y=22;y<=34;y++)for(let x=20;x<=48;x++)g.setTile(x,y,T.PATH);
 g.objects=g.objects.filter(o=>o.x<20||o.x>48||o.y<22||o.y>34);g.crates=[];g.gates=g.gates.filter(a=>a.tiles.every(([x,y])=>x<20||x>48||y<22||y>34));g.rebuildBlock();
 for(const [i,q] of g.activePlayers().entries()){q.x=30.5+i*5;q.y=28.5;q.face='right';q.grace=100;q.inVehicle=false;if(g.zooId==='city')q.location='street';}
 const s=makeKeepers([{route:[[31,28],[38,28]],start:0}],1)[0];if(g.zooId==='city'){s.scene='street';s.police=true;}g.staff=[s];return {g,p,s};
};
const tick=(g,p,input,n=1)=>{for(let i=0;i<n;i++){g.setInput(p.id,input);g.step(.05);}};
test('holding Bite after a knockout grabs the keeper and freezes the remaining sleep time',()=>{
 const {g,p,s}=create();tick(g,p,{b:true});assert.equal(p.dragging,0);assert.equal(s.draggedBy,p.id);assert.equal(s.downUntil-g.time,30);assert.equal(g.snapshot().st[0].light,0);
 tick(g,p,{b:true},100);assert.ok(Math.abs(s.downUntil-g.time-30)<1e-8);assert.equal(g.personal(p.id).dragging,0);
 tick(g,p,{});assert.equal(p.dragging,null);assert.equal(s.draggedBy,null);assert.ok(s.downUntil-g.time<30);g.time=s.downUntil-.01;tick(g,p,{});assert.notEqual(s.state,'unconscious');assert.equal(staffFlashlight(g,s),1);
});
test('drag movement is half walking speed even with Run held, spends no stamina, and moves the body',()=>{
 const {g,p,s}=create();s.downUntil=30;s.state='unconscious';tick(g,p,{b:true});const x=p.x,body=s.x;
 p.sprintT=1.6;tick(g,p,{b:true,mx:-1,my:0,run:true},20);
 assert.ok(Math.abs((x-p.x)-ANIMALS[p.animal].speed*.5)<1e-8,'half beaver walking speed');assert.ok(s.x<body-1);assert.equal(p.running,false);assert.equal(p.sprintT,0);assert.equal(p.stamina,1);
});
test('an already sleeping officer can be grabbed without rebiting or resetting a nearly expired timer',()=>{
 const {g,p,s}=create(CityGame);s.downUntil=.2;s.state='unconscious';tick(g,p,{b:true});assert.equal(p.dragging,s.id);const left=s.downUntil-g.time;
 s.downUntil=g.time+.01;tick(g,p,{b:true});assert.ok(s.downUntil>g.time);assert.equal(s.state,'unconscious');assert.ok(left<.2);assert.ok(!g.drainEvents().some(e=>e.k==='bitten'));
});
test('a body cannot pass through a wall; dragging stops the animal at a tight corner',()=>{
 const {g,p,s}=create();s.downUntil=30;s.state='unconscious';tick(g,p,{b:true});g.setTile(31,29,T.WALL);
 tick(g,p,{b:true,mx:0,my:1},40);assert.equal(p.dragging,0);assert.ok(s.y<28.71);assert.ok(p.y<31);assert.ok(Math.hypot(p.x-s.x,p.y-s.y)<1.1);
});
test('only one animal can drag each body and muzzles, walls and different scenes prevent grabs',()=>{
 const {g,p,s}=create(CityGame,2),q=g.activePlayers()[1];s.downUntil=30;s.state='unconscious';p.x=29.9;q.x=33.1;q.face='left';tick(g,p,{b:true});tick(g,q,{b:true});assert.equal(s.draggedBy,p.id);assert.equal(q.dragging,null);
 g.setConnected(p.id,false);assert.equal(s.draggedBy,null);q.muzzled=true;tick(g,q,{b:true});assert.equal(q.dragging,null);q.muzzled=false;s.scene='bank';tick(g,q,{b:true});assert.equal(q.dragging,null);
 s.scene='street';q.x=33.1;g.setTile(32,28,T.WALL);tick(g,q,{b:true});assert.equal(q.dragging,null);
});
test('capture and leaving release the body, and run-over staff remain permanently unconscious',()=>{
 const {g,p,s}=create(ParkingGame);g.vehicle.x=s.x;g.vehicle.y=s.y;g.vehicle.speed=1;g._hitKeepers();assert.equal(s.permanentDown,true);g.vehicle.x=10;g.vehicle.y=10;g.rebuildBlock();
 tick(g,p,{b:true});assert.equal(p.dragging,s.id);const deadline=s.downUntil;tick(g,p,{b:true,mx:-1,my:0},10);assert.equal(s.downUntil,deadline);assert.equal(staffFlashlight(g,s),0);
 g._capture({},p);assert.equal(p.dragging,null);assert.equal(s.draggedBy,null);assert.equal(s.permanentDown,true);
 const other=create();other.s.downUntil=30;other.s.state='unconscious';tick(other.g,other.p,{b:true});other.g.removePlayer(other.p.id);assert.equal(other.s.draggedBy,null);
});
test('flashlights remain dark asleep, flicker before waking, then return fully on; dragging keeps them dark',()=>{
 const {g,p,s}=create();s.downUntil=5;s.state='unconscious';assert.equal(staffFlashlight(g,s),0);
 const levels=[];for(let i=0;i<14;i++){g.time=3.61+i*.1;levels.push(staffFlashlight(g,s));}assert.ok(levels.includes(0));assert.ok(levels.some(n=>n>0));g.time=5;assert.equal(staffFlashlight(g,s),1);
 s.downUntil=5.5;g.setInput(p.id,{b:true});tick(g,p,{b:true});assert.equal(p.dragging,0);assert.equal(staffFlashlight(g,s),0);
});
