import { DEBUG, logger } from "../util/debug";
import { produce } from "../util/produce";
import { apply, inverse } from "../util/se2";
import { Point } from "../util/types";
import { next_rand } from "../util/util";
import { vequal, vm } from "../util/vutil";
import { getAssets } from "./assets";
import { Energies, getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, Grid, mkGrid, mkGridOf } from "./grid";
import { getOverlay, setOverlay } from "./layer";
import { GameState } from "./state";

export function is_occupied(state: GameState, p: Point): boolean {
  return state.main_tiles.some(tile => vequal(tile.p_in_world_int, p));
}

export function drawOfState(state: GameState): GameState {
  const p_in_world_int = vm(apply(inverse(state.canvas_from_world), state.mouseState.p), Math.floor);
  const { letter, energies, seed } = getLetterSample(state.seed, state.energies);
  return checkValid(produce(state, s => {
    s.seed = seed;
    s.energies = energies;
    s.hand_tiles.push({ letter, p_in_world_int, used: false });
  }));
}

export function killTileOfState(state: GameState): GameState {
  const p_in_world_int = vm(apply(inverse(state.canvas_from_world), state.mouseState.p), Math.floor);
  const ix = state.main_tiles.findIndex(tile => vequal(tile.p_in_world_int, p_in_world_int));
  if (ix == -1)
    return state;
  return checkValid(produce(state, s => {
    s.main_tiles.splice(ix, 1);
  }));
}

function resolveValid(state: GameState): GameState {
  const tiles = state.main_tiles;
  logger('words', 'grid valid');
  const scorings = tiles.flatMap(tile => {
    if (getOverlay(state.bonusOverlay, state.bonusLayer, tile.p_in_world_int) == 'bonus') {
      return [tile.p_in_world_int];
    }
    else {
      return [];
    }
  });
  const newTiles = produce(tiles, ts => {
    ts.forEach(t => { t.used = true });
  });
  return produce(state, s => {
    s.main_tiles = newTiles;
    scorings.forEach(p => {
      setOverlay(s.bonusOverlay, p, 'empty');
      s.score++;
    });
  });
}

export function checkValid(state: GameState): GameState {
  const tiles = state.main_tiles;
  const grid = mkGrid(tiles);

  const { validWords, invalidWords } = checkGridWords(grid, word => getAssets().dictionary[word]);

  let allValid = false;
  if (invalidWords.length == 0 && checkConnected(grid) && state.hand_tiles.length == 0) {
    state = resolveValid(state);
    allValid = true;
  }

  let panic = state.panic;
  if (allValid) panic = undefined;
  if (!allValid && panic === undefined)
    panic = { currentTime: Date.now(), lastClear: Date.now() };

  return produce(state, s => {
    s.panic = panic;
    s.invalidWords = invalidWords;
  });
}
