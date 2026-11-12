import {carsOverlap,movableCars,moveDrivenCar,stepAnimalCarPushes,pushPersonal,initParkingCars,carSnapshot} from './car-pushing.js';
import {parkingGPS} from './navigation.js';
import {Game} from './game.js';
import {getZoo} from './zoos/index.js';
import {makeKeepers,parkingKeeperCount} from './staff.js';
import {vehicleCells,CAR_HALF_LENGTH,CAR_HALF_WIDTH} from './driving.js';
import {T,tileBlocksVision} from './tiles.js';
import {canOccupy} from './physics.js';
import {dist,lineOfSight} from './util.js';
export const CAR_CONTROLS=[
 {id:'steering',label:'Steering wheel',kind:'wheel',choices:[-1,0,1],goal:0,hint:'Hold and drag the wheel, or use A/D.'},
 {id:'gas',label:'Gas pedal',kind:'pedal',choices:[0,1],goal:1,hint:'Hold or press W to accelerate. Release to coast.'},
 {id:'gear',label:'Gear selector',kind:'gear',choices:['Park','Reverse','Drive'],goal:'Drive',hint:'Stop the car before changing gear.'},
 {id:'brake',label:'Brake pedal',kind:'pedal',choices:[0,1],goal:1,hint:'Hold or press S to slow down and stop.'},
 {id:'handbrake',label:'Handbrake',kind:'select',choices:['Set','Release'],goal:'Release',hint:'Release before driving.'},
 {id:'ignition',label:'Ignition key',kind:'select',choices:['Off','Start'],goal:'Start',hint:'Start the engine for your crew.'},
 {id:'signals',label:'Turn signals',kind:'select',choices:['Off','Left','Right'],goal:'Right',hint:'Signal the right turn toward the exit road.'},
 {id:'navigation',label:'Navigator',kind:'select',choices:['Zoo entrance','Exit road'],goal:'Exit road',hint:'Choose Exit road and guide your driver.'},
];
const defaults={steering:0,gas:0,brake:0,gear:'Park',handbrake:'Set',ignition:'Off',signals:'Off',navigation:'Zoo entrance'};
export class ParkingGame extends Game{
 constructor({players,seed=1,options={},worldId='parking',previousCarSlot=null,carColor=null}){
  super({players,seed,options:{...options,staff:false}});
  this.options={staff:true,...options};this.zoo={...getZoo(worldId),decor:getZoo(worldId).decor.map(d=>({...d}))};this.zooId=worldId;
  if(worldId==='parking'){
   const cars=this.zoo.decor.filter(d=>d.kind==='parkedCar'),choices=cars.map((_,i)=>i).filter(i=>i!==previousCarSlot),slot=choices[Math.floor(this.rng()*choices.length)];
   cars.forEach((d,i)=>{d.getaway=i===slot;d.colorIndex=(i+Math.floor(this.rng()*6))%6;});const d=cars[slot];
   this.zoo.getaway={x:d.x+1.5,y:d.y+2,angle:Math.PI/2,stall:[d.x,d.y,d.x+2,d.y+3],slot,colorIndex:d.colorIndex};
   this.zoo.objects=this.zoo.objects.map(o=>o.kind==='vehicle'?({...o,x:d.x-1,y:d.y+2,stand:[d.x-1,d.y+2]}):({...o}));
  }this.w=this.zoo.w;this.h=this.zoo.h;
  this.tiles=new Uint8Array(this.zoo.tiles);this.tileMods=new Map();this.tileVersion=1;this.defsVersion=1;
  this.entSolid=new Uint8Array(this.w*this.h);this.entVis=new Uint8Array(this.w*this.h);
  this.gates=[];this.objects=this.zoo.objects.map(o=>({...o,state:0,cool:0}));this.plates=[];this.crates=[];this.burrows=[];this.npcs=[];this.parts=[];this.bayState=[];this.requiredRescues=0;
  this.chew=new Map();this.staff=this.options.staff&&this.zoo.staffRoutes.length?makeKeepers(this.zoo.staffRoutes,parkingKeeperCount(players.length)):[];
  for(const [i,p] of this.activePlayers().entries()){
   p.enc=this.zoo.enclosures.findIndex(e=>e.animal===p.animal);p.x=3.5+(i%3);p.y=20.5+Math.floor(i/3);p.cageKeys=0;p.muzzled=false;p.escaped=true;p.grace=5;p.inVehicle=false;p.inControlRoom=false;p.hold=null;p.carry=null;
  }
  this.vehicle={...this.zoo.getaway,unlocked:false,speed:0,owners:{},values:{},heldAt:{},lightsUntil:0,alarmUntil:0,alarmPulse:0,braked:false,bumpUntil:0};
  const [x0,y0,x1,y1]=this.zoo.getaway.stall;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)this.setTile(x,y,T.PATH);
  if(worldId==='parking')initParkingCars(this);this._assignCarJobs();if(worldId==='parking'&&players.length>=2)this._buildHoldingCage();if(carColor!=null)this.vehicle.colorIndex=carColor;this.rebuildBlock();
 }
 _assignCarJobs(){
  const ids=this.activePlayers().map(p=>p.id),count=Math.max(4,ids.length);this.vehicle.owners={};this.vehicle.values={...defaults};this.vehicle.heldAt={};this.vehicle.speed=0;
  if(!ids.length)return;
  CAR_CONTROLS.slice(0,count).forEach((c,i)=>{let owner=i%ids.length;if(ids.length===2)owner=['steering','gear'].includes(c.id)?0:1;if(ids.length===3&&c.id==='brake')owner=1;this.vehicle.owners[c.id]=ids[owner];});
 }
 removePlayer(pid){super.removePlayer(pid);this._assignCarJobs();}
 rebuildBlock(){super.rebuildBlock();for(const car of movableCars(this))for(const i of vehicleCells(car,this.w,this.h)){this.entSolid[i]=1;this.entVis[i]=1;}}
 _stepPlayer(p,dt){if(p.inVehicle){p.moving=false;p.x=this.vehicle.x;p.y=this.vehicle.y;return;}super._stepPlayer(p,dt);}
 detectable(p){return !p.inVehicle&&super.detectable(p);}
 _nearCar(p){const v=this.vehicle,c=Math.cos(v.angle),s=Math.sin(v.angle),dx=p.x-v.x,dy=p.y-v.y,u=dx*c+dy*s,l=-dx*s+dy*c;if(Math.hypot(Math.max(0,Math.abs(u)-2.25),Math.max(0,Math.abs(l)-1.65))>1.15)return false;const own=new Set(vehicleCells(v,this.w,this.h));return lineOfSight(p.x,p.y,v.x,v.y,(x,y)=>own.has(y*this.w+x)?tileBlocksVision(this.tileAt(x,y)):this.visionBlocked(x,y));}
 _door(){const v=this.vehicle;return [v.x-Math.sin(v.angle)*2.75,v.y+Math.cos(v.angle)*2.75];}
 interactTarget(p){if(p.caged)return this._cageWallInteraction(p);const target=super.interactTarget(p);if(target)return target;return this._objectInteraction(p,this.obj('getaway'));}
 _objectInteraction(p,o){
  if(o.kind==='holdingCageDoor'){if(p.caged)return {text:'Wait for a rescue, or grab a wall when everyone is captured',idle:true};return {text:'Open the cage and free your captured teammates',run:()=>this._openHoldingCage(p.name)};}
  if(o.kind!=='vehicle')return super._objectInteraction(p,o);
  if(!this.vehicle||p.inVehicle||p.capturedT>0||!this._nearCar(p))return null;
  if(!this.vehicle.unlocked)return {text:p.cageKeys?'Use Unlock on your key fob first':'Locked car: find a keeper carrying its key fob',idle:true};
  if(Math.abs(this.vehicle.speed)>.2)return {text:'Wait until the car stops before boarding',idle:true};
  return {text:'Climb into the car',run:()=>{p.inVehicle=true;p.hold=null;p.hidden=false;p.shell=false;p.slide=null;p.hop=null;p.x=this.vehicle.x;p.y=this.vehicle.y;}};
 }
 _capture(s,p){p.inVehicle=false;super._capture(s,p);}
 _returnToEnclosure(p){
  const spawn=this.zoo.enclosures[p.enc].spawn;p.capturedT=0;p.cageKeys=0;p.materials=0;p.inVehicle=false;p.hold=null;p.hidden=false;p.exposed=false;p.shell=false;p.hop=null;p.slide=null;p.under=null;p.carry=null;p.sprintT=0;p.x=spawn[0]+.5;p.y=spawn[1]+.5;p.grace=5;
  if(this.holdingCage){const i=Math.max(0,this.order.indexOf(p.id)),slot=[[3,53],[5,53],[7,53],[3,55],[7,54],[3,57],[5,57],[7,57]][i%8];p.caged=true;p.x=slot[0]+.5;p.y=slot[1]+.5;this.holdingCage.progress=0;this.closeGate(this.gate('holding-gate'));this.obj('holding-door').state=0;}
  p.safe=[p.x,p.y];
  this.msg(p,this.holdingCage?'Captured in the holding cage! An uncaptured teammate can open it. If everyone is caught, all hold E at separate walls.':'Caught! Back at the service exit. Your keys and fob were taken.');
 }
 vehicleAction(pid,msg){
  const p=this.players.get(pid),v=this.vehicle;if(this.phase!=='play'||!p?.active||!p.connected||p.capturedT>0)return;
  if(msg.op==='unlock'||msg.op==='panic'){
   if(!p.cageKeys)return;
   if(msg.op==='unlock'){v.unlocked=true;v.lightsUntil=this.time+5;this.obj('getaway').state=1;this.emit({k:'carunlock',x:v.x,y:v.y,name:p.name});}
   else if(this.time>=(v.panicReady||0)){v.alarmUntil=this.time+8;v.panicReady=this.time+2;v.alarmPulse=0;}
   return;
  }
  if(!p.inVehicle)return;
  if(msg.op==='leave'){
   if(Math.abs(v.speed)>.2)return this.msg(p,'Stop the car before climbing out.');
   const c=Math.cos(v.angle),s=Math.sin(v.angle),candidates=[[0,2.75],[0,-2.75],[3.5,0],[-3.5,0],[2.8,2.75],[-2.8,-2.75]].map(([u,l])=>[v.x+u*c-l*s,v.y+u*s+l*c]);
   const point=candidates.find(([x,y])=>canOccupy(this,p.animal,x,y,null));if(!point)return this.msg(p,'The door is blocked. Park with room to climb out.');
   p.inVehicle=false;[p.x,p.y]=point;p.grace=1;p.input={};p.prevE=true;this._releaseCarHolds();return;
  }
  if(!this._vehicleCrew().every(p=>p.connected&&p.inVehicle))return;
  const control=this._carControls().find(c=>c.id===msg.control);if(!control||v.owners[control.id]!==pid)return;
  if(control.kind==='wheel'||control.kind==='pedal'){
   if(typeof msg.value!=='number'||!Number.isFinite(msg.value))return;
   if(control.kind==='wheel'?(msg.value < -1||msg.value>1):(msg.value<0||msg.value>1))return;
   v.values[control.id]=msg.held===true?msg.value:0;v.heldAt[control.id]=this.time;
   if(control.id==='brake'&&msg.held===true&&msg.value>.2)v.braked=true;
  }else{
   if(control.kind==='gear'&&msg.held!==true)return;
   if(!control.choices.includes(msg.value))return;
   if(control.id==='gear'&&Math.abs(v.speed)>.4)return this.msg(p,'Stop before shifting between Park, Reverse and Drive.');
   v.values[control.id]=msg.value;
  }
 }
 _releaseCarHolds(){for(const id of ['steering','gas','brake'])this.vehicle.values[id]=0;this.vehicle.heldAt={};this.vehicle.speed=0;}
 _carFits(x,y,angle){return this._terrainFits(x,y,angle)&&!(this.parkedCars||[]).some(other=>carsOverlap({...this.vehicle,x,y,angle},other));}
 _tryVehicleMove(x,y,angle,dt){return moveDrivenCar(this,x,y,angle,dt);}
 _terrainFits(x,y,angle){
  const c=Math.cos(angle),s=Math.sin(angle),blocked=new Set([T.WALL,T.REINF,T.MACHINE]);
  const nu=Math.ceil(CAR_HALF_LENGTH*2/.25),nv=Math.ceil(CAR_HALF_WIDTH*2/.25);
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=-CAR_HALF_LENGTH+2*CAR_HALF_LENGTH*i/nu,v=-CAR_HALF_WIDTH+2*CAR_HALF_WIDTH*j/nv,tx=Math.floor(x+u*c-v*s),ty=Math.floor(y+u*s+v*c);if(tx<0||ty<0||tx>=this.w||ty>=this.h||blocked.has(this.tileAt(tx,ty))||this.gates.some(g=>g.state===0&&g.tiles.some(t=>t[0]===tx&&t[1]===ty)))return false;}

  return true;
 }
 _vehicleCrew(){return this.activePlayers();}
 _stepKeysAndExit(dt){stepAnimalCarPushes(this,dt);this._stepVehicle(dt,this._vehicleCrew());}
 _stepVehicle(dt,team){
  const v=this.vehicle;if(!v)return;this._stepHoldingCage(dt);
  if(v.alarmUntil>this.time){v.alarmPulse-=dt;if(v.alarmPulse<=0){v.alarmPulse=1;this.noise(v.x,v.y,80);this.emit({k:'caralarm',x:v.x,y:v.y});}}
  const ready=team.length>0&&team.every(p=>p.connected&&p.inVehicle);
  if(!ready){this._releaseCarHolds();return;}
  for(const id of ['steering','gas','brake'])if(this.time-(v.heldAt[id]??-10)>.35)v.values[id]=0;
  const engine=!v.owners.ignition||v.values.ignition==='Start',handbrake=v.owners.handbrake&&v.values.handbrake!=='Release';
  const steps=Math.max(1,Math.ceil(dt/.025)),d=dt/steps;
  for(let i=0;i<steps;i++){
   const direction=v.values.gear==='Drive'?1:v.values.gear==='Reverse'?-1:0;
   if(!engine||handbrake||!direction)v.speed=0;
   else{
    v.speed+=direction*v.values.gas*3.8*d;
    const slowing=(v.values.brake*9+.55)*d;v.speed=Math.sign(v.speed)*Math.max(0,Math.abs(v.speed)-slowing);v.speed=Math.max(-3.5,Math.min(7,v.speed));
   }
   const angle=v.angle+v.values.steering*v.speed*.38*d,nx=v.x+Math.cos(angle)*v.speed*d,ny=v.y+Math.sin(angle)*v.speed*d;
   if(this._tryVehicleMove(nx,ny,angle,d)){this._hitKeepers();}
   else{if(Math.abs(v.speed)>.5&&this.time>v.bumpUntil){v.bumpUntil=this.time+.8;this.emit({k:'carbump',x:v.x,y:v.y});this.noise(v.x,v.y,16);}v.speed=0;}
  }
  for(const p of team){p.x=v.x;p.y=v.y;}this.rebuildBlock();
  if(this.zooId==='parking'&&v.x>=67.5&&v.x<=74&&v.y>=60){this.phase='complete';for(const p of team)p.muzzled=false;this.emit({k:'carstolen'});this.emit({k:'complete'});}
  this._stepCityVisits?.();
 }
 _buildHoldingCage(){
  this.holdingCage={progress:0};for(let y=52;y<=58;y++)for(let x=2;x<=8;x++)if(x===2||x===8||y===52||y===58)this.setTile(x,y,T.FENCE);
  this.setTile(8,55,T.PATH);this._addGate({id:'holding-gate',kind:'holding',vis:'bars',tiles:[[8,55]],label:'Holding cage door'});
  this._addObject({id:'holding-door',kind:'holdingCageDoor',x:8,y:55,stand:[9,55],label:'Holding cage rescue latch'});
  this.zoo.decor.push({kind:'sign',x:5,y:51,text:'Captured animals — rescue cage'});
 }
 inOwnEnclosure(p){return p.caged||super.inOwnEnclosure(p);}
 abilityTarget(p){return p.caged?{text:'Hold E at a wall when the whole crew is captured',idle:true}:super.abilityTarget(p);}
 _canSteal(p,s){return !p.caged&&super._canSteal(p,s);}
 _cageWallInteraction(p){
  if(!this.activePlayers().every(q=>q.caged&&q.capturedT<=0))return {text:'Wait for an uncaptured teammate to open the cage',idle:true};
  const candidates=[];for(let y=52;y<=58;y++)for(let x=2;x<=8;x++)if((x===2||x===8||y===52||y===58)&&!(x===8&&y===55)&&dist(p.x,p.y,x+.5,y+.5)<1.2&&!this.activePlayers().some(q=>q!==p&&q.hold?.kind==='cageWall'&&q.hold.wall[0]===x&&q.hold.wall[1]===y))candidates.push([x,y]);
  const wall=candidates[0];if(!wall)return {text:'Move beside a free wall section, then hold E',idle:true};
  return {text:'Hold E: grab this wall — everyone must grab together',run:()=>{p.hold={kind:'cageWall',btn:'e',wall,t:0,need:Infinity};}};
 }
 _stepHoldingCage(dt){
  if(!this.holdingCage)return;const team=this.activePlayers(),ready=team.length>0&&team.every(p=>p.caged&&p.connected&&p.capturedT<=0&&p.hold?.kind==='cageWall'&&p.input.e&&dist(p.x,p.y,p.hold.wall[0]+.5,p.hold.wall[1]+.5)<1.3);
  this.holdingCage.progress=ready?this.holdingCage.progress+dt:0;if(this.holdingCage.progress>=1.5)this._openHoldingCage('The whole crew');
 }
 _openHoldingCage(name){
  this.openGate(this.gate('holding-gate'));this.obj('holding-door').state=1;for(const p of this.activePlayers())if(p.caged){p.caged=false;p.hold=null;p.grace=3;}this.holdingCage.progress=0;this.emit({k:'cagerescue',name});
 }
 _hitKeepers(){
  const v=this.vehicle;if(Math.abs(v.speed)<.6)return;const c=Math.cos(v.angle),s=Math.sin(v.angle);
  for(const keeper of this.staff){const dx=keeper.x-v.x,dy=keeper.y-v.y;if(!keeper.permanentDown&&Math.abs(dx*c+dy*s)<2&&Math.abs(-dx*s+dy*c)<1.4){keeper.permanentDown=true;keeper.downUntil=Number.MAX_SAFE_INTEGER;keeper.state='unconscious';keeper.path=null;keeper.target=null;this.emit({k:'runover',id:keeper.id,x:keeper.x,y:keeper.y});}}
 }
 _carControls(){return CAR_CONTROLS;}
 defs(){return {...super.defs(),decor:this.zoo.decor};}
 objectives(){
  const act=this.activePlayers(),v=this.vehicle,inCar=act.filter(p=>p.inVehicle).length;
  return {stage:'parking',parking:{unlocked:v.unlocked,route:this.zooId==='parking'?[[this.zoo.getaway.x+4,this.zoo.getaway.y+4.6],[70,this.zoo.getaway.y+4.6],[71,61]]:[],keys:act.filter(p=>p.cageKeys).map(p=>p.name),inCar,need:act.length,keepers:this.staff.length,holding:this.holdingCage?{captured:act.filter(p=>p.caged).length,allCaptured:act.length>0&&act.every(p=>p.caged),progress:this.holdingCage.progress}:null,progress:Math.max(0,Math.min(1,1-dist(v.x,v.y,71,61)/60)),car:{x:v.x,y:v.y,angle:v.angle,colorIndex:v.colorIndex||0,speed:v.speed,steering:v.values.steering,lightsUntil:v.lightsUntil,alarmUntil:v.alarmUntil},roles:Object.entries(v.owners).map(([id,pid])=>({id,pid,label:this._carControls().find(c=>c.id===id).label,name:this.players.get(pid).name,ready:['steering','gas','brake'].includes(id)?!!v.values[id]:v.values[id]===this._carControls().find(c=>c.id===id).goal})),team:act.map(p=>({id:p.id,name:p.name,inside:!!p.inVehicle,connected:p.connected}))},
   escape:{done:true,players:[]},rescue:{done:true,n:0,need:0},power:{done:true,parts:[]},keys:{done:true,active:false,keys:[],need:0},exit:{done:this.phase==='complete',open:false,inZone:0,need:act.length},waiting:act.filter(p=>!p.connected).map(p=>p.name)};
 }
 personal(pid){const result=super.personal(pid),p=this.players.get(pid);if(result){if(result.hold&&p.hold?.kind==='cageWall')result.hold.p=Math.min(1,this.holdingCage.progress/1.5);result.fob=!!p.cageKeys;result.carPush=pushPersonal(p);if(p.inVehicle){result.vehicle={...this.objectives().parking,controls:this._carControls().filter(c=>this.vehicle.owners[c.id]===pid).map(c=>({...c,value:this.vehicle.values[c.id]}))};if(this.zooId==='parking'&&this.vehicle.owners.navigation===pid)result.gps=parkingGPS(this);result.pe=null;result.ps=null;}result.special=!!p.inVehicle||result.special;}return result;}
 snapshot(){const s=super.snapshot();if(this.parkedCars)s.cars=movableCars(this).map(carSnapshot);s.pl=s.pl.map(p=>({...p,car:!!this.players.get(p.id).inVehicle,caged:!!this.players.get(p.id).caged,carId:this.players.get(p.id).inVehicle?this.vehicle.id:null}));return s;}
 results(){return {...super.results(),stage:this.zooId,next:this.zooId==='parking'?'city':null,carStolen:true};}
}
