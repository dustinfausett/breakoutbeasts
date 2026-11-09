import { Game, TICK } from '../shared/game.js';
import { Autopilot, viewFromGame } from '../shared/bot.js';

/** Run a headless mission with autopilots. Returns { game, bots, ticks }. */
export function runMission(animals, { staff = false, maxTime = 900, seed = 7, onTick } = {}) {
  const players = animals.map((a, i) => ({ id: 'p' + (i + 1), name: 'P' + (i + 1), animal: a }));
  const game = new Game({ players, seed, options: { staff } });
  const bots = players.map((p) => new Autopilot(p.id));
  let ticks = 0;
  while (game.phase === 'play' && game.time < maxTime) {
    bots.forEach((b) => {
      const p = game.players.get(b.pid);
      if (!p.active) return;
      const inp = b.update(viewFromGame(game, b.pid), TICK);
      if(inp.vehicle)game.vehicleAction(b.pid,inp.vehicle);
      if(inp.panel)game.controlAction(b.pid,inp.panel);
      game.setInput(b.pid, inp);
    });
    game.step(TICK);
    game.drainEvents();
    ticks++;
    if (onTick) onTick(game, ticks);
  }
  return { game, bots, ticks };
}
