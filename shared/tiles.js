// Tile types and their movement / vision rules.
// Movement rules are per-animal so abilities change how each animal can traverse the world.

export const T = {
  GRASS: 0,
  PATH: 1,
  FLOOR: 2,       // habitat / maintenance floor (themed by area)
  WALL: 3,        // solid, blocks vision
  FENCE: 4,       // bars: block movement, not vision; monkeys reach through
  CLIMB: 5,       // marked climbable fence: red pandas hop over
  HEDGE: 6,       // block movement + vision
  BUSH: 7,        // hiding cover, walkable
  WATER: 8,       // deep water: penguins swim
  POND: 9,        // shallow water: flamingos wade, penguins swim
  ICE: 10,        // slippery: penguins fast, others slow
  LOW: 11,        // low passage: penguins belly-slide through
  NARROW: 12,     // narrow gap: everyone but elephants
  WOOD: 13,       // marked wooden barrier: beavers chew
  LOOSE: 14,      // marked loose planks: zebras kick
  REINF: 15,      // reinforced barrier: nobody breaks it
  SOIL: 16,       // marked soft soil: meerkats dig
  BURROW: 17,     // dug tunnel entrance
  ROPE: 18,       // rope crossing: monkeys climb along
  LEDGE: 19,      // narrow ledge: red pandas walk along
  BEAM: 20,       // balance beam: flamingos balance across
  BRIDGE_SPOT: 21,// water with posts: beavers build bridges here
  BRIDGE: 22,     // built bridge
  TREE: 23,
  ROCK: 24,
  EXIT: 25,       // exit zone
  DEBRIS: 26,     // broken barrier remains (walkable)
  SOILX: 27,      // hidden far end of a burrow (walkable ground)
  MACHINE: 28,    // generator housing / sheds (solid, see-through low)
  BARREL: 29,     // solid low clutter
};

export const TILE_NAMES = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k]));

const VISION_BLOCK = new Set([T.WALL, T.HEDGE, T.TREE, T.WOOD, T.LOOSE, T.REINF, T.MACHINE]);
export function tileBlocksVision(t) { return VISION_BLOCK.has(t); }

// Ground anyone can walk on.
const GROUND = new Set([T.GRASS, T.PATH, T.FLOOR, T.BUSH, T.ICE, T.BURROW, T.BRIDGE, T.EXIT, T.DEBRIS, T.SOIL, T.SOILX]);

/**
 * Can this animal stand on tile t?
 * mode: { slide: bool } — penguin belly-slide lets it pass LOW passages.
 */
export function animalCanEnter(animal, t, mode) {
  if (GROUND.has(t)) return true;
  switch (t) {
    case T.NARROW: return animal !== 'elephant';
    case T.WATER: return animal === 'penguin';
    case T.BRIDGE_SPOT: return animal === 'penguin';
    case T.POND: return animal === 'penguin' || animal === 'flamingo';
    case T.LOW: return animal === 'penguin' && !!(mode && mode.slide);
    case T.LEDGE: return animal === 'redpanda';
    case T.ROPE: return animal === 'monkey';
    case T.BEAM: return animal === 'flamingo';
    default: return false;
  }
}

// Staff walk on ordinary ground only.
const STAFF_GROUND = new Set([T.GRASS, T.PATH, T.FLOOR, T.BUSH, T.ICE, T.BRIDGE, T.EXIT, T.DEBRIS, T.SOIL, T.SOILX, T.BURROW, T.NARROW]);
export function staffCanEnter(t) { return STAFF_GROUND.has(t); }

// Rescued / caged NPC animals wander loosely (they splash through water etc.).
export function npcCanEnter(t) {
  return GROUND.has(t) || t === T.WATER || t === T.POND || t === T.NARROW || t === T.BRIDGE_SPOT || t === T.BEAM || t === T.ROPE || t === T.LEDGE;
}

// Crates slide over flat ground only.
const CRATE_GROUND = new Set([T.GRASS, T.PATH, T.FLOOR, T.ICE, T.BRIDGE, T.DEBRIS, T.SOILX]);
export function crateCanEnter(t) { return CRATE_GROUND.has(t); }

export const DIRS = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};
export const DIR_LIST = ['up', 'down', 'left', 'right'];
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
