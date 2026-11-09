import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,TICK} from '../shared/game.js';import {ANIMAL_IDS} from '../shared/animals.js';import {T} from '../shared/tiles.js';import {canOccupy} from '../shared/physics.js';import {bfs,dist} from '../shared/util.js';
test('the original maintenance yard keeps its open floor and central generator',()=>{
 const g=new Game({players:[{id:'p',animal:'redpanda'}]});let open=0;
 for(let y=27;y<=38;y++)for(let x=3;x<=22;x++)if(g.tileAt(x,y)===T.FLOOR)open++;
 assert.ok(open>=190,'lower yard is mostly open');assert.equal(g.tileAt(8,30),T.MACHINE);assert.equal(g.tileAt(15,31),T.MACHINE);
 assert.deepEqual(g.zoo.bays.slice(0,4).map(b=>[b.x,b.y]),[[3,18],[8,18],[13,18],[18,18]]);
 assert.ok(g.zoo.bays.slice(4).every(b=>b.y===58));
 assert.ok(g.objects.filter(o=>o.kind==='socket').every(o=>o.y===32&&o.stand[1]===33));
});
test('all eight fuse bay entrances remain reachable from the promenade',()=>{
 const g=new Game({players:ANIMAL_IDS.slice(0,8).map((animal,i)=>({id:'p'+i,animal})),options:{staff:false}});
 for(const [i,p] of g.activePlayers().entries()){
  const bay=g.bayState[i];assert.ok(bfs(g.w,g.h,12,42,bay.entrance,(x,y)=>canOccupy(g,p.animal,x+.5,y+.5,null)),'reachable bay '+(i+1));
 }
});
test('the south keeper can patrol into and across the open maintenance yard',()=>{
 const g=new Game({players:[{id:'p',animal:'redpanda'}]}),keeper=g.staff[2],seen=new Set();
 for(const goal of [[12,35],[20,28]])assert.ok(bfs(g.w,g.h,12,42,goal,(x,y)=>g._staffPass(x,y)));
 for(let i=0;i<4000;i++){g.step(TICK);g.drainEvents();for(const [j,point] of [[12,35],[20,28]].entries())if(dist(keeper.x,keeper.y,point[0]+.5,point[1]+.5)<1)seen.add(j);}
 assert.equal(seen.size,2,'keeper visits both yard waypoints instead of circling in a pocket');
});
