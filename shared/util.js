// Small shared helpers: RNG, grid search, line of sight.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/**
 * Breadth-first search on a 4-connected grid.
 * passable(x, y) -> bool. Returns array of [x,y] from start (exclusive) to goal (inclusive), or null.
 * goal may be a function (x,y)->bool.
 */
export function bfs(w, h, sx, sy, goal, passable, maxNodes = 20000) {
  const isGoal = typeof goal === 'function' ? goal : (x, y) => x === goal[0] && y === goal[1];
  if (isGoal(sx, sy)) return [];
  const prev = new Int32Array(w * h).fill(-1);
  const start = sy * w + sx;
  prev[start] = start;
  const q = [start];
  let qi = 0;
  while (qi < q.length && qi < maxNodes) {
    const cur = q[qi++];
    const cx = cur % w, cy = (cur / w) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0);
      const ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (prev[ni] !== -1) continue;
      if (isGoal(nx, ny)) {
        prev[ni] = cur;
        const path = [];
        let p = ni;
        while (p !== start) { path.push([p % w, (p / w) | 0]); p = prev[p]; }
        return path.reverse();
      }
      if (!passable(nx, ny)) continue;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  return null;
}

/** Line of sight between two points (tile units). blocks(tx,ty)->bool. */
export function lineOfSight(x0, y0, x1, y1, blocks) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(len / 0.1));
  let lastTx = -1, lastTy = -1;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor(x0 + dx * t), ty = Math.floor(y0 + dy * t);
    if (tx === lastTx && ty === lastTy) continue;
    lastTx = tx; lastTy = ty;
    if (blocks(tx, ty)) return false;
  }
  return true;
}

/** Ray march for vision-cone polygons. Returns distance travelled before hitting a blocker. */
export function rayDistance(x0, y0, ang, maxD, blocks) {
  const cx = Math.cos(ang), cy = Math.sin(ang);
  for (let d = 0.1; d <= maxD; d += 0.1) {
    const tx = Math.floor(x0 + cx * d), ty = Math.floor(y0 + cy * d);
    if (blocks(tx, ty)) return d;
  }
  return maxD;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function makeRoomCode(rng = Math.random) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += A[Math.floor(rng() * A.length)];
  return s;
}
