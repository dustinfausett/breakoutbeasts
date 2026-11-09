import {chromium,startServer,Report,SHOTS,pageErrors} from './lib.mjs';
export async function run(){
 const R=new Report('animation'),srv=await startServer(),browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=pageErrors(page,'walk cycles');await page.goto(srv.url);
  const classic=await page.evaluate(async()=>{const {IMAGES,loadImages}=await import('./assets.js');const {SPRITES,buildSprites}=await import('./sprites.js');await loadImages();buildSprites();return !IMAGES.actors&&!IMAGES.terrain&&SPRITES.redpanda.r[0].width===16&&!!SPRITES.staffDown&&IMAGES.logo.naturalWidth>500;});
  R.ok('classic characters remain the default while the generated logo loads',classic);
  await page.goto(srv.url+'?art=detailed');
  const result=await page.evaluate(async()=>{
   const {loadImages}=await import('./assets.js'),{buildSprites,SPRITES}=await import('./sprites.js'),{Renderer}=await import('./render.js');
   await loadImages();buildSprites();
   const ids=['redpanda','elephant','monkey','beaver','giraffe','penguin','zebra','meerkat','tortoise','flamingo','staff'];
   const renderer=Object.create(Renderer.prototype);renderer.settings={reducedMotion:false};
   const frames=ids.every(id=>SPRITES[id].r.length===4&&SPRITES[id].l.length===4);
   const distinct=ids.every(id=>new Set(SPRITES[id].r.map(c=>c.toDataURL())).size===4);
   const loop=ids.every(id=>{
    const interval=id==='tortoise'?200:id==='staff'?115:140,set=SPRITES[id];
    return [0,1,2,3,4].every(i=>renderer._sprite(id,'right',true,i*interval)===set.r[i%4])&&renderer._sprite(id,'left',true,interval)===set.l[1];
   });
   const idle=ids.every(id=>renderer._sprite(id,'right',false,0)===renderer._sprite(id,'right',false,500));
   renderer.settings.reducedMotion=true;
   const reduced=ids.every(id=>renderer._sprite(id,'right',true,0)===renderer._sprite(id,'right',true,500));
   document.body.innerHTML='<h1>Breakout Beasts · Walking frames</h1>';document.body.style='background:#172d32;color:#ffe6aa;font:16px sans-serif;padding:20px';
   const grid=document.createElement('div');grid.style='display:grid;grid-template-columns:repeat(3,1fr);gap:12px';document.body.append(grid);
   for(const id of ids){const row=document.createElement('div');row.style='background:#294348;padding:10px';row.textContent=id;const c=document.createElement('canvas');c.width=320;c.height=82;c.style='width:100%;image-rendering:pixelated';const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;SPRITES[id].r.forEach((f,i)=>ctx.drawImage(f,i*80,0,80,80));row.append(c);grid.append(row);}
   return {frames,distinct,loop,idle,reduced};
  });
  R.ok('all ten animals and the human keeper have four frames in both directions',result.frames);
  R.ok('every walking pose is distinct for every character',result.distinct);
  R.ok('movement cycles through all four frames and loops in both directions',result.loop);
  R.ok('idle characters do not cycle their walking frames',result.idle);
  R.ok('reduced motion stops the walk cycle',result.reduced);
  R.ok('walking artwork loads without browser errors',!errors.length,errors.join(' | '));
  await page.screenshot({path:`${SHOTS}/walking-sprites.png`,fullPage:true});
 }finally{await browser.close();srv.stop();}return R;
}
if(import.meta.url===`file://${process.argv[1]}`)run().then(r=>process.exit(r.failed?1:0),e=>{console.error(e);process.exit(1)});
