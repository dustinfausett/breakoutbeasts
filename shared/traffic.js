// Cars wait briefly, then route around parked cars and blocked junctions.
import {carsOverlap} from './car-pushing.js';
const clear=(g,c,x,y,angle)=>g._terrainFits(x,y,angle)&&!g.cars.some(other=>other!==c&&carsOverlap({...c,x,y,angle},other))&&!g.activePlayers().some(p=>!p.inVehicle&&p.location==='street'&&Math.hypot(p.x-x,p.y-y)<1.4);
function detour(g,c,target){
 const start=[Math.round(c.x),Math.round(c.y)],queue=[start],prev=new Map([[start.join(','),null]]);let end=null;
 for(let i=0;i<queue.length&&i<18000;i++){const p=queue[i];if(Math.hypot(p[0]-target[0],p[1]-target[1])<1.1){end=p;break;}
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const x=p[0]+dx,y=p[1]+dy,key=x+','+y;if(x<4||y<4||x>155||y>121||prev.has(key)||!g.zoo.driveMask[y*g.w+x])continue;const angle=Math.atan2(dy,dx);if(!clear(g,c,x,y,angle)||!clear(g,c,p[0]+dx*.5,p[1]+dy*.5,angle))continue;prev.set(key,p);queue.push([x,y]);}
 }
 if(!end)return null;const path=[];for(let p=end;prev.get(p.join(','));p=prev.get(p.join(',')))path.push(p);return path.reverse();
}
export function stepTraffic(g,c,dt){
 if(c.pushedUntil>g.time){c.speed=0;return;}
 let target=c.detour?.[0]||c.trafficRoute[c.trafficIndex],dx=target[0]-c.x,dy=target[1]-c.y,d=Math.hypot(dx,dy),step=Math.min(d,c.trafficSpeed*dt),angle=d>.001?Math.atan2(dy,dx):c.angle,x=c.x+(d?dx/d*step:0),y=c.y+(d?dy/d*step:0);
 if(clear(g,c,x,y,angle)){c.x=x;c.y=y;c.angle=angle;c.speed=c.trafficSpeed;c.blocked=0;if(d<=step+.01){if(c.detour?.length)c.detour.shift();else c.trafficIndex=(c.trafficIndex+1)%c.trafficRoute.length;}}
 else {c.speed=0;c.blocked=(c.blocked||0)+dt;if(c.blocked>=1.5){c.blocked=0;c.reroutes=(c.reroutes||0)+1;if(c.reroutes%3===0)c.trafficIndex=(c.trafficIndex+1)%c.trafficRoute.length;c.detour=detour(g,c,c.trafficRoute[c.trafficIndex]);}}
}
