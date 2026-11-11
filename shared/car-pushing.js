import {T} from './tiles.js';
import {vehicleCells} from './driving.js';
import {canOccupy,moveBody,HALF} from './physics.js';
export const CAR_PUSH_SPEED=.55;
export const pushSeconds=animal=>['elephant','giraffe','zebra'].includes(animal)?1:5;
export const movableCars=g=>g.cars||[g.vehicle,...(g.parkedCars||[])].filter(Boolean);
export function carsOverlap(a,b){
 const c=Math.cos(a.angle),s=Math.sin(a.angle),oc=Math.cos(b.angle),os=Math.sin(b.angle),dx=b.x-a.x,dy=b.y-a.y;
 for(const [ax,ay] of [[c,s],[-s,c],[oc,os],[-os,oc]]){const ar=1.8*Math.abs(ax*c+ay*s)+1.15*Math.abs(-ax*s+ay*c),br=1.8*Math.abs(ax*oc+ay*os)+1.15*Math.abs(-ax*os+ay*oc);if(Math.abs(dx*ax+dy*ay)>ar+br+.15)return false;}return true;
}
function coversBody(g,car,p){const cells=new Set(vehicleCells(car,g.w,g.h));for(let y=Math.floor(p.y-HALF);y<=Math.floor(p.y+HALF-1e-6);y++)for(let x=Math.floor(p.x-HALF);x<=Math.floor(p.x+HALF-1e-6);x++)if(cells.has(y*g.w+x))return true;return false;}
function trapsPlayer(g,old,pose){return g.activePlayers().some(p=>!p.inVehicle&&p.capturedT<=0&&!p.inPlane&&!p.under&&!p.hop&&!coversBody(g,old,p)&&coversBody(g,pose,p));}
function syncRiders(g,car){for(const p of g.activePlayers())if(p.inVehicle&&(g.cars?p.vehicleId===car.id:car===g.vehicle)){p.x=car.x;p.y=car.y;}}
// Plan an entire chain before moving anything: a wall or a closed gate stops all
// the cars in the chain. No partial moves, overlaps or tunnelling through scenery.
export function shoveCars(g,root,dx,dy,angle=root.angle){
 if(Math.hypot(dx,dy)>.1)return false;
 const cars=movableCars(g),planned=new Map([[root,{...root,x:root.x+dx,y:root.y+dy,angle}]]),queue=[root];
 for(let i=0;i<queue.length;i++){
  const car=queue[i],pose=planned.get(car);if(!g._terrainFits(pose.x,pose.y,pose.angle)||trapsPlayer(g,car,pose))return false;
  for(const other of cars)if(other!==car&&carsOverlap(pose,planned.get(other)||other)){
   if(planned.has(other))return false;
   planned.set(other,{...other,x:other.x+dx,y:other.y+dy});queue.push(other);
  }
 }
 for(const [car,pose] of planned){car.x=pose.x;car.y=pose.y;car.angle=pose.angle;car.pushedUntil=g.time+.2;syncRiders(g,car);}
 g.rebuildBlock();return true;
}
export function moveDrivenCar(g,x,y,angle,dt){
 const car=g.vehicle;if(g._carFits(x,y,angle)){if(trapsPlayer(g,car,{...car,x,y,angle}))return false;car.x=x;car.y=y;car.angle=angle;return true;}
 if(!movableCars(g).some(other=>other!==car&&carsOverlap({...car,x,y,angle},other)))return false;
 const speed=Math.sign(car.speed)*Math.min(Math.abs(car.speed),CAR_PUSH_SPEED);if(!speed)return false;
 const turn=car.angle+car.values.steering*speed*.38*dt,dx=Math.cos(turn)*speed*dt,dy=Math.sin(turn)*speed*dt;
 if(!shoveCars(g,car,dx,dy,turn))return false;car.speed=speed;return true;
}
function touches(g,p,car,dx,dy,reach){
 if(Math.hypot(car.x-p.x,car.y-p.y)>4.8+reach)return false;
 if((car.x-p.x)*dx+(car.y-p.y)*dy<=0)return false;
 const x=p.x+dx*reach,y=p.y+dy*reach,cells=new Set(vehicleCells(car,g.w,g.h));
 for(let ty=Math.floor(y-HALF);ty<=Math.floor(y+HALF-1e-6);ty++)for(let tx=Math.floor(x-HALF);tx<=Math.floor(x+HALF-1e-6);tx++)if(cells.has(ty*g.w+tx))return true;return false;
}
export function stepAnimalCarPushes(g,dt){
 const cars=movableCars(g);
 for(const p of g.activePlayers()){
  const inp=p.input||{},length=Math.hypot(inp.mx||0,inp.my||0);
  if(!p.connected||p.inVehicle||p.capturedT>0||p.caged||p.shopping||p.chapterStation!=null||p.inPlane||p.shell||p.under||p.hop||p.slide||p.hold||length<=.15){p.carPush=null;continue;}
  const dx=inp.mx/length,dy=inp.my/length,previous=p.carPush;
  let car=cars.find(c=>touches(g,p,c,dx,dy,.18));
  if(!car&&previous?.t>=previous?.need)car=cars.find(c=>c.id===previous.id&&touches(g,p,c,dx,dy,.85));
  if(!car){p.carPush=null;continue;}
  // A car on the far side of a wall cannot be pushed through it.
  const solids=g.entSolid.slice();for(const car of cars)for(const i of vehicleCells(car,g.w,g.h))solids[i]=0;
  for(const gate of g.gates)if(!gate.state)for(const [x,y] of gate.tiles)solids[y*g.w+x]=1;
  for(const o of g.objects)if(!o.walkable&&o.kind!=='vehicle'&&g.entSolid[o.y*g.w+o.x])solids[o.y*g.w+o.x]=1;
  const world={w:g.w,h:g.h,tiles:g.tiles,entSolid:solids};if(!canOccupy(world,p.animal,p.x+dx*.18,p.y+dy*.18,null)){p.carPush=null;continue;}
  const same=previous?.id===car.id&&previous.dx*dx+previous.dy*dy>.9;
  const push=p.carPush={id:car.id,dx,dy,need:pushSeconds(p.animal),t:Math.min(pushSeconds(p.animal),(same?previous.t:0)+dt),moving:false,blocked:false};
  if(push.t+1e-8<push.need)continue;
  push.t=push.need;push.moving=shoveCars(g,car,dx*CAR_PUSH_SPEED*dt,dy*CAR_PUSH_SPEED*dt);push.blocked=!push.moving;
  if(push.moving){moveBody(g,p,dx*CAR_PUSH_SPEED*dt,dy*CAR_PUSH_SPEED*dt,null);p.moving=true;}
 }
}
export function pushPersonal(p){const h=p.carPush;return h?{car:h.id,elapsed:h.t,need:h.need,ready:h.t>=h.need,moving:h.moving,blocked:h.blocked}:null;}
export function initParkingCars(g){
 g.vehicle.id='getaway';g.parkedCars=[];
 for(const [i,d] of g.zoo.decor.filter(d=>d.kind==='parkedCar').entries()){
  d.fleet=true;if(d.getaway)continue;
  g.parkedCars.push({id:'lot-car-'+i,x:d.x+d.w/2,y:d.y+d.h/2,angle:d.angle||Math.PI/2,colorIndex:d.colorIndex||0,speed:0,values:{steering:0},lightsUntil:0,alarmUntil:0});
  for(let y=d.y;y<d.y+d.h;y++)for(let x=d.x;x<d.x+d.w;x++)g.setTile(x,y,T.PATH);
 }
}
export function carSnapshot(c){return {id:c.id,x:c.x,y:c.y,angle:c.angle,colorIndex:c.colorIndex||0,speed:c.speed||0,steering:c.values?.steering||0,lightsUntil:c.lightsUntil||0,alarmUntil:c.alarmUntil||0};}
