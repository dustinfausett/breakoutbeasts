// Solo flow in a real browser: keyboard-only menus, controls, focus loss, pause, full mission.
import { chromium, startServer, pageErrors, state, waitFor, Report, SHOTS } from './lib.mjs';

export async function run() {
  const R = new Report('solo');
  const srv = await startServer();
  const browser = await chromium.launch();
  try {
    // 1) keyboard-only menu navigation + controls
    const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
    const errs = pageErrors(page, 'solo');
    await page.goto(srv.url + '?test=1&nostaff=1');
    await waitFor(async () => (await state(page)).screen === 'title', { what: 'title' });
    await page.screenshot({ path: `${SHOTS}/desktop-title.png` });
    await page.keyboard.press('Enter'); // focused "Play Solo"
    await waitFor(async () => (await state(page)).screen === 'animals', { what: 'animal screen' });
    await page.keyboard.press('Tab'); // into the grid (first card)
    await page.focus('.animal-card[data-animal="redpanda"]');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); // monkey
    await page.keyboard.press('ArrowDown'); // second row -> meerkat
    const focused = await page.evaluate(() => document.activeElement.dataset.animal);
    R.ok('arrow keys move through the animal grid', focused === 'meerkat', focused);
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); // penguin
    await page.keyboard.press('Enter');
    const detail = await page.textContent('#animal-detail');
    R.ok('selection screen shows ability, limitation and controls', /Ability/.test(detail) && /Limitation/.test(detail) && /Controls/.test(detail));
    await page.screenshot({ path: `${SHOTS}/desktop-animals.png` });
    await page.click('#animals-go');
    await waitFor(async () => (await state(page)).snap, { what: 'game start' });
    await page.waitForTimeout(600);
    const s0 = await state(page);
    const me0 = s0.snap.pl[0];
    R.ok('player starts in the chosen animal\'s enclosure', me0.a === 'penguin' && (me0.s & 2048) !== 0);
    // movement with arrow keys
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500);
    // focus loss must release held keys
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const keysAfterBlur = await page.evaluate(() => window.__bb.input.keys.size);
    await page.waitForTimeout(500);
    const a = (await state(page)).snap.pl[0];
    await page.waitForTimeout(500);
    const b = (await state(page)).snap.pl[0];
    await page.keyboard.up('ArrowRight');
    R.ok('arrow keys move the animal', a.x > me0.x + 0.3, `${me0.x} -> ${a.x}`);
    R.ok('blur releases held keys (no stuck movement)', keysAfterBlur === 0 && Math.abs(b.x - a.x) < 0.05, `keys=${keysAfterBlur} drift=${(b.x - a.x).toFixed(3)}`);
    // WASD
    await page.keyboard.down('KeyS'); await page.waitForTimeout(400); await page.keyboard.up('KeyS');
    const c = (await state(page)).snap.pl[0];
    R.ok('WASD moves the animal', c.y > b.y + 0.2 || c.y !== b.y);
    await page.screenshot({ path: `${SHOTS}/desktop-game-start.png` });
    // pause menu with Escape freezes solo play
    await page.keyboard.press('Escape');
    const t1 = (await state(page)).snap.tick; await page.waitForTimeout(600); const t2 = (await state(page)).snap.tick;
    R.ok('Escape opens the menu and pauses solo play', (await state(page)).overlay === 'pause' && t1 === t2, `ticks ${t1} -> ${t2}`);
    await page.screenshot({ path: `${SHOTS}/desktop-pause.png` });
    await page.click('#pause [data-act="settings"]');
    R.ok('settings has separate music and effects volume, mute and reduced motion', await page.isVisible('#set-music') && await page.isVisible('#set-sfx') && await page.isVisible('#set-mute') && await page.isVisible('#set-motion'));
    await page.check('#set-motion');
    R.ok('reduced motion option applies', await page.evaluate(() => document.body.classList.contains('reduced')));
    await page.screenshot({ path: `${SHOTS}/desktop-settings.png` });
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    R.ok('menus close again with Escape', (await state(page)).overlay === null);
    // the prompt for the ability
    const prompt = await page.textContent('#prompts');
    R.ok('contextual prompts show in the HUD', /Space/.test(prompt), prompt.trim());
    R.ok('no page errors (controls run)', errs.length === 0, errs.join(' | '));
    await page.close();

    // 2) full solo mission with keepers, played by the autopilot through the real client
    for (const animal of ['tortoise', 'monkey']) {
      const p2 = await browser.newPage({ viewport: { width: 1280, height: 760 } });
      const e2 = pageErrors(p2, 'solo-' + animal);
      await p2.goto(srv.url + '?autopilot=1');
      await p2.click('[data-act="solo"]');
      await p2.click(`.animal-card[data-animal="${animal}"]`);
      await p2.click('#animals-go');
      let shots = 0;
      const res = await waitFor(async () => {
        const s = await state(p2);
        if (s.snap && shots < 3 && s.snap.tick > 300 * (shots + 1)) { await p2.screenshot({ path: `${SHOTS}/solo-${animal}-${shots}.png` }); shots++; }
        return s.results;
      }, { timeout: 420000, interval: 1000, what: `${animal} mission complete` }).catch((e) => { R.ok(`${animal} solo mission completes in the browser`, false, e.message); return null; });
      if (res) R.ok(`${animal} solo mission completes in the browser (keepers active)`, true, `time ${res.time}s, caught ${res.captures}x`);
      await p2.screenshot({ path: `${SHOTS}/solo-${animal}-complete.png` });
      R.ok(`mission-complete screen offers replay and lobby`, await p2.isVisible('[data-act="replay"]') && await p2.isVisible('[data-act="to-lobby"]'));
      if (animal === 'monkey' && res) {
        await p2.click('[data-act="replay"]');
        await waitFor(async () => { const s = await state(p2); return s.inGame && !s.results && s.snap && s.snap.tick < 100; }, { what: 'replay start' });
        R.ok('replay starts a fresh mission', true);
      }
      R.ok(`no page errors (${animal})`, e2.length === 0, e2.slice(0, 3).join(' | '));
      await p2.close();
    }
  } finally { await browser.close(); srv.stop(); }
  return R;
}
if (import.meta.url === `file://${process.argv[1]}`) run().then((r) => process.exit(r.failed ? 1 : 0), (e) => { console.error(e); process.exit(1); });
