# Original generated pixel art

Created for Breakout Beasts with image generation in this session. User reference images guided the level of pixel detail; no reference image is shipped. The transparent atlases use equal-size grid cells, read by `client/assets.js`. Rendering does not change collision geometry.

- `logo.png`: illustrated title logo, transparent background.
- `actors.png`: 4 columns × 3 rows. Red panda, elephant, monkey, beaver; giraffe, penguin, zebra, meerkat; tortoise, flamingo, keeper, unconscious keeper. Walk motion uses a small positional bob of these detailed poses.
- `terrain.png`: 4 × 4. Grass, path, habitat floor, brick; fence, hedge, bush, water; ice, wood, rock, tree; pond, roof, metal, dirt.
- `objects.png`: 4 × 4. Gate, logs, generator, crate; barrel, lamp, bench, sign; door, dial, lever, power button; key, socket, supplies, muzzle.
- `panel.png`: control-house console backdrop. Interactive text and controls are drawn by the browser for readability and accessibility.

The atlases and logo are also embedded by `npm run build:single`; they require no external image service at runtime.
