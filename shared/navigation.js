import {bfs,angleDiff,dist} from './util.js';
const columns=[12,50,88,126],rows=[12,44,76,108];
const nearest=(list,value)=>list.reduce((a,b)=>Math.abs(b-value)<Math.abs(a-value)?b:a);
function describe(car,route){
 const next=route.find(p=>dist(car.x,car.y,...p)>2)||route.at(-1),delta=angleDiff(Math.atan2(next[1]-car.y,next[0]-car.x),car.angle);
 if(Math.abs(delta)>.9)return delta>0?'Turn right':'Turn left';
 for(let i=1;i<route.length-1;i++){const [a,b,c]=[route[i-1],route[i],route[i+1]],ax=b[0]-a[0],ay=b[1]-a[1],bx=c[0]-b[0],by=c[1]-b[1],cross=ax*by-ay*bx;if(Math.abs(cross)>.1&&dist(car.x,car.y,...b)>2)return `Continue straight. In ${Math.round(dist(car.x,car.y,...b))} tiles, turn ${cross>0?'right':'left'}.`;}
 return 'Continue straight to the destination';
}
export function gpsFor(game){
 const car=game.vehicle,destination=game.zoo.destinations.find(d=>d.name===car.values.navigation)||game.zoo.destinations[0],key=Math.floor(car.x)+','+Math.floor(car.y)+':'+destination.id;
 let route=game._gpsCache?.key===key?game._gpsCache.route:null;
 if(!route){
  const col=nearest(columns,car.x),row=nearest(rows,car.y),start=Math.abs(car.x-col)<Math.abs(car.y-row)?[col,Math.round(car.y)]:[Math.round(car.x),row];
  const path=bfs(game.w,game.h,...start,[destination.x,destination.y],(x,y)=>(columns.includes(x)||rows.includes(y))&&game.zoo.driveMask[y*game.w+x]===1&&game.tileAt(x,y)!==28,30000)||[];
  route=[[start[0]+.5,start[1]+.5],...path.map(([x,y])=>[x+.5,y+.5])];game._gpsCache={key,route};
 }
 const liveRoute=[[car.x,car.y],...route],arrived=dist(car.x,car.y,destination.x,destination.y)<3;
 return {destination:destination.name,target:{x:destination.x,y:destination.y},route:liveRoute,instruction:arrived?'Arrived — park and climb out':describe(car,liveRoute),car:{x:car.x,y:car.y,angle:car.angle},w:160,h:128};
}
export function parkingGPS(game){const car=game.vehicle,route=game.objectives().parking.route.filter(p=>p[1]>=car.y-2);return {destination:'Parking exit',target:{x:71,y:61},route:[[car.x,car.y],...route],instruction:describe(car,[[car.x,car.y],...route]),car:{x:car.x,y:car.y,angle:car.angle},w:game.w,h:game.h};}
