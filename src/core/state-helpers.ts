import { DEBUG, logger } from "../util/debug";
import { produce } from "../util/produce";
import * as se1 from '../util/se1';
import { SE2, apply, inverse } from '../util/se2';
import { Point } from "../util/types";
import { vadd, vequal, vm } from "../util/vutil";
import { Animation } from "./animation-types";
import { mkPointDecayAnimation, mkScoreAnimation, mkWinAnimation } from './animations';
import { getAssets } from "./assets";
import { Scoring, adjacentScoringOfBonus, overlapScoringOfBonus } from "./bonus";
import { getBonusFromLayer, resolveScoring, updateBonusLayer } from "./bonus-helpers";
import { CacheUpdate, mkChunkUpdate } from './cache-types';
import { BIT_CONNECTED } from "./chunk";
import { PauseData, WORD_BONUS_INTERVAL_MS, now_in_game } from "./clock";
import { DrawForce, getLetterSample } from "./distribution";
import { updateFogOfWar } from "./fog-of-war";
import { freshPanic } from "./fresh-panic";
import { checkConnected, checkGridWords, gridKeys, mapGrid, mkGridOfMainTiles, unionGrids } from "./grid";
import { mkOverlayFrom, overlayAny, overlayPoints, setOverlay } from "./layer";
import { AbstractLetter } from "./letters";
import { addRandomMob } from "./mob-helpers";
import { PROGRESS_ANIMATION_POINTS, getHighWaterMark, getScore, setHighWaterMark } from "./scoring";
import { CoreState, GameState } from "./state";
import { HAND_TILE_LIMIT, MainLoc, MainTile, MouseState, TileNoId, WordBonusState } from './state-types';
import { MobileId } from './basic-types';
import { addHandTileEntity, addWorldTile, get_hand_tiles, get_main_tiles as get_world_tiles } from "./tile-helpers";
import { getCurrentTool } from "./tools";
import { WIN_SCORE, canWinFromState, shouldStartPanicBar } from "./winState";

export function addWorldTiles(state: CoreState, tiles: TileNoId[]): CoreState {
  tiles.forEach(tile => {
    state = addWorldTile(state, tile);
  });
  return state;
}

export function addHandTileEntities(state: CoreState, tiles: { letter: AbstractLetter, index: number }[]): CoreState {
  tiles.forEach(tile => {
    const { cs } = addHandTileEntity(state, tile.letter, tile.index);
    state = cs;
  });
  return state;
}

export function drawOfState(state: CoreState, drawForce?: DrawForce): CoreState {
  const handLength = get_hand_tiles(state).length;
  if (handLength >= HAND_TILE_LIMIT)
    return state;
  const { letter, energies, seed } = getLetterSample(state.seed, state.energies, drawForce);
  const { cs } = addHandTileEntity(state, { t: 'single', letter }, handLength);
  return checkValid(produce(cs, s => {
    s.seed = seed;
    s.energies = energies;
  }));
}

// doesn't call checkValid!
export function drawSpecific(state: CoreState, letter: AbstractLetter): { cs: CoreState, newId: MobileId } | undefined {
  const handLength = get_hand_tiles(state).length;
  if (handLength >= HAND_TILE_LIMIT)
    return undefined;

  const { tile, cs } = addHandTileEntity(state, letter, handLength);
  return {
    cs, newId: tile.id
  };
}

const directions: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) => ({ x, y }));

// The reason we take in tiles rather than fetching
//   const tiles = get_world_tiles(state);
// is that not all tiles are eligible to trigger bonuses. Principally,
// tiles in "safe storage". So we expect the caller to tell us what
// the legitimate bonus-triggering tiles are.
export function resolveValid(state: CoreState, tiles: MainTile[], validWords: Set<string>): CoreState {
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
    destroy: false,
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
      state = addRandomMob(state);
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

export function checkValid(state: CoreState): CoreState {
  const tiles = get_world_tiles(state);

  const realTiles: MainTile[] = [];
  const safeTiles: MainTile[] = [];
  tiles.forEach(tile => {
    const bonus = getBonusFromLayer(state, tile.loc.p_in_world_int);
    if (bonus.t == 'safe-storage') {
      safeTiles.push(tile);
    }
    else {
      realTiles.push(tile);
    }
  });
  const grid = mkGridOfMainTiles(realTiles);

  const oldConnectedSet = state.connectedSet;

  const { validWords, invalidWords } = checkGridWords(grid, word => getAssets().dictionary[word] || DEBUG.allWords);
  const { allConnected, connectedSet: realConnectedSet } = checkConnected(grid);
  const connectedSet = unionGrids(realConnectedSet, mapGrid(mkGridOfMainTiles(safeTiles), _ => true));

  let allValid = false;
  if (invalidWords.length == 0 && allConnected && get_hand_tiles(state).length == 0) {
    state = resolveValid(state, realTiles, new Set(validWords.map(x => x.word)));
    allValid = true;
  }

  let panic = state.panic;
  if (allValid)
    panic = undefined;
  else if (panic === undefined && shouldStartPanicBar(state.slowState.winState)) {
    panic = freshPanic(state);
  }

  let winState = state.slowState.winState;
  let animations = state.animations;

  if (getScore(state) >= WIN_SCORE && canWinFromState(state.slowState.winState)) {
    winState = { t: 'won', winTime_in_game: now_in_game(state.game_from_clock) };
    animations = [...animations, mkWinAnimation(state.game_from_clock)];
  }

  const oldCacheUpdates: CacheUpdate[] =
    gridKeys(oldConnectedSet).map(p_in_world_int => mkChunkUpdate(
      p_in_world_int,
      { t: 'clearBit', bit: BIT_CONNECTED }
    ));

  const newCacheUpdates: CacheUpdate[] =
    gridKeys(connectedSet).map(p_in_world_int => mkChunkUpdate(
      p_in_world_int,
      { t: 'setBit', bit: BIT_CONNECTED }
    ));

  state = produce(state, s => {
    s.panic = panic;
    s.slowState.invalidWords = invalidWords;
    s.connectedSet = connectedSet;
    s.slowState.winState = winState;
    s.animations = animations;
    s._cacheUpdateQueue.push(...oldCacheUpdates);
    s._cacheUpdateQueue.push(...newCacheUpdates);

    // XXX: is this the right place to do this?
    if (getCurrentTool(state) != 'dynamite')
      s.slowState.currentTool = 'pointer';
  });

  if (allValid)
    state = updateFogOfWar(state, realTiles);

  return state;
}


export function isMobilePinned(state: CoreState, id: MobileId, loc: MainLoc): boolean {
  if (state.selected && state.selected.selectedIds.includes(id)) {
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
// number returned is number expired
export function filterExpiredWordBonusState(now_ms: number, wordBonusState: WordBonusState): [WordBonusState, number] {
  const newActive = wordBonusState.active.filter(wb => now_ms <= wb.activation_time_in_game + WORD_BONUS_INTERVAL_MS);
  return [produce(wordBonusState, s => { s.active = newActive; }), wordBonusState.active.length - newActive.length];
}

export function unpauseState(state: CoreState, pause: PauseData): CoreState {
  const newGame_from_clock = se1.compose(se1.translate(pause.pauseTime_in_clock - Date.now()), state.game_from_clock);
  return produce(state, s => {
    s.slowState.paused = undefined;
    s.game_from_clock = newGame_from_clock;
  });

}

export function pointFall(state: CoreState, p_in_canvas: Point): Point {
  return pointFallForPan(state.canvas_from_world, p_in_canvas);
}

export function pointFallForPan(canvas_from_world: SE2, p_in_canvas: Point): Point {
  return vm(apply(inverse(canvas_from_world), p_in_canvas),
    Math.floor);
}

export function withCoreState(state: GameState, k: (cs: CoreState) => CoreState): GameState {
  const ncs = k(state.coreState);
  return produce(state, s => {
    s.coreState = ncs;
  });
}

export function proposedHandDragOverLimit(state: CoreState, mouseState: MouseState): boolean {
  const numHandTiles = get_hand_tiles(state).length - (mouseState.t == 'drag_mobile' && mouseState.orig_loc.t == 'hand' ? 1 : 0);
  const numDragTiles = (state.selected == undefined ? 1 : state.selected.selectedIds.length);
  return numHandTiles + numDragTiles > HAND_TILE_LIMIT;
}

export function needsRefresh(state: MouseState): boolean {
  return state.t == 'drag_selection' || state.t == 'exchange_tiles';
}

export function lostState(state: CoreState): boolean {
  return state.slowState.winState.t == 'lost';
}
