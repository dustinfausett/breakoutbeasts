// Export the original, code-drawn wardrobe as 90 reusable PNG sprites and a catalog sheet.
// Uses the same Playwright setup as the browser tests.
import {chromium,startServer} from '../e2e/lib.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const srv=await startServer(),browser=await chromium.launch();
try{const page=await browser.newPage({viewport:{width:1100,height:1500}});await page.goto(srv.url);await page.waitForFunction(()=>!!window.__bb?.app?.renderer);
 const items=await page.evaluate(async()=>{const {allGarmentPreviews}=await import('./clothing.js');return allGarmentPreviews();});const dir=new URL('../client/assets/clothes/',import.meta.url);await mkdir(dir,{recursive:true});for(const item of items)await writeFile(new URL(item.id+'.png',dir),Buffer.from(item.image.split(',')[1],'base64'));
 await writeFile(new URL('catalog.json',dir),JSON.stringify(items.map(({image,...item})=>({...item,file:item.id+'.png'})),null,2)+'\n');
 await page.evaluate(items=>{document.body.innerHTML='<h1>Breakout Beasts · Fitted disguises</h1>';document.documentElement.style='height:auto;overflow:visible';document.body.style='height:auto;min-height:0;overflow:visible;background:#162c32;color:#f6e4b4;font:14px monospace;padding:24px';const grid=document.createElement('div');grid.style='display:grid;grid-template-columns:repeat(9,1fr);gap:8px';document.body.append(grid);for(const item of items){const c=document.createElement('div');c.style='padding:6px;background:#29434a;text-align:center';const img=document.createElement('img');img.src=item.image;img.style='width:80px;height:80px;image-rendering:pixelated';const label=document.createElement('p');label.textContent=item.name;c.append(img,label);grid.append(c);}},items);
 await page.screenshot({path:new URL('catalog.png',dir).pathname,fullPage:true});console.log(`Exported ${items.length} fitted garments and catalog.png`);
}finally{await browser.close();srv.stop();}
