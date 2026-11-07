// Shared helpers for real-browser end-to-end tests (Playwright + the real server).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('@playwright/test'); }
export const { chromium, devices } = pw;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SHOTS = path.join(ROOT, 'e2e', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

function freePort() {
  return new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
}

export async function startServer(env = {}) {
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('server did not start')), 8000);
    proc.stdout.on('data', (d) => { if (String(d).includes('running')) { clearTimeout(to); res(); } });
    proc.on('exit', (c) => rej(new Error('server exited ' + c)));
  });
  return { url: `http://127.0.0.1:${port}/`, stop: () => proc.kill() };
}

export function pageErrors(page, label) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(`[${label}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`[${label}] ${m.text()}`); });
  return errs;
}

export const state = (page) => page.evaluate(() => window.__bb.state());

export async function waitFor(fn, { timeout = 30000, interval = 250, what = 'condition' } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('Timed out waiting for ' + what);
    await new Promise((r) => setTimeout(r, interval));
  }
}

export class Report {
  constructor(name) { this.name = name; this.rows = []; }
  ok(label, cond, detail = '') { this.rows.push({ label, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`); return !!cond; }
  get failed() { return this.rows.filter((r) => !r.pass).length; }
}
