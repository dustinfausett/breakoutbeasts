// Zoo registry. Add new zoos here; each builder returns a static zoo definition.
import { buildParking } from './parking.js';
import { buildMoonleaf } from './moonleaf.js';

export const ZOOS = {
  parking:{id:'parking',name:'Moonleaf Parking Lot',build:buildParking,available:false},
  moonleaf: { id: 'moonleaf', name: 'Moonleaf Zoo', blurb: 'A quiet woodland zoo under the moon. Perfect for a first breakout.', build: buildMoonleaf, available: true },
};

// Planned zoos shown as "coming soon" in the menu (not yet playable).
export const PLANNED_ZOOS = [
  { id: 'sunspire', name: 'Sunspire Safari Park', blurb: 'Searchlights, open savanna and rotating patrols.' },
  { id: 'frostfern', name: 'Frostfern Aquarium Zoo', blurb: 'Ice tunnels, pumps and timed floodgates.' },
];

const cache = new Map();
export function getZoo(id) {
  const z = ZOOS[id];
  if (!z) throw new Error('Unknown zoo ' + id);
  if (!cache.has(id)) cache.set(id, z.build());
  return cache.get(id);
}
