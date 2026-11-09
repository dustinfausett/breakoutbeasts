// Online co-op in real browsers: 4 separate clients through the real server.
import { chromium, startServer, pageErrors, state, waitFor, Report, SHOTS } from './lib.mjs';

export async function run({ players = 4, staff = false } = {}) {
  const R = new Report('multiplayer');
  const srv = await startServer(staff ? {} : { BB_STAFF: '0' });
  const browser = await chromium.launch();
  const names = ['Ana', 'Ben', 'Cy', 'Dee'];
  const animals = ['elephant', 'penguin', 'meerkat', 'flamingo'];
  const pages = []; const errs = [];
  try {
    for (let i = 0; i < players; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
      const p = await ctx.newPage();
      errs.push(pageErrors(p, names[i]));
      await p.goto(srv.url + '?autopilot=1');
      await p.fill('#name', names[i]);
      pages.push(p);
    }
    const [host] = pages;
    await host.click('[data-act="create"]');
    await waitFor(async () => (await state(host)).screen === 'animals', { what: 'host animal screen' });
    await host.click(`.animal-card[data-animal="${animals[0]}"]`);
    await host.click('#animals-go');
    await waitFor(async () => (await state(host)).screen === 'lobby', { what: 'host lobby' });
    const code = (await host.textContent('#lobby-code')).trim();
    R.ok('host gets a shareable room code', /^[A-Z0-9]{5}$/.test(code), code);
    for (let i = 1; i < players; i++) {
      const p = pages[i];
      await p.click('[data-act="join"]');
      await p.fill('#join-code', code.toLowerCase());
      await p.click('[data-act="join-go"]');
      await waitFor(async () => (await state(p)).screen === 'animals', { what: `${names[i]} animal screen` });
      if (i === 1) {
        const takenCls = await p.getAttribute(`.animal-card[data-animal="${animals[0]}"]`, 'class');
        await p.click(`.animal-card[data-animal="${animals[0]}"]`);
        const msg = await p.textContent('#animals-msg');
        R.ok('an animal taken by a teammate cannot be picked', takenCls.includes('taken') && /taken/i.test(msg), msg);
      }
      await p.click(`.animal-card[data-animal="${animals[i]}"]`);
      await p.click('#animals-go');
      await waitFor(async () => (await state(p)).screen === 'lobby', { what: `${names[i]} lobby` });
    }
    await waitFor(async () => (await state(host)).lobby?.players.length === players, { what: 'everyone in lobby' });
    R.ok('start is disabled until everyone is ready', await host.isDisabled('#lobby-start'));
    await host.screenshot({ path: `${SHOTS}/lobby-${players}p.png` });
    // fifth player
    if (players === 4) {
      const ctx = await browser.newContext(); const p5 = await ctx.newPage();
      await p5.goto(srv.url + `?room=${code}`);
      await p5.fill('#join-code', code);
      await p5.click('[data-act="join-go"]');
      await waitFor(async () => (await p5.textContent('#join-msg')).length > 0, { what: 'room full message' });
      const m = await p5.textContent('#join-msg');
      R.ok('a fifth player cannot join a full room', /full/i.test(m), m);
      await p5.screenshot({ path: `${SHOTS}/room-full.png` });
      await ctx.close();
    }
    for (let i = 1; i < players; i++) await pages[i].click('#lobby-ready');
    await waitFor(async () => !(await host.isDisabled('#lobby-start')), { what: 'start enabled' });
    const nonHostStart = await pages[1].isVisible('#lobby-start');
    R.ok('only the host sees the start button', !nonHostStart);
    await host.click('#lobby-start');
    await waitFor(async () => { for (const p of pages) { const s = await state(p); if (!s.snap) return false; } return true; }, { what: 'all in game' });
    const s0 = await state(host);
    R.ok(`${players} players get ${players} power parts and ${players} keys`, s0.snap.obj.power.parts.length === players && s0.snap.obj.keys.need === players);
    R.ok('each part is assigned to a different player\'s animal', new Set(s0.snap.obj.power.parts.map((p) => p.animal)).size === players);
    // consistency: compare digests for common ticks
    await new Promise((r) => setTimeout(r, 6000));
    const hist = await Promise.all(pages.map((p) => p.evaluate(() => window.__bb.history)));
    const common = Object.keys(hist[0]).filter((t) => hist.every((h) => h[t]));
    const mismatched = common.filter((t) => hist.some((h) => h[t] !== hist[0][t]));
    R.ok('all clients see identical world state for the same tick', common.length > 20 && mismatched.length === 0, `${common.length} common ticks, ${mismatched.length} mismatched`);
    await host.screenshot({ path: `${SHOTS}/mp-ingame-host.png` });
    await pages[players - 1].screenshot({ path: `${SHOTS}/mp-ingame-p${players}.png` });
    // disconnect + reconnect
    const victim = pages[players - 1];
    await victim.evaluate(() => window.__bb.dropConnection());
    await waitFor(async () => host.isVisible('#waiting'), { what: 'waiting banner', timeout: 10000 });
    const banner = await host.textContent('#waiting');
    R.ok('teammates see who disconnected and can choose to continue without them', /Waiting for/.test(banner) && /Continue without/.test(banner), banner.replace(/\s+/g, ' ').slice(0, 90));
    await host.screenshot({ path: `${SHOTS}/mp-waiting.png` });
    await waitFor(async () => (await state(victim)).conn === 'open' && !(await host.isVisible('#waiting')), { what: 'reconnect', timeout: 20000 });
    R.ok('the dropped client reconnects automatically and the banner clears', true);
    // finish
    let lastReport=0;
    const res = await waitFor(async () => {
      const s=await state(host);
      if(Date.now()-lastReport>20000){
        lastReport=Date.now();
        const bots=await Promise.all(pages.map(p=>p.evaluate(()=>window.__bb.botState?.())));
        console.log('Mission progress',JSON.stringify({tick:s.snap?.tick,rescued:s.snap?.obj.rescue.n,powered:s.snap?.obj.power.done,exitOpen:s.snap?.obj.exit.open,players:s.snap?.pl.map(p=>({animal:p.a,x:p.x,y:p.y})),bots}));
      }
      return s.results;
    }, { timeout: 400000, interval: 1000, what: 'mission complete' }).catch((e) => { R.ok('online mission completes', false, e.message); return null; });
    if (res) {
      const all = await Promise.all(pages.map((p) => state(p)));
      R.ok('online team completes the mission; every client shows the same results', all.every((s) => JSON.stringify(s.results) === JSON.stringify(res)), `time ${res.time}s`);
      await host.screenshot({ path: `${SHOTS}/mp-complete-host.png` });
      await pages[1].screenshot({ path: `${SHOTS}/mp-complete-guest.png` });
      R.ok('guests wait for the host after the mission', !(await pages[1].isVisible('[data-act="replay"]')) && /host/i.test(await pages[1].textContent('#complete-msg')));
      await host.click('[data-act="to-lobby"]');
      await waitFor(async () => { for (const p of pages) if ((await state(p)).screen !== 'lobby') return false; return true; }, { what: 'back to lobby' });
      R.ok('host returns everyone to the lobby', true);
      // host leaves: host passes on
      await host.click('[data-act="lobby-leave"]');
      await waitFor(async () => { const s = await state(pages[1]); return s.lobby && s.lobby.players.length === players - 1 && s.lobby.hostId === s.myId; }, { what: 'host migration' });
      R.ok('when the host leaves, the next player becomes host', true);
    }
    const allErrs = errs.flat();
    R.ok('no page errors in any client', allErrs.length === 0, allErrs.slice(0, 3).join(' | '));
  } finally { await browser.close(); srv.stop(); }
  return R;
}
if (import.meta.url === `file://${process.argv[1]}`) run({ players: Number(process.argv[2] || 4) }).then((r) => process.exit(r.failed ? 1 : 0), (e) => { console.error(e); process.exit(1); });
