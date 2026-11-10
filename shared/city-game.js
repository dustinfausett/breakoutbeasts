import {ParkingGame,CAR_CONTROLS} from './parking-game.js';
import {dist,lineOfSight} from './util.js';
import {DIRS} from './tiles.js';
import {clothesFor,isDisguised,CLOTHES} from './wardrobe.js';
import {gpsFor} from './navigation.js';
import {makeKeepers} from './staff.js';
export class CityGame extends ParkingGame{
 constructor(args){
  super({...args,worldId:'city',options:{...args.options,staff:false}});this.visited=new Set();this.vaultCash=2400;this.vaultProgress=0;this.controlAlarm=null;this.controlArrived=false;
  for(const gate of this.zoo.gates)this._addGate({...gate,tiles:gate.tiles.map(t=>[...t])});
  this.humans=Array.from({length:12},(_,i)=>({id:'human'+i,x:10.5+(i%4)*5,y:145.5+Math.floor(i/4)*7,home:[10.5+(i%4)*5,145.5+Math.floor(i/4)*7],angle:0,wallet:60+Math.floor(this.rng()*100),asleep:false,picked:false,phase:this.rng()*6,color:i%4}));
  for(const p of this.activePlayers()){p.money=0;p.owned=[];p.outfit={};p.location='street';p.disguiseBlown=false;p.cageHits=0;p.shopping=false;p.inVehicle=true;p.x=this.vehicle.x;p.y=this.vehicle.y;}
  this._ensureNavigator();this.vehicle.unlocked=true;this.vehicle.values.navigation=this.zoo.destinations[0].name;this.rebuildBlock();
 }
 _ensureNavigator(){const ids=this.activePlayers().map(p=>p.id);if(ids.length&&!this.vehicle.owners.navigation)this.vehicle.owners.navigation=ids.at(-1);}
 removePlayer(id){const destination=this.vehicle.values.navigation;super.removePlayer(id);this._ensureNavigator();this.vehicle.values.navigation=this.zoo.destinations.some(d=>d.name===destination)?destination:this.zoo.destinations[0].name;}
 _carControls(){return CAR_CONTROLS.map(c=>c.id==='navigation'?{...c,choices:this.zoo.destinations.map(d=>d.name),goal:this.zoo.destinations[0].name,hint:'Choose a destination. Read your GPS turns aloud to the driver.'}:c);}
 detectable(p){return !p.caged&&p.location==='street'&&!isDisguised(p)&&super.detectable(p);}
 abilityTarget(p){return p.caged?{text:'Wait for a rescue; if everyone is caged, each animal must ram the door twice',idle:true}:p.shopping?{text:'Choose your disguise',idle:true}:super.abilityTarget(p);}
 inOwnEnclosure(p){return !!p.caged;}
 _stepPlayer(p,dt){if(p.shopping){p.moving=false;return;}super._stepPlayer(p,dt);}
 _near(a,b,r=1.65){return dist(a.x,a.y,b.x,b.y)<r&&lineOfSight(a.x,a.y,b.x,b.y,(x,y)=>this.visionBlocked(x,y));}
 interactTarget(p){
  if(p.inVehicle||p.capturedT>0||p.under||p.hop||p.slide)return null;
  if(p.caged){const all=this.activePlayers().every(q=>q.caged&&q.capturedT<=0);if(!all)return {text:'A teammate must open the outside cage latch',idle:true};if(dist(p.x,p.y,137.5,161.5)>2.5)return {text:'Everyone move to the cage door, then hold E to ram it twice each',idle:true};if(p.cageHits>=2)return {text:'Your two hits are done — wait for your teammates',idle:true};return {text:`Hold E: ram the cage door (${p.cageHits}/2)`,run:()=>{p.hold={kind:'cityRam',btn:'e',t:0,need:.9};}};}
  if(p.location==='bank'){
   const human=this.humans.find(n=>this._near(p,n)&&n.wallet>0&&(n.asleep||!n.picked));
   if(human)return {text:human.asleep?'Hold E: take the sleeping customer’s wallet':'Hold E: sneak some money from this customer',run:()=>{p.hold={kind:'citySteal',btn:'e',human:human.id,t:0,need:human.asleep?.7:1.5};}};
  }
  const o=this.objects.filter(o=>o.kind!=='vehicle'&&dist(p.x,p.y,o.x+.5,o.y+.5)<1.7).sort((a,b)=>dist(p.x,p.y,a.x+.5,a.y+.5)-dist(p.x,p.y,b.x+.5,b.y+.5))[0];
  if(o){const result=this._objectInteraction(p,o);if(result)return result;}
  return super.interactTarget(p);
 }
 _objectInteraction(p,o){
  if(o.kind==='cityDoor')return {text:o.label+' (E)',run:()=>this._enter(p,o.scene,o.from)};
  if(o.kind==='shopCounter')return {text:'Browse fitted shirts, hats and pants',run:()=>{if(p.location==='thrift')p.shopping=true;}};
  if(o.kind==='vaultWheel')return this.gate('city-vault')?.state?{text:'Vault open — collect the cash inside',idle:true}:{text:'Hold E: everyone grab the vault wheel together',run:()=>{if(p.location==='bank')p.hold={kind:'cityVault',btn:'e',t:0,need:Infinity};}};
  if(o.kind==='vaultCash')return {text:this.vaultCash?`Collect vault money ($${this.vaultCash} left)`:'The vault is empty',...(this.vaultCash?{run:()=>{if(p.location==='bank'&&this.gate('city-vault').state&&p.x>34){const amount=Math.min(200,this.vaultCash);this.vaultCash-=amount;p.money+=amount;this.emit({k:'cash',pid:p.id,amount});}}}:{idle:true})};
  if(o.kind==='controlLatch')return {text:'Open the cage and rescue every captured animal',run:()=>{if(p.location==='control'&&!p.caged)this._releaseCityCage();}};
  return super._objectInteraction(p,o);
 }
 _enter(p,scene,from){
  if(p.inVehicle||p.caged||p.capturedT>0||!p.connected)return;
  let point;if(scene==='street'){const door=this.obj('enter-'+(from||p.location));if(!door)return;point=[door.stand[0]+.5,door.stand[1]+.5];}else{const room=this.zoo.interiors[scene];if(!room)return;point=room.spawn.map(v=>v+.5);}
  p.location=scene;p.shopping=scene==='thrift';p.hold=null;p.shell=false;p.slide=null;p.hop=null;p.under=null;p.x=point[0];p.y=point[1];p.safe=point;p.grace=3;p.input={};this.emit({k:'cityenter',pid:p.id,scene});
 }
 cityAction(pid,msg){
  const p=this.players.get(pid);if(this.phase!=='play'||!p?.active||!p.connected||p.capturedT>0||p.caged||p.inVehicle)return;
  if(msg.op==='closeShop'){p.shopping=false;return;}
  if(msg.op==='leaveShop'&&p.location==='thrift'){this._enter(p,'street','thrift');return;}
  if(!['buy','equip'].includes(msg.op)||p.location!=='thrift'||!p.shopping)return;
  const item=CLOTHES.find(c=>c.id===msg.item&&c.animal===p.animal);if(!item)return;
  if(!p.owned.includes(item.id)){if(msg.op!=='buy'||p.money<item.price)return this.msg(p,'Not enough money. Visit the bank first.');p.money-=item.price;p.owned.push(item.id);}
  p.outfit[item.slot]=item.id;if(['shirt','hat','pants'].every(slot=>p.outfit[slot]))p.disguiseBlown=false;
 }
 _bite(p){
  if(p.caged||p.shopping)return;
  if(!p.muzzled&&p.biteCool<=0&&p.capturedT<=0&&p.location==='bank'){
   const [fx,fy]=DIRS[p.face],human=this.humans.find(n=>!n.asleep&&this._near(p,n,1.35)&&(n.x-p.x)*fx+(n.y-p.y)*fy>-.1);
   if(human){human.asleep=true;p.biteCool=1.2;p.biteAnimT=.4;p.hold=null;p.disguiseBlown=true;this._callControl();this.emit({k:'citybite',pid:p.id});return;}
  }
  const before=this.permanentAlert;super._bite(p);if(!before&&this.permanentAlert){p.disguiseBlown=true;this._callControl();}
 }
 _callControl(){if(this.controlAlarm===null&&!this.controlArrived){this.controlAlarm=120;this.emit({k:'controlcalled'});}}
 _continueHold(p,inp,dt){
  const h=p.hold;if(!['citySteal','cityVault','cityRam'].includes(h.kind))return super._continueHold(p,inp,dt);
  if(!inp.e||!p.connected||p.capturedT>0){p.hold=null;return;}
  if(h.kind==='cityVault'){if(p.location!=='bank'||p.caged||dist(p.x,p.y,30.5,147.5)>2.8||this.gate('city-vault').state)p.hold=null;return;}
  if(h.kind==='citySteal'){const human=this.humans.find(n=>n.id===h.human);if(p.location!=='bank'||!human||!this._near(p,human)||!human.wallet||(!human.asleep&&human.picked)){p.hold=null;return;}h.t+=dt;if(h.t>=h.need){const amount=human.asleep?human.wallet:Math.min(25,human.wallet);human.wallet-=amount;human.picked=true;p.money+=amount;p.hold=null;this.emit({k:'cash',pid:p.id,amount});}return;}
  if(!p.caged||!this.activePlayers().every(q=>q.caged&&q.capturedT<=0)||dist(p.x,p.y,137.5,161.5)>2.5){p.hold=null;return;}
  h.t+=dt;if(h.t>=h.need){p.cageHits=Math.min(2,p.cageHits+1);p.hold=null;this.emit({k:'cageram',pid:p.id});if(this.activePlayers().every(q=>q.cageHits>=2))this._releaseCityCage();}
 }
 _returnToEnclosure(p){
  p.capturedT=0;p.inVehicle=false;p.shopping=false;p.caged=true;p.location='control';p.hold=null;p.cageHits=0;p.cageKeys=0;p.shell=false;p.slide=null;p.hop=null;p.under=null;
  const index=this.order.indexOf(p.id);p.x=140.5+(index%4)*3;p.y=153.5+Math.floor(index/4)*7;p.safe=[p.x,p.y];p.grace=5;this.closeGate(this.gate('city-cage'));
 }
 _capture(s,p){p.shopping=false;super._capture(s,p);}
 _releaseCityCage(){this.openGate(this.gate('city-cage'));for(const p of this.activePlayers())if(p.caged){p.caged=false;p.cageHits=0;p.hold=null;p.grace=5;}this.emit({k:'cityrescue'});}
 _stepKeysAndExit(dt){super._stepKeysAndExit(dt);this._stepCity(dt);}
 _stepCity(dt){
  for(const n of this.humans)if(!n.asleep){n.phase+=dt*.45;const ox=n.x,oy=n.y;n.x=n.home[0]+Math.sin(n.phase)*.65;n.y=n.home[1]+Math.cos(n.phase)*.5;n.angle=Math.atan2(n.y-oy,n.x-ox);}
  const crew=this.activePlayers();if(crew.length&&crew.every(p=>p.caged&&p.cageHits>=2))this._releaseCityCage();const ready=crew.length>0&&crew.every(p=>p.connected&&!p.caged&&p.capturedT<=0&&p.location==='bank'&&p.hold?.kind==='cityVault'&&p.input.e&&dist(p.x,p.y,30.5,147.5)<2.8);
  this.vaultProgress=ready?this.vaultProgress+dt:0;if(this.vaultProgress>=3&&!this.gate('city-vault').state){this.openGate(this.gate('city-vault'));for(const p of crew)p.hold=null;this.emit({k:'vaultopen'});}
  if(this.controlAlarm!==null){this.controlAlarm=Math.max(0,this.controlAlarm-dt);if(this.controlAlarm===0){this.controlAlarm=null;this.controlArrived=true;for(const p of crew)if(p.location==='bank'&&!p.caged&&p.capturedT<=0)this._capture({},p);this.staff=makeKeepers([{route:[[70,44],[88,44],[88,76],[70,76]],start:0},{route:[[126,76],[88,76],[88,44],[126,44]],start:0}],2+Math.floor(crew.length/2));this.emit({k:'controlarrived'});}}
 }
 _stepCityVisits(){for(const d of this.zoo.destinations)if(!this.visited.has(d.id)&&dist(this.vehicle.x,this.vehicle.y,d.x,d.y)<3&&Math.abs(this.vehicle.speed)<.7){this.visited.add(d.id);this.emit({k:'cityvisit',name:d.name});}}
 objectives(){const o=super.objectives();o.stage='city';o.parking.city={destinations:this.zoo.destinations.map(d=>({...d,visited:!!this.visited?.has(d.id)})),visited:this.visited?.size||0,selected:this.vehicle.values.navigation,alarm:this.controlAlarm??null,arrived:!!this.controlArrived,vaultOpen:!!this.gate('city-vault')?.state,vaultProgress:this.vaultProgress||0,vaultCash:this.vaultCash??2400,need:this.activePlayers().length,captured:this.activePlayers().filter(p=>p.caged).length};return o;}
 personal(pid){const o=super.personal(pid),p=this.players.get(pid);if(!o)return o;o.city={money:p.money||0,location:p.location||'street',disguised:isDisguised(p),owned:p.owned||[],outfit:p.outfit||{},cageHits:p.cageHits||0,shopping:!!p.shopping,catalog:p.shopping?clothesFor(p.animal):[]};if(o.vehicle&&this.vehicle.owners.navigation===pid)o.gps=gpsFor(this);return o;}
 snapshot(){const s=super.snapshot();s.humans=(this.humans||[]).map(n=>({id:n.id,x:n.x,y:n.y,d:n.angle,asleep:n.asleep,color:n.color,empty:n.wallet===0}));s.pl=s.pl.map(q=>{const p=this.players.get(q.id);return {...q,outfit:p.outfit||{},location:p.location,disguised:isDisguised(p)};});return s;}
 results(){return {...super.results(),stage:'city',next:null};}
}
