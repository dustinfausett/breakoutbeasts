// Shared collision footprint for the server simulation and client world mirror.
export function vehicleCells(car,w,h){
 const cells=[],c=Math.cos(car.angle),s=Math.sin(car.angle);
 for(let y=Math.max(0,Math.floor(car.y-3));y<=Math.min(h-1,Math.ceil(car.y+3));y++)for(let x=Math.max(0,Math.floor(car.x-3));x<=Math.min(w-1,Math.ceil(car.x+3));x++){
  const dx=x+.5-car.x,dy=y+.5-car.y;
  if(Math.abs(dx*c+dy*s)<2.25&&Math.abs(-dx*s+dy*c)<1.65)cells.push(y*w+x);
 }return cells;
}
