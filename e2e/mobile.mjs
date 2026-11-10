// Phone/tablet layouts and touch controls in a real browser.
import { chromium, devices, startServer, pageErrors, state, waitFor, Report, SHOTS } from './lib.mjs';

export async function run() {
  const R = new Report('mobile');
  const srv = await startServer();
  const browser = await chromium.launch();
  try {
    for (const [label, dev] of [['phone-portrait', devices['iPhone 13']], ['phone-landscape', devices['iPhone 13 landscape']], ['tablet', devices['iPad (gen 7)']], ['tablet-landscape', devices['iPad (gen 7) landscape']]]) {
      const ctx = await browser.newContext({ ...dev });
      const page = await ctx.newPage();
      const errs = pageErrors(page, label);
      await page.goto(srv.url + '?test=1&nostaff=1');
      await waitFor(async () => (await state(page)).screen === 'title', { what: 'title' });
      await page.screenshot({ path: `${SHOTS}/${label}-title.png` });
      const noHScroll = await page.evaluate(() => document.querySelector('#title').scrollWidth <= window.innerWidth + 1);
      R.ok(`${label}: title fits the screen width`, noHScroll);
      await page.tap('[data-act="solo"]');
      await page.tap('.animal-card[data-animal="zebra"]');
      await page.screenshot({ path: `${SHOTS}/${label}-animals.png` });
      await page.tap('#animals-go');
      await waitFor(async () => (await state(page)).snap, { what: 'game' });
      await page.waitForTimeout(800);
      R.ok(`${label}: objectives are hidden behind a compact button`,await page.locator('#objectives').isHidden()&&await page.locator('#objectives-toggle').isVisible());
      const canvasBefore=await page.locator('#game').boundingBox();
      await page.tap('#objectives-toggle');R.ok(`${label}: objectives open when tapped`,await page.locator('#objectives').isVisible()&&await page.locator('#objectives-toggle').getAttribute('aria-expanded')==='true');
      await page.tap('#objectives-toggle');R.ok(`${label}: a second tap hides objectives`,await page.locator('#objectives').isHidden());
      const fit=await page.evaluate(()=>{const r=document.querySelector('#game').getBoundingClientRect(),v=visualViewport;return Math.abs(r.width-v.width)<1&&Math.abs(r.height-v.height)<1;});
      R.ok(`${label}: the playfield fills the visible viewport`,fit);
      const canvasAfter=await page.locator('#game').boundingBox();R.ok(`${label}: opening objectives does not shrink the playfield`,canvasBefore.width===canvasAfter.width&&canvasBefore.height===canvasAfter.height);
      R.ok(`${label}: team stats and caption panels stay off the playfield`,await page.locator('#team').isHidden()&&await page.locator('#captions').isHidden());
      const controlsFit=await page.evaluate(()=>{const ids=['#stick','#tbtn-e','#tbtn-sp','#tbtn-b'],rs=ids.map(id=>document.querySelector(id).getBoundingClientRect());return rs.every(r=>r.left>=0&&r.top>=0&&r.right<=visualViewport.width&&r.bottom<=visualViewport.height)&&rs.every((r,i)=>rs.every((b,j)=>i===j||r.right<=b.left||b.right<=r.left||r.bottom<=b.top||b.bottom<=r.top));});
      R.ok(`${label}: joystick and action buttons fit without overlapping`,controlsFit);
      R.ok(`${label}: touch controls are shown`, await page.isVisible('#stick') && await page.isVisible('#tbtn-e') && await page.isVisible('#tbtn-sp'));
      // drive the stick with touch-style pointer events
      const box = await page.locator('#stick').boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const before = (await state(page)).snap.pl[0];
      await page.dispatchEvent('#stick', 'pointerdown', { pointerId: 7, clientX: cx, clientY: cy, isPrimary: true, pointerType: 'touch' });
      await page.dispatchEvent('#stick', 'pointermove', { pointerId: 7, clientX: cx - box.width / 2, clientY: cy, isPrimary: true, pointerType: 'touch' });
      await page.waitForTimeout(700);
      const mid = (await state(page)).snap.pl[0];
      // interrupted touch: pointercancel must release
      await page.dispatchEvent('#stick', 'pointercancel', { pointerId: 7, pointerType: 'touch' });
      await page.waitForTimeout(400);
      const a = (await state(page)).snap.pl[0];
      await page.waitForTimeout(500);
      const b = (await state(page)).snap.pl[0];
      R.ok(`${label}: the joystick moves the animal`, mid.x < before.x - 0.3, `${before.x} -> ${mid.x}`);
      R.ok(`${label}: an interrupted touch does not leave movement stuck`, Math.abs(b.x - a.x) < 0.05, `drift ${(b.x - a.x).toFixed(3)}`);
      // ability button
      await page.dispatchEvent('#tbtn-sp', 'pointerdown', { pointerId: 9, pointerType: 'touch' });
      await page.waitForTimeout(120);
      await page.dispatchEvent('#tbtn-sp', 'pointerup', { pointerId: 9, pointerType: 'touch' });
      await page.waitForTimeout(300);
      const t = await page.evaluate(() => window.__bb.input.touch);
      R.ok(`${label}: ability button presses and releases`, t.sp === false);
      await page.dispatchEvent('#tbtn-b','pointerdown',{pointerId:10,pointerType:'touch'});
      await page.waitForTimeout(120);await page.dispatchEvent('#tbtn-b','pointercancel',{pointerId:10,pointerType:'touch'});
      R.ok(`${label}: bite touch control releases on cancellation`,await page.evaluate(()=>!window.__bb.input.touch.b));
      await page.screenshot({ path: `${SHOTS}/${label}-game.png` });
      const hudOverflow = await page.evaluate(() => { const r = document.querySelector('#objectives').getBoundingClientRect(); return r.right <= window.innerWidth && r.bottom <= window.innerHeight; });
      R.ok(`${label}: HUD panels stay on screen`, hudOverflow);
      R.ok(`${label}: no page errors`, errs.length === 0, errs.join(' | '));
      if(label==='phone-portrait'){
        await page.tap('#objectives-toggle');
        const stick=await page.locator('#stick').boundingBox(),x=stick.x+stick.width/2,y=stick.y+stick.height/2;
        await page.dispatchEvent('#stick','pointerdown',{pointerId:21,clientX:x,clientY:y,pointerType:'touch'});await page.dispatchEvent('#stick','pointermove',{pointerId:21,clientX:x-stick.width/2,clientY:y,pointerType:'touch'});
        await page.setViewportSize({width:844,height:390});await page.waitForTimeout(450);
        R.ok('rotation closes objectives and releases the joystick',await page.locator('#objectives').isHidden()&&await page.evaluate(()=>window.__bb.input.touch.mx===0&&window.__bb.input.touch.my===0));
        const beforeRotateStop=(await state(page)).snap.pl[0];await page.waitForTimeout(450);const afterRotateStop=(await state(page)).snap.pl[0];R.ok('rotation does not leave movement stuck',Math.hypot(afterRotateStop.x-beforeRotateStop.x,afterRotateStop.y-beforeRotateStop.y)<.05);
        const scale=await page.evaluate(()=>window.__bb.app.renderer.scale/window.__bb.app.renderer.dpr*16);R.ok('landscape keeps animals a readable size',scale>=28);
        await page.screenshot({path:`${SHOTS}/phone-rotated-landscape.png`});
        await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);R.ok('rotating back preserves a full-sized playfield',await page.evaluate(()=>Math.abs(document.querySelector('#game').getBoundingClientRect().height-visualViewport.height)<1));
      }
      await ctx.close();
    }
  } finally { await browser.close(); srv.stop(); }
  return R;
}
if (import.meta.url === `file://${process.argv[1]}`) run().then((r) => process.exit(r.failed ? 1 : 0), (e) => { console.error(e); process.exit(1); });
