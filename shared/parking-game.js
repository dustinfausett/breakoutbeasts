import {Game} from './game.js';
import {getZoo} from './zoos/index.js';
import {makeKeepers,parkingKeeperCount} from './staff.js';
import {vehicleCells} from './driving.js';
import {T} from './tiles.js';
import {canOccupy} from './physics.js';
import {dist} from './util.js';
export const CAR_CONTROLS=[
 {id:'steering',label:'Steering wheel',kind:'wheel',choices:[-1,0,1],goal:0,hint:'Hold and drag the wheel, or use A/D.'},
 {id:'gas',label:'Gas pedal',kind:'pedal',choices:[0,1],goal:1,hint:'Hold or press W to accelerate. Release to coast.'},
 {id:'gear',label:'Gear selector',kind:'select',choices:['Park','Reverse','Drive'],goal:'Drive',hint:'Stop the car before changing gear.'},
 {id:'brake',label:'Brake pedal',kind:'pedal',choices:[0,1],goal:1,hint:'Hold or press S to slow down and stop.'},
 {id:'handbrake',label:'Handbrake',kind:'select',choices:['Set','Release'],goal:'Release',hint:'Release before driving.'},
 {id:'ignition',label:'Ignition key',kind:'select',choices:['Off','Start'],goal:'Start',hint:'Start the engine for your crew.'},
 {id:'signals',label:'Turn signals',kind:'select',choices:['Off','Left','Right'],goal:'Right',hint:'Signal the right turn toward the exit road.'},
 {id:'navigation',label:'Navigator',kind:'select',choices:['Zoo entrance','Exit road'],goal:'Exit road',hint:'Choose Exit road and guide your driver.'},
];
const defaults={steering:0,gas:0,brake:0,gear:'Park',handbrake:'Set',ignition:'Off',signals:'Off',navigation:'Zoo entrance'};
export class ParkingGame extends Game{
 constructor({players,seed=1,options={}}){
  super({players,seed,options:{...options,staff:false}});
  this.options={staff:true,...options};this.zoo=getZoo('parking');this.zooId='parking';this.w=this.zoo.w;this.h=this.zoo.h;
  this.tiles=new Uint8Array(this.zoo.tiles);this.tileMods=new Map();this.tileVersion=1;this.defsVersion=1;
  this.entSolid=new Uint8Array(this.w*this.h);this.entVis=new Uint8Array(this.w*this.h);
  this.gates=[];this.objects=this.zoo.objects.map(o=>({...o,state:0,cool:0}));this.plates=[];this.crates=[];this.burrows=[];this.npcs=[];this.parts=[];this.bayState=[];this.requiredRescues=0;
  this.chew=new Map();this.staff=this.options.staff?makeKeepers(this.zoo.staffRoutes,parkingKeeperCount(players.length)):[];
  for(const [i,p] of this.activePlayers().entries()){
   p.enc=this.zoo.enclosures.findIndex(e=>e.animal===p.animal);p.x=3.5+(i%3);p.y=20.5+Math.floor(i/3);p.cageKeys=0;p.muzzled=false;p.escaped=true;p.grace=5;p.inVehicle=false;p.inControlRoom=false;p.hold=null;p.carry=null;
  }
  this.vehicle={...this.zoo.getaway,unlocked:false,speed:0,owners:{},values:{},heldAt:{},lightsUntil:0,alarmUntil:0,alarmPulse:0,braked:false,bumpUntil:0};
  const [x0,y0,x1,y1]=this.zoo.getaway.stall;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)this.setTile(x,y,T.PATH);
  this._assignCarJobs();this.rebuildBlock();
 }
 _assignCarJobs(){
  const ids=this.activePlayers().map(p=>p.id),count=Math.max(4,ids.length);this.vehicle.owners={};this.vehicle.values={...defaults};this.vehicle.heldAt={};this.vehicle.speed=0;
  if(!ids.length)return;
  CAR_CONTROLS.slice(0,count).forEach((c,i)=>{let owner=i%ids.length;if(ids.length===2)owner=['steering','gear'].includes(c.id)?0:1;if(ids.length===3&&c.id==='brake')owner=1;this.vehicle.owners[c.id]=ids[owner];});
 }
 removePlayer(pid){super.removePlayer(pid);this._assignCarJobs();}
 rebuildBlock(){super.rebuildBlock();if(this.vehicle)for(const i of vehicleCells(this.vehicle,this.w,this.h)){this.entSolid[i]=1;this.entVis[i]=1;}}
 _stepPlayer(p,dt){if(p.inVehicle){p.moving=false;p.x=this.vehicle.x;p.y=this.vehicle.y;return;}super._stepPlayer(p,dt);}
 detectable(p){return !p.inVehicle&&super.detectable(p);}
 _door(){const v=this.vehicle;return [v.x-Math.sin(v.angle)*2.15,v.y+Math.cos(v.angle)*2.15];}
 interactTarget(p){const target=super.interactTarget(p);if(target)return target;return this._objectInteraction(p,this.obj('getaway'));}
 _objectInteraction(p,o){
  if(o.kind!=='vehicle')return super._objectInteraction(p,o);
  if(!this.vehicle||p.inVehicle||p.capturedT>0||dist(p.x,p.y,...this._door())>1.6)return null;
  if(!this.vehicle.unlocked)return {text:p.cageKeys?'Use Unlock on your key fob first':'Locked car: find a keeper carrying its key fob',idle:true};
  if(Math.abs(this.vehicle.speed)>.2)return {text:'Wait until the car stops before boarding',idle:true};
  return {text:'Climb into the car',run:()=>{p.inVehicle=true;p.hold=null;p.hidden=false;p.shell=false;p.slide=null;p.hop=null;p.x=this.vehicle.x;p.y=this.vehicle.y;}};
 }
 _capture(s,p){p.inVehicle=false;super._capture(s,p);}
 _returnToEnclosure(p){
  const spawn=this.zoo.enclosures[p.enc].spawn;p.capturedT=0;p.cageKeys=0;p.materials=0;p.inVehicle=false;p.hold=null;p.hidden=false;p.exposed=false;p.shell=false;p.hop=null;p.slide=null;p.under=null;p.carry=null;p.sprintT=0;p.x=spawn[0]+.5;p.y=spawn[1]+.5;p.grace=5;p.safe=[p.x,p.y];
  this.msg(p,'Caught! Back at the service exit. Your keys and fob were taken.');
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
   const candidates=[this._door(),[v.x+Math.sin(v.angle)*2.15,v.y-Math.cos(v.angle)*2.15]];
   const point=candidates.find(([x,y])=>canOccupy(this,p.animal,x,y,null));if(!point)return this.msg(p,'The door is blocked. Park with room to climb out.');
   p.inVehicle=false;[p.x,p.y]=point;p.grace=1;p.input={};p.prevE=true;this._releaseCarHolds();return;
  }
  if(!this.activePlayers().every(p=>p.connected&&p.inVehicle))return;
  const control=CAR_CONTROLS.find(c=>c.id===msg.control);if(!control||v.owners[control.id]!==pid)return;
  if(control.kind==='wheel'||control.kind==='pedal'){
   if(typeof msg.value!=='number'||!Number.isFinite(msg.value))return;
   if(control.kind==='wheel'?(msg.value < -1||msg.value>1):(msg.value<0||msg.value>1))return;
   v.values[control.id]=msg.held===true?msg.value:0;v.heldAt[control.id]=this.time;
   if(control.id==='brake'&&msg.held===true&&msg.value>.2)v.braked=true;
  }else{
   if(!control.choices.includes(msg.value))return;
   if(control.id==='gear'&&Math.abs(v.speed)>.4)return this.msg(p,'Stop before shifting between Park, Reverse and Drive.');
   v.values[control.id]=msg.value;
  }
 }
 _releaseCarHolds(){for(const id of ['steering','gas','brake'])this.vehicle.values[id]=0;this.vehicle.heldAt={};this.vehicle.speed=0;}
 _carFits(x,y,angle){
  const c=Math.cos(angle),s=Math.sin(angle),blocked=new Set([T.WALL,T.MACHINE,T.ROCK,T.HEDGE,T.TREE,T.BUSH]);
  for(let u=-1.8;u<=1.81;u+=.4)for(let v=-1.15;v<=1.16;v+=.38){const tx=Math.floor(x+u*c-v*s),ty=Math.floor(y+u*s+v*c);if(tx<0||ty<0||tx>=this.w||ty>=this.h||blocked.has(this.tileAt(tx,ty)))return false;}
  return true;
 }
 _stepKeysAndExit(dt){
  const v=this.vehicle;if(!v)return;
  if(v.alarmUntil>this.time){v.alarmPulse-=dt;if(v.alarmPulse<=0){v.alarmPulse=1;this.noise(v.x,v.y,80);this.emit({k:'caralarm',x:v.x,y:v.y});}}
  const team=this.activePlayers(),ready=team.length>0&&team.every(p=>p.connected&&p.inVehicle);
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
   if(this._carFits(nx,ny,angle)){v.x=nx;v.y=ny;v.angle=angle;}
   else{if(Math.abs(v.speed)>.5&&this.time>v.bumpUntil){v.bumpUntil=this.time+.8;this.emit({k:'carbump',x:v.x,y:v.y});this.noise(v.x,v.y,16);}v.speed=0;}
  }
  for(const p of team){p.x=v.x;p.y=v.y;}this.rebuildBlock();
  const extras=(!v.owners.signals||v.values.signals==='Right')&&(!v.owners.navigation||v.values.navigation==='Exit road');
  if(v.x>=58.5&&v.x<=63&&v.y>=36.5&&v.y<=40&&Math.abs(v.speed)<.5&&v.braked&&extras){this.phase='complete';for(const p of team)p.muzzled=false;this.emit({k:'carstolen'});this.emit({k:'complete'});}
 }
 objectives(){
  const act=this.activePlayers(),v=this.vehicle,inCar=act.filter(p=>p.inVehicle).length;
  return {stage:'parking',parking:{unlocked:v.unlocked,keys:act.filter(p=>p.cageKeys).map(p=>p.name),inCar,need:act.length,keepers:this.staff.length,progress:Math.max(0,Math.min(1,1-dist(v.x,v.y,60,38)/24)),car:{x:v.x,y:v.y,angle:v.angle,speed:v.speed,steering:v.values.steering,lightsUntil:v.lightsUntil,alarmUntil:v.alarmUntil},roles:Object.entries(v.owners).map(([id,pid])=>({id,pid,label:CAR_CONTROLS.find(c=>c.id===id).label,name:this.players.get(pid).name,ready:['steering','gas','brake'].includes(id)?!!v.values[id]:v.values[id]===CAR_CONTROLS.find(c=>c.id===id).goal})),team:act.map(p=>({id:p.id,name:p.name,inside:!!p.inVehicle,connected:p.connected}))},
   escape:{done:true,players:[]},rescue:{done:true,n:0,need:0},power:{done:true,parts:[]},keys:{done:true,active:false,keys:[],need:0},exit:{done:this.phase==='complete',open:false,inZone:0,need:act.length},waiting:act.filter(p=>!p.connected).map(p=>p.name)};
 }
 personal(pid){const result=super.personal(pid),p=this.players.get(pid);if(result){result.fob=!!p.cageKeys;if(p.inVehicle){result.vehicle={...this.objectives().parking,controls:CAR_CONTROLS.filter(c=>this.vehicle.owners[c.id]===pid).map(c=>({...c,value:this.vehicle.values[c.id]}))};result.pe=null;result.ps=null;}result.special=!!p.inVehicle||result.special;}return result;}
 snapshot(){const s=super.snapshot();s.pl=s.pl.map(p=>({...p,car:!!this.players.get(p.id).inVehicle}));return s;}
 results(){return {...super.results(),stage:'parking',next:null,carStolen:true};}
}
