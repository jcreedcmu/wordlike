import { mkPointDecayAnimation, Animation, mkExplosionAnimation } from './animations';
import { DragWidgetPoint, WidgetPoint } from "../ui/widget-helpers";
import { logger } from "../util/debug";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vadd, vequal, vint } from "../util/vutil";
import { getAssets } from "./assets";
import { Bonus, isBlocking, getBonusLayer } from "./bonus";
import { PanicData, PauseData, now_in_game } from "./clock";
import { getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, mkGridOfMainTiles } from "./grid";
import { Layer, Overlay, getOverlay, getOverlayLayer, mkOverlayFrom, overlayAny, overlayForEach, overlayPoints, setOverlay } from "./layer";
import { CoreState, GameState, HAND_TILE_LIMIT, Location, MainTile, SelectionState, Tile, TileEntity } from "./state";
import { addHandTile, addWorldTile, ensureTileId, get_hand_tiles, get_main_tiles, get_tiles, removeTile } from "./tile-helpers";
import { apply, compose, translate } from '../util/se1';
import { Intent, KillIntent } from './reduce';
import { Draft } from 'immer';
import { BOMB_RADIUS } from './tools';

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
export function isCollision(tiles: TileEntity[], points: Point[], bonusOverlay: Overlay<Bonus>, bonusLayer: Layer<Bonus>) {
  return points.some(p => isOccupiedTiles(tiles, p) || isBlocking(getOverlayLayer(bonusOverlay, bonusLayer, p)));
}

export function isOccupied(state: GameState, p: Point): boolean {
  if (isOccupiedTiles(get_tiles(state), p))
    return true;
  return isBlocking(bonusOfStatePoint(state.coreState, p));
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

function eligibleKillIntent(state: GameState, intent: KillIntent): boolean {
  switch (intent.t) {
    case 'kill': return state.coreState.score >= intent.cost;
    case 'bomb': return state.coreState.inventory.bombs >= 1;
  }
}

function spendKillIntent(state: GameState, intent: KillIntent): GameState {
  switch (intent.t) {
    case 'kill': return produce(state, s => { s.coreState.score -= intent.cost; });
    case 'bomb': return produce(state, s => { s.coreState.inventory.bombs--; });
  }
}

export function tryKillTileOfState(state: GameState, wp: WidgetPoint, intent: KillIntent): GameState {
  if (!eligibleKillIntent(state, intent))
    return state;

  if (!(wp.t == 'world' || wp.t == 'hand'))
    return state;

  return killTileOfState(state, wp, intent);
}

function splashDamage(center: Point, radius: number): Point[] {
  if (radius == 0)
    return [center];
  const pts: Point[] = [];
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      pts.push({ x: center.x + x, y: center.y + y });
    }
  }
  return pts;
}

function killTileOfState(state: GameState, wp: DragWidgetPoint, intent: KillIntent): GameState {
  const radius = intent.t == 'kill' ? intent.radius : BOMB_RADIUS;

  // Definitely want to clear the selection, because invariants get
  // violated if a tileId gets deleted but remains in the selection
  state = produce(state, s => { s.coreState.selected = undefined });

  switch (wp.t) {
    case 'world': {
      const p_in_world_int = vint(wp.p_in_local);
      const anim: Animation = mkExplosionAnimation(p_in_world_int, radius, state.coreState.game_from_clock);

      function tileAt(p: Point): MainTile | undefined {
        return get_main_tiles(state).find(tile => vequal(tile.loc.p_in_world_int, p));
      }
      function blockAt(p: Point) {
        return bonusOfStatePoint(state.coreState, p).t == 'block';
      }

      const tilesToDestroy: Point[] = splashDamage(p_in_world_int, radius);
      // remove all tiles in radius
      tilesToDestroy.forEach(p => {
        const tileAtP = tileAt(p);
        if (tileAtP !== undefined)
          state = removeTile(state, tileAtP.id);
      });
      // remove all blocks in radius
      state = produce(state, s => {
        tilesToDestroy.forEach(p => {
          if (blockAt(p))
            setOverlay(s.coreState.bonusOverlay, p, { t: 'empty' });
        });
      });

      return checkValid(produce(spendKillIntent(state, intent), s => {
        s.coreState.animations.push(anim);
      }));
    }
    case 'hand': {
      const p_in_hand_int = vint(wp.p_in_local);
      const hand_tiles = get_hand_tiles(state);
      if (p_in_hand_int.x == 0 && p_in_hand_int.y < hand_tiles.length) {
        const tile = hand_tiles[p_in_hand_int.y];
        if (tile == undefined)
          return state;
        return checkValid(produce(removeTile(state, tile.id), s => {
          s.coreState.score--;
        }));
      }
      else {
        return state;
      }
    }
  }
}

const directions: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) => ({ x, y }));

export type Scoring =
  | { t: 'bonus', p: Point }
  | { t: 'bomb', p: Point }
  ;

function scoringOfBonus(bonus: Bonus, p: Point): Scoring[] {
  switch (bonus.t) {
    case 'bonus': return [{ t: 'bonus', p }];
    case 'bomb': return [{ t: 'bomb', p }];
    default: return [];
  }
}

function resolveScoring(state: Draft<CoreState>, scoring: Scoring): void {
  switch (scoring.t) {
    case 'bonus': state.score++; break;
    case 'bomb': state.inventory.bombs++; break;
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

  const scorings = overlayPoints(layer)
    .flatMap(p => scoringOfBonus(bonusOfStatePoint(state.coreState, p), p));

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
