import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CityGame} from '../shared/city-game.js';
import {stepCrowds} from '../shared/crowds.js';
const make=()=>new CityGame({players:[{id:'p',name:'Jude',animal:'beaver'}],seed:7,options:{staff:false}});
test('airport has many more passengers, mostly in the terminal, with no one spawned inside jail',()=>{
 const g=make(),crowd=g.humans.filter(n=>n.scene==='airport');assert.equal(crowd.length,96);assert.equal(crowd.filter(n=>n.x<71).length,80);assert.equal(crowd.filter(n=>n.x>73).length,16);assert.ok(crowd.every(n=>!g.inRect(n.x,n.y,g.zoo.airportLayout.holding)));
});
test('biting at the airport frightens every other awake passenger and makes them run',()=>{
 const g=make(),p=g.players.get('p'),crowd=g.humans.filter(n=>n.scene==='airport'),victim=crowd[0];p.inVehicle=false;p.location='airport';p.x=20.5;p.y=413.5;p.face='right';p.grace=100;victim.x=21.3;victim.y=413.5;g._bite(p);assert.ok(victim.asleep);assert.ok(crowd.filter(n=>n!==victim).every(n=>n.panic));
 const start=new Map(crowd.map(n=>[n.id,[n.x,n.y]]));for(let i=0;i<30;i++){g.time+=.05;stepCrowds(g,.05);}
 assert.ok(crowd.filter(n=>!n.asleep&&Math.hypot(n.x-start.get(n.id)[0],n.y-start.get(n.id)[1])>1).length>50);assert.ok(g.snapshot().humans.filter(n=>n.id!==victim.id&&crowd.some(c=>c.id===n.id)).every(n=>n.running));
 assert.ok(crowd.every(n=>(start.get(n.id)[0]<71)===(n.x<71)),'passengers stay on their side of security');
});
