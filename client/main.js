// Breakout Beasts! client controller: menus, lobby, HUD, game loop, audio and captions.

import { mountControlPanel, updateControlPanel, addPanelChat } from './control-panel.js';
import { IMAGES, loadImages } from './assets.js';
import { ANIMALS, ANIMAL_IDS } from './shared/animals.js';
import { getZoo } from './shared/zoos/index.js';
import { PF, TICK } from './shared/game.js';
import { EMOTES } from './shared/room.js';
import { Autopilot } from './shared/bot.js';
import { buildSprites, portraitURL } from './sprites.js';
import { Renderer } from './render.js';
import { ClientWorld } from './world.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { SoloLink, OnlineLink } from './net.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const AUTOPILOT = params.get('autopilot') === '1';

// ---------------- settings ----------------
const DEFAULTS = { music: 40, sfx: 70, mute: false, motion: false, captions: true, bigtext: false, hard: false, touch: 'auto' };
function loadSettings() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('bb-settings') || '{}') }; } catch { return { ...DEFAULTS }; } }
function saveSettings() { try { localStorage.setItem('bb-settings', JSON.stringify(settings)); } catch { /* storage unavailable */ } }
const settings = loadSettings();
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && localStorage.getItem('bb-settings') === null) settings.motion = true;

// ---------------- app state ----------------
const app = {
  screen: 'loading', overlay: null, link: null, mode: null, myId: null, lobby: null,
  world: null, renderer: null, pickAnimal: null, inGame: false, results: null, paused: false,
  seq: 0, tickAcc: 0, lastFrame: performance.now(), hudT: 0, footT: 0, bot: null, connState: 'open',
  lastNotice: '', hintShown: false, teamClues:{}, lastRelay:0,
};
const input = new Input();
const audio = new Audio();
window.__bb = { app, settings };

// ---------------- screens ----------------
const BASE = ['loading', 'title', 'join', 'animals', 'lobby', 'hud'];
function show(id) {
  for (const s of BASE) $('#' + s).classList.toggle('show', s === id);
  app.screen = id;
  input.enabled = id === 'hud' && !app.overlay;
  const first = $('#' + id + ' [autofocus], #' + id + ' .btn.primary:not([disabled]), #' + id + ' .btn');
  if (id !== 'hud' && first) setTimeout(() => first.focus({ preventScroll: true }), 30);
}
function overlay(id) {
  for (const s of ['pause', 'settings', 'help', 'complete', 'conn']) $('#' + s).classList.toggle('show', s === id);
  app.overlay = id;
  input.enabled = app.screen === 'hud' && !id;
  if (id) { input.releaseAll(); const b = $('#' + id + ' .btn.primary') || $('#' + id + ' .btn'); if (b) setTimeout(() => b.focus({ preventScroll: true }), 30); }
}
let overlayReturn = null;

function applySettings() {
  audio.set({ musicVol: settings.music / 100, sfxVol: settings.sfx / 100, muted: settings.mute });
  document.body.classList.toggle('reduced', settings.motion);
  document.body.classList.toggle('bigtext', settings.bigtext);
  const touchOn = settings.touch === 'on' || (settings.touch === 'auto' && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window));
  document.body.classList.toggle('touch-on', touchOn);
  if (app.renderer) {app.renderer.settings.reducedMotion = settings.motion;app.renderer.settings.hard=settings.hard;}
  $('#title-hard').checked=settings.hard;$('#join-hard').checked=settings.hard;
}

function caption(text, cls = '', sound = false) {
  if (sound && !settings.captions) return;
  const box = $('#captions');
  const d = document.createElement('div');
  d.className = 'cap ' + cls + (sound ? ' sound' : '');
  d.textContent = text;
  box.appendChild(d);
  while (box.children.length > (innerWidth < 760 || innerHeight < 520 ? 2 : 4)) box.firstChild.remove();
  setTimeout(() => d.remove(), sound ? 2200 : 4200);
}

// ---------------- title ----------------
function buildTitle() {
  document.querySelectorAll('.pixel-logo').forEach(img=>img.src=IMAGES.logo.src);
  const parade = $('#title-parade');
  parade.innerHTML = '';
  for (const id of ANIMAL_IDS) { const img = document.createElement('img'); img.src = portraitURL(id); img.alt = ''; parade.appendChild(img); }
  try { $('#name').value = localStorage.getItem('bb-name') || '';$('#join-name').value=$('#name').value; } catch { /* */ }
}
function myName(source='#name') {
  const n = $(source).value.trim();
  $('#name').value=n;$('#join-name').value=n;
  try { localStorage.setItem('bb-name', n); } catch { /* */ }
  return n;
}

// ---------------- animal select ----------------
function takenAnimals() {
  if (!app.lobby) return {};
  const t = {};
  for (const p of app.lobby.players) if (p.animal && p.id !== app.myId) t[p.animal] = p.name;
  return t;
}
function buildAnimals() {
  const grid = $('#animal-grid');
  grid.innerHTML = '';
  const taken = takenAnimals();
  ANIMAL_IDS.forEach((id, i) => {
    const a = ANIMALS[id];
    const b = document.createElement('button');
    b.className = 'animal-card' + (app.pickAnimal === id ? ' sel' : '') + (taken[id] ? ' taken' : '');
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', app.pickAnimal === id ? 'true' : 'false');
    b.dataset.animal = id;
    b.tabIndex = (app.pickAnimal ? app.pickAnimal === id : i === 0) ? 0 : -1;
    b.setAttribute('aria-label', `${a.name}, ${a.difficulty}. ${a.ability}. ${taken[id] ? 'Taken by ' + taken[id] : ''}`);
    b.innerHTML = `${taken[id] ? `<span class="tk">Taken: ${esc(taken[id])}</span>` : ''}<img src="${portraitURL(id)}" alt=""><span class="nm">${a.name}</span><span class="df ${a.difficulty}">${a.difficulty}</span>`;
    b.addEventListener('click', () => selectAnimal(id));
    b.addEventListener('focus', () => showDetail(id));
    grid.appendChild(b);
  });
  showDetail(app.pickAnimal || ANIMAL_IDS[0]);
  $('#animals-go').disabled = !app.pickAnimal || !!taken[app.pickAnimal];
  $('#animals-go').textContent = app.mode === 'solo' ? 'Start mission' : 'Continue to lobby';
  $('#animals-sub').textContent = app.mode === 'solo' ? 'Solo play · Moonleaf Zoo' : `Room ${app.lobby?.code || ''} · each animal can only be picked once`;
}
function showDetail(id) {
  const a = ANIMALS[id];
  const taken = takenAnimals();
  $('#animal-detail').innerHTML = `<img src="${portraitURL(id, 6)}" alt="${a.name}">
    <div><h3 style="margin:0">${a.name} <span class="df ${a.difficulty}" style="font-size:.7em">${a.difficulty}</span>${taken[id] ? ` <span class="pill off">Taken by ${esc(taken[id])}</span>` : ''}</h3>
    <p><span class="tag">Ability — ${a.ability}:</span> ${a.abilityText}</p>
    <p><span class="tag">Limitation:</span> ${a.limitText}</p>
    <p><span class="tag">Controls:</span> ${a.controls}</p></div>`;
}
function selectAnimal(id) {
  if (takenAnimals()[id]) { $('#animals-msg').textContent = `${ANIMALS[id].name} is already taken.`; audio.play('error'); return; }
  app.pickAnimal = id;
  $('#animals-msg').textContent = '';
  audio.play('select');
  buildAnimals();
  const card = $(`.animal-card[data-animal="${id}"]`); if (card) card.focus();
}
$('#animal-grid').addEventListener('keydown', (e) => {
  const cards = [...document.querySelectorAll('.animal-card')];
  const i = cards.indexOf(document.activeElement);
  if (i < 0) return;
  const cols = getComputedStyle($('#animal-grid')).gridTemplateColumns.split(' ').length;
  let j = i;
  if (e.key === 'ArrowRight') j = Math.min(cards.length - 1, i + 1);
  else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
  else if (e.key === 'ArrowDown') j = Math.min(cards.length - 1, i + cols);
  else if (e.key === 'ArrowUp') j = Math.max(0, i - cols);
  else return;
  e.preventDefault();
  cards.forEach((c) => (c.tabIndex = -1)); cards[j].tabIndex = 0; cards[j].focus();
});

// ---------------- lobby ----------------
function renderLobby() {
  const L = app.lobby;
  if (!L) return;
  $('#lobby-code').textContent = L.code;
  const ul = $('#lobby-players');
  ul.innerHTML = '';
  for (let i = 0; i < L.max; i++) {
    const p = L.players[i];
    const li = document.createElement('li');
    if (!p) { li.className = 'empty'; li.innerHTML = `<div><b>Open slot</b><div class="st">Share the room code to invite a friend</div></div>`; ul.appendChild(li); continue; }
    const a = p.animal ? ANIMALS[p.animal] : null;
    li.innerHTML = `${a ? `<img src="${portraitURL(p.animal)}" alt="">` : '<div style="width:56px;height:56px;border:2px dashed #2a1d10;border-radius:6px"></div>'}
      <div><b>${esc(p.name)}${p.id === app.myId ? ' (you)' : ''}</b>
      <div class="st">${a ? a.name + ' · ' + a.difficulty : 'Choosing an animal…'}</div>
      <div>${p.host ? '<span class="pill host">Host</span>' : ''}${!p.connected ? '<span class="pill off">Reconnecting…</span>' : p.host ? '' : p.ready ? '<span class="pill ready">Ready ✓</span>' : '<span class="pill notready">Not ready</span>'}</div></div>`;
    ul.appendChild(li);
  }
  const me = L.players.find((p) => p.id === app.myId);
  const isHost = L.hostId === app.myId;
  $('#lobby-ready').hidden = isHost;
  $('#lobby-ready').textContent = me?.ready ? 'Not ready' : "I'm ready";
  $('#lobby-start').hidden = !isHost;
  const n = L.players.length;
  const blockers = L.players.filter((p) => !p.animal || (!p.host && !p.ready) || !p.connected);
  $('#lobby-start').disabled = blockers.length > 0;
  $('#lobby-info').textContent = (isHost ? (blockers.length ? `Waiting for ${blockers.map((p) => p.name).join(', ')}.` : 'Everyone is ready — start when you like!') : 'The host starts the mission when everyone is ready.') +
    ` With ${n} player${n > 1 ? 's' : ''}, the generator needs ${n} fuse${n > 1 ? 's' : ''} and the exit needs ${n} key${n > 1 ? 's' : ''} turned together.`;
}

// ---------------- messages ----------------
function onMessage(msg) {
  switch (msg.t) {
    case 'joined':
      app.myId = msg.you;
      if (msg.resumed) { overlay(app.inGame ? null : app.overlay === 'conn' ? null : app.overlay); caption('Reconnected!', 'good'); }
      break;
    case 'lobby': {
      const prev = app.lobby;
      app.lobby = msg;
      if (app.screen === 'animals') buildAnimals();
      if (app.screen === 'lobby') renderLobby();
      if (msg.phase === 'lobby' && app.inGame) leaveGameView(true);
      if (!prev && app.mode !== 'solo' && msg.phase === 'lobby') {
        const me = msg.players.find((p) => p.id === app.myId);
        if (me && me.animal) { show('lobby'); renderLobby(); } else { show('animals'); buildAnimals(); }
      }
      if (app.mode === 'solo' && msg.phase === 'lobby' && app.screen !== 'animals' && !app.inGame) { show('animals'); buildAnimals(); }
      break;
    }
    case 'start': enterGame(msg); break;
    case 'snap': onSnap(msg); break;
    case 'end': onEnd(msg.results); break;
    case 'notice': if (msg.text !== app.lastNotice) { caption(msg.text); app.lastNotice = msg.text; setTimeout(() => (app.lastNotice = ''), 2000); } if (app.screen === 'lobby') $('#lobby-msg').textContent = ''; break;
    case 'error': onError(msg); break;
  }
}

function onError(msg) {
  audio.play('error');
  if (['room_full', 'not_found', 'in_progress', 'expired'].includes(msg.code)) {
    if (app.link) { app.link.closedByUser = true; try { app.link.ws?.close(); } catch { /* */ } }
    app.link = null;
    if (msg.code === 'expired' && app.screen !== 'join') { show('title'); $('#title-msg').textContent = msg.message; overlay(null); return; }
    show('join');
    $('#join-msg').textContent = msg.message;
    return;
  }
  const where = { animals: '#animals-msg', lobby: '#lobby-msg', join: '#join-msg', title: '#title-msg' }[app.screen];
  if (where) $(where).textContent = msg.message; else caption(msg.message, 'alert');
}

function connStatus(state, info) {
  app.connState = state;
  if (state === 'reconnecting') { overlay('conn'); $('#conn-h').textContent = 'Connection lost'; $('#conn-text').textContent = `Reconnecting… (${info.left}s left). Your teammates are waiting for you.`; }
  else if (state === 'lost') { overlay('conn'); $('#conn-h').textContent = 'Connection lost'; $('#conn-text').textContent = 'We could not reach the game server. Check your internet connection and try again.'; }
  else if (state === 'open' && app.overlay === 'conn') overlay(null);
}

// ---------------- game ----------------
function enterGame(msg) {
  app.world = new ClientWorld(msg.zoo);
  app.world.myId = app.myId;
  app.renderer.setWorld(app.world);
  app.results = null; app.paused = false; app.hintShown = false;
  app.inGame = true;
  app.bot = AUTOPILOT ? new Autopilot(app.myId) : null;
  buildEmotes();
  overlay(null);
  show('hud');
  $('#captions').innerHTML = '';
  audio.startMusic();
  caption(app.world.zoo.intro);
}

function leaveGameView(toLobby) {
  app.inGame = false;
  updateControlPanel(null);
  app.world = null;
  overlay(null);
  input.releaseAll();
  if (toLobby) { if (app.mode === 'solo') { show('animals'); buildAnimals(); } else { show('lobby'); renderLobby(); } }
}

function onSnap(msg) {
  const w = app.world;
  if (!w) return;
  const first = !w.snap;
  w.applySnap(msg, performance.now());
  if (first) app.renderer.redrawAll();
  if (AUTOPILOT || params.get('test') === '1') {
    // test hook: digest of shared (non-personal) state per tick, for cross-client consistency checks
    const h = window.__bb.history || (window.__bb.history = {});
    h[msg.tick] = JSON.stringify([msg.g, msg.os, msg.cr, msg.pl.map((p) => [p.id, p.x, p.y, p.s]), msg.st, msg.obj.rescue, msg.obj.power.parts.map((p) => p.step)]);
    const ks = Object.keys(h); if (ks.length > 200) delete h[ks[0]];
  }
  for (const ev of msg.ev || []) handleEvent(ev);

}

function nameOf(pid) { return app.world?.snap?.pl.find((p) => p.id === pid)?.n || 'Someone'; }
function nearMe(x, y, r = 12) { const me = app.world?.me(); return me && Math.hypot(me.x - x, me.y - y) < r; }

function handleEvent(ev) {
  if(ev.k==='chat'){addPanelChat(ev);if(AUTOPILOT){const m=/^@panel (p[0-9]+) ([0-9]+) ([0-9]+) ([0-9]+)$/.exec(ev.text);if(m)app.teamClues[m[1]]={target:m[1],index:Number(m[2]),control:Number(m[3]),value:Number(m[4])};}return;}
  const r = app.renderer;
  r.addEvent(ev);
  const mine = ev.pid === app.myId;
  switch (ev.k) {
    case 'msg': caption(ev.text); break;
    case 'gate': if (nearMe(ev.x, ev.y)) { audio.play(ev.open ? 'gate' : 'gateClose'); caption(ev.open ? '[Clank] A gate swings open' : '[Clang] A gate slams shut', '', true); } break;
    case 'alert': audio.play('alert'); caption(`[Whistle!] A keeper spotted ${ev.pid === app.myId ? 'you' : nameOf(ev.pid)}! Run and hide!`, 'alert'); break;
    case 'panelraid': caption('The keepers broke in! Everyone was captured. Your generator and rescues are still complete.', 'alert');break;
    case 'panelready': caption('All operators ready. Power on your panels!', 'good');break;
    case 'bitten': audio.play('crunch');caption('Keeper knocked out! High alert and tranquilizer darts are enabled for the rest of this escape.', 'alert');break;
    case 'muzzleoff': audio.play('rescue');caption(`${ev.name} is free of their muzzle!`, 'good');break;
    case 'tranquilized': audio.play('capture');caption(`${ev.name} was tranquilized and muzzled. A teammate can bite off the muzzle with B.`, 'alert');break;
    case 'dartfired': if(nearMe(ev.x,ev.y,10))caption('[Pfft!] Tranquilizer dart!', 'alert');break;
    case 'nip': audio.play('chew');break;
    case 'gatehit': audio.play('clang'); caption(`[Bang!] Gate hit ${ev.hits}/${ev.needed}. Keepers are coming to check!`, 'alert'); break;
    case 'securityalert': caption(app.world?.snap?.permanent?'HIGH ALERT: keepers are armed for the rest of this escape!':'Zoo alert for 3 minutes: keepers see farther and walk faster!', 'alert'); break;
    case 'damagefound': caption('A keeper found a broken gate and raised the alarm!', 'alert'); break;
    case 'radio': caption('[Radio] Loose animal spotted! All keepers are converging. Break line of sight before hiding.', 'alert'); break;
    case 'suspicious': if (app.world && nearMe(app.world.snap.st[ev.id]?.x || 0, app.world.snap.st[ev.id]?.y || 0, 9)) { audio.play('suspicious'); caption('[Hmm?] A keeper noticed something…', '', true); } break;
    case 'investigate': break;
    case 'capture': audio.play('capture'); caption(mine ? 'You were caught! Back to your enclosure…' : `${ev.name} was caught! Steal a key for their cage or build an escape ramp.`, 'alert'); break;
    case 'rescue': audio.play('rescue'); { const o = app.world?.snap?.obj.rescue; caption(`${ANIMALS[ev.animal].name} is free!${o ? ` (${o.n}/${o.need} needed)` : ''}`, 'good'); } break;
    case 'escaped': audio.play('rescue'); caption(mine ? 'You escaped your enclosure!' : `${ev.name} escaped!`, 'good'); break;
    case 'chewed': audio.play('crunch'); caption('[Crunch] Wood chewed through', '', true); break;
    case 'chew': audio.play('chew'); break;
    case 'kick': audio.play('kick'); caption('[Crash!] Planks kicked down — that was loud', '', true); break;
    case 'climb': audio.play('climb'); break;
    case 'push': audio.play('push'); break;
    case 'reach': audio.play('reach'); break;
    case 'slide': audio.play('slide'); break;
    case 'splash': audio.play('splash'); caption('[Splash]', '', true); break;
    case 'dig': audio.play('dig'); break;
    case 'dug': audio.play('crunch'); break;
    case 'tunnel': audio.play('tunnel'); break;
    case 'shell': audio.play('shell'); break;
    case 'jam': audio.play('gate'); caption('Gate jammed open by a shell!', 'good'); break;
    case 'lookout': audio.play('lookout'); caption(`${mine ? 'You are' : ev.name + ' is'} on lookout — watch for keepers and tell your team what you see!`, 'good'); break;
    case 'sprint': audio.play('sprint'); break;
    case 'pickup': if (mine) audio.play('pickup'); break;
    case 'socket': audio.play('power'); { const o = app.world?.snap?.obj.power; if (o) caption(`Fuse plugged in! (${o.parts.filter((p) => p.done).length}/${o.parts.length})`, 'good'); } break;
    case 'power': audio.play('power'); caption('Power restored! Head to the Exit Plaza and turn the keys together.', 'good'); break;
    case 'exitOpen': audio.play('complete'); caption('The Moonleaf Gate is open! Everyone to the exit!', 'good'); break;
    case 'bayopen': caption(`Bay ${ev.bay + 1} is open!`, 'good'); break;
    case 'rattle': audio.play('clang'); caption('[Clang clang] A bin rattles — keepers will investigate', '', true); break;
    case 'noise': if (nearMe(ev.x, ev.y, 10)) caption('[Noise] Keepers nearby can hear that', '', true); break;
    case 'emote': audio.play('emote'); caption(`${ev.name}: “${ev.text}”`); break;
    case 'adapt': caption('Tasks adjusted for the remaining team. Finished work was kept.', 'good'); break;
    case 'unlock': audio.play('pickup'); break;
    case 'keyturn': audio.play('click'); break;
    case 'complete': audio.play('complete'); break;
    case 'blocked': caption('A keeper bumped into a shell and turned around!', 'good'); break;
    case 'fusereturn': caption('The dropped fuse went back to its bay.', ''); break;
    case 'plate': break;
  }
}

function onEnd(res) {
  updateControlPanel(null);
  app.results = res;
  input.releaseAll();
  const mins = Math.floor(res.time / 60), secs = String(res.time % 60).padStart(2, '0');
  $('#complete-stats').innerHTML = `<p><b>${esc(res.zoo)}</b> escaped in <b>${mins}:${secs}</b></p>
    <p>Animals freed: <b>${res.rescued}/${res.total}</b>${res.rescued === res.total ? ' — every animal is free! ★' : ''}</p>
    <p>Times caught: <b>${res.captures}</b>${res.captures === 0 ? ' — perfectly sneaky! ★' : ''}</p>
    <div class="players">${res.players.map((p) => `<span><img src="${portraitURL(p.animal)}" alt="">${esc(p.name)}${p.active ? '' : ' (left)'}</span>`).join('')}</div>`;
  const isHost = app.lobby?.hostId === app.myId;
  const solo = app.mode === 'solo';
  document.querySelector('[data-act="replay"]').hidden = !isHost;
  document.querySelector('[data-act="to-lobby"]').hidden = !isHost;
  document.querySelector('[data-act="to-lobby"]').textContent = solo ? 'Choose another animal' : 'Return to lobby';
  $('#complete-msg').textContent = isHost ? '' : 'Waiting for the host to play again or return to the lobby…';
  overlay('complete');
}

// ---------------- HUD ----------------
function updateHUD() {
  const w = app.world; if (!w || !w.snap) return;
  const s = w.snap, o = s.obj, me = w.me();
  const ck = (d) => `<span class="mark">${d ? '✓' : '○'}</span>`;
  let h = `<h4 tabindex="0" id="obj-h">Moonleaf Zoo — Objectives</h4><div class="detail">`;
  if(s.permanent) h += '<div class="o">⚠ HIGH ALERT · tranquilizers enabled until the zoo escape ends</div>';
  if(s.security>0) h += `<div class="o">⚠ Zoo alert: ${Math.floor(s.security/60)}:${String(s.security%60).padStart(2,'0')} · wider vision, faster keepers</div>`;
  const myEnc = me ? w.zoo.enclosures.find((e) => e.animal === me.a) : null;
  h += `<div class="o ${o.escape.done ? 'done' : ''}">${ck(o.escape.done)}Escape your enclosures${o.escape.done ? ' — done' : ''}</div>`;
  if (!o.escape.done) for (const p of o.escape.players) h += `<div class="sub ${p.escaped ? 'done' : ''} ${p.name === me?.n ? 'me' : ''}">${p.escaped ? '✓' : '·'} ${esc(p.name)} (${ANIMALS[p.animal].name})${p.escaped ? ' is out' : ''}</div>`;
  h += `<div class="o ${o.rescue.done ? 'done' : ''}">${ck(o.rescue.done)}Free caged animals: ${o.rescue.n}/${o.rescue.need}${o.rescue.done ? ' — done' : ' (steal guard keys for locks, or build escape ramps)'}</div>`;
  const pd = o.power.parts.filter((p) => p.done).length;
  h += `<div class="o ${o.power.done ? 'done' : ''}">${ck(o.power.done)}Restore power in the Maintenance Yard: ${pd}/${o.power.parts.length} fuses</div>`;
  if (!o.power.done) for (const p of o.power.parts) {
    const mine = p.pid === app.myId;
    const who = p.who ? `${esc(p.who)} (${ANIMALS[p.animal].name})` : 'Anyone';
    const step = p.steps[p.step];
    h += `<div class="sub ${p.done ? 'done' : ''} ${mine ? 'me' : ''}">${p.done ? '✓' : mine ? '➤' : '·'} Bay ${p.bay} · ${who}: ${p.done ? 'done' : p.waiting ? 'waiting for them to reconnect' : esc(step?.label || '')}${!p.done ? ` <small>(step ${p.step + 1}/${p.steps.length})</small>` : ''}</div>`;
  }
  h += `<div class="o ${o.keys.done?'done':''}">${ck(o.keys.done)}Control house: five tasks per operator${o.keys.active?'':' (needs power and rescued animals)'}</div>`;
  if(o.control)for(const p of o.control.team)h+=`<div class="sub">${esc(p.name)}: ${p.done}/5 ${p.inside?'· at station':''}</div>`;
  h += `<div class="o ${o.exit.done ? 'done' : ''}">${ck(o.exit.done)}Everyone through the Moonleaf Gate${o.exit.open ? `: ${o.exit.inZone}/${o.exit.need} there` : ''}</div>`;
  h += '</div>';
  let now = '';
  const myPart = o.power.parts.find((p) => p.pid === app.myId && !p.done);
  if (me && (me.s & PF.IN_ENC) && myEnc) now = myEnc.hint;
  else if (o.exit.open) now = 'Everyone to the Moonleaf Gate!';
  else if (o.keys.active) { const station=o.control?.team.find(p=>p.id===app.myId); now = `Enter control-house door ${String.fromCharCode(65+(station?.doorIndex||0))} and read your instructions to your team.`; }
  else if (myPart) now = myPart.steps[myPart.step]?.label || '';
  else if (!o.rescue.done) now = `Free caged animals (${o.rescue.n}/${o.rescue.need})`;
  else if (!o.power.done) now = 'Help teammates restore power';
  h += `<div class="now">➤ ${esc(now)}</div>`;
  const box = $('#objectives');
  if (box.dataset.h !== h) { box.innerHTML = h; box.dataset.h = h; $('#obj-h').onclick = () => box.classList.toggle('collapsed'); }

  // team
  let t = '';
  for (const p of s.pl) {
    let st = 'Free';
    if (!p.act) st = 'Left the mission';
    else if (!p.con) st = 'Offline — reconnecting';
    else if (p.s & PF.CAUGHT) st = 'Caught!';
    else if (p.s & PF.EXIT) st = 'At the exit';
    else if (p.s & PF.IN_ENC) st = p.s & PF.ESCAPED ? 'Back in enclosure' : 'In enclosure';
    else if (p.s & PF.HIDDEN) st = 'Hidden';
    else if (p.s & PF.SHELL) st = 'In shell';
    if(p.mu)st+=' · MUZZLED';
    if (p.c) st += p.c === 'wood' ? ' · log' : ' · fuse';
    if (p.s & PF.GRACE) st += ' · safe';
    t += `<div class="tm ${p.id === app.myId ? 'me' : ''}"><img src="${portraitURL(p.a)}" alt=""><div><b>${esc(p.n)}</b><small>${st}</small></div></div>`;
  }
  if ($('#team').dataset.h !== t) { $('#team').innerHTML = t; $('#team').dataset.h = t; }

  // waiting for reconnect
  const wt = $('#waiting');
  if (s.waiting && s.waiting.length) {
    const html = s.waiting.map((p) => `<div>Waiting for <b>${esc(p.name)}</b> to reconnect (${p.left}s). Their puzzle part is paused.</div><button class="btn small" data-cw="${p.id}">Continue without ${esc(p.name)}</button>`).join('');
    if (wt.dataset.h !== html) { wt.innerHTML = html; wt.dataset.h = html; }
    wt.hidden = false;
  } else wt.hidden = true;

  // prompts
  const pm = s.me;
  updateControlPanel(pm?.control||null);
  let ph = '';
  if (pm) {
    if (pm.pe) ph += `<div class="prompt ${pm.pe.ok ? '' : 'no'}"><kbd>E</kbd> ${esc(pm.pe.t)}</div>`;
    if (pm.ps && (pm.ps.ok || !pm.pe)) ph += `<div class="prompt ${pm.ps.ok ? '' : 'no'}"><kbd>Space</kbd> ${esc(pm.ps.t)}</div>`;
    if(me?.mu)ph+='<div class="prompt no">Muzzled: no biting or chewing. A teammate can bite it off; ask a rescued friend with E.</div>';
    else ph+='<div class="prompt"><kbd>B</kbd> Bite / remove a friend’s muzzle</div>';
    if (pm.grace > 0) ph += `<div class="prompt">Keepers ignore you for ${Math.ceil(pm.grace)}s</div>`;
  } else if (app.inGame) ph = '<div class="prompt">You are watching the mission</div>';
  if ($('#prompts').dataset.h !== ph) { $('#prompts').innerHTML = ph; $('#prompts').dataset.h = ph; }
  if (me) {
    const a = ANIMALS[me.a];
    $('#ab-name').textContent = a.ability;
    const cd = pm ? pm.cd : 0;
    $('#ab-fill').style.height = Math.round((1 - cd) * 100) + '%';
    $('#ab-state').textContent = cd > 0 ? 'Recharging…' : 'Ready · Space';
    $('#tbtn-sp').style.background = cd > 0 ? `conic-gradient(rgba(255,227,106,0.95) ${Math.round((1 - cd) * 360)}deg, rgba(120,110,90,0.85) 0)` : '';
  }
}


function buildEmotes() {
  const box = $('#emotes'); box.innerHTML = '';
  const tog = document.createElement('button'); tog.className = 'btn small emote-toggle'; tog.textContent = '💬 Say'; tog.tabIndex = -1;
  tog.addEventListener('click', () => box.classList.toggle('open')); box.appendChild(tog);
  $('#objectives').classList.toggle('collapsed', document.body.classList.contains('touch-on') || innerWidth < 760);
  EMOTES.forEach((t, i) => { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = `${i + 1} ${t}`; b.tabIndex = -1; b.addEventListener('click', () => { app.link?.send({ t: 'emote', i }); box.classList.remove('open'); }); box.appendChild(b); });
}

// ---------------- loop ----------------
function frame(now) {
  const dt = Math.min(0.1, (now - app.lastFrame) / 1000);
  app.lastFrame = now;
  if (app.inGame && app.world) {
    app.tickAcc += dt;
    while (app.tickAcc >= TICK) { app.tickAcc -= TICK; gameTick(); }
    const local = app.world.localPos(now);
    app.renderer.draw(now, dt, { local });
    app.hudT -= dt;
    if (app.hudT <= 0) { app.hudT = 0.1; updateHUD(); }
    // footsteps
    const me = app.world.me();
    if (me && me.mv) { app.footT -= dt; if (app.footT <= 0) { audio.play('foot'); app.footT = me.a === 'tortoise' ? 0.6 : 0.3; } }
  }
  requestAnimationFrame(frame);
}

function gameTick() {
  const w = app.world;
  if (!w.snap || app.paused) return;
  let inp;
  if (app.bot && w.snap.me) inp = app.bot.update(clientView(), TICK);
  else inp = (app.overlay && app.overlay !== 'complete') ? { mx: 0, my: 0, sp: false, e: false } : input.state();
  if (app.overlay === 'complete') inp = { mx: 0, my: 0, sp: false, e: false };
  if(inp.panel)app.link?.send({t:'panel',...inp.panel});
  if(AUTOPILOT&&w.snap.me?.control?.instruction&&performance.now()-app.lastRelay>500){
    const c=w.snap.me.control.instruction;app.lastRelay=performance.now();
    app.link?.send({t:'chat',text:`@panel ${c.target} ${c.index} ${c.control} ${c.value}`});
    if(c.target===app.myId)app.teamClues[c.target]=c;
  }
  app.seq++;
  const msg = { t: 'in', s: app.seq, mx: Math.round(inp.mx * 100) / 100, my: Math.round(inp.my * 100) / 100, sp: inp.sp ? 1 : 0, e: inp.e ? 1 : 0, b:inp.b?1:0 };
  app.link?.send(msg);
  w.predictStep({ seq: app.seq, mx: msg.mx, my: msg.my });
}

function clientView() {
  const w = app.world, s = w.snap, d = w.defs, me = w.me();
  return {
    panel:s.me?.control,teamClues:Object.values(app.teamClues),
    world: w, zoo: w.zoo, staff:s.st,
    me: { id: app.myId, x: s.me.x, y: s.me.y, animal: me.a, face: me.f, flags: me.s, carry: me.c, materials: me.supplies, enc: w.zoo.enclosures.findIndex((e) => e.animal === me.a) },
    obj: s.obj,
    objects: d.objects.map((o, i) => ({ ...o, state: s.os[i] })),
    gates: d.gates.map((g, i) => ({ ...g, state: Number(s.g[i]) })),
    npcs: s.np.map((n) => ({ enc: w.zoo.enclosures.findIndex((e) => e.animal === n.a), state: n.s })),
    activeIds: s.pl.filter((p) => p.act).map((p) => p.id),
    bays: d.bays,
  };
}

// ---------------- actions ----------------
// Opened as a downloaded file (no server): solo works, online rooms need the hosted game.
const OFFLINE_FILE = location.protocol === 'file:' && !params.get('server');
const OFFLINE_MSG = 'Online rooms need the game server. This downloaded copy plays solo; open the game\'s web link to play with friends.';

async function startOnline(kind, code) {
  if (OFFLINE_FILE) { const where = kind === 'create' ? '#title-msg' : '#join-msg'; show(kind === 'create' ? 'title' : 'join'); $(where).textContent = OFFLINE_MSG; return; }
  const name = myName(kind==='join'?'#join-name':'#name');
  if (app.link) { try { app.link.close(); } catch { /* */ } }
  app.mode = 'online'; app.lobby = null; app.pickAnimal = null;
  const link = new OnlineLink(onMessage, connStatus);
  app.link = link;
  $('#loading-text').textContent = kind === 'create' ? 'Creating a room…' : 'Joining room…';
  show('loading');
  try {
    if (kind === 'create') await link.create(name);
    else await link.join(code, name);
  } catch {
    app.link = null;
    show(kind === 'create' ? 'title' : 'join');
    $(kind === 'create' ? '#title-msg' : '#join-msg').textContent = 'Could not reach the game server. Online play needs the Breakout Beasts! server running — solo play works offline.';
  }
}

function startSolo() {
  if (app.link) { try { app.link.close(); } catch { /* */ } }
  app.mode = 'solo'; app.lobby = null;
  app.link = null;
  app.pickAnimal = app.pickAnimal || null;
  show('animals'); buildAnimals();
}

function toTitle() {
  if (app.link) { try { app.link.close(); } catch { /* */ } }
  app.link = null; app.mode = null; app.lobby = null; app.inGame = false; app.world = null;
  audio.stopMusic();
  overlay(null);
  show('title');
}

function act(name, el) {
  audio.unlock();
  audio.play('click');
  switch (name) {
    case 'solo': $('#title-msg').textContent = ''; startSolo(); break;
    case 'create': $('#title-msg').textContent = ''; startOnline('create'); break;
    case 'join': $('#join-msg').textContent = ''; $('#join-name').value=$('#name').value; show('join'); break;
    case 'join-go': {
      const code = $('#join-code').value.trim().toUpperCase();
      if (code.length < 4) { $('#join-msg').textContent = 'Enter the 5-letter room code.'; return; }
      startOnline('join', code); break;
    }
    case 'back': show('title'); break;
    case 'help': overlayReturn = app.overlay; overlay('help'); break;
    case 'help-close': overlay(overlayReturn === 'pause' ? 'pause' : null); overlayReturn = null; break;
    case 'settings': overlayReturn = app.overlay; syncSettingsUI(); overlay('settings'); break;
    case 'settings-close': overlay(overlayReturn === 'pause' ? 'pause' : null); overlayReturn = null; break;
    case 'animals-back':
      if (app.mode === 'solo') { if (app.link) { app.link.close(); app.link = null; } show('title'); }
      else if (app.lobby?.players.find((p) => p.id === app.myId)?.animal) { show('lobby'); renderLobby(); }
      else { toTitle(); }
      break;
    case 'animals-go': {
      if (!app.pickAnimal) return;
      if (app.mode === 'solo') {
        if (!app.link) { app.link = new SoloLink(onMessage); app.link.create(myName()); }
        app.link.send({ t: 'pick', animal: app.pickAnimal });
        app.link.send({ t: 'start' });
      } else {
        app.link?.send({ t: 'pick', animal: app.pickAnimal });
        show('lobby'); renderLobby();
      }
      break;
    }
    case 'copy': {
      const url = `${location.origin}${location.pathname}?room=${app.lobby?.code}`;
      (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => { $('#lobby-msg').textContent = ''; caption('Invite link copied!', 'good'); }, () => { $('#lobby-msg').textContent = 'Share this link: ' + url; });
      break;
    }
    case 'lobby-ready': { const me = app.lobby.players.find((p) => p.id === app.myId); app.link.send({ t: 'ready', ready: !me?.ready }); break; }
    case 'lobby-start': app.link.send({ t: 'start' }); break;
    case 'lobby-animal': show('animals'); buildAnimals(); break;
    case 'lobby-leave': toTitle(); break;
    case 'pause': openPause(); break;
    case 'resume': closePause(); break;
    case 'quit': toTitle(); break;
    case 'replay': app.link?.send({ t: 'replay' }); break;
    case 'to-lobby': app.link?.send({ t: 'toLobby' }); break;
    case 'to-title': toTitle(); break;
  }
  void el;
}

function openPause() {
  if (!app.inGame) return;
  overlay('pause');
  const solo = app.mode === 'solo';
  $('#pause-h').textContent = solo ? 'Paused' : 'Menu';
  $('#pause-note').textContent = solo ? 'The zoo is frozen until you resume.' : 'This is an online game: the zoo keeps moving while this menu is open, and your animal stands still.';
  $('#quit-btn').textContent = solo ? 'Quit to title' : 'Leave room';
  if (solo) { app.paused = true; app.link?.send({ t: 'pause', on: true }); }
}
function closePause() {
  overlay(null);
  if (app.mode === 'solo') { app.paused = false; app.link?.send({ t: 'pause', on: false }); }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b) { act(b.dataset.act, b); return; }
  const cw = e.target.closest('[data-cw]');
  if (cw) app.link?.send({ t: 'continueWithout', pid: cw.dataset.cw });
});
$('#join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') act('join-go'); });
document.addEventListener('pointerdown', () => audio.unlock(), { once: false });

input.onKey = (code, e) => {
  if (code === 'Escape') {
    if (app.overlay === 'settings' || app.overlay === 'help') { act(app.overlay + '-close'); return true; }
    if (app.overlay === 'pause') { closePause(); return true; }
    if (app.inGame && !app.overlay) { openPause(); return true; }
    if (app.screen === 'join' || app.screen === 'animals') { act(app.screen === 'join' ? 'back' : 'animals-back'); return true; }
    return false;
  }
  if (app.inGame && !app.overlay && e.target?.tagName !== 'INPUT') {
    if (/^Digit[1-6]$/.test(code)) { app.link?.send({ t: 'emote', i: Number(code.slice(5)) - 1 }); return true; }
  }
  if (!app.inGame) audio.unlock();
  return false;
};

// settings UI
for(const id of ['#title-hard','#join-hard'])$(id).addEventListener('input',e=>{settings.hard=e.target.checked;applySettings();saveSettings();});
function syncSettingsUI() {
  $('#set-hard').checked=settings.hard;
  $('#set-music').value = settings.music; $('#set-sfx').value = settings.sfx; $('#set-mute').checked = settings.mute;
  $('#set-motion').checked = settings.motion; $('#set-captions').checked = settings.captions; $('#set-bigtext').checked = settings.bigtext; $('#set-touch').value = settings.touch;
}
for (const [id, key, type] of [['#set-hard','hard','b'], ['#set-music', 'music', 'n'], ['#set-sfx', 'sfx', 'n'], ['#set-mute', 'mute', 'b'], ['#set-motion', 'motion', 'b'], ['#set-captions', 'captions', 'b'], ['#set-bigtext', 'bigtext', 'b'], ['#set-touch', 'touch', 's']]) {
  $(id).addEventListener('input', (e) => { settings[key] = type === 'n' ? Number(e.target.value) : type === 'b' ? e.target.checked : e.target.value; applySettings(); saveSettings(); if (key === 'sfx') audio.play('click'); });
}

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------------- boot ----------------
async function boot() {
  try {
    mountControlPanel(msg=>app.link?.send(msg));
    await loadImages();
    buildSprites();
    getZoo('moonleaf');
    app.renderer = new Renderer($('#game'));
    applySettings();
    input.attachTouch($('#touch'));
    window.addEventListener('resize', () => app.renderer.resize());
    buildTitle();
    if (OFFLINE_FILE) {
      for (const a of ['create', 'join']) { const b = document.querySelector(`#title [data-act="${a}"]`); b.disabled = true; b.title = OFFLINE_MSG; }
      const note = document.createElement('p'); note.className = 'info'; note.id = 'offline-note'; note.textContent = 'Downloaded copy: solo play works offline. ' + OFFLINE_MSG.split('. ')[0] + '.';
      $('#title .menu').after(note);
    }
    const room = params.get('room');
    const saved = OnlineLink.savedSession();
    if (saved && !room && !OFFLINE_FILE) {
      // a page reload during an online game: try to resume within the grace period
      app.mode = 'online';
      const link = new OnlineLink(onMessage, connStatus);
      app.link = link;
      $('#loading-text').textContent = 'Reconnecting to your room…';
      link.resume(saved.code, saved.token).catch(() => { app.link = null; show('title'); $('#title-msg').textContent = 'Could not reconnect to your previous room.'; });
    } else if (room) {
      show('join');
      $('#join-code').value = room.toUpperCase().slice(0, 5);
    } else show('title');
    requestAnimationFrame(frame);
  } catch (err) {
    console.error(err);
    $('#loading-text').textContent = 'Something went wrong while loading the zoo. Please refresh the page.';
  }
}

window.__bb.dropConnection = () => app.link?.dropForTest?.();
window.__bb.input = input;
window.__bb.botState = () => app.bot ? {script:app.bot.scriptName,step:app.bot.si,current:app.bot.script?.[app.bot.si],recent:app.bot.log.slice(-4)} : null;
window.__bb.state = () => ({ screen: app.screen, overlay: app.overlay, inGame: app.inGame, myId: app.myId, lobby: app.lobby, snap: app.world?.snap ? { tick: app.world.snap.tick, phase: app.world.snap.phase, obj: app.world.snap.obj, pl: app.world.snap.pl, st: app.world.snap.st, g: app.world.snap.g, tv: app.world.snap.tv } : null, results: app.results, conn: app.connState });
boot();
