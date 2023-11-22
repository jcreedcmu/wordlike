import { logger } from "../util/debug";
import { produce } from "../util/produce";
import { compose, translate } from '../util/se1';
import { Point } from "../util/types";
import { vadd, vequal } from "../util/vutil";
import { Animation, mkPointDecayAnimation } from './animations';
import { getAssets } from "./assets";
import { Bonus, adjacentScoringOfBonus, getBonusLayer, isBlocking, overlapScoringOfBonus, resolveScoring } from "./bonus";
import { PauseData, now_in_game } from "./clock";
import { DrawForce, getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, mkGridOfMainTiles } from "./grid";
import { Layer, Overlay, getOverlayLayer, mkOverlayFrom, overlayAny, overlayPoints, setOverlay } from "./layer";
import { CoreState, GameState, HAND_TILE_LIMIT, Location, Tile, TileEntity } from "./state";
import { addHandTile, addWorldTile, ensureTileId, get_hand_tiles, get_main_tiles, get_tiles } from "./tile-helpers";

export function addWorldTiles(state: CoreState, tiles: Tile[]): CoreState {
  return produce(state, s => {
    tiles.forEach(tile => {
      addWorldTile(s, tile);
    });
  });
}

export function addHandTiles(state: CoreState, tiles: Tile[]): CoreState {
  return produce(state, s => {
    tiles.forEach(tile => {
      addHandTile(s, tile);
    });
  });
}

// It's actually important that isCollision takes the bonusOverlay separately, because it's called
// while a drag of a bunch of tiles is being resolved.

export type MoveTile = { letter: string, id: string, p_in_world_int: Point };

// Returns false if we cannot place
export function isCollision(tiles: TileEntity[], moveTiles: MoveTile[], bonusOverlay: Overlay<Bonus>, bonusLayer: Layer<Bonus>) {
  return moveTiles.some(moveTile => isOccupiedTiles(tiles, moveTile.p_in_world_int)
    || isBlocking(moveTile, getOverlayLayer(bonusOverlay, bonusLayer, moveTile.p_in_world_int)));
}

export function isOccupied(state: CoreState, moveTile: MoveTile): boolean {
  if (isOccupiedTiles(get_tiles(state), moveTile.p_in_world_int))
    return true;
  return isBlocking(moveTile, bonusOfStatePoint(state, moveTile.p_in_world_int));
}

export function isOccupiedTiles(tiles: TileEntity[], p: Point): boolean {
  return tiles.some(tile => tile.loc.t == 'world' && vequal(tile.loc.p_in_world_int, p));
}

export function drawOfState(state: CoreState, drawForce?: DrawForce): CoreState {
  const handLength = get_hand_tiles(state).length;
  if (handLength >= HAND_TILE_LIMIT)
    return state;
  const { letter, energies, seed } = getLetterSample(state.seed, state.energies, drawForce);
  return checkValid(produce(state, s => {
    s.seed = seed;
    s.energies = energies;
    addHandTile(s, ensureTileId({ letter, p_in_world_int: { x: 0, y: handLength } }));
  }));
}

const directions: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) => ({ x, y }));

export function resolveValid(state: CoreState): CoreState {
  const tiles = get_main_tiles(state);
  logger('words', 'grid valid');
  const layer = mkOverlayFrom([]);

  tiles.forEach(tile => {
    directions.forEach(d => {
      const p = vadd(tile.loc.p_in_world_int, d);
      setOverlay(layer, p, true);
    });
  });

  const overlapScorings = tiles.flatMap(tile => {
    const p = tile.loc.p_in_world_int;
    return overlapScoringOfBonus(bonusOfStatePoint(state, p), p);
  });

  const adjacentScorings = overlayPoints(layer)
    .flatMap(p => adjacentScoringOfBonus(bonusOfStatePoint(state, p), p));

  const scorings = [...overlapScorings, ...adjacentScorings];

  return produce(state, s => {
    scorings.forEach(scoring => {
      setOverlay(s.bonusOverlay, scoring.p, { t: 'empty' });
      resolveScoring(s, scoring);
      s.animations.push(mkPointDecayAnimation(scoring.p, state.game_from_clock));
    });
  });
}

export function checkValid(state: CoreState): CoreState {
  const tiles = get_main_tiles(state);
  const grid = mkGridOfMainTiles(tiles);

  const { validWords, invalidWords } = checkGridWords(grid, word => getAssets().dictionary[word]);
  const { allConnected, connectedSet } = checkConnected(grid);
  let allValid = false;
  if (invalidWords.length == 0 && allConnected && get_hand_tiles(state).length == 0) {
    state = resolveValid(state);
    allValid = true;
  }

  let panic = state.panic;
  if (allValid) panic = undefined;
  if (!allValid && panic === undefined) {
    const currentTime_in_game = now_in_game(state.game_from_clock);
    panic = { currentTime_in_game, lastClear_in_game: currentTime_in_game };
  }

  return produce(state, s => {
    s.panic = panic;
    s.invalidWords = invalidWords;
    s.connectedSet = connectedSet;
  });
}


export function isTilePinned(state: CoreState, tileId: string, loc: Location & { t: 'world' }): boolean {
  if (state.selected && state.selected.selectedIds.includes(tileId)) {
    return overlayAny(state.selected.overlay, p => vequal(p, { x: 0, y: 0 }));
  }
  else {
    return vequal(loc.p_in_world_int, { x: 0, y: 0 });
  }
}

export function filterExpiredAnimations(now_ms: number, anims: Animation[]): Animation[] {
  return anims.filter(anim => now_ms <= anim.start_in_game + anim.duration_ms);
}

export function unpauseState(state: CoreState, pause: PauseData): CoreState {
  const newGame_from_clock = compose(translate(pause.pauseTime_in_clock - Date.now()), state.game_from_clock);
  return produce(state, s => {
    s.paused = undefined;
    s.game_from_clock = newGame_from_clock;
  });

}

export function bonusOfStatePoint(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerName), p);
}

export function withCoreState(state: GameState, k: (cs: CoreState) => CoreState): GameState {
  const ncs = k(state.coreState);
  return produce(state, s => {
    s.coreState = ncs;
  });
}
