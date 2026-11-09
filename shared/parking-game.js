import {Game} from './game.js';
import {getZoo} from './zoos/index.js';
import {makeKeepers,parkingKeeperCount} from './staff.js';
export const CAR_CONTROLS=[
 {id:'steering',label:'Steering wheel',choices:['Left','Straight','Right'],goal:'Straight'},
 {id:'gas',label:'Gas pedal',choices:['Off','Gentle','Floor it'],goal:'Gentle'},
 {id:'gear',label:'Gear selector',choices:['Park','Reverse','Drive'],goal:'Drive'},
 {id:'brake',label:'Brake pedal',choices:['Hold','Release'],goal:'Release'},
 {id:'handbrake',label:'Handbrake',choices:['Set','Release'],goal:'Release'},
 {id:'ignition',label:'Ignition key',choices:['Off','Start'],goal:'Start'},
 {id:'signals',label:'Turn signals',choices:['Off','Left','Right'],goal:'Left'},
 {id:'navigation',label:'Navigator',choices:['Zoo entrance','Exit road'],goal:'Exit road'},
];
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
  this.vehicle={unlocked:false,progress:0,owners:{},values:{}};this._assignCarJobs();this.rebuildBlock();
 }
 _assignCarJobs(){
  const ids=this.activePlayers().map(p=>p.id),count=Math.max(3,ids.length);this.vehicle.owners={};if(!ids.length){this.vehicle.values={};return;}
  CAR_CONTROLS.slice(0,count).forEach((c,i)=>{this.vehicle.owners[c.id]=ids[i%ids.length];this.vehicle.values[c.id]=c.choices[0];});this.vehicle.progress=0;
 }
 removePlayer(pid){super.removePlayer(pid);this._assignCarJobs();}
 _stepPlayer(p,dt){if(p.inVehicle){p.moving=false;return;}super._stepPlayer(p,dt);}
 detectable(p){return !p.inVehicle&&super.detectable(p);}
 _objectInteraction(p,o){
  if(o.kind!=='vehicle')return super._objectInteraction(p,o);
  if(!this.vehicle.unlocked&&!p.cageKeys)return {text:'Locked car: steal keys from an unwatched keeper',idle:true};
  return {text:this.vehicle.unlocked?'Enter the getaway wagon':'Unlock the car with your stolen keys and climb in',run:()=>{
   if(!this.vehicle.unlocked){this.vehicle.unlocked=true;o.state=1;this.noise(o.x+.5,o.y+.5,12,p);this.emit({k:'carunlock',name:p.name});}
   p.inVehicle=true;p.hold=null;p.hidden=false;p.shell=false;p.slide=null;p.hop=null;p.x=52.5;p.y=21.5;
  }};
 }
 _capture(s,p){p.inVehicle=false;super._capture(s,p);}
 _returnToEnclosure(p){
  const spawn=this.zoo.enclosures[p.enc].spawn;p.capturedT=0;p.cageKeys=0;p.materials=0;p.inVehicle=false;p.hold=null;p.hidden=false;p.exposed=false;p.shell=false;p.hop=null;p.slide=null;p.under=null;p.carry=null;p.sprintT=0;p.x=spawn[0]+.5;p.y=spawn[1]+.5;p.grace=5;p.safe=[p.x,p.y];
  this.msg(p,'Caught! Back at the service exit. Your stolen keys were taken; try sneaking behind another keeper.');
 }
 vehicleAction(pid,msg){
  const p=this.players.get(pid);if(this.phase!=='play'||!p?.active||!p.connected||!p.inVehicle||p.capturedT>0)return;
  if(msg.op==='leave'){p.inVehicle=false;p.x=48.5;p.y=21.5;p.grace=1;p.input={};p.prevE=false;this.vehicle.progress=0;return;}
  if(!this.activePlayers().every(p=>p.connected&&p.inVehicle))return;
  const control=CAR_CONTROLS.find(c=>c.id===msg.control);
  if(!control||this.vehicle.owners[control.id]!==pid||!control.choices.includes(msg.value))return;
  this.vehicle.values[control.id]=msg.value;
 }
 _stepKeysAndExit(dt){
  if(!this.vehicle)return;
  const ready=this.activePlayers().length>0&&this.activePlayers().every(p=>p.connected&&p.inVehicle)&&Object.keys(this.vehicle.owners).every(id=>this.vehicle.values[id]===CAR_CONTROLS.find(c=>c.id===id).goal);
  this.vehicle.progress=ready?Math.min(3,this.vehicle.progress+dt):0;
  if(this.vehicle.progress>=3){this.phase='complete';for(const p of this.activePlayers())p.muzzled=false;this.emit({k:'carstolen'});this.emit({k:'complete'});}
 }
 objectives(){
  const act=this.activePlayers(),inCar=act.filter(p=>p.inVehicle).length;
  return {stage:'parking',parking:{unlocked:this.vehicle.unlocked,keys:act.filter(p=>p.cageKeys).map(p=>p.name),inCar,need:act.length,keepers:this.staff.length,progress:this.vehicle.progress,roles:Object.entries(this.vehicle.owners).map(([id,pid])=>({id,pid,label:CAR_CONTROLS.find(c=>c.id===id).label,name:this.players.get(pid).name,ready:this.vehicle.values[id]===CAR_CONTROLS.find(c=>c.id===id).goal})),team:act.map(p=>({id:p.id,name:p.name,inside:!!p.inVehicle,connected:p.connected}))},
   escape:{done:true,players:[]},rescue:{done:true,n:0,need:0},power:{done:true,parts:[]},keys:{done:true,active:false,keys:[],need:0},exit:{done:this.phase==='complete',open:false,inZone:0,need:act.length},waiting:act.filter(p=>!p.connected).map(p=>p.name)};
 }
 personal(pid){const result=super.personal(pid),p=this.players.get(pid);if(result&&p.inVehicle)result.vehicle={...this.objectives().parking,controls:CAR_CONTROLS.filter(c=>this.vehicle.owners[c.id]===pid).map(c=>({...c,value:this.vehicle.values[c.id]}))};if(result){result.special=!!p.inVehicle||result.special;if(p.inVehicle){result.pe=null;result.ps=null;}}return result;}
 snapshot(){const s=super.snapshot();s.pl=s.pl.map(p=>({...p,car:!!this.players.get(p.id).inVehicle}));return s;}
 results(){return {...super.results(),stage:'parking',next:null,carStolen:true};}
}
