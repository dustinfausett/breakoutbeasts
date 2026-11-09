# Breakout Beasts!

A browser-based, cooperative pixel-art zoo escape for **1–8 players**. You are animals trapped
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
| Quick messages to teammates | 1–6 | 💬 Say |
| Bite / remove a teammate’s muzzle | B | **Bite** button |
| Menu / pause | Esc | ☰ Menu |

Menus can be operated with the keyboard alone (Tab, Enter and arrow keys).

**The mission at Moonleaf Zoo**
1. **Escape your enclosure.** Use your animal’s ability immediately to solve its enclosure puzzle. The beaver must chew timber down, pick up its log, build a bridge, and chew the exit barrier. Alternative for every animal: find a supply chest, collect two bundles and build a ramp at the front-left fence site. Smaller animals can instead use the front-right soil site to craft a stick and dig a tunnel; press E there again to travel. Elephants, giraffes and zebras can ram the main gate three times with Space. Hits must be separated by 1.2 seconds, and every hit carries farther and increases keeper attention. Chests have finite supplies and stay empty once used, including after capture. Their reachable locations change each mission.
2. **Free caged animals.** Sneak behind an unwatched keeper and hold **E** to steal a cage key. Keep it until capture and reuse it by holding **E** at any gold enclosure lock. Every opened enclosure dispatches a keeper to inspect it. Alternatively, find supply chests and gather two bundles and build an escape ramp from outside a cage. Beaver chewing and zebra kicking can also break suitable enclosure barriers. Three animals must be freed. Freed animals run to the Animal Hideout in the courtyard.
3. **Restore power.** In the Maintenance Yard, each player has their own bay. The bay door is
   rebuilt to need *that player's* ability. Get in, flip the breaker (when playing as a team),
   take the fuse and plug it into the generator.
4. **Operate the control house together.** Each animal enters its assigned door in the Exit Plaza. Once everyone is inside, every operator presses their flashing red power button. Each screen describes another player’s dials or levers: talk or use the panel chat to pass the strange instructions along. Each player must finish five tasks before the three-minute break-in timer expires. A failed attempt returns everyone to reinforced enclosures; power and rescued friends remain. Solo players get instructions from a rescued radio partner.
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

Hard mode draws only the forward half of the animal’s view, with obstacles blocking the area behind them. The near surface of a wall remains visible. Vision has no artificial distance limit and is independent of keeper cones; the camera still displays the current screen-sized portion of the zoo. The animal’s own sprite remains visible. This is a visual challenge mode, not an anti-cheat or network-privacy mechanism.

`test/wild.test.js` covers moving theft, bites, darts, muzzles and view geometry. `e2e/wild.mjs` verifies the invite flow and the complete bite/tranquilizer/muzzle-removal loop across two real online clients, plus pixel checks for the Hard-mode mask.

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
