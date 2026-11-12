import {CLOTHES} from './wardrobe.js';
import {TOOLS} from './hardware.js';
import {makeKeepers} from './staff.js';
import {dist} from './util.js';
export const FOOD=[{id:'meat',name:'Meat',price:20},{id:'fish',name:'Fish',price:15},{id:'bananas',name:'Bananas',price:10}];
export const STORE_SCENES=['thrift','hardware','grocery'];
const near=(p,o)=>o&&dist(p.x,p.y,o.x+.5,o.y+.5)<1.9;
export function shelfCatalog(p,category){return category==='tools'?TOOLS:category==='food'?FOOD:FOOD.some(f=>f.id===category)?FOOD.filter(f=>f.id===category):CLOTHES.filter(c=>c.animal===p.animal&&c.slot===category);}
export function shopObject(g,p,o){
 if(o.kind==='shopShelf'){if(p.location!==o.scene)return null;return {text:`Hold E: browse ${o.label}`,run:()=>{p.hold={kind:'shopBrowse',btn:'e',obj:o.id,t:0,need:.7};}};}
 if(['shopCounter','hardwareCounter','groceryCounter'].includes(o.kind)&&STORE_SCENES.includes(p.location))return {text:p.cart?.length?`Hold E: pay $${cartCost(p)}`:'Choose items from the labeled shelves first',...(p.cart?.length?{run:()=>{p.hold={kind:'shopPay',btn:'e',obj:o.id,t:0,need:1.4};}}:{idle:true})};
 return null;
}
export function cartCost(p){return (p.cart||[]).reduce((sum,item)=>sum+item.price,0);}
export function shopHold(g,p,inp,dt){const h=p.hold;if(!['shopBrowse','shopPay'].includes(h.kind))return false;const o=g.obj(h.obj);if(!inp.e||!p.connected||p.caged||p.capturedT>0||!near(p,o)||!STORE_SCENES.includes(p.location)){p.hold=null;return true;}h.t+=dt;if(h.t<h.need)return true;p.hold=null;
 if(h.kind==='shopBrowse'){p.shopping=true;p.shopShelf=o.id;p.shopCategory=o.category;return true;}
 const total=cartCost(p);if(p.money<total){g.msg(p,`You need $${total} to pay. Find more money or return items to their shelves.`);return true;}p.money-=total;p.cart=[];g.emit({k:'shopPaid',pid:p.id,amount:total});return true;}
export function shopAction(g,p,msg){
 if(msg.op==='closeShop'){p.shopping=false;p.shopShelf=null;return true;}
 if(msg.op==='returnCart'){for(const item of p.cart||[]){if(item.type==='food')p.food[item.id]=Math.max(0,(p.food[item.id]||0)-1);if(item.type==='tool')p.tools=p.tools.filter(id=>id!==item.id);if(item.type==='clothes'){p.owned=p.owned.filter(id=>id!==item.id);const c=CLOTHES.find(c=>c.id===item.id);if(p.outfit[c.slot]===item.id)delete p.outfit[c.slot];}}p.cart=[];return true;}
 if(!['take','wear'].includes(msg.op))return false;
 const shelf=g.obj(p.shopShelf);if(!p.shopping||!shelf||p.location!==shelf.scene||!near(p,shelf))return true;const item=shelfCatalog(p,shelf.category).find(c=>c.id===msg.item);if(!item)return true;
 const clothes=CLOTHES.includes(item),tool=TOOLS.includes(item),owned=clothes?p.owned.includes(item.id):tool?p.tools.includes(item.id):false;
 if(clothes&&owned){p.outfit[item.slot]=item.id;p.disguiseBlown=false;return true;}if(owned||msg.op==='wear'||(p.cart||[]).length>=12)return true;
 p.cart=p.cart||[];p.cart.push({id:item.id,price:item.price,type:clothes?'clothes':tool?'tool':'food'});
 if(clothes){p.owned.push(item.id);p.outfit[item.slot]=item.id;p.disguiseBlown=false;}else if(tool)p.tools.push(item.id);else p.food[item.id]=(p.food[item.id]||0)+1;return true;
}
export function reportShoplifting(g,p){if(!p.cart?.length)return;p.cart=[];p.shopping=false;p.shopShelf=null;g.shopThefts=(g.shopThefts||0)+1;g.policeWanted=g.policeWanted||new Set();g.policeWanted.add(p.id);
 const routes=[{route:[[50,44],[88,44],[88,76],[50,76]],start:0},{route:[[88,76],[126,76],[126,108],[88,108]],start:0}],officers=makeKeepers(routes,2);for(const [i,s] of officers.entries()){s.id=500+g.shopThefts*2+i;s.scene='street';s.police=true;s.state='investigate';s.goal=[Math.floor(p.x),Math.floor(p.y)];}g.staff.push(...officers);g._raiseAlert();g.emit({k:'shopTheft',pid:p.id,name:p.name});}
export function shopPersonal(g,p){return {category:p.shopCategory||null,shelf:p.shopShelf||null,cart:(p.cart||[]).map(c=>({...c})),bill:cartCost(p),food:{...p.food},catalog:p.shopping?shelfCatalog(p,p.shopCategory):[]};}
