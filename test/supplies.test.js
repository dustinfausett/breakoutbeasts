import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../shared/game.js';import {ANIMAL_IDS} from '../shared/animals.js';import {canOccupy} from '../shared/physics.js';import {bfs,dist} from '../shared/util.js';
const game=seed=>new Game({seed,players:[{id:'p',animal:'elephant'}],options:{staff:false}});
test('supply locations vary by game seed, repeat with the same seed, and remain reachable away from gates',()=>{
 const positions=g=>g.objects.filter(o=>o.kind==='supplies').map(o=>[o.id,o.x,o.y]);
 assert.deepEqual(positions(game(15)),positions(game(15)));assert.notDeepEqual(positions(game(15)),positions(game(16)));
 for(let seed=1;seed<=12;seed++){
  const g=game(seed);
  for(const o of g.objects.filter(o=>o.kind==='supplies')){
   assert.ok(g.gates.every(gate=>gate.tiles.every(t=>dist(o.x,o.y,...t)>=4)));
   const enc=g.zoo.enclosures[o.enc],animal=o.public?'elephant':enc.animal,start=o.public?[30,28]:enc.spawn;
   assert.ok(bfs(g.w,g.h,...start,[o.x,o.y],(x,y)=>canOccupy(g,animal,x+.5,y+.5,null)),'reachable '+enc.animal);
   assert.equal(o.remaining,o.public?6:2);
  }
 }
});
test('chests empty once, cannot overfill inventory, and never refill or move on capture',()=>{
 const g=game(9),p=g.players.get('p'),chest=g.objects.find(o=>o.kind==='supplies'&&!o.public&&o.enc===p.enc);p.x=chest.x+.5;p.y=chest.y+.5;
 const location=[chest.x,chest.y];g._finishCraft(p,chest);g._finishCraft(p,chest);assert.equal(p.materials,2);assert.equal(chest.remaining,0);assert.equal(chest.state,1);
 assert.equal(g._objectInteraction(p,chest).run,undefined);p.materials=0;g._finishCraft(p,chest);assert.equal(p.materials,0);
 g._returnToEnclosure(p);const kept=g.obj(chest.id);assert.equal(kept.remaining,0);assert.equal(kept.state,1);assert.deepEqual([kept.x,kept.y],location);
 assert.equal(game(9).obj(chest.id).remaining,2);
 const full=g.objects.find(o=>o.kind==='supplies'&&o.public);p.x=full.x+.5;p.y=full.y+.5;p.materials=2;g._finishCraft(p,full);assert.equal(full.remaining,6);
});
test('every animal can use its natural ability without preparing at a bench',()=>{
 for(const animal of ANIMAL_IDS){const g=new Game({players:[{id:'p',animal}],options:{staff:false}}),p=g.players.get('p');
  assert.equal(p.prepared,false);const target=g.abilityTarget(p);assert.ok(!target?.text.includes('prepare'));assert.ok(!g.zoo.enclosures[p.enc].solution.some(s=>s.holdE===1.2));
 }
 const g=game(5),p=g.players.get('p'),gate=g.gate(g.zoo.enclosures[p.enc].mainGate),[x,y]=gate.tiles[0];p.x=x+.5;p.y=y-.5;p.face='down';
 assert.ok(g.abilityTarget(p)?.run,'unprepared elephant can charge its gate');
});
