import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,TICK,staffProfile} from '../shared/game.js';
import {Room} from '../shared/room.js';
import {animalCanSee} from '../shared/vision.js';
import {T} from '../shared/tiles.js';

function fixture(animal='redpanda'){
 const g=new Game({players:[{id:'p',animal}],options:{staff:true}}),p=g.players.get('p');
 g.staff=g.staff.slice(0,1);const s=g.staff[0];s.x=20.5;s.y=14.5;s.dir=0;s.route=[[40,14]];s.wp=0;s.path=null;
 p.x=19.1;p.y=14.5;p.face='right';return {g,p,s};
}

test('hold E and move slowly alongside a guard to complete theft',()=>{
 const {g,p}=fixture(),start=p.x;g.setInput('p',{e:true,mx:.52});
 for(let i=0;i<22;i++)g.step(TICK);
 assert.ok(p.x>start+1,'animal can move throughout the theft');assert.equal(p.cageKeys,1);
});

test('leaving close range cancels theft instead of awarding a remote key',()=>{
 const {g,p}=fixture();g.setInput('p',{e:true,mx:-1});for(let i=0;i<22;i++)g.step(TICK);
 assert.equal(p.cageKeys,0);assert.equal(p.hold,null);
});

test('a keeper turning to watch a moving thief cancels theft',()=>{
 const {g,p,s}=fixture();g._interact(p);g._continueHold(p,{e:true},.3);s.dir=Math.PI;
 g._continueHold(p,{e:true},.7);assert.equal(p.cageKeys,0);assert.equal(p.hold,null);
});

test('biting knocks a keeper down, permits key theft, and enables permanent alert',()=>{
 const {g,p,s}=fixture();p.x=19.3;g._bite(p);
 assert.equal(s.state,'unconscious');assert.equal(s.downUntil,30);assert.equal(g.canSee(s,p),false);
 assert.equal(g.permanentAlert,true);assert.equal(g.snapshot().security,-1);
 s.dir=Math.PI;g._interact(p);for(let i=0;i<20;i++)if(p.hold)g._continueHold(p,{e:true},TICK);
 assert.equal(p.cageKeys,1,'an unconscious keeper can be looted regardless of facing');
 g.time=31;g._stepStaff(s,TICK);assert.notEqual(s.state,'unconscious');
 g.time=10000;assert.equal(g.snapshot().security,-1,'high alert lasts until this mission ends');
 const replay=new Game({players:[{id:'p',animal:'redpanda'}]});assert.equal(replay.permanentAlert,false);
});

test('bite input goes through room input queues and does not repeat while held',()=>{
 const room=new Room({code:'TEST',send:()=>{},options:{staff:true}});room.addPlayer('Tester');room.handle('p1',{t:'pick',animal:'redpanda'});room.handle('p1',{t:'start'});
 const g=room.game,p=g.players.get('p1');g.staff=g.staff.slice(0,1);const s=g.staff[0];s.x=20.5;s.y=14.5;s.dir=0;p.x=19.3;p.y=14.5;p.face='right';
 room.handle('p1',{t:'in',s:1,b:true});room.tick();assert.equal(s.state,'unconscious');
 for(let i=0;i<40;i++)room.tick();assert.equal(s.downUntil,30.05);
});

test('walls and distance prevent bites; muzzles prevent all biting',()=>{
 const {g,p,s}=fixture();g.setTile(20,14,T.WALL);p.x=19.9;s.x=21.1;g._bite(p);assert.equal(g.permanentAlert,false);
 g.setTile(20,14,T.PATH);p.biteCool=0;p.x=17;g._bite(p);assert.equal(g.permanentAlert,false);
 p.x=19.3;p.biteCool=0;p.muzzled=true;g._bite(p);assert.equal(g.permanentAlert,false);
});

test('darts unlock only after biting a keeper and require forward line of sight',()=>{
 const {g,p,s}=fixture();p.x=24.5;const cfg=staffProfile(g.zoo.staff,true);
 g._fireDart(s,p,cfg);assert.equal(g.darts.length,0);
 g.permanentAlert=true;s.dir=Math.PI;g._fireDart(s,p,cfg);assert.equal(g.darts.length,0);
 s.dir=0;g.setTile(22,14,T.WALL);g._fireDart(s,p,cfg);assert.equal(g.darts.length,0);
 g.setTile(22,14,T.PATH);p.x=40;g._fireDart(s,p,cfg);assert.equal(g.darts.length,0);
 p.x=24.5;g._fireDart(s,p,cfg);g._fireDart(s,p,cfg);assert.equal(g.darts.length,1,'shots have a cooldown');
});

test('dart impacts muzzle and return animals to their enclosure; muzzle survives capture',()=>{
 const {g,p,s}=fixture('beaver');g.permanentAlert=true;g._raiseAlert();p.x=24.5;
 g._fireDart(s,p,staffProfile(g.zoo.staff,true));for(let i=0;i<15;i++)g._stepDarts(TICK);
 assert.equal(p.muzzled,true);assert.ok(p.capturedT>0);g._returnToEnclosure(p);assert.equal(p.muzzled,true);
 assert.equal(g.snapshot().pl[0].mu,true);assert.ok(g.drainEvents().some(e=>e.k==='tranquilized'));
});

test('projectiles stop at obstacles and have finite travel distance',()=>{
 const {g,p,s}=fixture();g.permanentAlert=true;p.x=25.5;g._fireDart(s,p,staffProfile(g.zoo.staff,true));g.setTile(22,14,T.WALL);
 for(let i=0;i<30;i++)g._stepDarts(TICK);assert.equal(p.muzzled,false);assert.equal(g.darts.length,0);
 g.setTile(22,14,T.PATH);s.dartReady=0;g._fireDart(s,p,staffProfile(g.zoo.staff,true));p.x=40;
 for(let i=0;i<30;i++)g._stepDarts(TICK);assert.equal(g.darts.length,0);assert.equal(p.muzzled,false);
});

test('a teammate bites off a muzzle, restoring beaver chewing without triggering human aggression',()=>{
 const g=new Game({players:[{id:'a',animal:'beaver'},{id:'b',animal:'monkey'}],options:{staff:false}}),a=g.players.get('a'),b=g.players.get('b');
 a.muzzled=true;a.x=56.5;a.y=24.5;a.face='right';assert.equal(g.abilityTarget(a).idle,true);
 a.x=19.5;a.y=14.5;b.x=18.5;b.y=14.5;b.face='right';g._bite(b);assert.equal(a.muzzled,true);for(let i=0;i<51;i++)g._continueHold(b,{b:true},TICK);assert.equal(a.muzzled,false);assert.equal(g.permanentAlert,false);
 a.x=56.5;a.y=24.5;assert.equal(typeof g.abilityTarget(a).run,'function');
 a.muzzled=true;a.carry='wood';a.x=20.5;a.y=14.5;a.face='right';g.setTile(21,14,T.BRIDGE_SPOT);
 g.abilityTarget(a).run();assert.equal(g.tileAt(21,14),T.BRIDGE,'muzzles do not block construction with paws');
});

test('muzzles clear on a real zoo exit, not merely while waiting in the mission',()=>{
 const {g,p}=fixture();p.muzzled=true;p.x=78.5;p.y=28.5;g._postMove(p,0);assert.equal(p.muzzled,true);
 g.openGate(g.gate(g.zoo.exitGate));g._postMove(p,0);assert.equal(p.muzzled,false);
});

test('capture countdown reaches exactly zero so returned animals can receive teammate help',()=>{
 const g=new Game({players:[{id:'a',animal:'beaver'},{id:'b',animal:'monkey'}]}),a=g.players.get('a'),b=g.players.get('b');
 a.muzzled=true;g._capture(g.staff[0],a);
 for(let i=0;i<24;i++)g._stepPlayer(a,TICK);
 assert.equal(a.capturedT,0,'no negative floating-point remainder');
 b.x=a.x-1;b.y=a.y;b.face='right';g._bite(b);for(let i=0;i<51;i++)g._continueHold(b,{b:true},TICK);
 assert.equal(a.muzzled,false,'a real returned animal is a valid muzzle-removal target');
});

test('a freed NPC animal can bite off a solo animal’s muzzle on request',()=>{
 const {g,p}=fixture('beaver');g.staff=[];p.muzzled=true;const friend=g.npcs[0];friend.x=p.x+1;friend.y=p.y;
 friend.state='caged';g._interact(p);assert.equal(p.muzzled,true);
 friend.state='free';g._interact(p);for(let i=0;i<51;i++)g._continueHold(p,{e:true},TICK);assert.equal(p.muzzled,false,'solo muzzle removal still requires another freed animal');
});

test('Hard vision is forward, uncapped in distance, and blocked by obstacles and diagonal corners',()=>{
 const walls=new Set();const w={w:100,h:10,visionBlocked:(x,y)=>x<0||y<0||x>=100||y>=10||walls.has(x+','+y)};
 const p={x:2.5,y:5.5,face:'right'};assert.equal(animalCanSee(w,p,90.5,5.5),true);
 assert.equal(animalCanSee(w,p,1.5,5.5),false);walls.add('50,5');assert.equal(animalCanSee(w,p,90.5,5.5),false);
 assert.equal(animalCanSee(w,p,50.5,5.5),true,'the near wall surface remains visible');
 p.face='left';assert.equal(animalCanSee(w,p,1.5,5.5),true);assert.equal(animalCanSee(w,p,3.5,5.5),false);
 p.face='right';walls.clear();walls.add('3,5');walls.add('2,6');assert.equal(animalCanSee(w,p,4.5,7.5),false);
});

test('three garbage-bin rattles loosen a muzzle, with a cooldown between rattles',()=>{const {g,p}=fixture('beaver');g.staff=[];p.muzzled=true;const bin=g.objects.find(o=>o.kind==='can');assert.ok(bin);const target=()=>g._objectInteraction(p,bin);target().run();assert.equal(p.muzzleRattles,1);assert.equal(p.muzzled,true);assert.equal(target().idle,true);bin.cool=0;target().run();assert.equal(p.muzzled,true);bin.cool=0;target().run();assert.equal(p.muzzled,false);});
test('releasing bite early cancels muzzle removal',()=>{const g=new Game({players:[{id:'a',animal:'beaver'},{id:'b',animal:'monkey'}],options:{staff:false}}),a=g.players.get('a'),b=g.players.get('b');a.muzzled=true;a.x=19.5;a.y=14.5;b.x=18.5;b.y=14.5;b.face='right';g._bite(b);g._continueHold(b,{b:true},1);assert.equal(a.muzzled,true);g._continueHold(b,{b:false},TICK);assert.equal(b.hold,null);assert.equal(a.muzzled,true);});
