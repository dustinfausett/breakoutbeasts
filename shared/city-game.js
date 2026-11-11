import {pushPersonal} from './car-pushing.js';
import {safeArrival,recoverCityPlayer} from './city-movement.js';
import {Game} from './game.js';
import {TOOLS} from './hardware.js';
import {initFleet,rebuildFleet,crewFor,carTarget,fleetAction,fleetFits,stepFleet,fleetPersonal,publicCar,assignCrew} from './city-fleet.js';
import {initCrowds,stepCrowds,panicCrowd} from './crowds.js';
import {initRescue,isRescueScene,rescueTarget,rescueObject,rescueHold,rescueReturn,rescueBite,stepRescue,rescuePublic,rescuePersonal,rescueAction,wantedInRescue,exposeRescue,allRescued} from './rescue-chapter.js';
import {ParkingGame,CAR_CONTROLS} from './parking-game.js';
import {dist,lineOfSight} from './util.js';
import {DIRS} from './tiles.js';
import {clothesFor,isDisguised,CLOTHES} from './wardrobe.js';
import {gpsFor} from './navigation.js';
import {makeKeepers} from './staff.js';
export class CityGame extends ParkingGame{
 constructor(args){
  super({...args,worldId:'city',options:{...args.options,staff:false}});this.visited=new Set();this.vaultCash=12000;this.vaultProgress=0;this.controlAlarm=null;this.controlArrived=false;
  for(const gate of this.zoo.gates)this._addGate({...gate,tiles:gate.tiles.map(t=>[...t])});
  this.humans=[];
  for(const p of this.activePlayers()){p.money=0;p.tools=[];p.carKeys=[];p.owned=[];p.outfit={};p.location='street';p.disguiseBlown=false;p.cageHits=0;p.shopping=false;p.inVehicle=true;p.x=this.vehicle.x;p.y=this.vehicle.y;}
  this._ensureNavigator();this.vehicle.unlocked=true;this.vehicle.values.navigation=this.zoo.destinations[0].name;initRescue(this,args.options?.staff!==false);initFleet(this);initCrowds(this);this.rebuildBlock();
 }
 _ensureNavigator(){const ids=this.activePlayers().map(p=>p.id);if(ids.length&&!this.vehicle.owners.navigation)this.vehicle.owners.navigation=ids.at(-1);}
 removePlayer(id){Game.prototype.removePlayer.call(this,id);for(const car of this.cars)assignCrew(this,car);}
 rebuildBlock(){if(this.cars)rebuildFleet(this);else super.rebuildBlock();}
 _vehicleCrew(){return this.cars?crewFor(this,this.vehicle):this.activePlayers();}
 _carFits(x,y,angle){return this.cars?fleetFits(this,x,y,angle):super._carFits(x,y,angle);}
 vehicleAction(pid,msg){return fleetAction(this,pid,msg);}

 _carControls(){return CAR_CONTROLS.map(c=>c.id==='navigation'?{...c,choices:this.zoo.destinations.map(d=>d.name),goal:this.zoo.destinations[0].name,hint:'Choose a destination. Read your GPS turns aloud to the driver.'}:c);}
 detectable(p){return !p.caged&&p.chapterStation==null&&!p.inPlane&&(p.location==='street'||isRescueScene(p.location))&&(!isDisguised(p)||wantedInRescue(this,p))&&super.detectable(p);}
 _radio(s,p){const all=this.staff;this.staff=all.filter(q=>(q.scene||'street')===(s.scene||'street'));super._radio(s,p);this.staff=all;}
 controlAction(pid,msg){if(this.players.get(pid)?.chapterStation!=null)return rescueAction(this,pid,msg);return super.controlAction(pid,msg);}
 rescueAction(pid,msg){return rescueAction(this,pid,msg);}
 abilityTarget(p){return p.caged?{text:'Wait for a rescue; if everyone is caged, each animal must ram the door twice',idle:true}:p.shopping?{text:p.location==='hardware'?'Choose a tool for the team habitat':'Choose your disguise',idle:true}:super.abilityTarget(p);}
 inOwnEnclosure(p){return !!p.caged;}
 _stepPlayer(p,dt){if(p.inVehicle&&this.cars){const car=this.cars.find(c=>c.id===p.vehicleId);if(car){p.x=car.x;p.y=car.y;p.moving=false;return;}}if(p.shopping||p.chapterStation!=null||p.inPlane){p.moving=false;return;}super._stepPlayer(p,dt);}
 _near(a,b,r=1.65){return dist(a.x,a.y,b.x,b.y)<r&&lineOfSight(a.x,a.y,b.x,b.y,(x,y)=>this.visionBlocked(x,y));}
 interactTarget(p){
  if(p.inVehicle||p.capturedT>0||p.under||p.hop||p.slide)return null;
  const districtTarget=rescueTarget(this,p);if(districtTarget)return districtTarget;
  if(p.caged){const all=this.activePlayers().every(q=>q.caged&&q.capturedT<=0);if(!all)return {text:'A teammate must open the outside cage latch',idle:true};if(dist(p.x,p.y,...this.zoo.controlLayout.door.map(v=>v+.5))>2.5)return {text:'Everyone move to the cage door, then hold E to ram it twice each',idle:true};if(p.cageHits>=2)return {text:'Your two hits are done — wait for your teammates',idle:true};return {text:`Hold E: ram the cage door (${p.cageHits}/2)`,run:()=>{p.hold={kind:'cityRam',btn:'e',t:0,need:.9};}};}
  if(p.location==='street'){const n=this.humans.find(n=>n.scene==='street'&&n.carId&&!p.carKeys.includes(n.carId)&&this._near(p,n,1.8));if(n)return {text:'Hold E: steal car keys',run:()=>{p.hold={kind:'cityCarKey',btn:'e',human:n.id,t:0,need:1.1};}};}
  if(p.location==='bank'){
   const fixture=this.objects.find(o=>['cityDoor','vaultWheel','vaultCash'].includes(o.kind)&&dist(p.x,p.y,o.x+.5,o.y+.5)<1.7);if(fixture)return this._objectInteraction(p,fixture);
   const human=this.humans.find(n=>this._near(p,n)&&n.wallet>0&&(n.asleep||!n.picked));
   if(human)return {text:human.asleep?'Hold E: take the sleeping customer’s wallet':'Hold E: sneak some money from this customer',run:()=>{p.hold={kind:'citySteal',btn:'e',human:human.id,t:0,need:human.asleep?.7:1.5};}};
  }
  const o=this.objects.filter(o=>o.kind!=='vehicle'&&dist(p.x,p.y,o.x+.5,o.y+.5)<1.7).sort((a,b)=>dist(p.x,p.y,a.x+.5,a.y+.5)-dist(p.x,p.y,b.x+.5,b.y+.5))[0];
  if(o){const result=this._objectInteraction(p,o);if(result)return result;}
  const car=carTarget(this,p);if(car)return car;return super.interactTarget(p);
 }
 _objectInteraction(p,o){
  if(o.kind==='vehicle')return this.cars?carTarget(this,p):super._objectInteraction(p,o);
  if(o.kind==='hardwareCounter')return {text:'Buy tools for the team habitat',run:()=>{if(p.location==='hardware')p.shopping=true;}};
  const district=rescueObject(this,p,o);if(district)return district;
  if(o.kind==='cityDoor'&&o.scene==='airport'&&!allRescued(this))return {text:'Free every zoo, pet-store and Animal Control animal before leaving for the airport',idle:true};
  if(o.kind==='cityDoor')return {text:o.label+' (E)',run:()=>this._enter(p,o.scene,o.from)};
  if(o.kind==='shopCounter')return {text:'Browse fitted shirts, hats and pants',run:()=>{if(p.location==='thrift')p.shopping=true;}};
  if(o.kind==='vaultWheel')return this.gate('city-vault')?.state?{text:'Vault open — collect the cash inside',idle:true}:{text:'Hold E: everyone grab the vault wheel together',run:()=>{if(p.location==='bank')p.hold={kind:'cityVault',btn:'e',t:0,need:Infinity};}};
  if(o.kind==='vaultCash')return {text:this.vaultCash?`Collect vault money ($${this.vaultCash} left)`:'The vault is empty',...(this.vaultCash?{run:()=>{if(p.location==='bank'&&this.gate('city-vault').state&&p.x>this.zoo.bankLayout.wallX){const amount=Math.min(500,this.vaultCash);this.vaultCash-=amount;p.money+=amount;this.emit({k:'cash',pid:p.id,amount});}}}:{idle:true})};
  if(o.kind==='controlLatch')return {text:'Open the cage and rescue every captured animal',run:()=>{if(p.location==='control'&&!p.caged)this._releaseCityCage();}};
  return super._objectInteraction(p,o);
 }
 _enter(p,scene,from,arrival){
  if(p.inVehicle||p.caged||p.capturedT>0||!p.connected)return;
  let point;if(scene==='street'){const door=this.obj('enter-'+(from||p.location));if(!door)return;point=[door.stand[0]+.5,door.stand[1]+.5];}else{const room=this.zoo.interiors[scene];if(!room)return;point=(arrival||room.spawn).map(v=>v+.5);}
  point=safeArrival(this,p.animal,scene,point);if(!point){this.msg(p,'The doorway is blocked. Make some space outside.');return;}
  p.location=scene;p.shopping=scene==='thrift'||scene==='hardware';p.hold=null;p.shell=false;p.slide=null;p.hop=null;p.under=null;p.x=point[0];p.y=point[1];p.safe=point;p.grace=3;p.input={};this.emit({k:'cityenter',pid:p.id,scene});
 }
 cityAction(pid,msg){
  const p=this.players.get(pid);if(this.phase!=='play'||!p?.active||!p.connected||p.capturedT>0||p.caged||p.inVehicle)return;
  if(msg.op==='buyTool'&&p.location==='hardware'&&p.shopping){const tool=TOOLS.find(t=>t.id===msg.item);if(!tool||p.tools.includes(tool.id))return;if(p.money<tool.price)return this.msg(p,'Not enough money. Visit the bank first.');p.money-=tool.price;p.tools.push(tool.id);return;}
  if(msg.op==='leaveHardware'&&p.location==='hardware'){this._enter(p,'street','hardware');return;}
  if(msg.op==='closeShop'){p.shopping=false;return;}
  if(msg.op==='leaveShop'&&p.location==='thrift'){this._enter(p,'street','thrift');return;}
  if(!['buy','equip'].includes(msg.op)||p.location!=='thrift'||!p.shopping)return;
  const item=CLOTHES.find(c=>c.id===msg.item&&c.animal===p.animal);if(!item)return;
  if(!p.owned.includes(item.id)){if(msg.op!=='buy'||p.money<item.price)return this.msg(p,'Not enough money. Visit the bank first.');p.money-=item.price;p.owned.push(item.id);}
  p.outfit[item.slot]=item.id;if(['shirt','hat','pants'].every(slot=>p.outfit[slot]))p.disguiseBlown=false;
 }
 _bite(p){
  if(p.caged||p.shopping||p.chapterStation!=null||p.inPlane||p.under||p.hop||p.slide||p.shell)return;
  if(rescueBite(this,p))return;
  if(!p.muzzled&&p.capturedT<=0&&p.location==='bank'){
   const [fx,fy]=DIRS[p.face],human=this.humans.find(n=>!n.asleep&&this._near(p,n,1.75)&&(n.x-p.x)*fx+(n.y-p.y)*fy>-.35);
   if(human){human.asleep=true;panicCrowd(this,p);p.biteCool=0;p.biteAnimT=.4;p.hold=null;p.disguiseBlown=true;this._callControl();this.emit({k:'citybite',pid:p.id});return;}
  }
  const down=this.staff.filter(s=>s.downUntil>this.time).length;super._bite(p);if(this.staff.filter(s=>s.downUntil>this.time).length>down){p.disguiseBlown=true;if(isRescueScene(p.location))exposeRescue(this,p);else this._callControl();}
 }
 _callControl(){if(this.controlAlarm===null&&!this.controlArrived){this.controlAlarm=120;this.emit({k:'controlcalled'});}}
 _continueHold(p,inp,dt){
  if(rescueHold(this,p,inp,dt))return;
  const h=p.hold;if(h.kind==='cityCarKey'){const n=this.humans.find(n=>n.id===h.human);if(!inp.e||p.location!=='street'||!n||!this._near(p,n,1.8)){p.hold=null;return;}h.t+=dt;if(h.t>=h.need){if(!p.carKeys.includes(n.carId))p.carKeys.push(n.carId);p.carFob=n.carId;p.hold=null;this.msg(p,'Car keys stolen! Use your key fob to find and unlock the car.');}return;}if(!['citySteal','cityVault','cityRam'].includes(h.kind))return super._continueHold(p,inp,dt);
  if(!inp.e||!p.connected||p.capturedT>0){p.hold=null;return;}
  if(h.kind==='cityVault'){if(p.location!=='bank'||p.caged||dist(p.x,p.y,...this.zoo.bankLayout.wheel.map(v=>v+.5))>2.8||this.gate('city-vault').state)p.hold=null;return;}
  if(h.kind==='citySteal'){const human=this.humans.find(n=>n.id===h.human);if(p.location!=='bank'||!human||!this._near(p,human)||!human.wallet||(!human.asleep&&human.picked)){p.hold=null;return;}h.t+=dt;if(h.t>=h.need){const amount=human.asleep?human.wallet:Math.min(25,human.wallet);human.wallet-=amount;human.picked=true;p.money+=amount;p.hold=null;this.emit({k:'cash',pid:p.id,amount});}return;}
  if(!p.caged||!this.activePlayers().every(q=>q.caged&&q.capturedT<=0)||dist(p.x,p.y,...this.zoo.controlLayout.door.map(v=>v+.5))>2.5){p.hold=null;return;}
  h.t+=dt;if(h.t>=h.need){p.cageHits=Math.min(2,p.cageHits+1);p.hold=null;this.emit({k:'cageram',pid:p.id});if(this.activePlayers().every(q=>q.cageHits>=2))this._releaseCityCage();}
 }
 _returnToEnclosure(p){
  if(rescueReturn(this,p))return;p.cageDistrict='city';
  p.capturedT=0;p.inVehicle=false;p.shopping=false;p.caged=true;p.location='control';p.hold=null;p.cageHits=0;p.cageKeys=0;p.shell=false;p.slide=null;p.hop=null;p.under=null;
  const index=this.order.indexOf(p.id),slot=this.zoo.controlLayout.slots[index];p.x=slot[0]+.5;p.y=slot[1]+.5;p.safe=[p.x,p.y];p.grace=5;this.closeGate(this.gate('city-cage'));
 }
 _capture(s,p){const car=this.cars?.find(c=>c.id===p.vehicleId);p.inVehicle=false;p.vehicleId=null;p.carKeys=[];p.carFob=null;if(car)assignCrew(this,car);p.captureOrigin=isRescueScene(p.location)?'rescue':'city';p.chapterStation=null;p.inPlane=false;p.shopping=false;super._capture(s,p);}
 _releaseCityCage(){this.openGate(this.gate('city-cage'));for(const p of this.activePlayers())if(p.caged&&p.cageDistrict!=='rescue'){p.caged=false;p.cageHits=0;p.hold=null;p.grace=5;}this.emit({k:'cityrescue'});}
 _stepKeysAndExit(dt){stepFleet(this,dt);for(const p of this.activePlayers())recoverCityPlayer(this,p);this._stepCity(dt);stepRescue(this,dt);}
 _stepCity(dt){
  stepCrowds(this,dt);
  const crew=this.activePlayers();if(crew.length&&crew.every(p=>p.caged&&p.cageHits>=2))this._releaseCityCage();const ready=crew.length>0&&crew.every(p=>p.connected&&!p.caged&&p.capturedT<=0&&p.location==='bank'&&p.hold?.kind==='cityVault'&&p.input.e&&dist(p.x,p.y,...this.zoo.bankLayout.wheel.map(v=>v+.5))<2.8);
  this.vaultProgress=ready?this.vaultProgress+dt:0;if(this.vaultProgress>=3&&!this.gate('city-vault').state){this.openGate(this.gate('city-vault'));for(const p of crew)p.hold=null;this.emit({k:'vaultopen'});}
  if(this.controlAlarm!==null){this.controlAlarm=Math.max(0,this.controlAlarm-dt);if(this.controlAlarm===0){this.controlAlarm=null;this.controlArrived=true;for(const p of crew)if(p.location==='bank'&&!p.caged&&p.capturedT<=0)this._capture({},p);const officers=makeKeepers([{route:[[70,44],[88,44],[88,76],[70,76]],start:0},{route:[[126,76],[88,76],[88,44],[126,44]],start:0}],2+Math.floor(crew.length/2));officers.forEach(s=>s.id+=200);this.staff.push(...officers);this.emit({k:'controlarrived'});}}
 }
 _stepCityVisits(){for(const d of this.zoo.destinations)if(!this.visited.has(d.id)&&dist(this.vehicle.x,this.vehicle.y,d.x,d.y)<3&&Math.abs(this.vehicle.speed)<.7){this.visited.add(d.id);this.emit({k:'cityvisit',name:d.name});}}
 objectives(){const o=super.objectives();o.stage='city';o.parking.city={destinations:this.zoo.destinations.map(d=>({...d,visited:!!this.visited?.has(d.id)})),visited:this.visited?.size||0,selected:this.vehicle.values.navigation,alarm:this.controlAlarm??null,arrived:!!this.controlArrived,vaultOpen:!!this.gate('city-vault')?.state,vaultProgress:this.vaultProgress||0,vaultCash:this.vaultCash??12000,need:this.activePlayers().length,captured:this.activePlayers().filter(p=>p.caged).length};return o;}
 personal(pid){const o=Game.prototype.personal.call(this,pid),p=this.players.get(pid);if(!o)return o;o.vehicle=fleetPersonal(this,p);o.carPush=pushPersonal(p);o.fob=!!(p.carFob||p.cageKeys);if(o.vehicle){o.pe=null;o.ps=null;}o.special=o.special||p.inVehicle||p.chapterStation!=null||p.inPlane;Object.assign(o,rescuePersonal(this,p));o.city={wanted:wantedInRescue(this,p),money:p.money||0,location:p.location||'street',disguised:isDisguised(p),owned:p.owned||[],outfit:p.outfit||{},cageHits:p.cageHits||0,shopping:!!p.shopping,tools:p.tools||[],toolShop:p.location==='hardware',catalog:p.shopping?(p.location==='hardware'?TOOLS:clothesFor(p.animal)):[]};const car=this.cars.find(c=>c.id===p.vehicleId);if(o.vehicle&&car?.owners.navigation===pid)o.gps={...gpsFor(this,car),destinations:this.zoo.destinations.map(d=>d.name)};return o;}
 snapshot(){const s=super.snapshot();s.rescue=rescuePublic(this);s.cars=this.cars.map(publicCar);s.humans=(this.humans||[]).map(n=>({id:n.id,x:n.x,y:n.y,d:n.angle,asleep:n.asleep,color:n.color,visitor:!!n.visitor,moving:!!n.moving,running:!!n.panic,calling:(n.phoneUntil||0)>this.time,empty:n.wallet===0}));s.pl=s.pl.map(q=>{const p=this.players.get(q.id);return {...q,outfit:p.outfit||{},location:p.location,plane:!!p.inPlane,carId:p.vehicleId,disguised:isDisguised(p)};});return s;}
 results(){return {...super.results(),stage:'city',next:null,flightEscaped:this.rescue.flight.phase==='departed',districtRescued:this.rescue.animals.filter(a=>a.state==='escaped').length,districtTotal:this.rescue.animals.length};}
}
