import {ANIMAL_IDS,ANIMALS} from './animals.js';
// Every animal has its own fitted set of nine original pixel garments.
const STYLES={shirt:[['Sunset Stripe','#db7855',25],['Midnight Check','#6679bd',35],['Garden Vest','#72a06c',45]],hat:[['City Cap','#d1a451',20],['Moon Beanie','#9a79bc',30],['Sunday Fedora','#9e7359',40]],pants:[['Denim Trousers','#587ca0',25],['Plaid Slacks','#9a6c80',35],['Cargo Pants','#8c9868',45]]};
export const CLOTHES=ANIMAL_IDS.flatMap(animal=>Object.entries(STYLES).flatMap(([slot,styles])=>styles.map(([name,color,price],style)=>({id:`${animal}-${slot}-${style}`,animal,slot,style,name:`${ANIMALS[animal].name} ${name}`,color,price}))));
export function clothesFor(animal){return CLOTHES.filter(item=>item.animal===animal);}
export function isDisguised(p){return ['shirt','hat','pants'].every(slot=>!!p.outfit?.[slot])&&!p.disguiseBlown;}
