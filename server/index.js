// Breakout Beasts! server: serves the game client and runs authoritative multiplayer rooms
// over WebSockets (path /ws). Run with `npm start`. Configure with PORT, HOST, ALLOWED_ORIGINS.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Room } from '../shared/room.js';
import { TICK } from '../shared/game.js';
import { makeRoomCode } from '../shared/util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATIC_DIRS = { '/shared/': path.join(ROOT, 'shared'), '/': path.join(ROOT, 'client') };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

export function createServer({ port = 8080, host = '0.0.0.0', roomOptions = {}, log = console.log, allowedOrigins = null } = {}) {
  const rooms = new Map();
  const sockets = new Map(); // ws -> { room, pid }

  const httpServer = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: sockets.size }));
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const prefix = pathname.startsWith('/shared/') ? '/shared/' : '/';
    const base = STATIC_DIRS[prefix];
    const file = path.normalize(path.join(base, pathname.slice(prefix.length)));
    if (!file.startsWith(base)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'no-cache',
        'x-content-type-options': 'nosniff',
      });
      res.end(data);
    });
  });

  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 4096 });

  const sendTo = (room) => (pid, msg) => {
    for (const [ws, info] of sockets) {
      if (info.room === room && info.pid === pid && ws.readyState === 1) { ws.send(JSON.stringify(msg)); }
    }
  };

  function newRoom() {
    let code;
    do { code = makeRoomCode(); } while (rooms.has(code));
    const room = new Room({ code, send: null, options: roomOptions, onEmpty: (r) => { rooms.delete(r.code); log(`room ${r.code} closed (empty)`); } });
    room.sendFn = sendTo(room);
    rooms.set(code, room);
    log(`room ${code} created`);
    return room;
  }

  wss.on('connection', (ws, req) => {
    if (allowedOrigins && req.headers.origin && !allowedOrigins.includes(req.headers.origin)) { ws.close(1008, 'origin'); return; }
    const info = { room: null, pid: null, alive: true, budget: 60, lastRefill: Date.now() };
    sockets.set(ws, info);
    const reply = (msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
    ws.on('pong', () => { info.alive = true; });
    ws.on('message', (data) => {
      // simple rate limit: ~60 messages/second per socket
      const now = Date.now();
      info.budget = Math.min(90, info.budget + ((now - info.lastRefill) / 1000) * 60);
      info.lastRefill = now;
      if (info.budget < 1) return;
      info.budget -= 1;
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (!msg || typeof msg !== 'object') return;
      if (!info.room) {
        if (msg.t === 'create') {
          const room = newRoom();
          info.room = room;
          // attach before addPlayer so the 'joined' message reaches this socket
          const id = 'p' + room.pid;
          info.pid = id;
          const r = room.addPlayer(msg.name);
          if (r.error) { reply({ t: 'error', code: r.error, message: r.message }); info.room = null; info.pid = null; }
        } else if (msg.t === 'join' || msg.t === 'resume') {
          const code = String(msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const room = rooms.get(code);
          if (!room) return reply({ t: 'error', code: 'not_found', message: `No room with code ${code || '—'}. Check the code and try again.` });
          if (msg.t === 'resume') {
            const p = [...room.players.values()].find((q) => q.token === msg.token);
            if (!p) return reply({ t: 'error', code: 'expired', message: 'Your spot in this room has expired.' });
            // close any stale socket still bound to this player
            for (const [ows, oi] of sockets) if (ows !== ws && oi.room === room && oi.pid === p.id) { oi.room = null; oi.pid = null; try { ows.close(4000, 'replaced'); } catch { /* ignore */ } }
            info.room = room; info.pid = p.id;
            room.resume(msg.token);
          } else {
            if (room.players.size >= room.maxPlayers) return reply({ t: 'error', code: 'room_full', message: `Room ${code} is full (${room.maxPlayers}/${room.maxPlayers} players).` });
            if (room.phase !== 'lobby') return reply({ t: 'error', code: 'in_progress', message: 'That mission has already started. Ask the host to return to the lobby, then join again.' });
            info.room = room; info.pid = 'p' + room.pid;
            const r = room.addPlayer(msg.name);
            if (r.error) { info.room = null; info.pid = null; reply({ t: 'error', code: r.error, message: r.message }); }
          }
        } else if (msg.t === 'ping') reply({ t: 'pong', c: msg.c });
        return;
      }
      if (msg.t === 'leave') {
        info.room.handle(info.pid, msg);
        info.room = null; info.pid = null;
        return;
      }
      info.room.handle(info.pid, msg);
    });
    ws.on('close', () => {
      sockets.delete(ws);
      if (info.room && info.pid) {
        const stillBound = [...sockets.values()].some((o) => o.room === info.room && o.pid === info.pid);
        if (!stillBound) info.room.disconnect(info.pid);
      }
    });
  });

  // simulation loop
  let last = Date.now(); let acc = 0;
  const loop = setInterval(() => {
    const now = Date.now();
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= TICK) {
      acc -= TICK;
      for (const room of rooms.values()) {
        try { room.tick(TICK); } catch (err) { log('room error', room.code, err); }
      }
    }
  }, 1000 * TICK / 2);

  // heartbeat to detect dead connections
  const hb = setInterval(() => {
    for (const [ws, info] of sockets) {
      if (!info.alive) { try { ws.terminate(); } catch { /* ignore */ } continue; }
      info.alive = false;
      try { ws.ping(); } catch { /* ignore */ }
    }
  }, 10000);

  return new Promise((resolve) => {
    httpServer.listen(port, host, () => {
      const addr = httpServer.address();
      resolve({
        port: addr.port, rooms, httpServer, wss,
        close: () => new Promise((r) => { clearInterval(loop); clearInterval(hb); for (const ws of sockets.keys()) ws.terminate(); wss.close(); httpServer.closeAllConnections?.(); httpServer.close(() => r()); }),
      });
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT) || 8080;
  const host = process.env.HOST || '0.0.0.0';
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : null;
  createServer({ port, host, allowedOrigins }).then(({ port: p }) => {
    console.log(`Breakout Beasts! server running at http://localhost:${p}  (WebSocket path /ws)`);
  });
}
