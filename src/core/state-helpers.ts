import { Draft } from "immer";
import { DEBUG, logger } from "../util/debug";
import { produce } from "../util/produce";
import { apply, inverse } from "../util/se2";
import { Point } from "../util/types";
import { next_rand } from "../util/util";
import { vequal, vm } from "../util/vutil";
import { getAssets } from "./assets";
import { Energies, getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, Grid, gridKeys, mkGrid, mkGridOf } from "./grid";
import { getOverlayLayer, setOverlay } from "./layer";
import { GameState, Tile } from "./state";

export function get_main_tiles(state: GameState): Tile[] {
  return state.main_tiles_;
}

// FIXME: make this work by id instead
export function removeTile(state: GameState, ix: number): GameState {
  return produce(state, s => {
    state.main_tiles_.splice(ix, 1);
  });
}

export function addTile(state: Draft<GameState>, tile: Tile): void {
  state.main_tiles_.push(tile);
}

// FIXME: make this work by id instead
export function setTilePosition(state: Draft<GameState>, ix: number, p_in_world_int: Point): void {
  state.main_tiles_[ix].p_in_world_int = p_in_world_int;
}

export function setTiles(state: GameState, tiles: Tile[]): GameState {
  return produce(state, s => {
    s.main_tiles_ = tiles;
  });
}

// ultimately, functions above this point should be the only things accessing main_tiles or hand_tiles,
// other than perhaps state initialization in state.ts.

export function is_occupied(state: GameState, p: Point): boolean {
  return get_main_tiles(state).some(tile => vequal(tile.p_in_world_int, p));
}

export function drawOfState(state: GameState): GameState {
  const p_in_world_int = vm(apply(inverse(state.canvas_from_world), state.mouseState.p), Math.floor);
  const { letter, energies, seed } = getLetterSample(state.seed, state.energies);
  return checkValid(produce(state, s => {
    s.seed = seed;
    s.energies = energies;
    s.hand_tiles.push({ letter, p_in_world_int });
  }));
}

export function killTileOfState(state: GameState): GameState {
  const p_in_world_int = vm(apply(inverse(state.canvas_from_world), state.mouseState.p), Math.floor);
  const ix = get_main_tiles(state).findIndex(tile => vequal(tile.p_in_world_int, p_in_world_int));
  if (ix == -1)
    return state;
  return checkValid(produce(removeTile(state, ix), s => {
    produce(state, s => { s.score--; });
  }));
}

function resolveValid(state: GameState): GameState {
  const tiles = get_main_tiles(state);
  logger('words', 'grid valid');
  const scorings = tiles.flatMap(tile => {
    if (getOverlayLayer(state.bonusOverlay, state.bonusLayer, tile.p_in_world_int) == 'bonus') {
      return [tile.p_in_world_int];
    }
    else {
      return [];
    }
  });
  return produce(state, s => {
    scorings.forEach(p => {
      setOverlay(s.bonusOverlay, p, 'empty');
      s.score++;
    });
  });
}

export function checkValid(state: GameState): GameState {
  const tiles = get_main_tiles(state);
  const grid = mkGrid(tiles);

  const { validWords, invalidWords } = checkGridWords(grid, word => getAssets().dictionary[word]);
  const { allConnected, connectedSet } = checkConnected(grid);
  let allValid = false;
  if (invalidWords.length == 0 && allConnected && state.hand_tiles.length == 0) {
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
    s.connectedSet = connectedSet;
  });
}
