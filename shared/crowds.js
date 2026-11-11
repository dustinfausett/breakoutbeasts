import {bfs,dist} from './util.js';
import {staffCanEnter} from './tiles.js';
function open(g,x,y,scene){const r=scene==='street'?[2,2,157,124]:g.zoo.interiors[scene]?.rect;return r&&x>r[0]&&x<r[2]&&y>r[1]&&y<r[3]&&staffCanEnter(g.tileAt(x,y))&&!g.entSolid[y*g.w+x];}
function point(g,scene){const r=scene==='street'?[2,2,157,124]:g.zoo.interiors[scene]?.rect;if(!r)return null;for(let i=0;i<120;i++){const x=Math.floor(r[0]+1+g.rng()*(r[2]-r[0]-2)),y=Math.floor(r[1]+1+g.rng()*(r[3]-r[1]-2));if(!(scene==='bank'&&x>=g.zoo.bankLayout.wallX&&y<=144)&&open(g,x,y,scene)&&!g.rescue.animals.some(a=>a.scene===scene&&x>a.rect?.[0]&&x<a.rect?.[2]&&y>a.rect?.[1]&&y<a.rect?.[3]))return [x,y];}return null;}
export function initCrowds(g){
 const counts={bank:14,street:54,zoo:26,zooUpper:14,zooPavilion:12,petstore:8,hardware:4};
 for(const [scene,count] of Object.entries(counts))for(let i=0;i<count;i++){const p=point(g,scene);if(!p)continue;g.humans.push({id:scene+'-crowd-'+i,scene,x:p[0]+.5,y:p[1]+.5,home:[p[0]+.5,p[1]+.5],angle:g.rng()*Math.PI*2,wallet:scene==='bank'?60+Math.floor(g.rng()*100):0,asleep:false,picked:false,color:i%4,visitor:scene.startsWith('zoo')||scene==='petstore',wait:g.rng()*3,carId:scene==='street'&&i<18?'city-car-'+i:null});}
 g.humans.sort((a,b)=>(a.scene==='bank'?0:1)-(b.scene==='bank'?0:1));
}
export function panicCrowd(g,p){for(const n of g.humans)if((n.scene||'bank')===p.location&&!n.asleep){n.panic={x:p.x,y:p.y,until:g.time+120};n.path=null;n.wait=0;}}
export function stepCrowds(g,dt){
 for(const n of g.humans){n.moving=false;if(n.asleep)continue;const scene=n.scene||'bank';if(n.phoneUntil>g.time)continue;if(n.wait>0){n.wait-=dt;continue;}
  if(!n.path?.length){let target;
   if(n.panic){if(n.panic.until<g.time)n.panic=null;else{const pts=Array.from({length:8},()=>point(g,scene)).filter(Boolean);target=pts.sort((a,b)=>dist(...b,n.panic.x,n.panic.y)-dist(...a,n.panic.x,n.panic.y))[0];}}
   if(!target&&n.visitor&&g.rng()<.55){const a=g.rescue.animals.filter(a=>a.scene===scene&&a.state==='caged');const animal=a[Math.floor(g.rng()*a.length)];if(animal){const o=g.obj('release-'+animal.id);const candidate=o?.stand||[o?.x,o?.y];if(candidate&&open(g,...candidate,scene)){target=candidate;n.watch=[animal.x,animal.y];}}}
   target=target||point(g,scene);if(!target){n.wait=1;continue;}n.path=bfs(g.w,g.h,Math.floor(n.x),Math.floor(n.y),target,(x,y)=>open(g,x,y,scene),12000);if(!n.path?.length){n.wait=.5;continue;}
  }
  const [tx,ty]=n.path[0],x=tx+.5,y=ty+.5;if(!open(g,tx,ty,scene)){n.path=null;continue;}const dx=x-n.x,dy=y-n.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*(n.panic?3.5:1.05));if(d){n.x+=dx/d*step;n.y+=dy/d*step;n.angle=Math.atan2(dy,dx);n.moving=true;}if(d<=step+.01){n.path.shift();if(!n.path.length){n.wait=n.panic?.2:1+g.rng()*5;if(n.watch){n.angle=Math.atan2(n.watch[1]-n.y,n.watch[0]-n.x);n.watch=null;}}}
 }
}
