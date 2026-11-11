import {canOccupy} from './physics.js';
import {vehicleCells} from './driving.js';
import {bfs,dist} from './util.js';
import {staffCanEnter} from './tiles.js';
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
const boundsFor=(g,scene)=>scene==='street'?[1,1,158,126]:g.zoo.interiors[scene]?.rect;
const inside=(r,x,y)=>r&&x>r[0]&&x<r[2]&&y>r[1]&&y<r[3];
function walkSpace(g,animal,x,y,r){
 if(!inside(r,x,y)||!canOccupy(g,animal,x,y,null))return false;
 const queue=[[Math.floor(x),Math.floor(y)]],seen=new Set([queue[0].join(',')]);
 for(let i=0;i<queue.length&&seen.size<8;i++){const [cx,cy]=queue[i];for(const [dx,dy] of directions){const nx=cx+dx,ny=cy+dy,key=nx+','+ny;if(!seen.has(key)&&inside(r,nx,ny)&&canOccupy(g,animal,nx+.5,ny+.5,null)){seen.add(key);queue.push([nx,ny]);}}}return seen.size>=8;
}
// Search through a car's footprint to find an arrival on the SAME accessible side
// of permanent walls and closed gates. Never choose an isolated one-tile pocket.
export function safeArrival(g,animal,scene,point){
 const r=boundsFor(g,scene);if(!r)return null;if(walkSpace(g,animal,...point,r))return point;
 const solid=g.entSolid.slice();for(const car of g.cars||[])for(const i of vehicleCells(car,g.w,g.h))solid[i]=0;
 for(const gate of g.gates)if(!gate.state)for(const [x,y] of gate.tiles)solid[y*g.w+x]=1;
 for(const o of g.objects)if(!o.walkable&&o.kind!=='vehicle'&&g.entSolid[o.y*g.w+o.x])solid[o.y*g.w+o.x]=1;
 const staticWorld={w:g.w,h:g.h,tiles:g.tiles,entSolid:solid},queue=[[Math.floor(point[0]),Math.floor(point[1])]],seen=new Set([queue[0].join(',')]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i],candidate=[x+.5,y+.5];if(walkSpace(g,animal,...candidate,r))return candidate;for(const [dx,dy] of directions){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!seen.has(key)&&inside(r,nx,ny)&&canOccupy(staticWorld,animal,nx+.5,ny+.5,null)){seen.add(key);queue.push([nx,ny]);}}}return null;
}
export function recoverCityPlayer(g,p){
 if(p.inVehicle||p.inPlane||p.caged||p.capturedT>0||p.under||p.hop||p.slide||p.chapterStation!=null)return;
 if(canOccupy(g,p.animal,p.x,p.y,null)&&directions.some(([x,y])=>canOccupy(g,p.animal,p.x+x*.7,p.y+y*.7,null)))return;
 const point=safeArrival(g,p.animal,p.location,[p.x,p.y]);if(point){[p.x,p.y]=point;p.safe=point;p.hold=null;p.grace=Math.max(p.grace,1);}
}
export function enterCityAnimal(g,a){
 const source=a.scene.startsWith('zoo')?'zoo':a.scene,door=g.obj('enter-'+source),point=door?safeArrival(g,'redpanda','street',door.stand.map(v=>v+.5)):null;
 if(!point)return false;[a.x,a.y]=point;a.location='street';a.state='escaped';a.path=null;a.wanderWait=0;g.emit({k:'districtescaped',species:a.species});return true;
}
export function stepCityAnimal(g,a,dt){
 a.moving=false;if(a.location!=='street')return;
 if(a.wanderWait>0){a.wanderWait-=dt;return;}
 const pass=(x,y)=>inside([1,1,158,126],x,y)&&!g.entSolid[y*g.w+x]&&staffCanEnter(g.tileAt(x,y));
 if(!pass(Math.floor(a.x),Math.floor(a.y))){const point=safeArrival(g,'redpanda','street',[a.x,a.y]);if(point){[a.x,a.y]=point;a.path=null;}return;}
 if(!a.path?.length){let target;for(let i=0;i<40;i++){const x=Math.floor(3+g.rng()*152),y=Math.floor(3+g.rng()*120);if(pass(x,y)&&dist(a.x,a.y,x,y)>5){target=[x,y];break;}}a.path=target?bfs(g.w,g.h,Math.floor(a.x),Math.floor(a.y),target,pass,20000):null;if(!a.path?.length){a.wanderWait=.4;return;}}
 const [x,y]=a.path[0];if(!pass(x,y)){a.path=null;return;}const dx=x+.5-a.x,dy=y+.5-a.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*3.8);if(d){a.x+=dx/d*step;a.y+=dy/d*step;a.face=dx<0?'left':dx>0?'right':a.face;a.moving=true;}if(d<=step+.01){a.path.shift();if(!a.path.length)a.wanderWait=.15+g.rng()*.5;}
}
