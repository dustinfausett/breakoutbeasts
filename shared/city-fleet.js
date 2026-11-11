import {carsOverlap,stepAnimalCarPushes} from './car-pushing.js';
import {Game} from './game.js';
import {ParkingGame,CAR_CONTROLS} from './parking-game.js';
import {vehicleCells} from './driving.js';
import {T} from './tiles.js';
export function withCar(g,car,run){const previous=g.vehicle;g.vehicle=car;try{return run();}finally{g.vehicle=previous;}}
export function crewFor(g,car){return g.activePlayers().filter(p=>p.inVehicle&&p.vehicleId===car.id);}
export function assignCrew(g,car){
 const ids=crewFor(g,car).map(p=>p.id);car.owners={};car.speed=0;car.heldAt={};for(const id of ['steering','gas','brake'])car.values[id]=0;
 if(!ids.length)return;
 CAR_CONTROLS.slice(0,Math.max(4,ids.length)).forEach((c,i)=>{let owner=i%ids.length;if(ids.length===2)owner=['steering','gear'].includes(c.id)?0:1;if(ids.length===3&&c.id==='brake')owner=1;car.owners[c.id]=ids[owner];});car.owners.navigation=ids.at(-1);
}
export function initFleet(g){
 const main=g.vehicle;main.id='crew-car';g.cars=[main];
 for(const p of g.activePlayers())p.vehicleId=main.id;
 for(const [index,d] of g.zoo.decor.filter(d=>d.kind==='parkedCar').entries()){
  const car={...main,id:'city-car-'+index,x:d.x+1.5,y:d.y+2,angle:Math.PI/2,colorIndex:d.colorIndex,unlocked:false,speed:0,owners:{},values:{...main.values,gear:'Park'},heldAt:{},lightsUntil:0,alarmUntil:0,alarmPulse:0};g.cars.push(car);d.fleet=true;
  for(let y=d.y;y<d.y+d.h;y++)for(let x=d.x;x<d.x+d.w;x++)g.setTile(x,y,T.PATH);
 }
 // Traffic follows varied loops on the street lanes and yields to animals and cars.
 for(let i=0;i<6;i++){
  const left=[12,50,88][i%3],right=left+38,top=i<3?44:12,bottom=i<3?108:76;
  const route=[[left-1,top-1],[left-1,bottom+2],[right+2,bottom+2],[right+2,top-1]],start=Math.floor(g.rng()*4),index=Array.from({length:4},(_,j)=>(start+j)%4).find(j=>g.cars.every(c=>Math.hypot(c.x-route[j][0],c.y-route[j][1])>6))??start,point=route[index],next=route[(index+1)%4];
  g.cars.push({...main,id:'traffic-'+i,x:point[0],y:point[1],angle:Math.atan2(next[1]-point[1],next[0]-point[0]),colorIndex:i,unlocked:false,speed:0,owners:{},values:{...main.values},heldAt:{},traffic:true,trafficRoute:route,trafficIndex:(index+1)%4,trafficSpeed:1.8+g.rng()*1.2,lightsUntil:0,alarmUntil:0});
 }

 assignCrew(g,main);
}
export function rebuildFleet(g){Game.prototype.rebuildBlock.call(g);for(const car of g.cars||[g.vehicle])if(car)for(const i of vehicleCells(car,g.w,g.h)){g.entSolid[i]=1;g.entVis[i]=1;}}
export function nearestCar(g,p){return (g.cars||[g.vehicle]).filter(car=>!car.traffic&&withCar(g,car,()=>ParkingGame.prototype._nearCar.call(g,p))).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];}
export function carTarget(g,p){
 const car=nearestCar(g,p);if(!car)return null;
 return withCar(g,car,()=>{const target=ParkingGame.prototype._objectInteraction.call(g,p,g.obj('getaway'));if(!target?.run)return target;const run=target.run;return {...target,run:()=>withCar(g,car,()=>{run();if(p.inVehicle){p.vehicleId=car.id;for(const old of g.cars)if(old!==car&&Object.values(old.owners).includes(p.id))assignCrew(g,old);assignCrew(g,car);}})};});
}
export function fleetAction(g,pid,msg){
 const p=g.players.get(pid);if(!p?.active||!p.connected||p.capturedT>0||g.phase!=='play')return;
 let car=g.cars.find(c=>c.id===p.vehicleId);
 if(['unlock','panic'].includes(msg.op)){
  car=g.cars.find(c=>c.id===p.carFob)||g.cars.find(c=>c.id==='crew-car'&&p.cageKeys);if(!car)return;
  if(msg.op==='unlock'){car.unlocked=true;car.lightsUntil=g.time+5;g.emit({k:'carunlock',x:car.x,y:car.y,name:p.name});}
  else if(g.time>=(car.panicReady||0)){car.alarmUntil=g.time+8;car.panicReady=g.time+2;car.alarmPulse=0;}return;
 }
 if(!car||!p.inVehicle)return;
 withCar(g,car,()=>ParkingGame.prototype.vehicleAction.call(g,pid,msg));
 if(!p.inVehicle){p.vehicleId=null;assignCrew(g,car);}
}
export function fleetFits(g,x,y,angle){return g._terrainFits(x,y,angle)&&!g.cars.some(other=>other!==g.vehicle&&carsOverlap({...g.vehicle,x,y,angle},other));}

export function stepFleet(g,dt){
 stepAnimalCarPushes(g,dt);
 for(const car of g.cars){
  if(car.traffic){
   if(car.pushedUntil>g.time){car.speed=0;continue;}
   const target=car.trafficRoute[car.trafficIndex],dx=target[0]-car.x,dy=target[1]-car.y,distance=Math.hypot(dx,dy),step=Math.min(distance,car.trafficSpeed*dt),angle=Math.atan2(dy,dx),x=car.x+(distance?dx/distance*step:0),y=car.y+(distance?dy/distance*step:0);
   if(withCar(g,car,()=>g._carFits(x,y,angle))&&!g.activePlayers().some(p=>!p.inVehicle&&Math.hypot(p.x-x,p.y-y)<3)){car.x=x;car.y=y;car.angle=angle;car.speed=car.trafficSpeed;if(distance<=step+.01){car.trafficIndex=(car.trafficIndex+1)%4;car.trafficSpeed=1.8+g.rng()*1.2;}}else car.speed=0;
   continue;
  }

  withCar(g,car,()=>g._stepVehicle(dt,crewFor(g,car)));
 }
 g.rebuildBlock();
}
export function publicCar(car){return {id:car.id,x:car.x,y:car.y,angle:car.angle,colorIndex:car.colorIndex||0,speed:car.speed,steering:car.values.steering,lightsUntil:car.lightsUntil,alarmUntil:car.alarmUntil};}
export function fleetPersonal(g,p){
 const car=g.cars.find(c=>c.id===p.vehicleId);if(!p.inVehicle||!car)return null;const crew=crewFor(g,car),controls=g._carControls();return {city:true,unlocked:car.unlocked,car:publicCar(car),inCar:crew.length,need:crew.length,team:crew.map(p=>({id:p.id,name:p.name,inside:true,connected:p.connected})),roles:Object.entries(car.owners).map(([id,pid])=>({id,pid,name:g.players.get(pid)?.name,label:controls.find(c=>c.id===id).label})),controls:controls.filter(c=>car.owners[c.id]===p.id).map(c=>({...c,value:car.values[c.id]}))};
}
