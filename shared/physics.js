// Movement + collision shared by the authoritative simulation and client-side prediction.
// A "world" is { w, h, tiles: Uint8Array, entSolid: Uint8Array }.

import { T, animalCanEnter } from './tiles.js';
import { ANIMALS } from './animals.js';

export const HALF = 0.3; // half-size of every animal's collision box (tiles)

export function tileAt(world, x, y) {
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) return T.WALL;
  return world.tiles[y * world.w + x];
}

export function canOccupy(world, animal, x, y, mode) {
  const x0 = Math.floor(x - HALF), x1 = Math.floor(x + HALF - 1e-6);
  const y0 = Math.floor(y - HALF), y1 = Math.floor(y + HALF - 1e-6);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return false;
      const i = ty * world.w + tx;
      if (world.entSolid[i]) return false;
      if (!animalCanEnter(animal, world.tiles[i], mode)) return false;
    }
  }
  return true;
}

export function overlapsTile(x, y, tx, ty) {
  return x + HALF > tx && x - HALF < tx + 1 && y + HALF > ty && y - HALF < ty + 1;
}

export function overlapsTileType(world, x, y, type) {
  const x0 = Math.floor(x - HALF), x1 = Math.floor(x + HALF - 1e-6);
  const y0 = Math.floor(y - HALF), y1 = Math.floor(y + HALF - 1e-6);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileAt(world, tx, ty) === type) return true;
  return false;
}

/** Speed multiplier from terrain and status. */
export function speedFor(world, p, steady) {
  const a = ANIMALS[p.animal];
  let s = a.speed;
  const t = tileAt(world, Math.floor(p.x), Math.floor(p.y));
  if (t === T.ICE) s *= p.animal === 'penguin' ? 2.2 : 0.75;
  if (t === T.WATER && p.animal === 'penguin') s *= 1.7;
  if (t === T.POND) s *= p.animal === 'penguin' ? 1.5 : 0.85;
  if (t === T.ROPE) s *= 0.8;
  if (t === T.BEAM && steady) s *= 0.45;
  if (p.sprintT > 0) s *= 1.9;
  return s;
}

/**
 * Move a body by (dx,dy) with axis-separated collision and gentle corner assistance so
 * players slip into one-tile doorways. Returns true if any movement happened.
 */
export function moveBody(world, p, dx, dy, mode) {
  const animal = p.animal;
  let moved = false;
  if (dx !== 0) {
    const nx = p.x + dx;
    if (canOccupy(world, animal, nx, p.y, mode)) { p.x = nx; moved = true; }
    else if (dy === 0) {
      const cy = Math.floor(p.y) + 0.5;
      const off = cy - p.y;
      if (Math.abs(off) > 0.01 && Math.abs(off) < 0.49 && canOccupy(world, animal, nx, cy, mode)) {
        const step = Math.sign(off) * Math.min(Math.abs(off), Math.abs(dx));
        if (canOccupy(world, animal, p.x, p.y + step, mode)) { p.y += step; moved = true; }
      } else {
        // try the neighbouring row the body leans into
        const alt = off > 0 ? cy - 1 : cy + 1;
        const off2 = alt - p.y;
        if (Math.abs(off2) < 0.7 && canOccupy(world, animal, nx, alt, mode)) {
          const step = Math.sign(off2) * Math.min(Math.abs(off2), Math.abs(dx));
          if (canOccupy(world, animal, p.x, p.y + step, mode)) { p.y += step; moved = true; }
        }
      }
    }
  }
  if (dy !== 0) {
    const ny = p.y + dy;
    if (canOccupy(world, animal, p.x, ny, mode)) { p.y = ny; moved = true; }
    else if (dx === 0) {
      const cx = Math.floor(p.x) + 0.5;
      const off = cx - p.x;
      if (Math.abs(off) > 0.01 && Math.abs(off) < 0.49 && canOccupy(world, animal, cx, ny, mode)) {
        const step = Math.sign(off) * Math.min(Math.abs(off), Math.abs(dy));
        if (canOccupy(world, animal, p.x + step, p.y, mode)) { p.x += step; moved = true; }
      } else {
        const alt = off > 0 ? cx - 1 : cx + 1;
        const off2 = alt - p.x;
        if (Math.abs(off2) < 0.7 && canOccupy(world, animal, alt, ny, mode)) {
          const step = Math.sign(off2) * Math.min(Math.abs(off2), Math.abs(dy));
          if (canOccupy(world, animal, p.x + step, p.y, mode)) { p.x += step; moved = true; }
        }
      }
    }
  }
  return moved;
}

export function facingFrom(mx, my, prev) {
  if (Math.abs(mx) < 0.2 && Math.abs(my) < 0.2) return prev;
  if (Math.abs(mx) > Math.abs(my)) return mx > 0 ? 'right' : 'left';
  return my > 0 ? 'down' : 'up';
}

/** Plain walking step used by both server and client prediction. */
export function walkStep(world, p, mx, my, dt, steady) {
  let len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; len = 1; }
  if (len < 0.15) return false;
  const sp = speedFor(world, p, steady) * dt;
  p.face = facingFrom(mx, my, p.face);
  return moveBody(world, p, mx * sp, my * sp, null);
}
