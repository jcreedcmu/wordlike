import { canvas_from_drag_tile } from "../ui/view-helpers";
import { getWidgetPoint } from "../ui/widget-helpers";
import { DEBUG, logger } from "../util/debug";
import { produce } from "../util/produce";
import * as se1 from '../util/se1';
import { apply, compose, inverse } from '../util/se2';
import { Point } from "../util/types";
import { vadd, vequal, vm } from "../util/vutil";
import { Animation, mkPointDecayAnimation, mkWinAnimation } from './animations';
import { getAssets } from "./assets";
import { Bonus, adjacentScoringOfBonus, getBonusLayer, isBlocking, overlapScoringOfBonus, resolveScoring } from "./bonus";
import { PANIC_INTERVAL_MS, PauseData, now_in_game } from "./clock";
import { DrawForce, getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, mkGridOfMainTiles } from "./grid";
import { Layer, Overlay, getOverlayLayer, mkOverlayFrom, overlayAny, overlayPoints, setOverlay } from "./layer";
import { getScore } from "./scoring";
import { CoreState, GameState, HAND_TILE_LIMIT, Location, MouseState, Tile, TileEntity } from "./state";
import { addHandTile, addWorldTile, ensureTileId, get_hand_tiles, get_main_tiles, get_tiles, putTileInWorld, removeTile } from "./tile-helpers";
import { WIN_SCORE, canWinFromState, shouldStartPanicBar } from "./winState";

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

// doesn't call checkValid!
export function drawSpecific(state: CoreState, letter: string): { cs: CoreState, newId: string } | undefined {
  const handLength = get_hand_tiles(state).length;
  if (handLength >= HAND_TILE_LIMIT)
    return undefined;
  const tile = ensureTileId({ letter, p_in_world_int: { x: 0, y: handLength } });
  return {
    cs: produce(state, s => {
      addHandTile(s, tile);
    }), newId: tile.id
  };
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
  const currentTime_in_game = now_in_game(state.game_from_clock);
  if (!allValid && panic === undefined && shouldStartPanicBar(state.winState)) {

    const debug_offset = DEBUG.skipAheadPanic ? PANIC_INTERVAL_MS - 10000 : 0;
    panic = { currentTime_in_game, lastClear_in_game: currentTime_in_game - debug_offset };
  }

  let winState = state.winState;
  let animations = state.animations;

  if (getScore(state) >= WIN_SCORE && canWinFromState(state.winState)) {
    winState = { t: 'won', winTime_in_game: currentTime_in_game };
    animations = [...animations, mkWinAnimation(state.game_from_clock)];
  }

  return produce(state, s => {
    s.panic = panic;
    s.invalidWords = invalidWords;
    s.connectedSet = connectedSet;
    s.winState = winState;
    s.animations = animations;

    // XXX: is this the right place to do this?
    s.currentTool = 'pointer';
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
  const newGame_from_clock = se1.compose(se1.translate(pause.pauseTime_in_clock - Date.now()), state.game_from_clock);
  return produce(state, s => {
    s.paused = undefined;
    s.game_from_clock = newGame_from_clock;
  });

}

export function bonusOfStatePoint(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerName), p);
}

export function tileFall(state: CoreState, ms: MouseState): Point {
  return vm(compose(
    inverse(state.canvas_from_world),
    canvas_from_drag_tile(state, ms)).translate,
    Math.round);
}

export function pointFall(state: CoreState, p_in_canvas: Point): Point {
  return vm(apply(inverse(state.canvas_from_world), p_in_canvas),
    Math.floor);
}

export function withCoreState(state: GameState, k: (cs: CoreState) => CoreState): GameState {
  const ncs = k(state.coreState);
  return produce(state, s => {
    s.coreState = ncs;
  });
}

export function dropTopHandTile(state: GameState): GameState {
  const cs = state.coreState;
  const handTiles = get_hand_tiles(cs);
  if (handTiles.length == 0) {
    return state;
  }
  const tile = handTiles[0];
  if (state.mouseState.t == 'up' && getWidgetPoint(cs, state.mouseState.p_in_canvas).t == 'world') {
    const p_in_world_int = pointFall(cs, state.mouseState.p_in_canvas);
    if (!isOccupied(cs, { id: tile.id, letter: tile.letter, p_in_world_int })) {
      return withCoreState(state, cs => checkValid(putTileInWorld(cs, tile.id, p_in_world_int)));
    }
  }
  return state;
}
