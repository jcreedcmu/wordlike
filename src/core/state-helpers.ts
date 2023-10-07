import { DEBUG, logger } from "../util/debug";
import { produce } from "../util/produce";
import { apply, inverse } from "../util/se2";
import { Point } from "../util/types";
import { next_rand } from "../util/util";
import { vequal, vm } from "../util/vutil";
import { getAssets } from "./assets";
import { Energies, getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, mkGrid } from "./grid";
import { GameState } from "./state";

export function is_occupied(state: GameState, p: Point): boolean {
  return state.tiles.some(tile => vequal(tile.p_in_world_int, p));
}

export function peelOfState(state: GameState): GameState {
  const p_in_world_int = vm(apply(inverse(state.canvas_from_world), state.mouseState.p), Math.floor);
  const { letter, energies, seed } = getLetterSample(state.seed, state.energies);
  return produce(state, s => {
    s.seed = seed;
    s.energies = energies;
    s.tiles.push({ letter, p_in_world_int, used: false });
  });
}

export function checkAllWords(state: GameState): GameState {
  const tiles = state.tiles;

  let newTiles = tiles;
  const grid = mkGrid(tiles);

  if (checkGridWords(grid, word => getAssets().dictionary[word]) &&
    checkConnected(grid)) {
    logger('words', 'grid valid');
    newTiles = produce(tiles, ts => {
      ts.forEach(t => { t.used = true })
    });
  }
  return produce(state, s => { s.tiles = newTiles });
}
