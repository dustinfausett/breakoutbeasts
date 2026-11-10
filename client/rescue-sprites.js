import {RESCUE_SPECIES} from './shared/rescue-data.js';
export function buildRescueSprites(target,images){
 const atlas=images['rescue-animals'];if(!atlas)return;
 const flip=c=>{const f=document.createElement('canvas');f.width=c.width;f.height=c.height;const g=f.getContext('2d');g.translate(c.width,0);g.scale(-1,1);g.drawImage(c,0,0);return f;};
 RESCUE_SPECIES.forEach((id,index)=>{
  const base=document.createElement('canvas');base.width=32;base.height=32;const g=base.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(atlas,(index%4)*atlas.width/4,Math.floor(index/4)*atlas.height/4,atlas.width/4,atlas.height/4,0,0,32,32);
  const frames=Array.from({length:4},(_,phase)=>{const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const lift=[0,-1,0,1][phase];ctx.drawImage(base,0,0,32,23,0,lift,32,23);for(let x=0;x<32;x+=8){const stride=((x/8)%2?1:-1)*[-2,0,2,0][phase];ctx.drawImage(base,x,23,8,9,x+stride,23-lift,8,9);}return c;});const right=base,left=flip(base);target['rescue_'+id]={r:frames,l:frames.map(flip),idle:{r:right,l:left},run:{r:frames,l:frames.map(flip)}};
 });
}
