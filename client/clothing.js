import {CLOTHES} from './shared/wardrobe.js';
import {SPRITES} from './sprites.js';
// Garments are fitted to each classic animal's silhouette, rather than stretched from human art.
const FITS={redpanda:[3,9,8,4,10,6,5],elephant:[2,8,10,5,10,4,6],monkey:[5,9,7,4,10,2,5],beaver:[3,9,8,4,9,5,6],giraffe:[3,11,8,3,12,2,5],penguin:[5,9,6,4,9,4,5],zebra:[2,9,10,4,12,5,5],meerkat:[6,7,5,6,8,2,5],tortoise:[2,8,9,4,13,8,4],flamingo:[3,8,7,3,10,0,4]};
const cache=new Map();
export function garmentCanvas(item){
 if(cache.has(item.id))return cache.get(item.id);const c=document.createElement('canvas');c.width=16;c.height=16;const g=c.getContext('2d'),[x,y,w,h,hx,hy,hw]=FITS[item.animal];g.fillStyle=item.color;
 if(item.slot==='shirt'){g.fillRect(x,y,w,h);g.fillRect(x-1,y+1,2,2);g.fillRect(x+w-1,y+1,2,2);g.fillStyle='#ead9ab';if(item.style===0)g.fillRect(x,y+1,w,1);else if(item.style===1)for(let a=x;a<x+w;a+=3)for(let b=y;b<y+h;b+=2)g.fillRect(a,b,1,1);else{g.fillRect(x+Math.floor(w/2),y,1,h);g.fillRect(x+1,y+1,2,1);}}
 if(item.slot==='pants'){const py=Math.min(13,y+h-1),pw=Math.max(4,w-1);g.fillRect(x,py,pw,2);g.fillRect(x,py+2,2,2);g.fillRect(x+pw-2,py+2,2,2);g.fillStyle='#d1be87';g.fillRect(x,py,pw,1);if(item.style===1)for(let a=x+1;a<x+pw;a+=3)g.fillRect(a,py+1,1,2);if(item.style===2){g.fillStyle='#bac598';g.fillRect(x,py+1,2,1);g.fillRect(x+pw-2,py+1,2,1);}}
 if(item.slot==='hat'){const tx=Math.max(0,Math.min(16-hw,hx-2)),ty=Math.max(0,hy-1);g.fillRect(tx,ty,hw,2);if(item.style===0)g.fillRect(Math.min(14,tx+hw-1),ty+2,2,1);if(item.style===1){g.fillRect(tx+1,Math.max(0,ty-1),hw-2,1);g.fillStyle='#f1ce80';g.fillRect(tx+2,ty,1,1);}if(item.style===2){g.fillRect(Math.max(0,tx-1),ty+2,Math.min(16-tx+1,hw+2),1);g.fillStyle='#e8c68c';g.fillRect(tx,ty+1,hw,1);}}
 if(item.slot!=='hat'){const body=SPRITES[item.animal]?.idle?.r||SPRITES[item.animal]?.r[0];if(body){g.globalCompositeOperation='destination-in';g.drawImage(body,0,0,16,16);g.globalCompositeOperation='source-over';}}
 cache.set(item.id,c);return c;
}
export function drawOutfit(g,animal,outfit,x,y,w=16,h=16,face='right'){
 if(!outfit||!Object.keys(outfit).length)return;
 g.save();g.translate(x+(face==='left'?w:0),y);if(face==='left')g.scale(-1,1);g.imageSmoothingEnabled=false;
 for(const slot of ['pants','shirt','hat']){const item=CLOTHES.find(c=>c.id===outfit?.[slot]&&c.animal===animal);if(item)g.drawImage(garmentCanvas(item),0,0,w,h);}g.restore();
}
export function outfitPreview(item){const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const base=SPRITES[item.animal]?.idle?.r||SPRITES[item.animal]?.r[0];if(base)g.drawImage(base,0,0,64,64);g.drawImage(garmentCanvas(item),0,0,64,64);return c.toDataURL();}
export function allGarmentPreviews(){return CLOTHES.map(item=>({...item,image:outfitPreview(item)}));}
