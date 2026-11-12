import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CityGame} from '../shared/city-game.js';
import {stepTraffic} from '../shared/traffic.js';
import {carsOverlap} from '../shared/car-pushing.js';
test('traffic detours around a parked car without overlaps or a permanent queue',()=>{const g=new CityGame({players:[{id:'a',animal:'beaver'}],options:{staff:false}}),c=g.cars.find(c=>c.traffic),obstacle=g.cars[1];Object.assign(c,{x:50,y:46,angle:Math.PI/2,trafficRoute:[[50,76],[50,44]],trafficIndex:0,trafficSpeed:2.5});Object.assign(obstacle,{x:50,y:57,angle:Math.PI/2});g.cars=[c,obstacle];let passed=false;for(let i=0;i<1000;i++){g.time+=.05;stepTraffic(g,c,.05);assert.ok(!carsOverlap(c,obstacle));if(c.y>65){passed=true;break;}}assert.ok(passed,JSON.stringify({x:c.x,y:c.y,route:c.detour,reroutes:c.reroutes}));});
test('ambient traffic clears intersections without permanent gridlock',()=>{const g=new CityGame({players:[{id:'a',animal:'beaver'}],options:{staff:false}}),traffic=g.cars.filter(c=>c.traffic),last=new Map(traffic.map(c=>[c.id,0]));for(let i=0;i<2400;i++){g.time+=.05;for(const c of traffic){stepTraffic(g,c,.05);if(c.speed>0)last.set(c.id,g.time);assert.ok(g.time-last.get(c.id)<12,'stuck '+c.id+' '+c.x+','+c.y);}}});
