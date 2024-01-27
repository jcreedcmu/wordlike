import { canvas_from_drag_tile } from "../ui/view-helpers";
import { getWidgetPoint } from "../ui/widget-helpers";
import { DEBUG, logger } from "../util/debug";
import { produce } from "../util/produce";
import * as se1 from '../util/se1';
import { apply, compose, inverse } from '../util/se2';
import { Point } from "../util/types";
import { vadd, vequal, vm } from "../util/vutil";
import { Animation, mkPointDecayAnimation, mkScoreAnimation, mkWinAnimation } from './animations';
import { getAssets } from "./assets";
import { Bonus, ScoringBonus, adjacentScoringOfBonus, isBlocking, overlapScoringOfBonus, resolveScoring } from "./bonus";
import { getBonusFromLayer, updateBonusLayer } from "./bonus-helpers";
import { BIT_CONNECTED, updateChunkCache } from "./chunk";
import { PANIC_INTERVAL_MS, PanicData, PauseData, WORD_BONUS_INTERVAL_MS, now_in_game } from "./clock";
import { DrawForce, getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, gridKeys, mkGridOfMainTiles } from "./grid";
import { Layer, Overlay, getOverlayLayer, mkOverlayFrom, overlayAny, overlayPoints, setOverlay } from "./layer";
import { PROGRESS_ANIMATION_POINTS, getHighWaterMark, getScore, setHighWaterMark } from "./scoring";
import { CacheUpdate, CoreState, GameState, HAND_TILE_LIMIT, Location, MouseState, Tile, TileEntity, WordBonusState } from "./state";
import { addHandTile, addWorldTile, get_hand_tiles, get_main_tiles, get_tiles, putTileInWorld } from "./tile-helpers";
import { ensureTileId } from "./tile-id-helpers";
import { getCurrentTool } from "./tools";
import { WIN_SCORE, canWinFromState, shouldStartPanicBar } from "./winState";

export type Scoring = {
  bonus: ScoringBonus | { t: 'wordAchieved', word: string },
  p_in_world_int: Point,
  destroy: boolean,
};

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
export type GenMoveTile = { id: string, loc: Location };

// Returns false if we cannot place
export function isCollision(tiles: TileEntity[], moveTiles: MoveTile[], bonusOverlay: Overlay<Bonus>, bonusLayer: Layer<Bonus>) {
  return moveTiles.some(moveTile => isOccupiedTiles(tiles, moveTile.p_in_world_int)
    || isBlocking(moveTile, getOverlayLayer(bonusOverlay, bonusLayer, moveTile.p_in_world_int)));
}

export function isOccupied(state: CoreState, moveTile: MoveTile): boolean {
  if (isOccupiedTiles(get_tiles(state), moveTile.p_in_world_int))
    return true;
  return isBlocking(moveTile, getBonusFromLayer(state, moveTile.p_in_world_int));
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

export function resolveValid(state: CoreState, validWords: Set<string>): CoreState {
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
    return overlapScoringOfBonus(getBonusFromLayer(state, p), p);
  });

  const wordAchievedScorings: Scoring[] = state.wordBonusState.active.filter(x => validWords.has(x.word)).map(x => ({
    bonus: { t: 'wordAchieved', word: x.word },
    destroy: true,
    p_in_world_int: x.p_in_world_int,
  }));

  const adjacentScorings = overlayPoints(layer)
    .flatMap(p => adjacentScoringOfBonus(getBonusFromLayer(state, p), p))
    .filter(sc =>
      wordAchievedScorings.findIndex(x => vequal(x.p_in_world_int, sc.p_in_world_int)) == -1
      && state.wordBonusState.active.findIndex(x => vequal(x.p_in_world_int, sc.p_in_world_int)) == -1);

  const scorings = [...overlapScorings, ...adjacentScorings, ...wordAchievedScorings];

  const newActive = state.wordBonusState.active.filter(x => !validWords.has(x.word));
  let tmpState = produce(state, s => { s.wordBonusState.active = newActive; });

  scorings.forEach(scoring => {
    if (scoring.destroy) {
      tmpState = updateBonusLayer(tmpState, scoring.p_in_world_int, { t: 'empty' });
      tmpState = produce(tmpState, s => {
        s.animations.push(mkPointDecayAnimation(scoring.p_in_world_int, state.game_from_clock));
      });
    }
    tmpState = resolveScoring(tmpState, scoring);
  });

  return resolveHighWaterMark(tmpState);
}

function resolveHighWaterMark(state: CoreState): CoreState {
  const score = getScore(state);
  const oldMark = getHighWaterMark(state);
  if (score > oldMark) {
    const scoreLevel = Math.floor(score / PROGRESS_ANIMATION_POINTS);
    const oldMarkLevel = Math.floor(oldMark / PROGRESS_ANIMATION_POINTS);
    let anim: undefined | Animation;
    if (scoreLevel > oldMarkLevel && !(score > WIN_SCORE)) {
      anim = mkScoreAnimation(state.game_from_clock, scoreLevel * PROGRESS_ANIMATION_POINTS);
    }
    return produce(state, s => {
      if (anim !== undefined)
        s.animations.push(anim);
      setHighWaterMark(s, score);
    });
  }
  else {
    return state;
  }
}

export function freshPanic(state: CoreState): PanicData {
  const currentTime_in_game = now_in_game(state.game_from_clock);
  const debug_offset = DEBUG.skipAheadPanic ? PANIC_INTERVAL_MS - 10000 : 0;
  return { currentTime_in_game, lastClear_in_game: currentTime_in_game - debug_offset };
}

export function checkValid(state: CoreState): CoreState {
  const tiles = get_main_tiles(state);
  const grid = mkGridOfMainTiles(tiles);

  const oldConnectedSet = state.connectedSet;

  const { validWords, invalidWords } = checkGridWords(grid, word => getAssets().dictionary[word] || DEBUG.allWords);
  const { allConnected, connectedSet } = checkConnected(grid);
  let allValid = false;
  if (invalidWords.length == 0 && allConnected && get_hand_tiles(state).length == 0) {
    state = resolveValid(state, new Set(validWords.map(x => x.word)));
    allValid = true;
  }

  let panic = state.panic;
  if (allValid)
    panic = undefined;
  else if (panic === undefined && shouldStartPanicBar(state.winState)) {
    panic = freshPanic(state);
  }

  let winState = state.winState;
  let animations = state.animations;

  if (getScore(state) >= WIN_SCORE && canWinFromState(state.winState)) {
    winState = { t: 'won', winTime_in_game: now_in_game(state.game_from_clock) };
    animations = [...animations, mkWinAnimation(state.game_from_clock)];
  }

  const oldCacheUpdates: CacheUpdate[] =
    gridKeys(oldConnectedSet).map(p_in_world_int => ({
      p_in_world_int,
      chunkUpdate: { t: 'clearBit', bit: BIT_CONNECTED }
    }));

  const newCacheUpdates: CacheUpdate[] =
    gridKeys(connectedSet).map(p_in_world_int => ({
      p_in_world_int,
      chunkUpdate: { t: 'setBit', bit: BIT_CONNECTED }
    }));

  return produce(state, s => {
    s.panic = panic;
    s.slowState.invalidWords = invalidWords;
    s.connectedSet = connectedSet;
    s.winState = winState;
    s.animations = animations;
    s._cacheUpdateQueue.push(...oldCacheUpdates);
    s._cacheUpdateQueue.push(...newCacheUpdates);

    // XXX: is this the right place to do this?
    if (getCurrentTool(state) != 'dynamite')
      s.slowState.currentTool = 'pointer';
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

// List of Points is where to destroy word bonuses without points
export function filterExpiredWordBonusState(now_ms: number, wordBonusState: WordBonusState): [WordBonusState, Point[]] {
  const newActive = wordBonusState.active.filter(wb => now_ms <= wb.activation_time_in_game + WORD_BONUS_INTERVAL_MS);
  return [
    produce(wordBonusState, s => { s.active = newActive; }),
    wordBonusState.active.filter(wb => now_ms > wb.activation_time_in_game + WORD_BONUS_INTERVAL_MS).map(wb => wb.p_in_world_int)
  ];
}

export function unpauseState(state: CoreState, pause: PauseData): CoreState {
  const newGame_from_clock = se1.compose(se1.translate(pause.pauseTime_in_clock - Date.now()), state.game_from_clock);
  return produce(state, s => {
    s.slowState.paused = undefined;
    s.game_from_clock = newGame_from_clock;
  });

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

export function proposedHandDragOverLimit(state: CoreState, mouseState: MouseState): boolean {
  const numHandTiles = get_hand_tiles(state).length - (mouseState.t == 'drag_tile' && mouseState.orig_loc.t == 'hand' ? 1 : 0);
  const numDragTiles = (state.selected == undefined ? 1 : state.selected.selectedIds.length);
  return numHandTiles + numDragTiles > HAND_TILE_LIMIT;
}

export function needsRefresh(state: MouseState): boolean {
  return state.t == 'drag_selection' || state.t == 'exchange_tiles';
}
