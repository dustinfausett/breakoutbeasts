import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CityGame} from '../shared/city-game.js';
import {ANIMAL_IDS} from '../shared/animals.js';
import {CLOTHES,AIRPORT_CLOTHES} from '../shared/wardrobe.js';
import {bfs} from '../shared/util.js';
import {canOccupy} from '../shared/physics.js';
import {arcadePersonal,stepArcade,mazeOpen} from '../shared/arcade.js';
import {airportCrime,stepAirport} from '../shared/airport.js';
import {prisonPersonal} from '../shared/prison.js';
import {captureCheckpoint,encodeCheckpoint,decodeCheckpoint,applyCheckpoint} from '../shared/checkpoints.js';
const make=(n=2,staff=false)=>new CityGame({players:ANIMAL_IDS.slice(0,n).map((animal,i)=>({id:'p'+i,animal})),options:{staff}});
function foot(g,p,x=68,y=410){p.inVehicle=false;p.location='airport';p.x=x+.5;p.y=y+.5;p.grace=100;}
function outfit(p){for(const c of CLOTHES.filter(c=>c.animal===p.animal&&c.style===0)){p.outfit[c.slot]=c.id;p.owned.push(c.id);}}
function use(g,p,id){const o=g.obj(id);p.x=o.x+.5;p.y=o.y+1.5;g._objectInteraction(p,o).run?.();}
function hold(g,p,n=30){for(let i=0;i<n&&p.hold;i++)g._continueHold(p,{e:true},.05);}
function solve(g,p,id){use(g,p,'airport-lock-'+id);hold(g,p);const b=g.airportPrison.locks[id].game;assert.ok(b);if(b.type==='tail')g.prisonAction(p.id,{op:'pin',x:b.target[0],y:b.target[1]});else for(const [x,y] of bfs(b.w,b.h,...b.cursor,b.goal,(x,y)=>!!b.cells[y*b.w+x]))g.prisonAction(p.id,{op:'move',x,y});}
test('airport perimeter and divider block all ten animals from walking around security',()=>{
 const g=make(1),p=g.activePlayers()[0];for(const animal of ANIMAL_IDS){p.animal=animal;assert.equal(bfs(g.w,g.h,20,413,[100,410],(x,y)=>x>=4&&x<=155&&y>=350&&y<=426&&canOccupy(g,animal,x+.5,y+.5,null),14000),null,animal);}
 foot(g,p,80,410);stepAirport(g,.05);assert.equal(p.x,68.5);p.animal='meerkat';foot(g,p,66,420);g.abilityTarget(p).run();if(p.digChoice)g.digAction(p.id,{op:'choose',x:76,y:420});assert.ok(!p.digTarget);
});
test('pooled security fee admits the whole disguised group; one-way return requires only that animal to pay again',()=>{
 const g=make(),[a,b]=g.activePlayers();for(const p of [a,b]){foot(g,p);outfit(p);}a.money=20;b.money=180;g._objectInteraction(a,g.obj('airport-security')).run();assert.ok(a.x>73&&b.x>73);assert.equal(a.money+b.money,0);
 foot(g,a,74,419);g._objectInteraction(a,g.obj('airport-return')).run();assert.equal(a.airportPaid,false);assert.equal(a.x,68.5);assert.ok(b.airportPaid);const before=a.x;g._objectInteraction(a,g.obj('airport-return')).run();assert.equal(a.x,before,'return door cannot be used from terminal');
 foot(g,a);b.money=100;b.inPlane=true;assert.ok(!g._objectInteraction(a,g.obj('airport-security')).idle);g._objectInteraction(a,g.obj('airport-security')).run();assert.equal(a.airportPaid,true);assert.equal(b.money,0);
});
test('both jails keep independent lock ownership and only require their own captured animals',()=>{
 const g=make(3),[a,b,c]=g.activePlayers();foot(g,a);g._capture({police:true},a);g._returnToEnclosure(a);c.inVehicle=false;c.location='street';g._capture({police:true},c);g._returnToEnclosure(c);
 assert.equal(a.cageDistrict,'airport');assert.equal(prisonPersonal(g,a).required,1);assert.equal(prisonPersonal(g,c).required,1);
 foot(g,b,42,384);use(g,b,'airport-lock-0');assert.ok(g.airportPrison.locks[0].owner===b.id);use(g,a,'airport-lock-0');assert.notEqual(g.airportPrison.locks[0].owner,a.id);hold(g,b);g.prisonAction(b.id,{op:'cancel'});b.hold=null;
 solve(g,a,0);assert.equal(a.caged,false);assert.equal(c.caged,true);assert.equal(g.gate('airport-prison').state,1);assert.ok(a.policeEscapeUntil>=g.time+20);
});
test('airport jail supports all eight captives and one lock per captive',()=>{
 const g=make(8),crew=g.activePlayers();for(const p of crew){foot(g,p);g._capture({police:true},p);g._returnToEnclosure(p);}assert.equal(prisonPersonal(g,crew[0]).required,8);
 for(let i=0;i<8;i++)solve(g,crew[0],i);assert.ok(crew.every(p=>!p.caged));
});
test('all five arcade games cost five dollars once, accept normal inputs and can be won',()=>{
 for(let index=0;index<5;index++){
  const g=make(1),p=g.activePlayers()[0];foot(g,p);p.money=10;use(g,p,'airport-arcade-'+index);hold(g,p);assert.equal(p.money,5);const a=p.arcade;assert.ok(a);assert.equal(arcadePersonal(g,p).deck,undefined);
  const act=m=>{g.time+=.12;g.arcadeAction(p.id,m);};
  if(a.type==='catch')for(let n=0;n<5;n++){while(a.basket!==a.column)act({op:'move',dx:a.column>a.basket?1:-1});g.time+=2;stepArcade(g,2);}
  if(a.type==='mole')for(let n=0;n<5;n++)act({op:'tap',index:a.target});
  if(a.type==='memory')for(let n=0;n<3;n++)for(const i of a.deck.map((v,i)=>v===n?i:-1).filter(i=>i>=0))act({op:'tap',index:i});
  if(a.type==='timing'){g.time=a.started+1.1;for(let n=0;n<3;n++)act({op:'land'});}
  if(a.type==='maze')for(const goal of [[6,1],[6,4],[1,4]])for(const [x,y] of bfs(8,6,...a.cursor,goal,mazeOpen))act({op:'move',dx:x-a.cursor[0],dy:y-a.cursor[1]});
  assert.equal(a.status,'won',a.type);assert.equal(p.arcadeWins,1);assert.equal(p.money,5);g.arcadeAction(p.id,{op:'close'});assert.equal(p.arcade,null);
 }
 const g=make(1),p=g.activePlayers()[0];foot(g,p);p.money=4;use(g,p,'airport-arcade-0');hold(g,p);assert.ok(!p.arcade);assert.equal(p.money,4);
});
test('airport shops sell exclusive fitted disguises and snacks that persist through a checkpoint',()=>{
 const g=make(1),p=g.activePlayers()[0];foot(g,p);p.money=200;const item=AIRPORT_CLOTHES.find(c=>c.animal===p.animal&&c.slot==='hat');use(g,p,'airport-souvenir-hat');hold(g,p);assert.ok(g.personal(p.id).city.catalog.some(c=>c.id===item.id));g.cityAction(p.id,{op:'take',item:item.id});g.cityAction(p.id,{op:'closeShop'});use(g,p,'airport-souvenir-pay');hold(g,p);assert.equal(p.money,170);
 use(g,p,'airport-snacks');hold(g,p);g.cityAction(p.id,{op:'take',item:'airport-cookie'});g.cityAction(p.id,{op:'closeShop'});use(g,p,'airport-snack-pay');hold(g,p);assert.equal(p.money,165);
 const saved=decodeCheckpoint(encodeCheckpoint(captureCheckpoint(g,p.id))),h=make(1);applyCheckpoint(h,saved);const q=h.activePlayers()[0];assert.ok(q.owned.includes(item.id));assert.equal(q.outfit.hat,item.id);assert.equal(q.food['airport-cookie'],1);q.stamina=.2;h.cityAction(q.id,{op:'eatSnack',item:'airport-cookie'});assert.ok(q.stamina>.5);assert.equal(q.food['airport-cookie'],0);
});
test('airport police patrol and respond to witnessed pickpocketing and all bites',()=>{
 const g=make(1,true),p=g.activePlayers()[0];assert.equal(g.staff.filter(s=>s.airport).length,3);foot(g,p);outfit(p);g._policeVisible=()=>false;airportCrime(g,p,false);assert.ok(!p.airportWanted);g._policeVisible=()=>true;airportCrime(g,p,false);assert.ok(p.airportWanted);assert.ok(g.staff.filter(s=>s.airport).every(s=>s.state==='investigate'));
});
test('free helpers can reach every airport lock and a city police reset preserves airport patrols',()=>{
 const g=make(1,true),p=g.activePlayers()[0];foot(g,p);g._capture({police:true},p);g._returnToEnclosure(p);
 for(let i=0;i<8;i++){const o=g.obj('airport-lock-'+i);assert.ok(bfs(g.w,g.h,Math.floor(p.x),Math.floor(p.y),[o.x,o.y+1],(x,y)=>canOccupy(g,p.animal,x+.5,y+.5,null)),o.id);}
 p.caged=false;p.location='street';p.policeEscapeUntil=0;g._capture({police:true},p);g._returnToEnclosure(p);g._stepKeysAndExit(.05);assert.equal(g.staff.filter(s=>s.airport).length,3);
});
