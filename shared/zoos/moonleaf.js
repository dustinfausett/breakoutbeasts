// Moonleaf Zoo — the introductory zoo.
// Enclosures are drawn as ASCII art in *local* coordinates where the front wall (facing the
// promenade) is row 10 and row 11 is the promenade in front of it. South-row enclosures are
// mirrored vertically so their fronts face north.

import { T } from '../tiles.js';

export const W = 81;
export const H = 56;

// Legend for enclosure art
const LEGEND = {
  '#': T.WALL, '|': T.FENCE, 'C': T.CLIMB, '.': T.FLOOR, ',': T.GRASS, 'T': T.TREE, 'R': T.ROCK,
  'b': T.BUSH, '~': T.WATER, 'p': T.POND, 'i': T.ICE, 'L': T.LOW, 'n': T.NARROW, 'W': T.WOOD,
  'K': T.LOOSE, 'X': T.REINF, 's': T.SOIL, 'u': T.SOILX, 'r': T.ROPE, 'l': T.LEDGE, '=': T.BEAM,
  'B': T.BRIDGE_SPOT, 'P': T.PATH,
  // markers placed on floor/path/wall
  'o': T.FLOOR, 'G': T.FLOOR, 'g': T.FLOOR, 'k': T.PATH, 'S': T.FLOOR, 'h': T.FLOOR, 'c': T.FLOOR,
  'H': T.WALL, 'v': T.FLOOR, 'w': T.FLOOR,
};

// Each enclosure: art (12 rows x 14 cols), theme, sign name, and a step-by-step solution
// in local coordinates (used by the autopilot tests and the how-to-play guide).
const ENCLOSURES = {
  redpanda: {
    name: 'Red Panda Grove', theme: 'bamboo',
    art: [
      '##############',
      '#TT..b...TT..#',
      '#T..........T#',
      '#....RR......#',
      '#..........b.#',
      '#.T....S.....#',
      '#...........T#',
      '#..b.....R...#',
      '#T...........#',
      '#........T...#',
      '##|C||GG||||##',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'Hop over the striped climbing fence at the front of your grove (face it and press Space).',
    solution: [{ go: [3, 9] }, { face: 'down' }, { space: 1 }, { wait: 0.6 }],
  },
  monkey: {
    name: 'Monkey Jungle', theme: 'jungle',
    art: [
      '##############',
      '#TT.T~~......#',
      '#T...~~..T...#',
      '#..S.rr......#',
      '#T...~~...b..#',
      '#..T.~~......#',
      '#....~~...T..#',
      '#T.b.~~......#',
      '#~~~~~~......#',
      '#~~~~~~...R..#',
      '###X##GG#|####',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'Climb the rope over the moat, then reach through the bars to the keeper lever outside (Space).',
    solution: [{ go: [9, 9] }, { face: 'down' }, { space: 1 }, { wait: 0.6 }, { go: [7, 11] }],
  },
  giraffe: {
    name: 'Giraffe Heights', theme: 'savanna',
    art: [
      '##############',
      '#...T....T...#',
      '#.T......R...#',
      '#....b.......#',
      '#.......T....#',
      '#..S.........#',
      '#......R..T..#',
      '#.T..........#',
      '#......b.....#',
      '#............#',
      '###H##GG######',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'A switch sits high on top of the front wall. Stretch up to it with Space.',
    solution: [{ go: [3, 9] }, { space: 1 }, { wait: 0.6 }, { go: [6, 11] }],
  },
  elephant: {
    name: 'Elephant Yard', theme: 'dust',
    art: [
      '##############',
      '#T....RR....T#',
      '#............#',
      '#..T.........#',
      '#.......~~...#',
      '#.......~~...#',
      '#............#',
      '#..h.c..S....#',
      '#............#',
      '#T........R..#',
      '######GG###g##',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'Shove the crate onto the heavy plate (Space) to hold the side door open.',
    solution: [{ go: [6, 7] }, { face: 'left' }, { space: 1 }, { wait: 0.3 }, { go: [5, 7] }, { face: 'left' }, { space: 1 }, { wait: 0.4 }, { go: [11, 11] }],
  },
  zebra: {
    name: 'Zebra Plains', theme: 'plains',
    art: [
      '##############',
      '#....R.......#',
      '#.b.......T..#',
      '#............#',
      '#...T........#',
      '#.........S..#',
      '#............#',
      '#..R.....b...#',
      '#............#',
      '#......T.....#',
      '###K##GG######',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'Kick the loose planks in the front fence (face them and press Space).',
    solution: [{ go: [3, 9] }, { face: 'down' }, { space: 1 }, { wait: 0.4 }, { go: [3, 11] }],
  },
  penguin: {
    name: 'Penguin Cove', theme: 'ice',
    art: [
      '##############',
      '#~~~~~~iiiiii#',
      '#~~~~~~iiiiii#',
      '#~~~~~iiiiiii#',
      '#i~~~iiiS.iii#',
      '#iiiiiiiiiiii#',
      '#iiiii~~~iiii#',
      '#iiii~~~~~iii#',
      '#ii.i~~~~~iii#',
      '#iLiiiiiiiiii#',
      '##L###GG######',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'Belly-slide (Space) through the low ice chute at the front corner.',
    solution: [{ go: [2, 8] }, { face: 'down' }, { space: 1 }, { wait: 0.8 }],
  },
  beaver: {
    name: 'Beaver Lodge', theme: 'pond',
    art: [
      '##############',
      '#T..o.....TT.#',
      '#..........~~#',
      '#.T....S...~~#',
      '#..........~~#',
      '#....b.......#',
      '#.R..........#',
      '#............#',
      '#............#',
      '#~~B~~.......#',
      '###W##GG######',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'Chew down the timber below the log pile (hold Space), then grab a log (E), build a bridge on the posts (Space), then chew through the wooden door (hold Space).',
    solution: [{ go: [4, 2] }, { face: 'up' }, { e: 1 }, { go: [3, 8] }, { face: 'down' }, { space: 1 }, { wait: 1.2 }, { go: [3, 9] }, { face: 'down' }, { holdSpace: 2.2 }, { go: [3, 11] }],
  },
  meerkat: {
    name: 'Meerkat Dunes', theme: 'desert',
    art: [
      '##############',
      '#...R........#',
      '#.b.....R....#',
      '#............#',
      '#..R....S....#',
      '#............#',
      '#.....b...R..#',
      '#............#',
      '#..s.........#',
      '#............#',
      '######GG######',
      'PPPuPPPPPkPPPP',
    ],
    hint: 'Dig into the patch of soft soil (hold Space), then travel through the tunnel (E).',
    solution: [{ go: [3, 8] }, { holdSpace: 2.6 }, { e: 1 }, { wait: 1.0 }],
  },
  tortoise: {
    name: 'Tortoise Garden', theme: 'garden',
    art: [
      '##############',
      '#T.b....T..T.#',
      '#............#',
      '#..T...b.....#',
      '#.......S....#',
      '#...T........#',
      '#..........T.#',
      '#.b..........#',
      '#.v..........#',
      '#............#',
      '###g##GG######',
      'PPPPPPPPPkPPPP',
    ],
    hint: 'Pull the lever (E), step into the gateway and tuck into your shell (Space) before the gate snaps shut.',
    solution: [{ go: [3, 8] }, { e: 1 }, { moveFor: ['down', 0.9] }, { space: 1 }, { wait: 1.4 }, { space: 1 }, { go: [3, 11] }],
  },
  flamingo: {
    name: 'Flamingo Lagoon', theme: 'lagoon',
    art: [
      '##############',
      '#b...~~~pppp.#',
      '#....~~~pppp.#',
      '#.S..~~~ppp~~#',
      '#....~~~ppp~w#',
      '#....===...~~#',
      '#T...~~~.....#',
      '#....~~~...T.#',
      '#..b.~~~.....#',
      '#....~~~.....#',
      '##GG#####|#g##',
      'PPPPkPPPPPPPPP',
    ],
    hint: 'Balance across the beam (hold Space to steady), wade into the pond and stretch over the water to the switch (Space).',
    solution: [{ go: [4, 5] }, { beam: ['right', 8] }, { go: [10, 4] }, { face: 'right' }, { space: 1 }, { wait: 0.5 }, { go: [11, 9] }, { go: [11, 11] }],
  },
};

const TOP_ROW = ['redpanda', 'monkey', 'giraffe', 'elephant', 'zebra'];
const BOTTOM_ROW = ['penguin', 'beaver', 'meerkat', 'tortoise', 'flamingo'];
const ROW_X = [2, 17, 32, 47, 62];

export const THEMES = ['outside', 'bamboo', 'jungle', 'savanna', 'dust', 'plains', 'ice', 'pond', 'desert', 'garden', 'lagoon', 'maint', 'court', 'plaza', 'exit'];

export function buildMoonleaf() {
  const tiles = new Uint8Array(W * H).fill(T.GRASS);
  const theme = new Uint8Array(W * H).fill(0);
  const staffMask = new Uint8Array(W * H);
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = t; };
  const get = (x, y) => tiles[y * W + x];
  const setTheme = (x, y, th) => { theme[y * W + x] = THEMES.indexOf(th); };
  const rect = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };
  const border = (x0, y0, x1, y1, t) => {
    for (let x = x0; x <= x1; x++) { set(x, y0, t); set(x, y1, t); }
    for (let y = y0; y <= y1; y++) { set(x0, y, t); set(x1, y, t); }
  };
  const themeRect = (x0, y0, x1, y1, th) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setTheme(x, y, th); };

  const gates = [];
  const objects = [];
  const plates = [];
  const crates = [];
  const burrows = [];
  const decor = [];
  const enclosures = [];
  let nid = 1;
  const addGate = (g) => { g.id = 'g' + (nid++); gates.push(g); return g.id; };
  const addObj = (o) => { o.id = 'o' + (nid++); objects.push(o); return o.id; };

  // --- Base grounds ---
  border(0, 0, W - 1, H - 1, T.WALL);
  for (let x = 1; x < W - 1; x++) { set(x, 1, T.TREE); }
  for (let y = 1; y < H - 1; y++) { set(1, y, (y % 3 === 0) ? T.TREE : T.HEDGE); }
  rect(1, 13, W - 2, 15, T.PATH);
  rect(1, 41, W - 2, 43, T.PATH);
  for (const gx of [16, 31, 46, 61]) {
    rect(gx, 2, gx, 12, T.TREE); rect(gx, 44, gx, 54, T.TREE);
  }
  rect(76, 2, 79, 12, T.TREE); rect(76, 44, 79, 54, T.TREE);
  for (let y = 2; y <= 12; y += 3) set(78, y, T.BUSH);

  // --- Enclosures ---
  const placeEnclosure = (animal, x0, bottom) => {
    const def = ENCLOSURES[animal];
    const idx = enclosures.length;
    const toWorld = (lx, ly) => [x0 + lx, bottom ? 54 - ly : 2 + ly];
    const dirMap = (d) => (bottom ? ({ up: 'down', down: 'up' }[d] || d) : d);
    const mainTiles = []; const sideTiles = [];
    let spawn = null, keeper = null, plate = null, crate = null, high = null, lever = null, wsw = null, soil = null, soilx = null, logpile = null;
    def.art.forEach((row, ly) => {
      if (row.length !== 14) throw new Error(`Enclosure ${animal} row ${ly} has ${row.length} cols`);
      [...row].forEach((ch, lx) => {
        const t = LEGEND[ch];
        if (t === undefined) throw new Error(`Unknown art char ${ch} in ${animal}`);
        const [wx, wy] = toWorld(lx, ly);
        set(wx, wy, t);
        if (ly <= 10) { setTheme(wx, wy, def.theme); staffMask[wy * W + wx] = 1; }
        switch (ch) {
          case 'G': mainTiles.push([wx, wy]); break;
          case 'g': sideTiles.push([wx, wy]); break;
          case 'S': spawn = [wx, wy]; break;
          case 'k': keeper = [wx, wy]; break;
          case 'h': plate = [wx, wy]; break;
          case 'c': crate = [wx, wy]; break;
          case 'H': high = [wx, wy]; break;
          case 'v': lever = [wx, wy]; break;
          case 'w': wsw = [wx, wy]; break;
          case 's': soil = [wx, wy]; break;
          case 'u': soilx = [wx, wy]; break;
          case 'o': logpile = [wx, wy]; break;
        }
      });
    });
    const mainGate = addGate({ kind: 'main', vis: 'bars', tiles: mainTiles, enc: idx, label: def.name + ' gate' });
    const keeperId = addObj({ kind: 'lever', reach: 'normal', hold: 1.0, x: keeper[0], y: keeper[1], action: { open: mainGate }, enc: idx, keeper: true, label: 'Cage key lock' });
    addObj({kind:'supplies',x:keeper[0]-1,y:keeper[1],enc:idx,public:true,label:'Supply chest'});
    if (high) addObj({ kind: 'lever', reach: 'high', hold: 0, x: high[0], y: high[1], action: { open: mainGate }, enc: idx, label: 'High switch' });
    let sideGate = null;
    if (sideTiles.length) {
      const kind = animal === 'tortoise' ? 'timed' : 'side';
      sideGate = addGate({ kind, vis: animal === 'flamingo' ? 'bars' : 'solid', tiles: sideTiles, enc: idx, label: 'Side door' });
    }
    if (animal === 'monkey' || animal === 'giraffe') {
      const spot=toWorld(animal==='monkey'?9:4,10);set(...spot,T.FLOOR);
      sideGate=addGate({kind:'side',vis:'bars',tiles:[spot],enc:idx,label:'Ability service hatch'});
      if(animal==='monkey'){
        const lock=objects.find(o=>o.id===keeperId);lock.x++;
        addObj({kind:'lever',reach:'bars',hold:0,x:keeper[0],y:keeper[1],action:{open:sideGate},enc:idx,oneShot:true,label:'Service hatch latch'});
      }else objects.find(o=>o.reach==='high'&&o.enc===idx).action={open:sideGate};
    }
    if (plate) plates.push({ id: 'p' + (nid++), x: plate[0], y: plate[1], heavy: true, gate: sideGate });
    if (crate) crates.push({ id: 'c' + (nid++), x: crate[0], y: crate[1], home: [...crate] });
    if (lever) addObj({ kind: 'lever', reach: 'normal', hold: 0, x: lever[0], y: lever[1], action: { timed: sideGate, dur: 1.3 }, enc: idx, label: 'Gate lever' });
    if (wsw) addObj({ kind: 'lever', reach: 'water', hold: 0, x: wsw[0], y: wsw[1], action: { open: sideGate }, enc: idx, label: 'Lagoon switch' });
    if (logpile) {
      const source=toWorld(4,2);set(...source,T.WOOD);
      addObj({ kind: 'logpile', x: logpile[0], y: logpile[1], enc: idx, source, label: 'Chewed timber pile' });
    }
    if (soil && soilx) burrows.push({ id: 'b' + (nid++), a: soil, b: soilx });
    const [rx0, ry0] = toWorld(0, 0); const [rx1, ry1] = toWorld(13, 10);
    const [sx, sy] = toWorld(11, 11);
    decor.push({ kind: 'sign', x: sx, y: sy, text: def.name });
    // Supply placeholder; Game chooses a reachable location for each mission.
    const bench = [spawn[0], spawn[1] + (bottom ? 1 : -1)];
    set(...bench, T.GRASS);
    addObj({ kind: 'supplies', x: bench[0], y: bench[1], enc: idx, label: 'Supply chest' });
    const build = toWorld(1, 10), wall = toWorld(1, 10), outside = toWorld(1, 11);
    set(...outside, T.PATH);
    set(...toWorld(1,9),T.GRASS);
    // A shore path lets the monkey reach the ramp site without swimming the moat.
    if (animal === 'monkey') for(let y=3;y<=9;y++)set(...toWorld(1,y),T.GRASS);
    addObj({ kind: 'escapeBuild', x: build[0], y: build[1], enc: idx, label: 'Stack a ramp', wall, outside });
    const dig = toWorld(12, 10), digOut = toWorld(12, 11);
    set(...toWorld(12,9),T.GRASS); set(...digOut, T.PATH);
    addObj({ kind: 'escapeDig', x: dig[0], y: dig[1], enc: idx, label: 'Dig with a stick', outside: digOut });
    const solution = [{ go: spawn }, ...(animal==='beaver'?[{go:toWorld(4,3)},{face:dirMap('up')},{holdSpace:2.2}]:[]), ...def.solution.map((s) => {
      const o = { ...s };
      if (s.go) o.go = toWorld(...s.go);
      if (s.face) o.face = dirMap(s.face);
      if (s.moveFor) o.moveFor = [dirMap(s.moveFor[0]), s.moveFor[1]];
      if (s.beam) o.beam = [dirMap(s.beam[0]), x0 + s.beam[1]];
      return o;
    })];
    enclosures.push({
      index: idx, animal, name: def.name, theme: def.theme,
      hint: def.hint + ' Alternative: find a supply chest and collect two bundles, then hold E at the ramp site in the front-left corner. Small animals can craft a digging stick at the front-right soil site. Large animals can charge a hit on the main gate by holding Space — every hit is louder!',
      rect: [Math.min(rx0, rx1), Math.min(ry0, ry1), Math.max(rx0, rx1), Math.max(ry0, ry1)],
      spawn, mainGate, keeper: keeperId, sideGate, front: bottom ? 'up' : 'down', solution,
    });
  };
  TOP_ROW.forEach((a, i) => placeEnclosure(a, ROW_X[i], false));
  BOTTOM_ROW.forEach((a, i) => placeEnclosure(a, ROW_X[i], true));

  // --- Maintenance yard (x2..23, y17..39) ---
  border(2, 17, 23, 39, T.WALL);
  rect(3, 18, 22, 38, T.FLOOR);
  themeRect(2, 17, 23, 39, 'maint');
  const bays = [];
  for (let i = 0; i < 8; i++) {
    const bx = 3 + (i%4) * 5, by = 18+Math.floor(i/4)*10;
    // bay shell
    rect(bx, by, bx + 4, by + 7, T.WALL);
    rect(bx + 1, by + 1, bx + 3, by + 3, T.FLOOR);
    rect(bx + 2, by + 4, bx + 2, by + 7, T.FLOOR);
    for (let y = by; y <= by + 7; y++) for (let x = bx; x <= bx + 4; x++) staffMask[y * W + x] = 1;
    const cage = addObj({ kind: 'cage', x: bx + 1, y: by + 1, bay: i, label: 'Fuse cage' });
    const breaker = addObj({ kind: 'breaker', x: bx + 3, y: by + 1, bay: i, label: 'Breaker' });
    bays.push({
      index: i, x: bx, y: by,
      door: [bx + 2, by + 4],
      corridor: [[bx + 2, by + 5], [bx + 2, by + 6], [bx + 2, by + 7]],
      room: [bx + 1, by + 1, bx + 3, by + 3],
      entrance: [bx + 2, by + 8],
      sidePanel: [bx + 1, by + 6],   // wall cell beside the corridor (cranks, tortoise lever)
      barsWindow: [bx + 3, by + 6],  // wall cell that becomes bars for monkeys
      barsSwitch: [bx + 4, by + 6],  // switch cell behind the bars
      highSpot: [bx + 1, by + 4],    // high wall switch beside the door
      cage, breaker,
    });
  }
  rect(4,38,10,38,T.MACHINE);rect(15,38,21,38,T.MACHINE);
  const sockets=[4,6,8,10,15,17,19,21].map((x,index)=>addObj({kind:'socket',x,y:37,index,stand:[x,36],label:'Generator socket'}));
  rect(23,26,23,27,T.PATH);
  rect(23, 28, 23, 30, T.PATH); // east exit
  rect(11, 39, 13, 39, T.PATH); // south exit
  set(23, 34, T.LOW);           // penguin shortcut duct
  for (const [x, y] of [[4,27]]) set(x, y, T.BARREL);
  for (const [x, y] of [[18,36]]) set(x, y, T.BUSH);
  addObj({ kind: 'can', x: 22, y: 36, label: 'Noisy bin' });
  decor.push({ kind: 'sign', x: 24, y: 27, text: 'Maintenance Yard' });
  decor.push({ kind: 'sign', x: 12, y: 37, text: 'Generator' });

  // --- West garden (x24..29) ---
  rect(25, 17, 28, 26, T.HEDGE);
  rect(25, 32, 28, 39, T.HEDGE);
  rect(27, 18, 27, 25, T.NARROW);  // narrow rock gap (shortcut, no elephants)
  set(27, 17, T.NARROW); set(27, 26, T.NARROW);
  rect(24, 28, 30, 30, T.PATH);
  for (const [x, y] of [[24, 25], [24, 26], [29, 32], [29, 33], [24, 38]]) set(x, y, T.BUSH);

  // --- Central courtyard (x30..50, y19..37) ---
  border(30, 19, 50, 37, T.HEDGE);
  rect(31, 20, 49, 36, T.PATH);
  themeRect(30, 19, 50, 37, 'court');
  rect(38, 19, 42, 19, T.PATH); rect(38, 37, 42, 37, T.PATH);
  rect(30, 27, 30, 31, T.PATH); rect(50, 27, 50, 31, T.PATH);
  rect(39, 16, 41, 18, T.PATH); rect(39, 38, 41, 40, T.PATH);
  // fountain
  rect(37, 25, 43, 31, T.WATER);
  rect(37, 26, 43, 26, T.LEDGE);
  rect(39, 27, 41, 29, T.ROCK);
  rect(37, 30, 43, 30, T.ROPE);
  // hideout bushes
  rect(31, 20, 34, 22, T.BUSH);
  rect(46, 33, 49, 36, T.BUSH);
  for (const [x, y] of [[31, 35], [33, 26], [47, 25]]) set(x, y, T.BUSH);
  set(32, 35, T.SOIL); // meerkat shortcut
  addObj({ kind: 'can', x: 35, y: 34, label: 'Noisy bin' });
  decor.push({ kind: 'sign', x: 38, y: 18, text: 'Central Courtyard' });
  decor.push({ kind: 'sign', x: 35, y: 20, text: 'Animal Hideout' });
  decor.push({ kind: 'statue', x: 40, y: 28 });

  // --- East garden (x51..56) ---
  rect(51, 17, 55, 25, T.HEDGE);
  rect(51, 33, 55, 39, T.HEDGE);
  rect(50, 28, 57, 30, T.PATH);
  for (const [x, y] of [[56, 19], [56, 20], [52, 26], [52, 32], [56, 37]]) set(x, y, T.BUSH);

  // --- Exit plaza (x57..76, y17..39) ---
  border(57, 17, 76, 39, T.WALL);
  rect(58, 18, 75, 38, T.PATH);
  themeRect(57, 17, 76, 39, 'plaza');
  rect(57, 28, 57, 30, T.PATH);
  rect(66, 16, 67, 17, T.PATH);
  set(57, 22, T.CLIMB);   // red panda shortcut
  set(57, 24, T.WOOD);    // beaver shortcut
  set(57, 35, T.LOOSE);   // zebra shortcut
  set(59, 37, T.SOILX);   // meerkat shortcut far end
  burrows.push({ id: 'b' + (nid++), a: [32, 35], b: [59, 37] });
  set(72, 17, T.PATH); set(72, 16, T.PATH);
  const shortcutGate = addGate({ kind: 'side', vis: 'bars', tiles: [[72, 17]], label: 'Service gate' });
  addObj({ kind: 'lever', reach: 'high', hold: 0, x: 73, y: 17, action: { open: shortcutGate }, label: 'High switch' });
  for (const [x, y] of [[59, 25], [59, 26], [74, 23], [74, 33], [66, 26], [67, 26]]) set(x, y, T.BUSH);
  for (const [x, y] of [[61, 29], [73, 30]]) set(x, y, T.BARREL);
  addObj({ kind: 'can', x: 66, y: 33, label: 'Noisy bin' });
  // A compact control house replaces the exposed exit-key stations.
  rect(64,25,70,31,T.FLOOR);border(64,25,70,31,T.WALL);
  for(let y=25;y<=31;y++)for(let x=64;x<=70;x++)staffMask[y*W+x]=1;
  const keys = [[66,25,66,24],[68,25,68,24],[70,27,71,27],[70,29,71,29],[68,31,68,32],[66,31,66,32],[64,29,63,29],[64,27,63,27]].map(([x,y,sx,sy],index)=>{
    set(x,y,T.FLOOR);set(sx,sy,T.PATH);
    return addObj({kind:'controlDoor',x,y,index,stand:[sx,sy],label:'Control house door '+String.fromCharCode(65+index)});
  });
  for(let i=objects.length-1;i>=0;i--){const o=objects[i];if(o.kind!=='controlDoor'&&o.x>=64&&o.x<=70&&o.y>=25&&o.y<=31)objects.splice(i,1);}
  decor.push({kind:'controlHouse',x:64,y:25,w:7,h:7});
  decor.push({kind:'sign',x:65,y:23,text:'Exit Control House — separate doors'});
  // exit gate and zone
  rect(76, 27, 76, 29, T.PATH);
  const exitGate = addGate({ kind: 'exit', vis: 'solid', tiles: [[76, 27], [76, 28], [76, 29]], label: 'Moonleaf Gate' });
  rect(77, 16, 79, 40, T.TREE);
  rect(77, 24, 79, 32, T.EXIT);
  rect(77, 23, 79, 23, T.WALL); rect(77, 33, 79, 33, T.WALL);
  themeRect(77, 24, 79, 32, 'exit');
  decor.push({ kind: 'sign', x: 56, y: 27, text: 'Exit Plaza' });
  decor.push({ kind: 'sign', x: 75, y: 26, text: 'Moonleaf Gate' });

  // promenade dressing
  for (let x = 6; x < 77; x += 10) { decor.push({ kind: 'lamp', x, y: 16 }); decor.push({ kind: 'lamp', x: x + 4, y: 40 }); }
  for (const [x, y] of [[34, 24], [46, 24], [34, 32], [46, 32], [62, 27], [71, 27], [6, 28], [18, 28]]) decor.push({ kind: 'lamp', x, y });
  for (const [x, y] of [[44, 21], [36, 21], [44, 35], [64, 37], [69, 19]]) decor.push({ kind: 'bench', x, y });
  for (let x = 2; x < 79; x += 3) { if (get(x, 16) === T.GRASS && (x < 38 || x > 42) && (x < 65 || x > 68)) decor.push({ kind: 'flowers', x, y: 16 }); }
  // grass strips between promenades and middle get a few hedges for cover
  for (const [x, y] of [[44, 16], [45, 16], [33, 40], [34, 40], [55, 40], [56, 40], [20, 16], [21, 16]]) set(x, y, T.HEDGE);
  for (const [x, y] of [[46, 16], [32, 40], [57, 40], [22, 16]]) set(x, y, T.BUSH);

  // staff never wander into habitats or bays (they patrol public paths)
  const staffRoutes = [
    { route: [[4, 14], [40, 14], [40, 18], [40, 14], [77, 14], [40, 14]], start: 1, cycle: true },
    { route: [[33, 24], [47, 24], [47, 33], [33, 33]], start: 0, cycle: true },
    { route: [[77, 42], [12, 42], [12, 35], [20, 28], [12, 35], [12, 42]], start: 0, cycle: true },
    { route: [[59, 19], [74, 19], [74, 37], [59, 37]], start: 2, cycle: true },
  ];

  const hideout = [[32, 21], [33, 21], [31, 21], [32, 20], [33, 20], [34, 21], [31, 20], [34, 20], [33, 22], [32, 22]];

  return {
    id: 'moonleaf', name: 'Moonleaf Zoo', w: W, h: H, tiles, theme, themes: THEMES, staffMask,
    gates, objects, plates, crates, burrows, decor, enclosures, bays, sockets, keys,
    exitGate, exitZone: [77, 24, 79, 32], staffRoutes, hideout,
    requiredRescues: 3,
    staff: { patrolSpeed: 1.5, chaseSpeed: 2.2, alertSpeed: 1.9, investigateSpeed: 1.55, range: 5.5, halfAngle: 0.72, detectRate: 1.0 },
    intro: 'Moonleaf Zoo is quiet tonight. Slip out of your enclosure, free your friends, restore power in the maintenance yard and slip through the Moonleaf Gate together.',
  };
}
