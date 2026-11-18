import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monsterSkin,MONSTER_IDS} from '../shared/monster-skins.js';
import {Room} from '../shared/room.js';
import {Game} from '../shared/game.js';
import {ANIMAL_IDS} from '../shared/animals.js';
import {runMission} from './helpers.js';
import {playerAwards} from '../shared/scoring.js';
test('only the four exact names enable distinct monster appearances, ignoring case and surrounding spaces',()=>{
 assert.deepEqual(['Jude',' Baylee ','TATE','dAx'].map(monsterSkin),MONSTER_IDS);
 for(const name of ['Jude Smith','Bayleee','Tater','Daxter','constructor','__proto__',null,'Player'])assert.equal(monsterSkin(name),null);
});
test('the lobby never reveals a monster; in-game snapshots show it while preserving the selected animal',()=>{
 for(const [name,index] of [['Jude',0],['Baylee',1],['Tate',2],['Dax',3]]){
  const r=new Room({code:'TEST',send:()=>{},options:{staff:false}}),p=r.addPlayer(name).player;r.handle(p.id,{t:'pick',animal:'beaver'});
  const lobby=r.lobbyState();assert.equal(lobby.players[0].animal,'beaver');assert.ok(!Object.hasOwn(lobby.players[0],'skin'));assert.ok(!JSON.stringify(lobby).includes('monster_'));
  r.handle(p.id,{t:'start'});const actor=r.game.players.get(p.id);assert.equal(actor.animal,'beaver');assert.equal(r.game.snapshot().pl[0].skin,MONSTER_IDS[index]);assert.equal(r.game.personal(p.id).skin,MONSTER_IDS[index]);assert.equal(playerAwards(r.game)[0].skin,MONSTER_IDS[index]);
 }
});
test('all ten animal choices retain identical stats and ability prompts with a monster name',()=>{
 for(const animal of ANIMAL_IDS){const base=new Game({players:[{id:'a',name:'Player',animal}],seed:31,options:{staff:false}}),monster=new Game({players:[{id:'a',name:'Jude',animal}],seed:31,options:{staff:false}});
  assert.equal(monster.players.get('a').animal,animal);assert.equal(monster.players.get('a').enc,base.players.get('a').enc);assert.equal(monster.personal('a').ps.t,base.personal('a').ps.t);assert.equal(monster.players.get('a').stamina,base.players.get('a').stamina);
  for(let i=0;i<8;i++){base.setInput('a',{mx:.5,my:.1});monster.setInput('a',{mx:.5,my:.1});base.step(.05);monster.step(.05);}assert.equal(monster.players.get('a').x,base.players.get('a').x);assert.equal(monster.players.get('a').y,base.players.get('a').y);
 }
});
test('secret skins work for live joins, reconnects and later chapters without replacing animal identity',()=>{
 const r=new Room({code:'TEST',send:()=>{},options:{staff:false}}),a=r.addPlayer('Jude').player;r.handle(a.id,{t:'pick',animal:'beaver'});r.handle(a.id,{t:'start'});
 const b=r.addPlayer('Baylee').player;r.handle(b.id,{t:'pick',animal:'monkey'});assert.equal(r.game.personal(b.id).skin,'monster_baylee');assert.equal(r.game.players.get(b.id).animal,'monkey');r.disconnect(b.id);r.resume(b.token);assert.equal(r.game.personal(b.id).skin,'monster_baylee');
 for(const stage of ['parking','city','takeoff']){r.startMission(stage);assert.equal(r.game.snapshot().pl.find(p=>p.id===a.id).skin,'monster_jude');assert.equal(r.game.players.get(a.id).animal,'beaver');}
});
test('a mission still completes when every actor uses one of the surprise names',()=>{
 const names=['Jude','Baylee','Tate','Dax'];const {game}=runMission(['beaver','monkey','meerkat','flamingo'],{maxTime:600,onTick:(g,t)=>{if(t===1)for(const [i,p] of g.activePlayers().entries())p.name=names[i];}});assert.equal(game.phase,'complete');assert.deepEqual(game.snapshot().pl.map(p=>p.skin),MONSTER_IDS);
});
