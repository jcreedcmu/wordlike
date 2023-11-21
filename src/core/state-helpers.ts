import { Draft } from 'immer';
import { logger } from "../util/debug";
import { produce } from "../util/produce";
import { compose, translate } from '../util/se1';
import { Point } from "../util/types";
import { vadd, vequal } from "../util/vutil";
import { Animation, mkPointDecayAnimation } from './animations';
import { getAssets } from "./assets";
import { Bonus, getBonusLayer, isBlocking } from "./bonus";
import { PauseData, now_in_game } from "./clock";
import { getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, mkGridOfMainTiles } from "./grid";
import { Layer, Overlay, getOverlayLayer, mkOverlayFrom, overlayAny, overlayPoints, setOverlay } from "./layer";
import { CoreState, GameState, HAND_TILE_LIMIT, Location, Tile, TileEntity } from "./state";
import { addHandTile, addWorldTile, ensureTileId, get_hand_tiles, get_main_tiles, get_tiles } from "./tile-helpers";

export function addWorldTiles(state: GameState, tiles: Tile[]): GameState {
  return produce(state, s => {
    tiles.forEach(tile => {
      addWorldTile(s, tile);
    });
  });
}

export function addHandTiles(state: GameState, tiles: Tile[]): GameState {
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

export function isOccupied(state: GameState, moveTile: MoveTile): boolean {
  if (isOccupiedTiles(get_tiles(state), moveTile.p_in_world_int))
    return true;
  return isBlocking(moveTile, bonusOfStatePoint(state.coreState, moveTile.p_in_world_int));
}

export function isOccupiedTiles(tiles: TileEntity[], p: Point): boolean {
  return tiles.some(tile => tile.loc.t == 'world' && vequal(tile.loc.p_in_world_int, p));
}

export function drawOfState(state: GameState): GameState {
  const handLength = get_hand_tiles(state).length;
  if (handLength >= HAND_TILE_LIMIT)
    return state;
  const { letter, energies, seed } = getLetterSample(state.coreState.seed, state.coreState.energies);
  return checkValid(produce(state, s => {
    s.coreState.seed = seed;
    s.coreState.energies = energies;
    addHandTile(s, ensureTileId({ letter, p_in_world_int: { x: 0, y: handLength } }));
  }));
}

const directions: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) => ({ x, y }));

export type Scoring =
  | { t: 'bonus', p: Point }
  | { t: 'bomb', p: Point }
  | { t: 'required', p: Point }
  ;

function adjacentScoringOfBonus(bonus: Bonus, p: Point): Scoring[] {
  switch (bonus.t) {
    case 'bonus': return [{ t: 'bonus', p }];
    case 'bomb': return [{ t: 'bomb', p }];
    default: return [];
  }
}

function overlapScoringOfBonus(bonus: Bonus, p: Point): Scoring[] {
  switch (bonus.t) {
    case 'required': return [{ t: 'required', p }];
    default: return [];
  }
}

function resolveScoring(state: Draft<CoreState>, scoring: Scoring): void {
  switch (scoring.t) {
    case 'bonus': state.score++; break;
    case 'bomb': state.inventory.bombs++; break;
    case 'required': state.score += 10; break;
  }
}

export function resolveValid(state: GameState): GameState {
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
    return overlapScoringOfBonus(bonusOfStatePoint(state.coreState, p), p);
  });

  const adjacentScorings = overlayPoints(layer)
    .flatMap(p => adjacentScoringOfBonus(bonusOfStatePoint(state.coreState, p), p));

  const scorings = [...overlapScorings, ...adjacentScorings];

  return produce(state, s => {
    scorings.forEach(scoring => {
      setOverlay(s.coreState.bonusOverlay, scoring.p, { t: 'empty' });
      resolveScoring(s.coreState, scoring);
      s.coreState.animations.push(mkPointDecayAnimation(scoring.p, state.coreState.game_from_clock));
    });
  });
}

export function checkValid(state: GameState): GameState {
  const tiles = get_main_tiles(state);
  const grid = mkGridOfMainTiles(tiles);

  const { validWords, invalidWords } = checkGridWords(grid, word => getAssets().dictionary[word]);
  const { allConnected, connectedSet } = checkConnected(grid);
  let allValid = false;
  if (invalidWords.length == 0 && allConnected && get_hand_tiles(state).length == 0) {
    state = resolveValid(state);
    allValid = true;
  }

  let panic = state.coreState.panic;
  if (allValid) panic = undefined;
  if (!allValid && panic === undefined) {
    const currentTime_in_game = now_in_game(state.coreState.game_from_clock);
    panic = { currentTime_in_game, lastClear_in_game: currentTime_in_game };
  }

  return produce(state, s => {
    s.coreState.panic = panic;
    s.coreState.invalidWords = invalidWords;
    s.coreState.connectedSet = connectedSet;
  });
}


export function isTilePinned(state: GameState, tileId: string, loc: Location & { t: 'world' }): boolean {
  if (state.coreState.selected && state.coreState.selected.selectedIds.includes(tileId)) {
    return overlayAny(state.coreState.selected.overlay, p => vequal(p, { x: 0, y: 0 }));
  }
  else {
    return vequal(loc.p_in_world_int, { x: 0, y: 0 });
  }
}

export function filterExpiredAnimations(now_ms: number, anims: Animation[]): Animation[] {
  return anims.filter(anim => now_ms <= anim.start_in_game + anim.duration_ms);
}

export function unpauseState(state: GameState, pause: PauseData): GameState {
  const newGame_from_clock = compose(translate(pause.pauseTime_in_clock - Date.now()), state.coreState.game_from_clock);
  return produce(state, s => {
    s.coreState.paused = undefined;
    s.coreState.game_from_clock = newGame_from_clock;
  });

}

export function bonusOfStatePoint(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerName), p);
}
