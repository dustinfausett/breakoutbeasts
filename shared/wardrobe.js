import {uniformWorks} from './uniforms.js';
import {ANIMAL_IDS,ANIMALS} from './animals.js';
// Every animal has its own fitted set of nine original pixel garments.
const STYLES={shirt:[['Sunset Stripe','#db7855',25],['Midnight Check','#6679bd',35],['Garden Vest','#72a06c',45]],hat:[['City Cap','#d1a451',20],['Moon Beanie','#9a79bc',30],['Sunday Fedora','#9e7359',40]],pants:[['Denim Trousers','#587ca0',25],['Plaid Slacks','#9a6c80',35],['Cargo Pants','#8c9868',45]]};
const CITY_CLOTHES=ANIMAL_IDS.flatMap(animal=>Object.entries(STYLES).flatMap(([slot,styles])=>styles.map(([name,color,price],style)=>({id:`${animal}-${slot}-${style}`,animal,slot,style,name:`${ANIMALS[animal].name} ${name}`,color,price}))));
export const AIRPORT_CLOTHES=ANIMAL_IDS.flatMap(animal=>[
 {slot:'hat',name:'Wildwing Pilot Cap',color:'#355e8a',price:30},
 {slot:'shirt',name:'I Flew Wildwing Shirt',color:'#dfaa5f',price:35},
 {slot:'pants',name:'Cloud Print Trousers',color:'#80b3bd',price:30}
].map(c=>({...c,id:`${animal}-${c.slot}-3`,animal,style:3,airport:true,name:`${ANIMALS[animal].name} ${c.name}`})));
export const CLOTHES=[...CITY_CLOTHES,...AIRPORT_CLOTHES];
export function clothesFor(animal){return CLOTHES.filter(item=>item.animal===animal&&!item.airport);}
export function isDisguised(p){return p.uniform?uniformWorks(p):['shirt','hat','pants'].every(slot=>!!p.outfit?.[slot])&&!p.disguiseBlown;}

export function disguiseSignature(p){return [p.animal,...(p.uniform?['uniform:'+p.uniform]:[]),...['hat','shirt','pants'].map(s=>p.outfit?.[s]||'bare')].join('|');}
