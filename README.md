# Breakout Beasts!

A browser-based, cooperative pixel-art zoo escape for **1–4 players**. You are animals trapped
in Moonleaf Zoo: slip out of your enclosure, free your friends, restore power, and walk out
through the Moonleaf Gate together, without getting caught by the night keepers.

- **Solo** runs entirely in your browser. No server is needed once the page has loaded.
- **Online co-op** uses a small Node.js server that runs every room. The server decides all
  game state, and browsers only send input.

---

## Contents
1. [Quick start](#1-quick-start)
2. [How to play](#2-how-to-play)
3. [What works now and what is planned](#3-what-works-now-and-what-is-planned)
4. [Running tests](#4-running-tests)
5. [Saving your work in Git](#5-saving-your-work-in-git)
6. [Deploying to a public HTTPS address](#6-deploying-to-a-public-https-address)
7. [Operating the multiplayer server (secure WebSockets)](#7-operating-the-multiplayer-server-secure-websockets)
8. [Project layout and adding new zoos](#8-project-layout-and-adding-new-zoos)
9. [Art, audio and licensing](#9-art-audio-and-licensing)

---

## 1. Quick start

Requirements: **Node.js 20 or newer** (developed on Node 22) and a modern browser.

```bash
npm install
```

```bash
npm start
```

Open **http://localhost:8080** in your browser.

- `npm run dev` does the same thing but restarts the server whenever you edit a file.
- To use a different port: `PORT=3000 npm start`.
- To play online with friends on the same Wi-Fi, they open `http://<your-computer's-LAN-IP>:8080`.
  Over the internet you need a real deployment (see §6).

> **Managed cloud / container environments:** a running server process does **not** survive
> the environment being stopped, restored or rebuilt. After a restore, run `npm install` (if
> `node_modules` is missing) and `npm start` again. A development environment's preview URL is
> not a public website, and §6 explains the difference.

### Handy URL options
| URL | What it does |
|---|---|
| `/?room=ABCDE` | Opens the Join screen with the room code filled in (this is the invite link the lobby copies). |
| `/?nostaff=1` | Solo practice with no keepers (also used by tests). |
| `/?autopilot=1` | Test mode: an autopilot plays your animal through the real client. |

---

## 2. How to play

**Controls**

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD or arrow keys | Left joystick |
| Interact (hold for levers, cranks, keys) | E | **E** button |
| Use your animal's ability | Space | **★** button |
| Quick messages to teammates | 1–6 | 💬 Say |
| Minimap on/off | M | — |
| Menu / pause | Esc | ☰ Menu |

Menus can be operated with the keyboard alone (Tab, Enter and arrow keys).

**The mission at Moonleaf Zoo**
1. **Escape your enclosure.** Each animal starts in its own habitat with a small puzzle that
   teaches its ability. The tip at the start, and the objectives panel, tell you what to do.
2. **Free caged animals.** Hold **E** at the yellow keeper lever outside an enclosure gate.
   Three animals must be freed. Freed animals run to the Animal Hideout in the courtyard.
3. **Restore power.** In the Maintenance Yard, each player has their own bay. The bay door is
   rebuilt to need *that player's* ability. Get in, flip the breaker (when playing as a team),
   take the fuse and plug it into the generator.
4. **Turn the exit keys together.** The Exit Plaza has one key per player, and everyone must
   hold theirs at the same time.
5. **Everyone through the Moonleaf Gate.** The mission ends once every active player is in the
   exit zone.

**The animals**

| Animal | Difficulty | Ability (Space) | Limitation |
|---|---|---|---|
| Red Panda | Easy | Hops over yellow-striped climbing fences and walks along ledges | Cannot move heavy crates |
| Elephant | Easy | Pushes crates (Space), pulls them with its trunk (E), holds heavy plates | Too big for narrow rock gaps |
| Monkey | Easy | Reaches levers through bars and climbs ropes | Cannot break reinforced barriers |
| Beaver | Easy | Chews marked wood (hold Space). Picks up logs (E) and builds bridges on posts | Chewing takes time and bridges need logs |
| Giraffe | Medium | Flips high wall switches. Lookout reveals every keeper to the team | Too tall for tunnels |
| Penguin | Medium | Belly-slides through low ducts, zooms on ice, swims | Slow on ordinary ground |
| Zebra | Medium | Kicks loose planks down and sprints | Sprint recharges, and kicks and sprints are noisy |
| Meerkat | Hard | Digs through marked soil to open a tunnel, then travels it (E) | Digging is slow and each tunnel has one exit |
| Tortoise | Hard | Shell: jams snapping gates open and blocks keepers, who take it for a rock | Very slow |
| Flamingo | Hard | Wades ponds, stretches across water to switches, balances on beams | Wobbles on beams unless you hold Space |

**Keepers.** Keepers patrol fixed routes with flashlight cones. Walls, hedges, trees and
crates block their view. Fences do not. When a keeper sees you, a **? %** meter fills. At 100%
they shout **!** and give chase. To escape, break their line of sight, hide in a bush, or
rattle a noisy bin to send them somewhere else. Keepers ignore animals inside their own
enclosure.

**Getting caught.** You are returned to your enclosure and keepers ignore you for 5 seconds.
Everything the team finished stays finished. You can escape again, or a teammate can pull your
keeper lever.

**If a teammate disconnects,** everyone sees a "Waiting for …" banner, and that player's part of
the puzzle pauses. They have 45 seconds to reconnect; reloading the page reconnects
automatically. Anyone can press **Continue without …**. The game then drops the missing
player's untouched task, or turns a half-finished one into a crank anyone can turn. The number
of exit keys shrinks to match the remaining team.

---

## 3. What works now and what is planned

### Working and tested
- Title, solo / create room / join room, animal selection (ability, limitation, difficulty and
  controls shown for each), lobby, mission, and a mission-complete screen with Play again /
  Return to lobby. Back to title is also offered.
- **Moonleaf Zoo:** ten themed enclosures, promenades, a central courtyard with a fountain, the
  Animal Hideout, hedge gardens and hiding bushes, the Maintenance Yard, the Exit Plaza, the
  exit gate, signs, lamps, and ability shortcuts (a narrow gap, ledge, rope, duct, climb fence,
  chewable door, kickable planks, a tunnel and a high-switch gate).
- All **10 animals** with abilities that change the world in different ways: tiles are chewed,
  kicked or dug, bridges are built, crates move, gates jam, and animals hop, slide, tunnel or
  wade.
- **Puzzles that scale with team size:** one power part and one exit key per player. Parts are
  generated from the team's own animals, and the generator part has an extra breaker step for
  teams. **All 385 possible teams of 1–4 animals** were played through to completion
  automatically.
- **Keepers:** they patrol, become suspicious, investigate noises, chase, catch and return to
  patrol. They have directional vision cones with line-of-sight checks and show a warning
  before full detection. Players can hide, and bins work as distractions.
- **Online:** an authoritative server, 5-letter room codes, invite links, a 4-player limit,
  duplicate animals blocked, readiness, host-only start, host hand-over, reconnection with a
  grace period, clear "room full", "not found" and "connection lost" messages, smoothing of
  remote movement and prediction for your own movement.
- Pause and settings: separate music and sound-effect volume, mute, reduced motion, sound
  captions, larger text, and touch controls (automatic, on or off). There are touch controls
  that release on focus loss or an interrupted touch, keyboard menu navigation, text labels as
  well as colours, and on-screen captions for important sounds.
- Synthesized sound effects and a quiet music loop. Audio starts only after you click or press
  a key.

### Planned (not built yet)
- More zoos: **Sunspire Safari Park** and **Frostfern Aquarium Zoo** are listed as "coming soon"
  on the title screen. The zoo registry (`shared/zoos/index.js`) is ready for them.
- Joining a mission that has already started (right now you join in the lobby, or reconnect to
  your own slot).
- Gamepad support, remappable keys, saved progress and stars per zoo.
- Running across more than one server instance (rooms live in one process's memory today).

### Known limitations
- Keepers are deliberately forgiving in this first zoo. Difficulty tuning has only been tried
  by automated players, not by real playtesters.
- The autopilot does not sneak, so automated runs with keepers include captures. The game still
  completes.

---

## 4. Running tests

```bash
npm test
```
This runs the Node unit and integration tests, about 2–3 minutes:
- `test/rules.test.js`: each enclosure starts sealed for every animal; each animal escapes using
  its own ability and its effect is checked (for example, chewing produces debris and only a
  beaver can chew); every animal finishes the zoo solo; players cannot pass walls or closed
  gates; movement is validated; keepers cannot see through walls or hedges but can see through
  bars; hidden or shelled animals are not seen; suspicion comes before a chase; capture, the
  grace period and teammate release work; noise is investigated; part and key counts scale with
  the team; the exit requires every active player; disconnect adaptation keeps progress; the
  tortoise gate really needs the shell.
- `test/compositions.test.js`: all 385 teams of 1–4 different animals finish the mission (no
  deadlocks), plus one team run with keepers active.
- `test/room.test.js`: room limit of 4, duplicate picks, host-only start and readiness,
  joining mid-mission refused, host migration, reconnecting within the grace period, automatic
  continue after the grace period, manual "continue without", replay and lobby.
- `test/server.test.js`: real WebSocket clients against the real server: create and join, a
  fifth player refused, unknown code, identical world state on two clients, the server limiting
  movement speed, disconnect and resume, joining mid-mission refused, host leaving, and a full
  online mission played to completion.

```bash
npm run test:e2e
```
This runs the real-browser tests (Playwright with Chromium, about 10 minutes), which start
their own server:
- `e2e/solo.mjs`: keyboard-only menus, arrow keys, WASD, keys released on blur, the Escape
  menu pausing solo play, settings, reduced motion, prompts, and full solo missions with keepers
  through the real client.
- `e2e/multiplayer.mjs`: 2 and 4 separate browser clients create and join a room; the test
  checks that a taken animal is blocked, a fifth player is refused, only the host can start,
  every client has the same world state at the same tick, a dropped client reconnects, the
  mission completes with matching results everywhere, everyone returns to the lobby, and the
  host role passes on.
- `e2e/mobile.mjs`: phone portrait, phone landscape and tablet layouts; the joystick and
  buttons work, and an interrupted touch does not leave movement stuck.

Screenshots are written to `e2e/screenshots/` (git-ignored). If Playwright is not installed:
`npm i -D playwright` then `npx playwright install chromium`.

---

## 5. Saving your work in Git

```bash
git status
```

```bash
git add -A
```

```bash
git commit -m "Describe what you changed"
```

```bash
git push -u origin <your-branch>
```

`node_modules/` and test screenshots are ignored by `.gitignore`. Commit `package-lock.json` so
installs stay reproducible.

---

## 6. Deploying to a public HTTPS address

**A development environment is not a deployment.** Running `npm start` on your laptop, or in a
cloud dev container with a "preview" or "port forward" link, gives you a temporary address. It
stops working when the machine sleeps, the session ends or the container is recycled, and it is
often private to you. A **deployment** runs the server on a host built for staying up: it gets
a permanent public `https://` address, restarts after crashes, and accepts WebSocket
connections from anyone with the link.

Because rooms are kept in the server's memory, pick a host that runs **one long-lived
process** (not "serverless functions") and **keep exactly one instance running**. Two good
options are included.

### Option A: Fly.io (`fly.toml` + `Dockerfile` included)
1. Install `flyctl` and run `fly auth login`. This needs an account and may need a payment method.
2. Edit `fly.toml` and replace `breakout-beasts-CHANGE-ME` with a unique app name.
3. Run each of these in turn:

```bash
fly launch --no-deploy --copy-config
```

```bash
fly deploy
```

```bash
fly scale count 1
```

4. Open `https://<your-app-name>.fly.dev` and check `https://<your-app-name>.fly.dev/healthz`.

### Option B: Render (`render.yaml` included)
1. Push the repository to GitHub.
2. In Render choose **New → Blueprint**, pick the repository, and accept `render.yaml`
   (one web service, one instance, health check `/healthz`). Note that free instances go to
   sleep when idle, which ends open rooms.
3. Open the `https://….onrender.com` URL Render gives you.

### Any Docker host

```bash
docker build -t breakout-beasts .
```

```bash
docker run -p 8080:8080 breakout-beasts
```

Then put the container behind an HTTPS reverse proxy (see §7).

> Nothing has been deployed by this project's setup, and there is no official public URL.
> Deploying creates resources on your own account, and some may cost money.

---

## 7. Operating the multiplayer server (secure WebSockets)

- One process serves both the game files and the WebSocket endpoint at **`/ws`** on the same
  port. The browser connects with `wss://` automatically when the page was loaded over
  `https://`, so no client configuration is needed.
- **TLS (the "s" in `wss`)** is handled by your host (Fly and Render do this automatically) or
  by a reverse proxy you run yourself. With Caddy, this two-line `Caddyfile` gets a certificate
  and forwards WebSockets:
  ```
  play.example.com {
      reverse_proxy 127.0.0.1:8080
  }
  ```
  With nginx, forward `/ws` with `proxy_http_version 1.1;`,
  `proxy_set_header Upgrade $http_upgrade;`, `proxy_set_header Connection "upgrade";` and raise
  `proxy_read_timeout` above 60 seconds.
- **Environment variables:** `PORT` (default 8080), `HOST` (default `0.0.0.0`),
  `ALLOWED_ORIGINS` (optional comma-separated list such as
  `https://play.example.com`, which refuses WebSocket connections from other sites' pages), and
  `BB_STAFF=0` (testing only: no keepers).
- **Health check:** `GET /healthz` returns `{"ok":true,"rooms":N,"players":N}`.
- **Built-in safeguards:** a message size limit (4 KB), a per-connection message rate limit, a
  ping every 10 seconds to drop dead connections, input clamping, and server-side checks of all
  movement and interactions. Empty rooms are deleted about 50 seconds after the last player
  leaves.
- **Restarts end all rooms** (state is in memory). Deploy at quiet times. Run a single instance:
  with several instances behind a load balancer, players would land in different processes and
  room codes would not be found.
- **Host leaving:** host duties move to the longest-connected remaining player. A disconnected
  player keeps their lobby slot for 20 seconds, and their mission slot for 45 seconds before the
  team automatically continues without them.

---

## 8. Project layout and adding new zoos

```
server/index.js        HTTP static server + WebSocket rooms (+ simulation loop at 20 ticks/s)
shared/                Code used by BOTH the server and the browser
  game.js              The game rules: movement, abilities, keepers, puzzles, objectives
  room.js              Lobby, picks, readiness, start/replay, reconnection, snapshots
  bays.js              Generator bay templates, one per animal, plus the universal crank
  physics.js           Collision + movement (also used for client prediction)
  tiles.js / animals.js / util.js / bot.js (autopilot used by tests)
  zoos/moonleaf.js     Moonleaf Zoo map (enclosures drawn as ASCII art) + patrol routes
  zoos/index.js        Zoo registry
client/                index.html, style.css, main.js (UI), render.js, sprites.js, world.js,
                       net.js (online + solo links), input.js, audio.js
test/                  node:test suites      e2e/   Playwright browser suites
```

To add a zoo, create `shared/zoos/<name>.js` that returns the same shape as `buildMoonleaf()`
(tiles, enclosures with solutions, bays, keys, exit, staff routes), register it in
`shared/zoos/index.js`, and the existing deadlock sweep can be pointed at it.

---

## 9. Art, audio and licensing

All pixel art (animals, keepers, tiles and the icon) is original to this project and is drawn
in code in `client/sprites.js`. All sound effects and music are synthesized at runtime with the
Web Audio API in `client/audio.js`. No third-party art, audio or fonts are used, so there are no
attribution requirements. The only runtime dependency is the [`ws`](https://github.com/websockets/ws)
library (MIT license).
