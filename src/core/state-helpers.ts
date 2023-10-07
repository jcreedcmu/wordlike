import { DEBUG, logger } from "../util/debug";
import { produce } from "../util/produce";
import { apply, inverse } from "../util/se2";
import { Point } from "../util/types";
import { next_rand } from "../util/util";
import { vequal, vm } from "../util/vutil";
import { getAssets } from "./assets";
import { Energies, getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, Grid, mkGrid, mkGridOf } from "./grid";
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
  const grid = mkGrid(tiles);

  const { allValid, validWords } = checkGridWords(grid, word => getAssets().dictionary[word]);
  if (allValid && checkConnected(grid)) {
    logger('words', 'grid valid');
    const newTiles = produce(tiles, ts => {
      ts.forEach(t => { t.used = true })
    });
    state = produce(state, s => {
      s.tiles = newTiles;
    });
  }

  const validPoints: Point[] = validWords.flatMap(vw => {
    let p = vw.p;
    let rv: Point[] = [];
    for (let i = 0; i < vw.word.length; i++) {
      rv.push({ x: p.x, y: p.y });
      p.x += vw.orientation.x;
      p.y += vw.orientation.y;
    }
    return rv;
  });
  const newValidities: Grid<boolean> = mkGridOf(validPoints.map(p => ({ p, v: true })));
  return produce(state, s => {
    s.validities = newValidities;
  });
}
