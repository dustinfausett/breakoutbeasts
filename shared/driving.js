// The painted body fills about 3.45 × 1.9 tiles; ignore mirrors and shadows.
export const CAR_HALF_LENGTH=1.65;
export const CAR_HALF_WIDTH=.82;
export const CAR_CONTACT_GAP=.02;
// Shared collision footprint for the server simulation and client world mirror.
export function vehicleCells(car,w,h){
 const cells=[],c=Math.cos(car.angle),s=Math.sin(car.angle);
 for(let y=Math.max(0,Math.floor(car.y-3));y<=Math.min(h-1,Math.ceil(car.y+3));y++)for(let x=Math.max(0,Math.floor(car.x-3));x<=Math.min(w-1,Math.ceil(car.x+3));x++){
  const dx=x+.5-car.x,dy=y+.5-car.y;
  if(Math.abs(dx*c+dy*s)<CAR_HALF_LENGTH&&Math.abs(-dx*s+dy*c)<CAR_HALF_WIDTH)cells.push(y*w+x);
 }return cells;
}
