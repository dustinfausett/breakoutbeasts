// Forward-facing animal vision. Unlike keeper vision it has no distance cap.
import { DIRS } from './tiles.js';

export function animalCanSee(world, animal, x, y) {
  const [fx, fy] = DIRS[animal.face || animal.f || 'down'];
  const dx = x - animal.x, dy = y - animal.y;
  if (dx * fx + dy * fy < -0.00001) return false;
  let cx = Math.floor(animal.x), cy = Math.floor(animal.y);
  const tx = Math.floor(x), ty = Math.floor(y);
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const stepX = dx ? 1 / Math.abs(dx) : Infinity;
  const stepY = dy ? 1 / Math.abs(dy) : Infinity;
  let nextX = dx ? ((sx > 0 ? cx + 1 - animal.x : animal.x - cx) / Math.abs(dx)) : Infinity;
  let nextY = dy ? ((sy > 0 ? cy + 1 - animal.y : animal.y - cy) / Math.abs(dy)) : Infinity;
  const blocked = (a,b) => world.visionBlocked(a,b);
  for (let i=0;i<world.w+world.h+4;i++) {
    if (cx===tx && cy===ty) return true;
    if (Math.abs(nextX-nextY)<1e-9) {
      if (blocked(cx+sx,cy) && blocked(cx,cy+sy)) return false;
      cx+=sx;cy+=sy;nextX+=stepX;nextY+=stepY;
    } else if(nextX<nextY){cx+=sx;nextX+=stepX;}
    else {cy+=sy;nextY+=stepY;}
    // The near surface of an obstacle is visible; the space behind it is not.
    if(cx===tx && cy===ty) return true;
    if(blocked(cx,cy))return false;
  }
  return false;
}
