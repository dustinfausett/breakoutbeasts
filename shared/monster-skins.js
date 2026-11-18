// Secret appearances are cosmetic: animal identity, abilities and collision stay intact.
export const MONSTER_NAMES=Object.freeze({jude:'monster_jude',baylee:'monster_baylee',tate:'monster_tate',dax:'monster_dax'});
export const MONSTER_IDS=Object.values(MONSTER_NAMES);
export function monsterSkin(name){const key=String(name??'').trim().toLowerCase();return Object.hasOwn(MONSTER_NAMES,key)?MONSTER_NAMES[key]:null;}
