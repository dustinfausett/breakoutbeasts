# Original generated pixel art

Created for Breakout Beasts with image generation in this session. User reference images guided the level of pixel detail; no reference image is shipped. The transparent atlases are sliced by the client renderer; walking-sheet row bounds are documented below. Rendering does not change collision geometry.

- `logo.png`: illustrated title logo, transparent background.
- `actors.png`: 4 columns × 3 rows. Red panda, elephant, monkey, beaver; giraffe, penguin, zebra, meerkat; tortoise, flamingo, keeper, unconscious keeper. These poses remain the idle and portrait artwork.
- `terrain.png`: 4 × 4. Grass, path, habitat floor, brick; fence, hedge, bush, water; ice, wood, rock, tree; pond, roof, metal, dirt.
- `objects.png`: 4 × 4. Gate, logs, generator, crate; barrel, lamp, bench, sign; door, dial, lever, power button; key, socket, supplies, muzzle.
- `panel.png`: control-house console backdrop. Interactive text and controls are drawn by the browser for readability and accessibility.

The atlases and logo are also embedded by `npm run build:single`; they require no external image service at runtime.

- `walk-animals-a.png`: original generated four-frame walking cycles, four columns × six equal rows: red panda, elephant, monkey, beaver, giraffe, penguin.
- `walk-animals-b.png`: original generated four-frame cycles for zebra, meerkat, tortoise, flamingo and human keeper. Four equal columns; source row bounds are 0–260, 270–540, 560–775, 780–1060 and 1065–1402 pixels. Explicit strip crops prevent neighbouring characters from entering a frame.

Walking frames change limb positions, with mirrored frames for leftward movement. Idle characters retain the original standing pose. Tortoises animate more slowly; reduced motion freezes walking. Both walking sheets are embedded in the single-file build.

The game defaults to the original code-drawn world and characters, with the generated logo active in both styles. All PNGs are intentionally retained here. Open the game with `?art=detailed` to use these generated assets and walking cycles again; no files need to be restored.

- `car.png`: newly generated original top-down station wagon, facing right. Used for every parked and driven car in both art styles, with game-drawn lamp flashes. Its chunky pixel outline and palette match the classic world. The moving car rotates this same sprite; the source image is preserved unchanged.

The original `app-icon-source.png` was generated for Breakout Beasts: a pixel-art red panda breaking a gate, with animal teammates on a dark teal background. `app-icon-{32,180,192,512}.png` are resized exports for the browser favicon, Apple home-screen icon, and web manifest. They are independent of the selectable detailed game artwork.

`flight-controls.png` is an original generated 4-column × 2-row transparent sprite sheet made for the continuous flight dashboard. Cells are thrust handle, brake pedal, steering wheel, flight yoke, crank, direction shifter, guarded landing-gear switch, and fuel rocker. The background was removed with image generation; no third-party stock art is used. `client/flight-art.js` crops and animates these objects from authoritative control positions. The atlas is embedded in standalone builds.

`secret-monsters.png` is an original generated transparent 1536×1024 atlas arranged in 6 columns × 4 rows. Rows are Jude, Baylee, Tate and Dax. Columns are idle, four run/walk poses and bite. `secret-monsters-source.png` preserves the generated source. The sprites are cropped into 32×32 canvases, mirrored for leftward movement and rendered with nearest-neighbor scaling. They appear only during gameplay when the shared secret-name mapping selects that skin; the chosen animal's gameplay identity is retained. Both art modes and the standalone build load this sheet. No external stock or third-party character artwork was used.
