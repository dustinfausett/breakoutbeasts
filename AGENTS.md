# Notes for contributors and coding agents

- **Game rules live in `shared/`** and run in two places: on the server for online rooms, and
  in the browser for solo play. Never put game logic in `client/`. The client only renders
  snapshots and sends inputs (`{t:'in', mx, my, sp, e}`).
- `shared/game.js` holds the authoritative simulation, which ticks 20 times per second.
  `shared/room.js` holds the lobby, lifecycle and snapshots and has no transport code. The
  server (`server/index.js`) only adds WebSockets around it.
- Each enclosure solution (`shared/zoos/moonleaf.js`) and bay template (`shared/bays.js`)
  carries autopilot steps. If you change a map or puzzle, update its steps and run `npm test`.
  The composition sweep must stay at 0 failures (no team may deadlock).
- Every ability must change the world in its own way. Do not add "press a button to open a
  gate faster" abilities.
- Player-facing text uses plain language. Keep technical terms out of the UI.
- Art is original and drawn in code (`client/sprites.js`). Audio is synthesized
  (`client/audio.js`). Do not add assets without a compatible licence, and document any you add
  in the README.
- Tests: `npm test` (Node) and `npm run test:e2e` (Playwright and Chromium, which start their
  own server).
