// Generated art is kept separate from gameplay coordinates. Atlases are sliced
// only while rendering; collision and vision continue to use the shared tile map.
export const IMAGES={};
export async function loadImages(){
 await Promise.all(['logo','actors','terrain','objects','panel'].map(async name=>{
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
