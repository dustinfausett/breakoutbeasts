// Generated art is kept separate from gameplay coordinates. Atlases are sliced
// only while rendering; collision and vision continue to use the shared tile map.
export const IMAGES={};
export async function loadImages(){
 const names=new URLSearchParams(location.search).get('art')==='detailed'?['car','logo','actors','terrain','objects','panel','walk-animals-a','walk-animals-b']:['logo','car'];
 await Promise.all(names.map(async name=>{
  const image=new Image();image.src=window.__BB_ASSETS__?.[name]||`assets/${name}.png`;
  await image.decode();IMAGES[name]=image;
  document.documentElement.style.setProperty(`--${name}-art`,`url("${image.src}")`);
 }));
}
export function atlasDraw(ctx,image,index,cols,rows,x,y,w,h){
 const sw=image.width/cols,sh=image.height/rows;
 ctx.drawImage(image,(index%cols)*sw,Math.floor(index/cols)*sh,sw,sh,x,y,w,h);
}
export function objectArt(ctx,index,x,y,w=16,h=16){
 if(!IMAGES.objects)return false;
 atlasDraw(ctx,IMAGES.objects,index,4,4,x,y,w,h);return true;
}

export function carArt(ctx,x,y,w=64,h=48){if(!IMAGES.car)return;ctx.drawImage(IMAGES.car,x,y,w,h);}
