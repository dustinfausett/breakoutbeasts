// Phone/tablet layouts and touch controls in a real browser.
import { chromium, devices, startServer, pageErrors, state, waitFor, Report, SHOTS } from './lib.mjs';

export async function run() {
  const R = new Report('mobile');
  const srv = await startServer();
  const browser = await chromium.launch();
  try {
    for (const [label, dev] of [['phone-portrait', devices['iPhone 13']], ['phone-landscape', devices['iPhone 13 landscape']], ['tablet', devices['iPad (gen 7)']]]) {
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
      await page.screenshot({ path: `${SHOTS}/${label}-game.png` });
      const hudOverflow = await page.evaluate(() => { const r = document.querySelector('#objectives').getBoundingClientRect(); return r.right <= window.innerWidth && r.bottom <= window.innerHeight; });
      R.ok(`${label}: HUD panels stay on screen`, hudOverflow);
      R.ok(`${label}: no page errors`, errs.length === 0, errs.join(' | '));
      await ctx.close();
    }
  } finally { await browser.close(); srv.stop(); }
  return R;
}
if (import.meta.url === `file://${process.argv[1]}`) run().then((r) => process.exit(r.failed ? 1 : 0), (e) => { console.error(e); process.exit(1); });
