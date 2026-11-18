import {MONSTER_IDS} from './shared/monster-skins.js';
import {CLOTHES} from './shared/wardrobe.js';
function mirror(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.translate(c.width,0);g.scale(-1,1);g.drawImage(image,0,0);return c;}
function fallback(g,row,frame){const colors=['#86ab45','#9a65a5','#c68245','#669fa8'];const step=[0,-2,0,2,1,0][frame];g.fillStyle='#26303c';g.fillRect(7,5,18,17);g.fillStyle=colors[row];g.fillRect(8,6,16,15);g.fillStyle=['#a84d53','#3e8582','#5c7696','#755179'][row];g.fillRect(10,20,12,7);g.fillStyle=colors[row];g.fillRect(6,18,4,8-step);g.fillRect(22,18,4,8+step);g.fillRect(10+step,26,5,5);g.fillRect(18-step,26,5,5);g.fillStyle='#ffe895';g.fillRect(10,9,6,6);g.fillRect(19,11,3,3);g.fillStyle='#25202e';g.fillRect(13,11,2,3);g.fillRect(12,17,10,2);g.fillStyle='#efe7b5';g.fillRect(14,17,2,3);g.fillRect(19,17,2,3);if(row===1){g.fillStyle='#9f477c';g.fillRect(3,4,6,7);g.fillRect(24,4,6,8);}}
export function buildMonsterSprites(sprites,images){const atlas=images['secret-monsters'];
 for(const [row,id] of MONSTER_IDS.entries()){
  const frames=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=32;c.height=32;const g=c.getContext('2d');g.imageSmoothingEnabled=false;if(atlas)g.drawImage(atlas,i*atlas.width/6,row*atlas.height/4,atlas.width/6,atlas.height/4,0,0,32,32);else fallback(g,row,i);return c;});
  const run=frames.slice(1,5);sprites[id]={r:run,l:run.map(mirror),idle:{r:frames[0],l:mirror(frames[0])},walk:{r:run,l:run.map(mirror)},run:{r:run,l:run.map(mirror)},bite:{r:[frames[0],frames[5]],l:[mirror(frames[0]),mirror(frames[5])]}};
 }
}
export function drawMonsterOutfit(g,outfit,x,y){
 for(const slot of ['pants','shirt','hat']){const item=CLOTHES.find(c=>c.id===outfit?.[slot]);if(!item)continue;g.fillStyle=item.color;
  if(slot==='hat'){g.fillRect(x-5,y-17,10,3);g.fillRect(x-3,y-20,6,3);g.fillStyle='#e6c37a';g.fillRect(x-4,y-15,8,1);}
  if(slot==='shirt'){g.fillRect(x-4,y-7,8,5);g.fillStyle='#e7d7af';g.fillRect(x,y-6,1,3);}
  if(slot==='pants'){g.fillRect(x-4,y-2,8,3);g.fillStyle='#c5b486';g.fillRect(x-4,y-2,8,1);}
 }
}
