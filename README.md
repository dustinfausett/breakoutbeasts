# Breakout Beasts!

A browser-based, cooperative pixel-art zoo escape for **1–8 players**. You are animals trapped
in Moonleaf Zoo: slip out of your enclosure, free your friends, restore power, and walk out
through the Moonleaf Gate together, without getting caught by the night keepers.

- **Solo** runs entirely in your browser. No server is needed once the page has loaded.
- **Online co-op** uses a small Node.js server that runs every room. The server decides all
  game state, and browsers only send input.

---

On phones, tap the money button to expand disguise and inventory details. Opening objectives
collapses those details so they stay readable. Expanded details close again after four seconds.

Hold **E** beside an unconscious keeper or officer to take their keys, release, then hold
**E** again to steal their $20 wallet. Release and hold **E** a third time to take and wear their uniform. A uniform counts as a full disguise. Use **Menu →
Stolen uniforms** to change back to your clothes or another collected uniform. Witnessed biting, cage unlocking, escape work, and dragging unconscious staff raise an alert.
These actions and normal disguise discovery compromise that entire uniform type for the group: police and
keeper uniforms are tracked separately. Wallet and clothes actions have no on-screen hints. This status and collected uniforms persist through
chapters and group saves; police capture confiscates the captured animal's uniforms.

When the entire active crew is captured, alerts clear immediately and guards disperse.
Everyone can hold **E** at a different wall section in their own cell for 1.5 seconds;
all players must hold together, even across different buildings, to unlock every occupied
cell at once. Letting go resets the shared progress. Garbage cans inside cells let muzzled
animals remove their muzzles. Extra emergency guards retire one at a time every 10 seconds
without an active alert, while the normal patrol remains.

The host can open **Menu → Continue or restart this part**. Continue keeps the current
world; Restart restores the current part's entry checkpoint. Capture never opens a voting
popup. Under **Settings → Joystick position**, each player can choose the default left
joystick/right buttons or a right joystick/left buttons; the choice is saved on that device.

Multiplayer keeps its 20 Hz simulation while streaming compact state changes and only the
pedestrians in each player's current scene. WebSocket compression reduces transfer size;
slow connections receive the newest world state with retained events and map changes.
Rendering skips offscreen characters, and sprint movement is predicted locally.

To measure one-, four-, and eight-player city/airport traffic and server tick cost locally:
`node tools/benchmark-multiplayer.mjs 3`. Results compare the previous uncompressed stream
with the optimized stream, including actual network bytes. Refresh each device after a
deployment to load the updated client.

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

### Single-file download (solo, offline)

```bash
npm run build:single
```

This writes `dist/index.html`: the whole game in one file, about 240 KB, with no other files
needed. Double-click it to play **solo** in any modern browser, even with no internet. Online
rooms are switched off in this copy because they need the game server. `dist/` is not committed,
so rebuild after changing the game.

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
| Run (uses stamina) | Hold Shift while moving | Hold **Run** while moving |
| Quick messages to teammates | 1–6 | 💬 Say |
| Bite / remove a teammate’s muzzle | B | **Bite** button |
| Menu / pause | Esc | ☰ Menu |

Menus can be operated with the keyboard alone (Tab, Enter and arrow keys).

**The mission at Moonleaf Zoo**
1. **Escape your enclosure.** Use your animal’s ability immediately to solve its enclosure puzzle. The beaver must chew timber down, pick up its log, build a bridge, and chew the exit barrier. Alternative for every animal: find a supply chest, collect two bundles and build a ramp at the front-left fence site. Smaller animals can instead use the front-right soil site to craft a stick and dig a tunnel; press E there again to travel. Elephants, giraffes and zebras can ram the main gate three times with Space. Hits must be separated by 1.2 seconds, and every hit carries farther and increases keeper attention. Chests have finite supplies and stay empty once used, including after capture. Their reachable locations change each mission.
2. **Free caged animals.** Sneak behind an unwatched keeper and hold **E** to steal a cage key. Keep it until capture and reuse it by holding **E** at any gold enclosure lock. Every opened enclosure dispatches a keeper to inspect it. Alternatively, find supply chests and gather two bundles and build an escape ramp from outside a cage. Beaver chewing and zebra kicking can also break suitable enclosure barriers. Every remaining caged animal must be freed. Freed animals run to the Animal Hideout in the courtyard.
3. **Restore power.** In the Maintenance Yard, each player has their own bay. The bay door is
   rebuilt to need *that player's* ability. Get in, flip the breaker (when playing as a team),
   take the fuse and plug it into the generator.
4. **Operate the control house together.** Each animal enters its assigned door in the Exit Plaza. Once everyone is inside, every operator presses their flashing red power button. Each screen gives only an action for a randomly chosen station, including its own: talk or use the panel chat to pass the strange instructions along. Each player must finish five tasks before the three-minute break-in timer expires. A failed attempt returns everyone to reinforced enclosures; power and rescued friends remain. Solo players receive commands for their own controls.
5. **Everyone through the Moonleaf Gate.** The mission ends once every active player is in the
   exit zone.

**The animals**

| Animal | Difficulty | Ability (Space) | Limitation |
|---|---|---|---|
| Red Panda | Easy | Hops over yellow-striped climbing fences and walks along ledges | Cannot move heavy crates |
| Elephant | Easy | Pushes crates (Space), pulls them with its trunk (E), holds heavy plates | Too big for narrow rock gaps |
| Monkey | Easy | Reaches levers through bars and climbs ropes | Cannot break reinforced barriers |
| Beaver | Easy | Chews marked wood (hold Space). Picks up logs (E) and builds bridges on posts | Chewing takes time and bridges need logs |
| Giraffe | Medium | Flips high wall switches. Lookout sends a warning to teammates | Too tall for tunnels |
| Penguin | Medium | Belly-slides through low ducts, zooms on ice, swims | Slow on ordinary ground |
| Zebra | Medium | Kicks loose planks down and sprints | Sprint recharges, and kicks and sprints are noisy |
| Meerkat | Hard | Digs through marked soil to open a tunnel, then travels it (E) | Digging is slow and each tunnel has one exit |
| Tortoise | Hard | Shell: jams snapping gates open and blocks keepers, who take it for a rock | Very slow |
| Flamingo | Hard | Wades ponds, stretches across water to switches, balances on beams | Wobbles on beams unless you hold Space |

**Keepers.** Keepers patrol fixed routes with flashlight cones. Walls, hedges, trees and
crates block their view. Fences do not. When a keeper sees a loose animal, they immediately raise **!**, radio its position, and every keeper converges. Noise increases the **? %** attention indicator without granting sight through walls. Keepers normally walk at 1.5 tiles/second, walk at 1.9 on alert, and run at 2.2 in pursuit. Nine animals are faster than their pursuit speed; the tortoise is slower. A confirmed sighting puts the zoo on alert for three minutes after the latest sighting. Alert vision is 20% longer and its cone is about 18 degrees wider. To escape, break their line of sight before hiding in a bush, or
rattle a noisy bin to send them somewhere else. Keepers ignore animals inside their own
enclosure.

**Getting caught.** You are returned to your enclosure and keepers ignore you for 5 seconds.
Everything the team finished stays finished. You can escape again, or a teammate can unlock your
cage using a stolen key, or build an escape ramp.

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
- **Puzzles that scale with team size:** one power part and five control-house tasks per player. Parts are
  generated from the team's own animals, and the generator part has an extra breaker step for
  teams. **All 1,012 possible teams of 1–8 animals** were played through to completion
  automatically.
- **Keepers:** they patrol, become suspicious, investigate noises, chase, catch and return to
  patrol. They have directional vision cones with line-of-sight checks and radio sightings immediately; noise raises attention. Players can hide, and bins work as distractions.
- **Online:** an authoritative server, 5-letter room codes, invite links, an 8-player limit,
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
- The autopilot avoids visible flashlight cones, but automated runs with keepers can still include captures. The game still
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
  bars; hidden or shelled animals are not seen; visual sightings trigger an immediate radio chase; capture, the
  grace period and teammate release work; noise is investigated; part and key counts scale with
  the team; the exit requires every active player; disconnect adaptation keeps progress; the
  tortoise gate really needs the shell.
- `test/compositions.test.js`: all 1,012 teams of 1–8 different animals finish the mission (no
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

The original generated pixel art (animals, keepers, terrain, props, console and logo) lives
in `client/assets/`. Small functional overlays and the icon are drawn in code. All sound effects and music are synthesized at runtime with the
Web Audio API in `client/audio.js`. No third-party art, audio or fonts are used, so there are no
attribution requirements. The only runtime dependency is the [`ws`](https://github.com/websockets/ws)
library (MIT license).

## Escape and stealth update

Run `npm ci`, then `npm start` (port 8080, or set `PORT`). Use **Create Online Room** and share the five-letter code; friends choose **Join a Room**, select different animals, and mark ready. The host starts the shared mission. Downloaded single-file HTML supports solo only. Online friends need the same hosted server, such as a single Railway service with WebSocket support.

The current escape alternatives use salvage bundles and a stepped ramp rather than freeform physics-based object stacking. Tunnel sites are fixed; arbitrary digging is not implemented. Native ability routes remain distinct. Guard-held cage keys are separate from the cooperative exit-key stations. Changes in this workspace do not update Railway until committed and pushed to its deployment branch.

Browser tests can use an existing Chrome installation via `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`. Otherwise install Playwright and its Chromium browser as described above.

### Validation notes for the escape update

Real browser checks completed two-player and four-player online missions, including room codes, readiness, synchronized snapshots, reconnection, and lobby return. Phone portrait, landscape, and tablet checks passed. A solo monkey mission completed with keepers active and replay worked. An earlier full solo tortoise browser run exceeded the seven-minute test limit: its automated player could skip a temporarily blocked safe waypoint and then try to hold a distant exit station. That navigation bug is fixed and covered by a regression test; a complete tortoise mission with the final automated player has been verified in the simulation, but a full browser rerun remains outstanding. Human difficulty tuning is still needed.

## Guard alert and enclosure security

- A sighting refreshes a zoo-wide 180-second alert timer. Wider cones, faster alert walking and the remaining timer appear in the client. Pursuit uses the faster running speed. Losing sight still sends keepers to the last known location; they do not learn hidden positions.
- Heavy animals must hold Space for 1.2 seconds for each gate strike. Releasing early or moving cancels the charge. A continuous hold produces one strike; release and charge again to strike again. Each strike makes a bang, increases nearby attention, and schedules an investigation. Response delays shrink from 4 seconds to 2.5, then 1, then a minimum of 0.5 seconds. Travel time still depends on where the guard is.
- Capture repairs that player's enclosure: gates, chewed barriers, bridges, ramps, tunnels, crates and latches return to their starting state. The animal must prepare again. Gates need three charged strikes initially, four after the first capture, five after the second, and so on. Other enclosures and completed mission objectives are preserved.
- A keeper who sees a broken gate and has evidence that its animal escaped raises the alert even without seeing the animal. Each keeper reports a given break once; the same unrepaired gate does not keep the timer alive forever.
- Small animals can hide in a single bush. Elephants, giraffes and zebras need at least two edge-connected bush tiles. Diagonally touching bushes do not count. Being watched still prevents entering hiding; the tortoise's shell remains a separate ability.

Focused regression coverage is in `test/security.test.js`; `node e2e/security.mjs` tests charging, sound captions, repairs, the alert HUD and bush cover in Chromium. It is also included in `npm run test:e2e`.

Validation for the guard-security update: all 78 Node tests passed, including all 385 team compositions and the live WebSocket mission test. All 8 focused security browser checks passed, along with the mobile suite and the two-player browser mission. Four-player browser room creation, readiness, synchronization and reconnect checks passed; its full autoplay stalled while navigating the maintenance yard. That long run was stopped, so full four-player browser completion and the subsequent solo browser suite are not claimed for this update.

## Wild update: invites, biting and Hard mode

The title now uses original retro bitmap lettering with jungle vines, claws and fangs. Room invite links open a name field before joining; names are saved locally and appear in the shared lobby. Hard mode can be chosen on the title screen, the invite screen or in Settings. It is an individual visual choice, so teammates can choose different modes.

Hold E to steal a key while creeping at 45% walking speed. You must stay within 1.9 tiles and out of awake keepers’ sight for 0.9 seconds. Holding E while approaching automatically begins the attempt when you enter a valid position. Losing range or being seen cancels it.

Press B (or the touch Bite button) while facing a nearby target. A bite can knock a keeper unconscious for 30 seconds. Their keys can be taken while they are down, but biting a keeper permanently enables high alert and tranquilizer darts for this mission. Awake keepers fire only at visible animals within their view range. Darts travel at a finite speed, can be dodged, stop at obstacles and expire at the keeper’s viewing range.

A dart hit returns an animal to its enclosure with a muzzle. The muzzle survives capture, repair and time passing. It prevents biting and beaver chewing, but does not prevent collecting materials or building an alternate escape ramp. A nearby teammate can face the muzzled animal and press B to bite off the muzzle. In solo play, approach a freed NPC animal and press E to ask it to bite off the muzzle. This keeps a muzzled solo beaver from being stuck permanently: it can build a ramp for a friend and ask that friend for help. A muzzle also comes off when the animal passes through the open zoo exit. Friendly nips cause only a brief flinch; there is no health system or graphic injury. NPC animals can also be nipped.

There is no minimap, objective navigation arrow or through-wall keeper highlight. Use zoo signs, landmarks and teammate communication. Quick-message buttons remain available; built-in voice chat is not implemented.

Hard mode keeps terrain and animals visible throughout the current camera view. Keepers, their cones, and their markers appear only within 10 tiles in front of the animal, with obstacles blocking sight of keepers behind them. This is an individual visual challenge mode; keeper detection rules are unchanged.

`test/wild.test.js` covers moving theft, bites, darts, muzzles and view geometry. `e2e/wild.mjs` verifies the invite flow and the complete bite/tranquilizer/muzzle-removal loop across two real online clients, plus pixel checks for visible terrain and renderer checks for hidden keepers.

Validation for this update: all 92 Node tests passed, including all 385 team compositions and live WebSocket integration. The two-client wild-feature browser suite passed 13/13 checks; mobile passed 24/24; the earlier security suite passed 8/8. The single-file build completed. Full four-player and solo autoplay were not rerun; the earlier maintenance-yard autoplay limitation remains documented above.


## Eight-player control house and artwork

Rooms now support up to eight distinct animals. The maintenance yard has eight bays and generator sockets, and the control house has eight individual entrances. Panel solutions are private: an operator receives their own controls and a clue for another player, never their own multiplayer answer. Disconnected players pause the puzzle timer; continuing without them preserves remaining operators’ door assignments and progress. Action, ability, hiding and bite buttons are available with a mouse as well as touch.

The original generated PNG artwork in `client/assets/` replaces the small actor sprites, terrain, props and title logo with more detailed pixel art. The console uses its own generated backdrop. Assets were created for this project using image generation; the supplied references guided pixel detail and style only. See `client/assets/README.md` for atlas layouts. Audio remains synthesized.

Run `npm run test:e2e -- "control house"` for eight real clients joining, separate entrances, private instructions, chat, timer failure, and all forty panel tasks unlocking the exit. `npm run build:single` embeds the art and code for offline solo play; online rooms require the running server.

Validation for the eight-player update: 102/102 Node tests passed, including all 1,012 animal-team combinations and a live WebSocket mission. The eight-client control-house browser test passed 15/15 checks; wild-feature regression passed 13/13 and mobile passed 24/24. The single-file build succeeded and started a solo beaver game over localhost with no browser errors. Direct `file://` opening is blocked by this test environment’s browser policy. The eight-client control-house test prepares completed power/rescue prerequisites to isolate the final puzzle; full missions for every team composition are exercised in the simulation. Full eight-player browser autoplay from enclosure to exit was not run.


## Walking animation

All ten animals and the human keeper now have four generated walking poses, mirrored for leftward movement. Movement animates their limbs instead of shifting a single still picture. Freed NPC animals and keepers animate only when their snapshot positions change. Idle poses, portraits and unconscious keepers remain still. Reduced motion disables the walk cycle; tortoises use a slower cadence. The new original artwork and atlas crop layout are documented in `client/assets/README.md`.

Validation: `npm run test:e2e -- animation` passed all six checks for frame coverage, distinct poses, looping, leftward movement, idle poses and reduced motion. Phone portrait, landscape and tablet checks passed 24/24. `npm run build:single` includes both walking sheets.


## Classic artwork and finite supplies

The original code-drawn pixel artwork is the default again. All generated artwork and walking sheets remain saved in `client/assets/`, and adding `?art=detailed` to the game URL restores the newer art for that browser session. Both styles use the same game rules. The new control-house puzzle, eight-player rooms, keys and guard behavior remain.

Supply chests now occupy randomized reachable locations away from gates. Each enclosure chest contains two building bundles; scattered public chests contain six. Holding E takes one bundle, up to a carrying limit of two. Empty chests remain empty after capture and enclosure repair. A new mission resets chest stock and chooses new locations. Native animal abilities no longer require preparation at a bench; supplies are only needed for alternative building/digging routes.

Validation for the classic-art and supply update: 105/105 Node tests passed, including all 1,012 team compositions and live WebSocket integration. The classic/default and retained detailed-art checks passed 7/7; mobile passed 24/24; the eight-player control-house browser test passed 15/15. The single-file build completed. Supply tests cover deterministic seeding, varied placements, reachable locations away from gates, finite stock, full inventory, capture persistence, fresh mission stock, and abilities without preparation.


## Open maintenance yard

The original four north-side fuse bays and open lower maintenance yard are restored. The generator sits at its original central location, with eight sockets along its south side. Bays 5–8 are in a separate southern service annex, reached from the south promenade by the west passage. Eight-player puzzles remain supported without filling the main yard with a second row of walls. Patrol tests check the south keeper actually reaches both yard waypoints.

The generated epic logo is now used with both art styles. Characters, terrain, props and the console keep the classic appearance by default; `?art=detailed` still selects the saved detailed artwork.

Validation for the yard repair: 108/108 Node tests passed, including all 1,012 animal-team missions, live WebSocket integration, reachability of all eight fuse bays, and a keeper actually visiting both yard patrol points. The art browser suite passed 7/7 checks, including the generated logo with classic sprites. The running browser showed the open yard without page errors, and the single-file build succeeded.

## Parking-lot chapter and keeper scaling

Zoo patrols now scale at mission start: 1–2 players face six keepers, 3–4 face seven, 5–6 face eight, and 7–8 face nine. Added patrols use separate connected routes. Leaving a mission does not despawn its patrols.

After escaping Moonleaf Zoo, results include **Continue**. The host moves the active crew into the shared parking-lot chapter; disconnected teammates must reconnect first. Names and animals stay the same. Zoo keys are left behind, so players must steal fresh car keys from a parking-lot keeper. The lot contains three rows of parked cars, planted hiding islands large enough for bigger animals, and a getaway car parked in an ordinary stall. Every car uses the same newly generated classic pixel-art station wagon. Cars block walking and sight. Parking patrols scale from two keepers for solo play to six for eight players. Capture confiscates the animal’s keys and returns it to the zoo service exit.

After stealing keys, the thief receives a **Key fob** button. **Unlock** unlocks the car and flashes its lights for five seconds. **Panic** sounds its alarm and flashes the lamps for eight seconds; searching keepers investigate the noise. There is no special paint color or sign revealing the getaway car. Use **E** beside its door to board after unlocking.

The parking lot stays visible while first-person controls sit at the bottom of the screen. Hold the steering wheel and drag left/right to steer; release it to center. A/D also steer, W holds gas, and S holds brake when those jobs belong to you, so solo players can operate pedals while holding the wheel. Hold the gas pedal to accelerate, release to coast, and hold the brake to stop. Park/Reverse/Drive can only be changed while stopped. One player operates all four core controls in solo play. For two players, one gets steering and gears while the other gets gas and brake. Larger crews split these jobs and add handbrake, ignition, signals and navigation. Button-up, pointer cancellation, blur, and a short input lease clear held controls; a disconnected or missing crew member stops the car. Owners alone can operate their assigned controls.

Drive out of the stall, turn down the right-side aisle, and brake to a stop in the painted **EXIT** area. The car collides with other cars, planted islands and walls; Reverse can get it out of a tight spot. Everyone must be aboard and connected. Larger crews must also use their signal/navigation jobs. Hard-mode sight follows the car heading through the windshield; other obstacles still block vision.

This chapter ends with **Car stolen!** after driving the car to the lot exit. Driving between destinations and the other zoo/grocery/bank missions remain future work. Replay restarts the parking lot; returning to the lobby starts a fresh zoo adventure.

Rules and lifecycle: `shared/parking-game.js`, `shared/zoos/parking.js`, `shared/staff.js`, and `shared/room.js`. The client only displays controls and sends actions. `test/parking.test.js` covers team scaling, patrol reachability, Continue permissions, stage transfer, key theft, capture, car-control ownership, disconnects and cooperative completion for crew sizes 1–8. Browser suites: `npm run test:e2e -- parking` runs two-player, eight-player and phone-sized flows. These browser tests prepare zoo completion and freeze a keeper to isolate the new transition and theft; the zoo composition sweep still plays the full zoo missions.

Validation for the parking update: the full regression run passed 118/118 tests, including all 1,012 complete zoo team compositions and live WebSocket integration. The final focused parking run passed 11/11 tests, including a subsequently added empty-crew Continue check. Two-player, eight-player, and phone-sized parking browser flows each passed 12/12 checks. The standalone embedded solo build completed Continue and cooperative car setup without browser errors. The single-file build succeeded. Full guard-driven autoplay through both chapters was not run; parking browser tests isolate the new stage transition and use a stationary keeper for repeatable real key theft.


The generated car source is `client/assets/car.png`; it is loaded with both artwork styles and embedded in the single-file build. `shared/driving.js` supplies the shared moving-car footprint. The car simulation and fob rules remain authoritative in `shared/parking-game.js`; the client only renders the lot and sends control inputs. Tests exercise continuous steering/gas/brake, release and lost-heartbeat behavior, ownership, Reverse, collisions, fob permissions/lamps/alarm, and full drives for crews of 1–8.

Validation for the generated-car/fob/driving update: the full regression run passed 122/122 tests, including all 1,012 complete zoo team compositions. Final focused parking and wild-feature checks passed 29/29, including the newly added car-heading vision check. Two-player, eight-player and phone-sized browser drives passed 19/19 checks each; the Hard-mode drive passed 20/20, including rendered forward/rear visibility pixels. Tests use actual wheel drags and held gas/brake inputs to drive the car to the exit; zoo completion and a stationary keeper are fixtures isolating the new chapter. The standalone embedded solo build loaded the fob and verified keyboard gas, release and braking without browser errors. The single-file build succeeded.

## Larger-team fuse access and mobile playfield

Every active zoo player has a distinct fuse bay and fuse. Six players require six fuses; eight require eight. Bays 1–4 are in the main yard and Bays 5–8 are in the fuse workshop. Clearly marked **FUSE WORKSHOP 5–8 · E** stairs beside the generator now lead directly to that workshop; **BACK TO GENERATOR · E** returns with carried fuses intact. The original perimeter route stays available. Each entrance has a numbered fuse label, the player's bay is marked **YOURS**, and objectives list every assignment and its area. The open yard and central generator remain.

Objectives are hidden by default on desktop, phones and tablets. Tap the small **Objectives** button at the top left to open them, then tap again to close them. They overlay the canvas without shrinking the playfield. On touch devices, the team sidebar, ambient captions, persistent inventory text and idle prompts stay off the map. Relevant nearby action prompts still appear. The joystick and action buttons fit within safe screen edges; landscape arranges the action buttons along the lower right and keeps characters readable. Rotation closes objectives and releases movement controls. The canvas follows the visible viewport, and the landscape car cockpit is compact too.

Validation: 125/125 Node tests passed, including all 1,012 animal-team missions. Live six- and eight-browser fuse missions each passed 8/8 checks: every player solved a real bay, collected its fuse and filled a separate socket, with power completion synchronized to everyone. These isolate the fuse stage by placing escaped animals in the yard with keepers disabled; no fuses are awarded or pre-inserted. One concurrent eight-client run timed out; the isolated repeat completed. Mobile passed 64/64 checks across portrait/landscape phones and tablets, including in-game rotation, objective toggles, joystick release and non-overlapping controls. Landscape cooperative driving passed 19/19 checks. The build succeeded. Refresh the game and start a new room after deployment to load the new map and UI.

### Parking escape, city driving, and holding cage

The parking chapter now uses a larger lot with 24 vertically parked cars in several paint colors. Each visit selects a getaway stall; the same room avoids repeating its previous stall. The stolen fob identifies that car. Hold and drag the gear-shift knob between Park, Reverse and Drive while stopped. Drive through the real opening at the bottom right to finish the parking chapter, then choose Continue to enter Breakout City. The city is a 160 × 128 driving map with six stores and three zoo destinations. Stop near a destination to discover it; building interiors and their missions are not implemented yet. Shared driving responsibilities remain in effect. A moving car can knock down keepers, who remain unconscious for the rest of that chapter.

For crews of two or more, captured parking-lot animals go to a fenced holding cage. Any uncaptured teammate can use its outside latch without a key. If the whole active crew is captured, every animal must hold E beside a different wall section together for 1.5 seconds to open the door. Releasing a wall or disconnecting interrupts the collective hold. Solo captures still return the animal to the service exit. Control-house stations are now first-come, first-served: any animal may choose any free room, and each room admits only one animal. Leaving a waiting station frees it for someone else.

A muzzled animal can loosen its own muzzle with three garbage-bin rattles, with the usual bin cooldown and noise. A teammate must hold Bite for 2.5 seconds at close range to remove a muzzle; releasing early cancels the attempt. Original code-drawn running frames are supplied for all ten animals and the keeper, with bite frames for all ten animals, in the existing classic art style. The saved detailed artwork remains selectable. Car color variants use the existing original car asset with palette shifts; city buildings and streets are drawn in code.

Validation for this update: the full Node suite passed 132/132 tests, including all 1,012 zoo team compositions. The final focused rules run passed 49/49 checks, including room occupancy/reuse, multiplayer cage rescues for crews of 2–8, solo capture behavior, car knockdowns, muzzle holds/rattles, and city continuation. Automated parking drives also completed from 30 randomized placements. Real-browser checks passed for two- and eight-player parking drives, phone landscape driving with both cage-release paths, all eight players completing the control-house puzzle after choosing free rooms, theft/combat/muzzle interactions, and run/bite sprites. The single-file build succeeded. Zoo completion and stationary keepers are fixtures in parking browser tests; these are not a full guard-driven playthrough of all chapters. Railway deployment is triggered by the connected GitHub branch; its public endpoint was not verified from this workspace.

### Hidden chapter selection and revised Hard Mode

On the title screen, click all ten animal portraits in order from left to right, starting with the red panda and finishing with the flamingo. A wrong click resets the sequence (clicking the red panda starts it again). Completing the sequence reveals **Choose where to start** for this page session. Choose enclosure escape, the powered control house, parking-lot car theft, parking-lot driving with everyone aboard, or city driving. Then choose Play Solo or Create Online Room and select animals normally. For an online room, only the host chooses the starting chapter; animal selection, teammate readiness, and connection checks still apply. Refreshing the page hides the selector again. The control-house checkpoint supplies the required rescue/power progress, while the driving checkpoint supplies an unlocked car with the crew aboard; these shortcuts do not change a normal enclosure-escape start.

Hard Mode now keeps the map, scenery, other animals, and terrain behind walls visible. It hides keepers, their vision cones, and their markers unless they are within 10 tiles ahead of the animal with a clear line of sight. When aboard a car, the car heading determines forward sight. Normal mode and keeper detection/capture rules are unchanged. Hard Mode remains a per-player choice.

Validation: all 138 Node tests passed, including all 1,012 zoo team compositions. The secret-menu browser suite passed 12 checks covering wrong-order/reset behavior, every solo checkpoint, a two-player online city start, and phone taps. The wild-feature browser suite passed 14 checks, including visible terrain behind the animal and walls, and hiding rear, distant, and wall-blocked keepers. The two-player Hard Mode parking drive passed 22 checks through city continuation. The standalone build now checks embedded-script syntax; its driving checkpoint and Hard Mode were smoke-tested without browser errors over localhost. Direct file-URL testing was blocked by managed Chromium policy. The public Railway endpoint was not verified.

### City jobs: navigation, money, disguises, and animal control

Animals can board a stopped, unlocked car from any nearby side. Walls still block entry, and climbing out chooses an unblocked spot around the car. The navigator alone receives a GPS in the upper-left corner. Choose a destination on the navigator's panel to update the route and spoken-turn text; city routes follow street centers. The navigator can also see the parking-exit route when assigned that job in the parking chapter. Street asphalt, lane markings, sidewalks, parking bays, and parked cars distinguish the city from the zoo.

Park and climb out, then use E at the entrance to **Cedar Bank**, **Second Paw Thrift**, or **Animal Control**. These three buildings have playable interiors in the same shared world, allowing teammates to split up. The other city destinations remain landmarks for future missions.

The bank has twelve moving customers. Hold E close to an awake customer for 1.5 seconds to take $25; each customer can be pickpocketed once while awake. Biting a customer puts them to sleep, allowing a short E hold to take their remaining wallet. Wallets are finite. The first human bite calls animal control and starts a shared **120-second countdown**, displayed as a progress bar. When it expires, animals still inside the bank are captured; teammates who left in time remain free. Animal-control officers then patrol the streets. The bank vault opens only when every active, connected, uncaptured teammate holds E at the wheel together for three seconds. Releasing the wheel, moving away, or disconnecting interrupts progress. The vault holds $2,400 total; collect it in $200 bundles after entering the opened vault.

Captured animals are taken to the cage inside Animal Control, retaining money and purchased clothes. An uncaptured teammate can enter that building and open the outside latch without a key. If the entire active crew is caged, everyone must move to the cage door and make **two charged E hits each** (release E between hits). Removing an unavailable teammate cannot strand animals who already finished their hits. This recovery also works for solo play.

The thrift store sells **90 original pixel garments**: three shirts, three hats and three pants fitted to each of the ten species. Purchases validate the animal, available money, and store presence on the shared simulation. Buying automatically wears the garment; owned garments can be worn again free. Wearing all three categories provides a disguise against street patrols; biting a human exposes it until a complete outfit is worn again. Money, clothing ownership, equipped outfits, NPC wallets, and vault cash survive reconnects within the current city session. A new mission/replay creates a fresh city; this is not a cross-session account/save system.

Clothing art is original and drawn in `client/clothing.js`, with animal-specific fits and three styles per category in `shared/wardrobe.js`. Reusable transparent previews for all 90 garments, their catalog, and a contact sheet are in `client/assets/clothes/`. Run `tools/export-clothes.mjs` using the same Playwright/Chromium setup as the browser tests to regenerate them. The runtime draws the same garments on moving animals and generates shop previews locally; the single-file build needs no additional clothing downloads. Bank customers, city surfaces, parking lines, counters and clothing racks are original code-drawn art.

Validation for city jobs: the full Node regression run passed **149/149 tests**, including every one of the 1,012 zoo team compositions. The final focused city/parking run passed **36/36**, including added coverage for car exit/reentry, street-center GPS routes, interrupted vault holds and recovery after a captive is removed. Vault and all-captured escape rules cover solo, two-player and eight-player teams. Two real-browser players completed **17/17 checks on desktop and 17/17 at phone size**, covering navigator-only GPS, real building entrances/exits, theft, biting/countdown, the shared vault, purchases/disguises, deadline capture, teammate rescue and collective cage escape. These browser tests position animals near interactions to isolate the actual controls; they are not full autonomous city playthroughs. The standalone HTML build loaded city GPS, nine shop previews and a real purchase without browser errors when served locally. Clothing export generated all 90 PNGs and the full ten-animal catalog. Changes remain in the current draft; no environment publication or deployment was performed.

### Daytime rescue chapter: Northgate, pet store, and Wildwing Airport

The beaver's original Moonleaf enclosure now includes a reachable garbage can for its three-rattle muzzle-removal route. Bite range is 1.75 tiles with a slightly wider forward allowance and no bite cooldown between presses. Holding B still produces a single bite per press; walls, muzzles, captures and special movement states continue to block invalid bites.

A live map sits in the top-right corner. Click/tap it to enlarge or shrink it without pausing the simulation. It shows the current area, teammates and remaining caged rescue animals, and changes with building/floor transitions. It does not expose unseen keeper positions. The navigator's separate GPS remains at top left. Map, menu and key-fob positions have been adjusted so they remain accessible on phones.

Driving controls now sit at bottom left in place of the touch joystick. The steering wheel and pedals are independent transparent objects, with a draggable gear shifter and a working local radio selector, without the previous blue cockpit/card backgrounds. The radio cycles three synthesized music variations. `client/assets/cockpit-controls.png` is original artwork generated for this project, containing wheel, gas, brake, shifter, radio and ignition components; render bounds preserve the transparent individual shapes. The original Moonleaf escape remains at night; the parking lot and subsequent city/rescue areas use daylight.

**Northgate Zoo** is now playable from its city entrance. Its garden paths weave around hedges and unevenly placed habitats. Stairs lead to a separate upper terrace, and doors lead into the wetlands/bird house and habitat signal building. Floors and interiors have separate physical bounds and transfers. The city also has **Paws & Whiskers Pet Store** (replacing the cafe landmark) and **Wildwing Airport**. The other two city zoo landmarks remain planned destinations.

The new rescue objective requires every one of sixteen non-playable animals to run safely out of its cage: lion, tiger, rhinoceros, hippopotamus, gorilla, wolf, kangaroo, capybara, otter, crocodile, peacock and sloth in the zoo, plus rabbit, guinea pig, cat and dog in the pet store. The playable selection remains the original ten animals. Original generated artwork is in `client/assets/rescue-animals.png`. Runtime run cycles provide four distinct poses in both directions per species; reusable exported sheets and a catalog are in `client/assets/rescue-sprites/`, regenerated with `tools/export-rescue-sprites.mjs` using the browser-test setup. These assets were created for this project; no third-party image downloads were added.

Each active player has a distinct habitat relay fuse: numbers 1–4 in the gardens, 5–6 upstairs, and 7–8 in the wetlands house. Everyone must collect and insert their own fuse at the garden generator. The signal house then requires one operator per station, all power buttons, and five tasks per operator. Its unique dials, levers and buttons get instructions from other screens, assigned randomly without naming recipients in the visible instructions. Readers can change between tasks; funny clues include animal sounds. A three-minute break-in timer captures an unsuccessful crew but preserves relay and rescue progress. Solo has a radio-partner version of the same tasks. Key cages use reusable keys stolen from keepers; powered and signal cages depend on the matching team objectives. The rhino, gorilla and dog habitats each require every teammate to hold their own numbered handle together. Disconnection/release interrupts shared holds, and removing an unavailable player adapts the required participants and instruction routing.

Visitors walk near habitats. A witnessed release queues a three-second phone report describing the animal and its hat/shirt/pants. Delivered reports put keepers on alert and make the reported appearance recognizable across the district. Changing the outfit breaks that match; hiding and line-of-sight rules still apply. Hidden animals do not generate a release report. Biting a visitor exposes the animal and enables the established high-alert/dart consequences. Visitor phones visibly appear during calls.

Zoo/pet-store captures return the animal to a garden holding cage, retaining money, clothes, relays and rescues. An uncaptured teammate can open its latch. If the whole active crew is captured, zoo captives must hold E at different wall sections together for 1.5 seconds. Bank/street captures retain the existing Animal Control building and two-hit emergency door rule. The two capture locations do not remotely open each other's cages.

The airport opens only after all sixteen zoo/pet-store animals have physically evacuated. Everyone must board the plane and operate their assigned flight controls. Eight aircraft jobs are shared across the active crew (all eight for solo); with all correct and everyone aboard/connected, the plane moves down the runway and flies away, completing the chapter. This is a cooperative takeoff sequence, not a free-flight simulator. Players may climb out before takeoff to rescue a teammate. The new animal animation and aircraft/rendering art is separate from the original playable-animal artwork.

City rendering now allocates a map canvas for the current floor/interior instead of the entire multi-floor world, keeping each canvas under mobile area limits. The standalone build embeds the new generated artwork and needs no extra asset downloads.

Validation for the daytime rescue update: the full regression run passed **166/166 tests**, including all **1,012** original-zoo animal-team compositions. The final focused rescue/city/parking/combat run passed **69/69 checks**, including new cases for departed operators, climbing out of the plane before takeoff, hidden releases, and real guards recognizing then losing a changed outfit. Patrol-free automated crews of **1, 2, 4 and 8** completed all relays, five signal tasks each, all sixteen physical evacuations, and the shared aircraft takeoff. These completion fixtures supply keeper keys; they do not claim a full autonomous playthrough against patrols. Guard routes were checked for reachable waypoints and finite motion.

Two real-browser players passed **15/15 desktop checks** and **16/16 landscape-phone checks** through the whole new chapter: live-map expansion while time advances, transparent generated controls/radio, stairs and animal houses, relays, communicated signal tasks, every zoo/pet cage, both rescue paths, boarding and takeoff. A separate phone parking drive passed **21/21** through the city transition. The bank/thrift browser flow passed **17/17**, and the invite/combat/Hard Mode flow passed **14/14**. Generated species exports verify four distinct running frames in each direction for all sixteen species. The self-contained HTML build loaded the new images and all run cycles, entered the zoo, enlarged the live map, and reported no browser errors over localhost; its garden-area canvas used 1,921,280 pixels, below mobile canvas limits. These browser tests position animals near interactions to isolate actual inputs, rather than walking every route manually. The build and whitespace checks succeeded. The public Railway endpoint remains unverified from this workspace.

### City crowds, hardware tools, and shared or solo cars

The city supports multiple cars at the same time. Everyone starts together in the crew car. A street pedestrian carrying car keys can be pickpocketed by holding E at close range; slow movement is allowed during the theft. The stolen key fob flashes/unlocks that person's parked car, or sounds its alarm. There are eighteen stealable parked cars in addition to the original crew car, with varied colors, and six moving traffic cars. Captures confiscate car keys. This feature is limited to the city; the parking-lot chapter still requires the whole team in its shared getaway car.

**Shared driving remains available throughout the city.** Any unlocked stopped car can hold the whole team, with separate steering, pedal, gear and other jobs. Players may split across different cars, or travel alone. A solo driver receives all essential controls. Jobs are reassigned when passengers board, leave or are removed; a car stops during reassignment. An occupied car only waits for its own passengers to be connected, so a teammate walking elsewhere does not prevent driving. Controls, heartbeat safety, collisions and key ownership run in the shared authoritative simulation. Every moving car appears in multiplayer snapshots and blocks movement and vision.

The navigator's GPS starts on its map. Click/tap the map or enlarge button for a bigger unit; **Back** opens its destination choices. Selecting a destination returns to the route and turn instructions. Destination buttons no longer occupy the bottom-left driving controls in the city. Each car has its own navigator and route cache. Enlarging GPS does not pause the game.

Cedar Bank now has a compact lobby and a small vault holding $12,000, collected in $500 bundles. Its fourteen customers wander rather than standing in place. Biting a customer makes the other awake customers flee and starts the existing two-minute animal-control timer. The vault wheel still needs the entire active team. Beaver Hardware has an accessible interior and sells reusable crowbars, cutters, wrenches and hand drills. Each player must own at least one tool and hold their numbered handle alongside all teammates to open the gorilla habitat; tools survive capture. The campaign autopilot now obtains cash and buys a tool before proceeding to the rescue objectives.

The city has 54 roaming pedestrians and the zoo, upper terrace, animal houses and pet store have additional visitors who can stop to watch habitats. Visitors are placed outside closed cages, follow passable paths and retain their delayed witness-report behavior. Extra garbage cans across the city and rescue areas can distract guards and loosen muzzles.

**Art:** `client/assets/city-props.png` is original generated pixel artwork made for this project: teller desks, vault door, banknotes, ATM, tool shelf, checkout, pegboard and tool crate. The sixteen rescue species now use original code-drawn **16×16** sprites in `client/rescue-sprites.js`, matching the original playable animals. Four running poses in each direction are exported under `client/assets/rescue-sprites/`. The previous generated rescue atlas remains in `client/assets/rescue-animals.png`, with its renderer preserved in `client/rescue-sprites-detailed.js`; `?art=detailed` selects that preserved art alongside the other detailed assets. The original playable animals and logo are unchanged.

Validation for this update: the full Node regression run passed **178/178**, including all **1,012** original-zoo team compositions. The final focused city/fleet/rescue/parking run passed **64/64** after adding checks for separate-car disconnects, independent navigator routes, unblocked bank exits and visitors spawning outside closed habitats. Teams of **1–8** retain shared city driving; eight simulated players can drive separate cars simultaneously. Patrol-free rescue bots for **1, 2, 4 and 8** obtain bank cash, purchase tools and complete the rescue chapter (keeper keys are supplied by these fixtures).

Real-browser checks passed **20/20 desktop city**, **24/24 phone city**, **16/16 landscape-phone rescue**, **21/21 phone parking**, and **5/5 standalone HTML**. City phone checks include real pedestrian key theft, key-fob unlocking, solo controls, boarding to restore shared roles, and separate simultaneous drivers. Browser fixtures position players near interactions to isolate the actual controls. All sixteen exported rescue species have four distinct running frames in both directions. The standalone build and whitespace checks pass. These changes are saved in the draft; this update does not publish or deploy the environment.

### Compact city interiors and persistent animal rescues

Second Paw Thrift is now **19×17 tiles** (83% less floor area than the previous 43×45 room), with hanging shirts, a hat stand, trouser rack, dressed mannequin, checkout, fitting mirror and donation basket. `client/assets/thrift-props.png` is original pixel artwork generated for this project, with a transparent background; the original playable-animal art remains unchanged. Clothing displays keep their shared collision shapes while their floor tiles render as indoor flooring rather than machine blocks. All ninety fitted garments and the existing buying/equipping rules remain available.

Animal Control is **37×30** instead of 53×45, roughly half its previous area. It has a separate player holding cage and three smaller rescue cages containing a dog, cat and rabbit. Uncaptured animals can hold the action button at each rescue lock. These three animals join the twelve Northgate animals and four pets in the city rescue objective: **19 rescues** before airport departure. The player holding cage still supports teammate rescue, or two charged door hits per player when the whole team is captured.

Northgate's gardens are now **62×50** instead of 95×79. Its main habitats are **14×11**, matching the first zoo's enclosures. The upper terrace, wetlands/bird house, signal house and pet-store interior are also smaller. Winding paths, stairs and separate buildings remain, with all eight numbered fuses and all eight possible operators' handles/stations reachable. Physical directional signs identify the upper-terrace and bird-house fuse wings, generator, signal house and city exit. Habitat labels, shelters, feeders, climbing frames, ponds, fountains, flower beds, benches and lamps provide zoo scenery. Shelters and display art are decorative; walls, gates, hedges and listed objects remain authoritative collision shapes.

Rescued animals run out of their open cages to an evacuation point, then appear outside their source building and continue running around the city. They remain in synchronized snapshots, retain their classic running sprites, and continue to count as rescued. Their paths avoid blocked tiles and recalculate around cars. Animal Control rescues use this same behavior.

Building transfers now choose a clear arrival with enough connected walking space. When a car covers the normal door position, the search stays within the destination area's permanent walls and closed gates and finds a nearby open arrival. The city also recovers loose players overlapped by a vehicle or isolated in a tiny collision pocket. Captured players, occupied puzzle stations, aircraft passengers and special movement actions are excluded, so this safeguard does not bypass cage-rescue rules. Collision regression tests cover all ten playable species, six building exits and three parked-car angles per exit.

Validation: **187/187** Node tests passed, including all **1,012** original-zoo team compositions. A final focused run passed **49/49** after the last thrift-layout refinement. Patrol-free teams of **1, 2, 4 and 8** complete the resized relay, signal, nineteen-rescue and aircraft objectives; these fixtures supply keeper keys. Every guard-route segment was checked for a traversable path. Real-browser checks passed **10/10** for the compact scenes/art/blocked exits/roaming animals/signs, **24/24** for phone city shopping, capture/rescue and shared/individual cars, **16/16** for landscape-phone rescue progression, and **5/5** for the standalone HTML. Browser fixtures position players near interactions to isolate actual controls. The self-contained build and whitespace checks pass. This update remains in the draft and has not been pushed or deployed.

### Cars can be shoved out of the way

Cars in both the parking lot and city can be displaced. Driving into another car now makes the cars creep at **0.55 tiles/second** instead of treating the other car as a permanent wall. Reverse works the same way. A line of cars can be pushed together; the entire move is checked before anything moves, so a wall, building, hedge or closed gate stops the chain without overlaps or partial movement.

On foot, walk or lean the joystick continuously against a car to build pushing effort. Most animals need **five seconds**; the existing large-animal group—**elephant, giraffe and zebra**—needs **one second**. A visible meter shows effort. Continue walking to keep shoving; releasing movement, changing target/direction, disconnecting, entering a car, capture or another task resets the effort. This action is available while muzzled and does not need tools or a salvage bench. Each animal's original special ability remains unchanged.

Parking-lot scenery cars are now synchronized movable bodies; only the designated getaway car can still be boarded there. City cars retain shared/individual driving, locks, keys and ownership. Traffic briefly yields when bumped. Moving cars update passenger positions, collision/vision footprints, both clients' snapshots and the parking navigator's car markers. Pushes stop before pinning an on-foot teammate. The movement and timing rules run in the shared authoritative simulation; clients send their ordinary movement inputs.

Validation: the full regression run passed **196/196**, including all **1,012** original-zoo teams. The final focused push/parking/fleet run passed **43/43**, including added tests that a car cannot pin a teammate and that rotated cars can be pushed from every side. Threshold tests cover every playable animal in both parking and city. Real two-player browser checks cover slow car-on-car shoving, matching snapshots, five-second beaver pushes, one-second elephant pushes, interruption and a phone-size effort meter; mobile parking passed **21/21**, mobile city passed **24/24**, and the standalone game passed **5/5**. The build and whitespace checks pass.

### Close driving and host checkpoint codes

Vehicle contact now follows a **3.3×1.64-tile body**, with just **0.02 tiles** of contact clearance. Collision, terrain sampling and the client/server vehicle footprints share these dimensions; mirrors and the artwork's glow no longer create a large invisible cushion. Cars can pass closely side by side, and the previous slow-shoving and animal-pushing rules still apply. Cars can cross grass, bushes, hedges, trees, rocks, small fences and other landscaping. Buildings, map boundaries, reinforced structures and closed objective gates remain solid.

The host's menu now includes **Pause & Save Group**. It freezes the simulation for everyone, releases held movement/driving controls, and generates a ten-character checkpoint code (with a versioned `BB1` downloadable backup). Other players see the pause and only the host may resume. Movement, purchases, vehicle/panel actions, chat and emotes cannot mutate the paused game. Pausing also freezes disconnected-player grace timers; a replacement host can resume if the previous host disconnects.

To keep and resume group progress:

1. As host, open **Menu → Pause & Save Group**.
2. Use **Copy progress code** or **Download save** and keep the complete code. The latest code is also stored on this device.
3. Later, open **Resume group progress** on the title screen. Paste the code or choose **Use last save from this device**.
4. Create a new online room, invite the new group, choose animals and start. The same code also works for solo play.

Ten-character codes refer to checkpoint files on the server. Attach durable storage using the steps below to keep them across deployments. Downloaded `BB1` backups carry the data themselves and remain portable without server storage; old backups still load. Backups have a format version, strict bounds and a damage-detection checksum. They are cooperative progress files, not authenticated competitive records.

Saved progress includes the chapter; escaped animals and completed fuse insertions in Moonleaf; an unlocked getaway; city rescues, completed habitat power and signal objectives, opened/depleted bank vault and customer wallets; cash; tools; and purchased/worn clothing. The host's current district determines the safe city entrance on resume. Positions, chases, captures, muzzle state, partial console sequences and unfinished team tasks are reset. Already released animals return as city wildlife. Completed team puzzles adapt to the new **1–8-player** roster. Cash is pooled and divided across the new crew; matching animals keep their outfits, unclaimed outfits can be refitted to replacement animals, and unused tool copies remain in the checkpoint rather than being duplicated or lost.

Validation: **211/211** regression tests passed, including all **1,012** original-zoo team compositions. The final focused save/room/driving run passed **35/35**, and checkpoint-specific checks also verify a paused disconnected player remains in the crew beyond the normal grace period. Restoration tests cover fresh rooms, all chapters, changed species, groups of **1–8**, no duplicated cash/tools, incomplete-puzzle resets, original-zoo rescue/fuse progress, bad codes and host migration. Real-browser save checks passed **15/15**, including a phone-size host panel, a downloaded code, a two-player checkpoint resumed by three players, solo use, and retrieval after reloading the device. Close-driving/pushing passed **9/9** browser checks, mobile parking **21/21**, and the standalone HTML **5/5**. The standalone build and whitespace checks pass.


### Anonymous command stations, shops, food and short saves

Both command rooms now give each of eight players a disjoint set of named controls. Commands contain only the action, such as `Raise PICKLE PUMP` or `Set BANANA BOOSTER to 3`. Each completed task reshuffles unfinished clues across readers, including their own station. Recipient names never appear in the visible command. Stations have different four-to-six-control arrangements and still require five tasks each. Shared cage, habitat and vault holds expose circular progress instead of an indefinite indicator.

Stores now require a physical visit to labeled shelves: hold **E**, select an item, close the shelf menu, then hold **E** at the **Cashier** to pay. Thrift shelves separate Hats, Shirts and Pants. Hardware tools are used at the gorilla habitat, with an animated tool and a specific work prompt; every teammate must bring a tool and work together. Acorn Groceries sells meat, fish and bananas. The lion requires a key and one food item to lure it outside; the food is consumed. Paid food and tools are saved. Unpaid items are excluded from checkpoints. Players may return unpaid items while browsing. Leaving a store with unpaid goods calls police, whose patrol, investigation and pursuit speeds exceed the zoo keepers'. Police have navy caps and a gold badge.

Ambient cars yield briefly and plan a collision-checked detour around blocked roads, rather than waiting indefinitely. Detours stay on the road network. Player driving and shared car roles remain available.

**Railway storage for ten-character progress codes:**

1. Open the Railway project and select **breakout-beasts**.
2. Add a **Volume** from the project canvas (or the service's **Volumes** section) and attach it to that service.
3. Set its mount path to **`/app/data`**.
4. Under service **Variables**, set **`RAILWAY_RUN_UID=0`** so this Docker image can write to Railway's root-owned volume.
5. Apply the changes and redeploy. Railway supplies `RAILWAY_VOLUME_MOUNT_PATH`; the app writes to its `checkpoints` subdirectory. For other hosting, set `CHECKPOINT_DIR` to a persistent writable directory.
6. As host, use **Menu → Pause & Save Group**, keep the ten-character code, and **Download save** as a portable backup. Verify that code in a fresh room after a restart before relying on it.

The volume must be attached before codes are relied on across deployments. Without it, server codes last only as long as the container's files; the UI recommends downloading a backup. Browser-only standalone play caches a short code on that device and offers a full backup for moving to another device. If both server and browser storage fail, the UI provides the downloadable backup without displaying an unusable code. Save files use exclusive random ten-character names, bounded decoded data, and API save rate limits. Codes can be shared with anyone who should resume that group.

Validation for this update: **221/221 final regression tests** passed; the separate original-zoo sweep completed all **1,012** team combinations with zero deadlocks, and its keeper-enabled mission passed too. The first full run identified an old lion-rescue fixture that did not supply food; that fixture was updated for the new requirement and passes in the final regression run. Campaign autopilots now collect tools and food from shelves and pay at cashiers before completing the rescue chapter with **1, 2, 4 and 8 players**. Browser checks passed **31/31 desktop city**, **31/31 phone city**, **15/15 eight-player command room**, **15/15 rescue chapter**, **15/15 group saves**, and **5/5 standalone HTML**. Short-save tests reopen persisted files through a new store and restart the HTTP server before loading the code. Traffic tests cover detouring around a parked car and two minutes of intersection flow. The standalone build and whitespace checks pass. Railway volume attachment and production deployment health must be checked in the Railway dashboard.


### Running, tunnels and breakable terrain

Every animal can run at **1.9× walking speed** using **Shift** or the on-screen **Run** button while moving. A small stamina bar lasts four seconds of continuous running and refills while walking or resting. After exhaustion, release Run and recover at least 30% before sprinting again. Zebra keeps its existing Space dash/kick; all animals also have the shared stamina run, and their other abilities remain available. Running makes noise. Captures, shell mode, cages, interaction holds and vehicle controls prevent running.

Moonleaf requires freeing **all NPC animals**, rather than three, before the control-house puzzle becomes available: nine rescue cages in solo, down to two with eight players. The playable crew still needs to leave together. Loading an older control-stage save restores its actual freed animals without automatically satisfying the larger rescue objective. The secret control-house test shortcut opens all NPC gates.

Breakout City now has only **Northgate Zoo**. The two other zoo buildings/destinations are replaced by Sunspire Library and Frostfern Cinema; the thrift store, bank, pet store, airport and other locations remain.

Meerkat can choose an exit within **ten tiles** from clear ground, then hold **Space / Ability** for 2.2 seconds to dig and emerge there. The destination picker shows nearby terrain and does not pause the game. Escape or Cancel closes it. Exits must be clear, inside the current area and in range; walls, water, occupied spots, map boundaries and other interior scenes are rejected. Existing marked-soil puzzle tunnels retain their preset exits. New tunnels are reusable with **E** from either end. Small animals fit one tunnel; digging a second endpoint directly beside an existing endpoint widens both tunnels for elephant, giraffe and zebra. Wide entrances render larger. Tunnels and unfinished terrain damage reset at safe checkpoints.

Elephant, giraffe and zebra can face an ordinary wall or tree and hold **Space / Ability** to charge each impact for 1.2 seconds. Release between hits. Walls need **five impacts**, trees **two**. Damage is shared between players and every impact makes a loud noise that draws nearby keepers or police to investigate. Broken terrain becomes walkable rubble. Reinforced barriers, occupied fixture tiles, closed objective gates and the outer map boundary retain their own rules. Enclosure capture resets its terrain damage with the enclosure.

Validation: **229/229 final regression checks** passed, including the real WebSocket mission with every remaining Moonleaf cage required and the older-checkpoint compatibility check. All **1,012** team compositions completed with zero deadlocks; the keeper-enabled mission also completes with the autopilot using stamina running near guards. The online mission test now allows time for the longer rescue objective and cleans up its timer and clients on timeout. New multiplayer browser checks passed **19/19** on desktop and phone, including stamina recovery, ten-tile exit selection, Escape cancellation, narrow/wide tunnel access, synchronized terrain changes, and guards responding to impact noise. The standalone HTML passed **5/5** browser checks; build and whitespace checks pass. No new image assets were needed; wide holes and rubble use the existing pixel artwork style.

### Team scores, medals and extremely official awards

Every zoo, parking-lot and city escape result now includes a **team round score out of 10,000**, a readable breakdown and one funny performance award per participant. Completion contributes up to **3,500** points, efficiency up to **3,500**, and elusiveness up to **3,000**. Every capture deducts a separate **300 points**, with the final score bounded at zero. New sightings cost 150 elusiveness points; alarm/report events cost 100. Guard radio fan-out is debounced per player for five seconds. Making noise to distract guards does not itself reduce elusiveness.

Efficiency decreases with active stage time against stage-specific pace targets: Moonleaf uses 240 seconds plus 30 seconds for each missing crew member below four; parking uses 120 seconds; the city uses 720 seconds. Efficiency is `round(3500 × max(0.1, 1 − elapsed / (3 × target)))`. Task points use completed stage objectives, not button presses or repeated cash collection, and a completed stage earns all completion points. Medals are **Bronze at 5,000**, **Silver at 7,000**, **Gold at 8,500**, and **Platinum at 9,500**. Below Bronze there is no medal for that round.

Awards use actual rescues, completed controls, stolen keys, muzzle assistance, digging, shared mechanism holds, running, driving roles, noise, cash, bites and captures. Examples include **Chief Cage Unclencher**, **Certified Button Goblin**, **Muzzle Removal Dentist**, **Cardio With Criminal Intent**, **Walking Pots-and-Pans Drawer**, and **Frequent Flyer, Enclosure Airlines**. Every player gets a distinct title and an explanation, including quieter crew members and players who left before the finish. Repeated control steps do not inflate task credit. Cooperative habitat rescues credit all helpers. Award selection is deterministic and never consumes the gameplay random generator; awards do not add farmable team points.

The server/solo shared simulation produces a versioned `results.score` record containing stage, crew size, completion, elapsed time, total, medal, breakdown, awards, and practice/checkpoint-resume flags for later leaderboard integration. Each stage or replay starts a fresh round. A resumed checkpoint starts a new scoring round from that safe checkpoint and is marked as resumed. Normal multiplayer clients receive the same calculated result; they never submit a score. Phone result panels scroll through all eight awards, and gameplay maps/driving overlays are hidden while viewing results.

Validation for scoring and the combined update: **239/239 tests passed**, including all **1,012** original-zoo team compositions and the keeper-enabled mission. Score checks cover all three stages, capture penalties, time efficiency, sightings/alarms, score bounds, repeated-action farming, cooperative attribution, distinct player awards, stage resets and resumed-round flags. Real desktop/phone result checks passed **12/12**, including identical results across clients, all eight awards, medals, visible capture deductions, unobstructed phone layouts, chapter transitions and replay. The running/digging/destruction browser checks passed **19/19**, and standalone HTML checks passed **5/5**. The final build and whitespace checks pass.


### Hidden desktop mission completion for transition tests

During desktop play, the host can type **`breakoutbeast`** directly on the keyboard. There is no field, button or visible menu entry. The complete word is case-insensitive and must be typed consecutively, with no more than four seconds between letters. Normal keyboard controls keep working; typing the word in chat, another text/editable field, a menu, or while paused does not activate it. Losing focus or changing screens clears a partial sequence. Phone/tablet browsers do not enable the sequence, including phones with a keyboard attached; touch laptops with a mouse/trackpad remain supported.

The host-only action completes the current stage's tasks for the active crew and keeps the game playable. Players retain their positions and can explore. Leave Moonleaf through its exit, drive out of the parking lot, or board and fly the plane to finish normally and reach results / **Continue**. In the city it completes rescues and power/signal tasks and prepares the airplane for boarding. It also clears captures/holds and queued input so testing from a cage or interaction does not strand the transition. It works in desktop solo and online rooms. Guests cannot skip a host's game. Test-completed rounds are marked as practice in score records for future leaderboard handling. The shortcut never automatically ends the mission or opens results.

Validation: **244/244 regression tests passed**, including all **1,012** original-zoo team compositions. Hidden-code checks cover exact/case-insensitive matching, partial words, timeouts, repeats, editable fields, mobile/tablet classification, host permissions, paused games, cleanup and one/two/eight-player completion across all stages. Real browser checks passed **11/11**, including desktop solo, host/guest behavior, chat exclusion, typing while driving, normal results/Continue transitions and phone blocking. The standalone HTML passed **6/6**, including the hidden code while browsing a hardware shelf. Final build and whitespace checks pass.


### Police response and prison

Opening the bank vault starts a police response within 30 seconds, shortening any longer pending alarm. Each vault cash grab requires an uninterrupted five-second action hold. Police continue searching on foot and in patrol cars; their keys can be stolen to unlock and drive their cars, including shared driving. Current disguises delay identification. Police remember identified outfits, so changing clothing can evade the description; wearing the old outfit again remains risky.

Police captures send animals to the City Police Station. It has eight lock stations, but the door requires **one unlocked lock per currently captured animal**, regardless of total group size. One prisoner in an eight-player group needs one lock. Free teammates can help. Hold action near a lock until the circle fills, then solve its maze, donkey-tail or key-path game. Each station permits only one animal at a time. The next capture starts a new set of locks.

The driving GPS moves beside expanded objectives when space permits, or below them on narrow screens. New police sprites and patrol-car art are original code-drawn pixel art, with no external assets.

Validation for this update: the full Node suite passed **254/254**, including all **1,012** Moonleaf team compositions. Additional checkpoint and mixed-capture isolation checks passed after the final changes. Multiplayer browser tests cover all three prison games, one-lock rescue by a free teammate, visible action-hold progress, and GPS/objective separation at 1200, 844 and 390 pixels. Task-only shortcut checks passed across all three stages, and the standalone build passed its browser checks.

### Wildwing airport and shared runway takeoff

The airport now has 24 roaming passengers and a visible security scanner. Wear a complete hat, shirt and pants disguise and interact with security before walking to the boarding stairs. Changing the checked outfit invalidates boarding clearance. All city animals must still be rescued before boarding.

Once every connected animal boards, the cockpit fills the screen: a pixel aircraft rolls right across a scrolling runway above each player's unique controls. Everyone sees the same ordered checklist. Eight controls are divided across the active crew, with speed gates at 35, 55, 75 and 85 knots and eight-second action windows. Premature, out-of-order and other players' inputs cannot advance tasks. Running out of runway or missing a deadline crashes the attempt. Retry restarts takeoff and keeps city rescues intact. The banana horn sends harmless silly sounds to teammates, with a short spam limit. Aircraft, runway, scanner and cockpit art are original code-generated pixel graphics; no external assets were added.

Validation: all 1,012 original-zoo compositions complete without deadlocks. Full city campaign simulations reach takeoff with 1, 2, 4 and 8 players. Focused runway checks cover all crew sizes, costume security, ownership/order rules, deadlines, runway exhaustion, retries and harmless horn rate limits. Real-browser checks pass security, boarding, a crash/retry and successful takeoff using the cockpit controls, with no browser errors. The older boarding and police-car fixtures were updated for security clearance and a clear boarding location and passed their reruns. Standalone build and whitespace checks pass.

### Pooled airport fee, civilian wallets and vault searches

Airport security requires the whole connected crew together in full disguises. The fee is $100 per animal, paid from combined team cash: two animals with $20 and $180 can pay the $200 total. No money is taken until everyone is present and the group can afford the full fee. Contributions never make a balance negative. Payments are saved per animal in checkpoint codes; checking a changed outfit does not charge again.

Any nearby human can be pickpocketed for $1 once. Biting lets the animal take a $20 wallet once, makes the local crowd flee and dispatches searching animal-control officers to that scene. Keys remain a separate theft action. Entering the bank vault raises police alert and makes the vault the officers’ search priority without shortening the 30-second arrival countdown; an outfit seen inside is identified without the normal disguise delay. Cash/action captions now appear above bottom action prompts, clear of the top status bars, including touch layouts.

Validation: all 1,012 Moonleaf team compositions pass. The full run's two outdated airport/campaign fixtures were updated for the fee and the harder bank patrols, and their reruns pass. The rescue-puzzle campaign uses funded crews to isolate relays, consoles, rescues and takeoff from bank combat. Focused tests cover pooled $20/$180 payment, insufficient funds, absent teammates, duplicate payments, saved fees, $1/$20 theft across scenes, local animal control and immediate vault identification. Browser checks cover group payment, hardware-store theft and popup visibility at desktop/landscape/portrait sizes.

### Flight caller and police runover reinforcements

Each multiplayer takeoff attempt randomly chooses one caller, who alone receives the command checklist. The other players get distinct sets of aircraft controls and share the speed/runway view. Their controls do not highlight or disable themselves to reveal the next command: pilots must listen to the caller and report their settings. Control assignments and command order are shuffled each attempt, within preparation and acceleration phases so speed gates remain achievable. Solo play shows all commands and controls together. If a caller leaves the room, another player takes over and control ownership is reassigned to the remaining crew.

Running over a city police officer keeps that officer permanently down for the chapter and alerts police. Each newly run-over officer schedules exactly two reinforcements fifteen simulation seconds later: two arrivals minus one downed officer means one additional active officer. Separate collisions keep separate deadlines. Hitting the same already downed officer does not schedule more officers, and routine backup checks do not double-count permanent casualties.

Focused tests cover caller privacy, randomized readers/orders, unique control ownership, solo play, caller departure, all crew sizes and independent police reinforcement deadlines. Multiplayer browser checks verify private commands, absence of pilot hints and cooperative takeoff without browser errors.

Validation for this update: the full suite passed 265/265 tests, including all 1,012 team compositions with no deadlocks. Additional focused reruns passed the final caller-departure and independent runover-deadline cases. The two-player caller/pilot browser flow completed takeoff with private commands and no browser errors; build and whitespace checks pass.

### Bank arrival timing and prison escape consequences

Biting someone in the bank starts a full 120-second response countdown. Bank incidents never use the faster neighborhood responder queue, and repeat bites do not restart the timer. Opening the bank vault keeps the full 30-second police response countdown. Entering the vault raises alert and records it as the bank officers' search priority; it neither spawns officers nor shortens their arrival timer. Once police arrive, they prioritize that recorded vault location and immediately identify an outfit they see inside.

Unlocking the police prison alerts up to four existing nearby street officers and sends them toward the station. Escapees and free rescuers already inside receive a 20-second getaway allowance, which survives passing through the exit door. Officers arriving early wait outside until the allowance ends, then enter and search the station. This response does not spawn extra officers.

Police capture immediately removes all cash, worn clothes and owned disguises, including clothing cached from a resumed checkpoint. Teammates keep their possessions; tools and non-clothing shop items keep their existing rules. Prisoners must earn new money and acquire new clothes after escape.

Focused simulation and multiplayer browser checks cover preserved bank timing, vault-search priority, confiscation, unchanged teammate inventory, getaway protection through doorways, and the player-facing escape warning.

Validation: all 1,012 team compositions completed without deadlocks. The bank/prison focused suite passed 19 checks, save/shortcut regressions passed 21, and the multiplayer browser flow passed all six checks without browser errors. A syntax typo in the revised vault test was corrected and that test passed on rerun. Build and whitespace checks pass.

### Wanted cars, five-hit tasers and police reset

Running over an officer marks that specific car as wanted. Officers who see it can fire tasers in range with clear sight; each officer has a firing cooldown. Four hits leave the car usable, and the fifth disables its engine until the police reset. Nearby officers approach different sides of the car. Two officers surrounding a stopped car for two seconds tranquilize its occupants and send them to police jail. Animals may climb out and flee; a stopped ordinary car also does not conceal visibly recognized animals. Current disguises retain their recognition delay in an ordinary stopped car. Wanted-car hits and disabled state appear in the car status display, with electrical effects on the vehicle.

The elevated police presence and runover reinforcement queues remain until every active animal is physically jailed at the police station. Capturing only part of the crew does not reset them. Once all are jailed, outstanding reinforcements and dispatch alarms are cancelled, wanted-car records clear, disabled vehicles reset and police return to their normal starting numbers. This reset happens once per all-jailed event; it does not free the prisoners.

Ambient event popups—including police backups, shell bumps, alarms, sightings and taser warnings—are suppressed. Capture notifications stay visible. Direct cash/payment feedback and player emotes remain available; taser progress and alarms remain in their HUD displays.

Focused simulation tests and a two-player browser flow cover the five-hit threshold, stopped-car arrests, clear sight, partial/full jail resets, suppressed ambient warnings, preserved capture notifications and visible taser status.

### Boarding score screen and the takeoff chapter

When every connected animal boards at the airport, the city chapter ends with its team score, medal and player awards. The host's **Continue** button starts a separate Wildwing takeoff chapter with a fresh timer and its own score. Waiting for other animals to board does not start the runway clock. The existing randomized caller/controls, speed gates, five-hit vehicle rules and capture-only ambient-warning policy remain in place.

The secret start menu now includes **Airport — security and boarding** and **Plane — runway takeoff**. The airport test start supplies completed rescue objectives, fitted disguises and the pooled security fee so the crew can test boarding. The takeoff start places the crew aboard immediately and begins the playable runway challenge. These direct starts are marked as practice, including continuation from the airport shortcut. Safe progress codes also support restarting the takeoff chapter.

Tests cover partial boarding, city score/Continue, host permissions, takeoff scores and saved-flight restoration. A real two-player browser flow passed airport boarding, the score screen, Continue, private caller/pilot controls and successful takeoff; a separate solo browser start opened all flight controls directly from the secret menu.

The hidden desktop task-completion word also supports the takeoff chapter: it prepares every flight control and leaves the scene open. Choose **Take off** when ready to finish that practice attempt; typing the word does not force the results screen.

Final validation: the full suite passed **278/278**, including all **1,012** original-zoo team compositions. Focused reruns passed the final vehicle-surrounding and takeoff-shortcut changes. The multiplayer vehicle-arrest browser flow passed seven checks; the boarding/Continue/takeoff flow passed nine, including a direct solo takeoff start. Both had no browser errors. Build and whitespace checks pass.

### Continuous cooperative Wildwing takeoff

The takeoff chapter now runs a continuous aircraft simulation instead of eight discrete button tasks. The crew must reach **1,000 feet above the airport** and maintain safe speed (140–165 kph), an 8–12 degree climb, wings within five degrees of level and a centered departure path for **five consecutive seconds**. Losing stability resets that five-second indicator, not the mission. There are no per-command timers. Runway use follows actual ground movement; stopping and reversing can recover runway before liftoff. Reverse is capped at taxi speed and direction changes require stopping.

Every attempt randomly assigns stations. Eight players staff caller, gauges, thrust/brakes, steering/direction, pitch/bank/gear, flaps, trim, and engines. Seven automate engines; six combine flaps/trim; five also combine caller/gauges; four automate flaps/trim; three automate steering; two combine caller/gauges with thrust; solo combines information with thrust/brakes/pitch and automates supporting duties. Small crews retain the direction shifter with thrust so they can still abort and reverse. Removing a player reassigns duties and automation without resetting the aircraft.

Caller: manual Previous/Next controls show three procedure cards with the centered instruction enlarged. Only callers see the exact procedure and the warning light; they also have a persistent speed readout. Gauge readers swipe or use arrows between Engines, Wings & Balance, and Takeoff & Systems. Gauges show actual measurements, with speed on the systems page. Operators see unnumbered physical controls and rely on callouts. **Runway remaining stays pinned for everyone**, including when scrolling mobile dashboards.

Controls: grab and drag independent throttle levers; desktop users may link them while preserving their existing offset, while touch stays independent. Press/release the brake pedal, drag the stopped-aircraft Park/Reverse/Forward shifter, rotate and hold steering against steady winds and gusts, pull/push pitch, and use a separate banking control. Spring controls return toward neutral after release. Flap and trim cranks require continuous circular gestures, with server-enforced movement budgets and gradual actual movement. The gear lever requires opening its cover. Fuel switches and cooling are continuously managed with a full crew; automated stations use the same gradual aircraft response. Cooling controls engine temperature and adds drag. Imbalanced engines, wrong flaps, poor trim, overheating, stalls, runway-edge excursions, and hard landings affect flight or cause a crash. Retry creates a fresh attempt; the hidden task shortcut retains its explicit departure step.

The steering station uses a forward windshield with drift and the approaching runway end; everyone else uses the animated side view during takeoff. Aircraft pitch, bank, flaps, gear, wheels, propellers and scenery react to actual flight state. This chapter ends at altitude; cross-country chase-view flight remains a future chapter.

New original AI-generated artwork is included in `client/assets/flight-atlas.png` and `client/assets/flight-plane.png` (generated for this project using the image-generation tool). The atlas supplies cockpit, gauge, crank, throttle, airport, runway and windshield textures. Transparent aircraft art is animated with code-drawn moving components. No third-party art was imported. Both generated assets are embedded in the standalone HTML build as well as served online.

Validation: a full regression run passed 278/278 tests, including all 1,012 Moonleaf team compositions. Subsequent focused tests cover the final continuous physics, all 1–8 crew layouts, private information, movement limits, desktop linking/touch independence, reverse braking, gear safety, roster changes, save resumption and altitude completion. An eight-client real-browser flow exercises caller browsing, gauge pages, circular crank gestures, held steering, spring centering, throttle linking, generated art and the real result screen; a phone flow checks separate throttles and responsive controls.

Final checks: the full regression run passed **278/278**, including all **1,012** original-zoo compositions. Final focused reruns passed continuous-flight, chapter, shortcut and scoring checks after tuning. The multiplayer/browser layout suite passed **19 checks** across crews of 1–8, including touch throttles, held steering and real crank gestures. Standalone HTML passed **6 checks** with both generated assets embedded, working gauge pages and explicit practice departure. Smaller crews keep a manual direction shifter with thrust; automated steering does not prevent stopping and reversing. Trim can sustain a climb with the yoke released, and scenery continues moving beyond the end of the physical runway.

### Live room joins, owned components and phone icon

A room code now works after play has started. Share it from **Menu → Room code** or **Copy room invite link**; newcomers enter a name, choose an available animal and join the existing world. The room supports eight connected players. A full room can replace a disconnected slot. Automatic reconnect restores the original animal while its room session is retained, including after the crew continues without that player. Room codes only address the currently running server room; use a progress save code to resume after a server restart.

Live joins add an owned power bay and a unique command station when needed, preserve completed power and objectives, and wait for the new station before resuming an unfinished command puzzle. City joins use available numbered relay/handle slots; takeoff joins receive the current crew's flight-control allocation. Original-zoo fuse collection, breakers and generator insertion now enforce component ownership in the shared simulation, including when a meerkat tunnels into somebody else's bay. Orphaned parts remain usable if their owner leaves.

Animals physically inside the parking or Northgate holding cage can grab a wall alongside captured teammates, even when they were not captured. Everyone inside must hold a different wall section together; the existing rescue progress circle shows the shared effort.

The original generated pixel-art red-panda gate-break icon is saved as `client/assets/app-icon-source.png`, with 32-, 180-, 192- and 512-pixel exports. It was generated for this game and adds no third-party stock assets. The web manifest supplies Android install artwork and standalone display; the Apple touch icon supplies iPhone/iPad artwork. The service worker caches only icon files: gameplay and multiplayer still require the network. The downloadable HTML embeds its icons and does not register a service worker.

To add the deployed site to a phone:

1. Open the game's HTTPS address in Safari on iPhone/iPad, or Chrome on Android.
2. On iPhone/iPad, use **Share → Add to Home Screen → Add**. On Android, use the browser menu's **Install app** or **Add to Home screen** option.
3. Launch **Breakout Beasts!** from the new animal icon. If an older home-screen shortcut keeps the old icon, remove that shortcut and add it again.

Regression checks: `test/live-join.test.js` covers live joins across chapters, expired-session restoration, full-room replacement, eight-player puzzle slots, command-room progress, component ownership and uncaptured cage helpers. `e2e/live-join.mjs` checks a named guest joining a running room, the Menu code, fuse protection, manifest, Apple icon, service-worker registration and icon dimensions in Chromium.

Validation: the full Node suite passed 286/286 tests, including all 1,012 original-zoo team compositions. Final live-join/room checks passed 20/20 and the live-join/Northgate checks passed 25/25; the expanded eight-player late-join crew also completed the zoo. Browser checks passed for live room joining and phone icon registration, and the standalone takeoff build loaded and completed without browser errors. Build and whitespace checks pass.

The additional full two-browser multiplayer playthrough completed and verified reconnects, matching results and host migration. The optional four-browser autoplay run verified synchronized snapshots and reconnection, but some bots then stalled leaving their starting enclosures; that broader playthrough was stopped and its completion remains unverified. The focused live-join browser flow and all simulated team compositions passed.

### Stamina, projected flamingo calls and flight instruments

Stamina drains 25% faster while sprinting (a full moving sprint lasts about 3.2 seconds). The strip starts green, turns yellow below half, and stays yellow until it recovers above 75%. Running can continue through yellow. Stopping while yellow, or emptying the strip, locks running until green returns; releasing Run applies that lock immediately. On computers each animal's name tag carries its own synchronized stamina strip at the bottom. On phones and tablets an unlabeled strip sits at the bottom safe-area edge, in both orientations.

The flamingo's Space/Ability power is **Ventriloquism**: it projects a sound fifteen tiles in the facing direction, with a five-second recharge. Nearby guards investigate the projected sound. Its natural pond wading and beam balance remain, and reaching a water switch now uses E/Action. The original enclosure instructions and autopilot solution use that interaction. Sound from an interior only attracts staff in that scene.

Free-form meerkat tunnel entrances and exits must stay clear of nearby locks and closed gates. Selection and completion both validate that restriction; the original purpose-built enclosure tunnels still work. Entering the closed bank vault through a tunnel starts the same police alarm as opening its door. Police retain the full thirty-second response delay, and staying inside or opening the door later does not restart that countdown.

The cockpit uses a new original generated eight-sprite atlas, `client/assets/flight-controls.png`, for throttle handles, brake pedal, steering wheel, yoke, hand crank, direction shifter, guarded landing-gear switch and fuel rocker. Each responds visually to the authoritative control position and pointer grabs; controls still move through their settings gradually. The caller's manual three-instruction procedure and readable warning screen use a green-on-dark 1980s DOS terminal style. Warnings name the problem without exposing operators' private gauge pages. The takeoff camera lifts away from the runway and drops the ground below the view as altitude rises; clouds pass with the plane and scenery speed follows travel speed.

Validation: 298/298 Node tests passed, including all 1,012 animal-team compositions with no deadlocks. Focused checks cover faster stamina drain, yellow recovery locking, synchronized player bars, directional flamingo calls, blocked tunnel endpoints, vault-entry alarms and private readable caller warnings. Chromium checks passed for desktop name-tag bars, portrait/landscape device strips, animated controls and high-altitude camera behavior. The continuous-flight suite passed one-to-eight-player dashboard and control checks and completed a real 1,000-foot takeoff; the downloadable build passed its flight checks without browser errors. Build and whitespace checks pass.

### Airport terminal, repeat security and arcade

Wildwing Airport's reinforced divider now meets both perimeter walls, including the former bottom gap. A shared-rule tarmac check also rejects unauthorized tunnel/ability arrivals. Passing security requires a full current disguise and $100 per uncleared animal from pooled team cash. The marked **one-way return to terminal** on the tarmac clears that animal's pass; it must pay another $100 to return. Already-cleared teammates can wait airside while a returning animal pays. Reaching the terminal by another route also clears an airside pass.

The terminal has three compact, original code-drawn kiosks: Banana Button Arcade, Snack Attack, and Wildwing Souvenirs. Five arcade cabinets each charge $5 when their hold-to-play interaction completes: Fruit Catch (catch five apples), Whack a Turnip (five hits), Memory Match (three pairs), Perfect Landing (three green-zone stops), and Snack Maze (collect three snacks). Games have keyboard, pointer and touch controls, private per-player state, and server-validated moves and results. Players can leave a game at any time; the play fee is not refunded. Arcade play does not pause guards or teammates.

Hold E at snack or souvenir shelves to choose items, then hold E at a cashier to pay. Paid chips, juice and cookies can be eaten from the airport HUD to restore stamina. Airport-exclusive pilot caps, souvenir shirts and cloud-print trousers are fitted to all ten animals, adding thirty garments while keeping city thrift shelves unchanged. Paid airport garments and snacks survive safe-checkpoint saves; existing save codes remain supported. Leaving a kiosk with unpaid items alerts airport police.

Three airport police patrol the terminal and investigate witnessed pickpocketing and biting. Airport police captures send animals to the airport jail and apply the existing police confiscation rules. Its eight locks use the same maze, tail-pinning and key-path games as the city prison, with one completed lock required per current airport captive. Airport and city jails have independent lock state, ownership and prisoner counts. Airport escapees receive the same twenty-second getaway allowance. The testing shortcut and campaign autopilot understand the new jail.

Validation: the full Node suite passed 305/305 tests, including all 1,012 original-zoo team compositions. Final airport/jail/police/save checks passed 37/37, followed by 18/18 airport/checkpoint checks. Chromium passed all fourteen airport checks, including five cabinets, live game input, souvenir checkout, edible paid snacks, repeat security, the local jail UI and phone fit. The standalone game passed its six flight checks without browser errors. Build and whitespace checks pass. New terminal, cabinet and cashier art is original code-drawn pixel art; no third-party assets were added.

### Dragging unconscious keepers and officers

Hold **B / Bite** near unconscious staff, then move to drag them. Keeping Bite held after a successful knockout grabs them immediately. Dragging uses half the animal's terrain-adjusted walking speed, prevents running and abilities, and pauses that keeper's remaining wake-up time. Release Bite to drop the body and resume its timer. Existing permanently unconscious run-over staff stay permanently unconscious; their reinforcement rules remain unchanged.

Bodies follow along clear ground and stop at solid obstacles instead of sliding through walls. Each body has one dragger. Capture, disconnect, leaving, a muzzle or another incompatible action releases the body. Teammates see the same body position and ownership. Keyboard and touch both support holding Bite while moving; the Bite button reads “Dragging” and Run is shown unavailable while carrying out the action.

Sleeping staff no longer cast a flashlight cone or illuminate the night lighting layer. Flashlights flicker during the last 1.4 seconds before waking and return to full brightness when awake. A held body stays dark, including while its timer is paused near waking. The server supplies the flashlight intensity to every client.

Validation: 313/313 Node tests passed, including all 1,012 original-zoo team compositions. Final bite/drag checks passed 23/23. Chromium passed eleven checks for half-speed dragging, paused/resumed sleep, flashlight-off/flicker/on transitions, synchronized multiplayer ownership, touch joystick plus held Bite, and release. The standalone game passed six flight checks without browser errors. Build and whitespace checks pass.

### Secret named monsters and busier airport

Players named **Jude**, **Baylee**, **Tate** or **Dax** receive a distinct surprise monster appearance once gameplay starts. Matching ignores capitalization and surrounding spaces, but requires the whole name. Selection cards and lobby portraits stay as the chosen animal. The animal remains the authoritative species for powers, movement, collision, puzzles, disguises and progression. The surprise survives reconnects, live joins and later chapters; gameplay name tags and round awards use the monster portrait after the reveal.

The original generated `client/assets/secret-monsters.png` is a 1536×1024 transparent atlas with six columns and four rows. Rows are Jude (green crooked zombie boy), Baylee (purple pigtail girl monster), Tate (orange fungal brute) and Dax (cyan swamp gremlin). Each row contains idle, four moving poses, and an open-mouth bite pose. Left-facing frames are mirrored in the renderer; walking and running use different playback speeds. Tortoise shell and penguin slide powers keep the monster appearance. Clothing overlays remain visible. `secret-monsters-source.png` preserves the original generated sheet. All character artwork is original to this game; no third-party character assets are used. Both art modes and standalone builds include the secret sprites.

Wildwing Airport now has **96 passengers**, with **80 in the terminal and 16 airside**. They choose nearby destinations on their own side of security and do not spawn or wander inside the jail. A bite frightens every other awake passenger in the airport and switches them to fleeing movement and running animation. Choosing local destinations prevents frightened passengers repeatedly trying unreachable routes across security.

Airport capture routing now prioritizes the airport over the general rescue-scene classification. Police, responding animal control and other airport staff send captured animals to the **airport jail**, including when an older capture already carries a rescue-zoo destination. The existing capture countdown, lock games, security-pass reset, and police confiscation rules apply.

Validation: the full Node suite passed 318/318 tests, including all 1,012 original-zoo team compositions. After the airport follow-ups, 44/44 current campaign, checkpoint, crowd, arrest-routing and monster tests passed. Browser checks cover the hidden lobby reveal, all four distinct animation sets, retained animal controls, multiplayer portraits, phone play, fleeing passengers and an actual delayed airport arrest. The standalone build revealed Jude's monster and completed its seven flight checks without browser errors. Build and whitespace checks pass.

Monster-size adjustment: all four secret creatures and their worn accessories now render at 75% of their previous size, anchored at their feet. The existing monster/browser checks and standalone build pass.
