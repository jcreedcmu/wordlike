import { WidgetPoint } from "../ui/widget-helpers";
import { logger } from "../util/debug";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vadd, vequal, vint } from "../util/vutil";
import { getAssets } from "./assets";
import { Bonus } from "./bonus";
import { getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, mkGridOfMainTiles } from "./grid";
import { Layer, Overlay, getOverlayLayer, overlayAny, overlayPoints, setOverlay } from "./layer";
import { Animation, GameState, Location, SelectionState, Tile, TileEntity } from "./state";
import { addHandTile, addWorldTile, ensureTileId, get_hand_tiles, get_main_tiles, get_tiles, removeTile } from "./tile-helpers";

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

export function isCollision(tiles: TileEntity[], points: Point[], bonusOverlay: Overlay<Bonus>, bonusLayer: Layer<Bonus>) {
  return points.some(p => isOccupiedTiles(tiles, p) || getOverlayLayer(bonusOverlay, bonusLayer, p) == 'block');
}

export function isOccupied(state: GameState, p: Point): boolean {
  return isOccupiedTiles(get_tiles(state), p) || getOverlayLayer(state.bonusOverlay, state.bonusLayer, p) == 'block';
}

export function isOccupiedTiles(tiles: TileEntity[], p: Point): boolean {
  return tiles.some(tile => tile.loc.t == 'world' && vequal(tile.loc.p_in_world_int, p));
}

export function drawOfState(state: GameState): GameState {
  const handLength = get_hand_tiles(state).length;
  const { letter, energies, seed } = getLetterSample(state.seed, state.energies);
  return checkValid(produce(state, s => {
    s.seed = seed;
    s.energies = energies;
    addHandTile(s, ensureTileId({ letter, p_in_world_int: { x: 0, y: handLength } }));
  }));
}

export function tryKillTileOfState(state: GameState, wp: WidgetPoint): GameState {
  if (state.score > 0)
    return killTileOfState(state, wp);
  else
    return state;
}

function killTileOfState(state: GameState, wp: WidgetPoint): GameState {

  // Definitely want to clear the selection, because invariants get
  // violated if a tileId gets deleted but remains in the selection
  state = produce(state, s => { s.selected = undefined });

  switch (wp.t) {
    case 'world': {
      const p_in_world_int = vint(wp.p_in_local);
      const anim: Animation = {
        t: 'explosion',
        center_in_world: vadd(p_in_world_int, { x: 0.5, y: 0.5 }),
        duration_ms: 500,
        start_ms: Date.now(),
      }
      const tile = get_main_tiles(state).find(tile => vequal(tile.loc.p_in_world_int, p_in_world_int));
      if (tile != undefined) {

        return checkValid(produce(removeTile(state, tile.id), s => {
          s.score--;
          s.animations.push(anim);
        }));

      }
      else if (getOverlayLayer(state.bonusOverlay, state.bonusLayer, p_in_world_int) == 'block') {
        return checkValid(produce(state, s => {
          setOverlay(s.bonusOverlay, p_in_world_int, 'empty');
          s.score--;
          s.animations.push(anim);
        }));
      }
      else {
        return state;
      }
    }
    case 'hand': {
      const p_in_hand_int = vint(wp.p_in_local);
      const hand_tiles = get_hand_tiles(state);
      if (p_in_hand_int.x == 0 && p_in_hand_int.y < hand_tiles.length) {
        const tile = hand_tiles[p_in_hand_int.y];
        if (tile == undefined)
          return state;
        return checkValid(produce(removeTile(state, tile.id), s => {
          s.score--;
        }));
      }
      else {
        return state;
      }
    }
    case 'toolbar':
      return state;
  }
}

function resolveValid(state: GameState): GameState {
  const tiles = get_main_tiles(state);
  logger('words', 'grid valid');
  const scorings = tiles.flatMap(tile => {
    if (getOverlayLayer(state.bonusOverlay, state.bonusLayer, tile.loc.p_in_world_int) == 'bonus') {
      return [tile.loc.p_in_world_int];
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
  if (!allValid && panic === undefined)
    panic = { currentTime: Date.now(), lastClear: Date.now() };

  return produce(state, s => {
    s.panic = panic;
    s.invalidWords = invalidWords;
    s.connectedSet = connectedSet;
  });
}


export function isTilePinned(state: GameState, tileId: string, loc: Location & { t: 'world' }): boolean {
  if (state.selected && state.selected.selectedIds.includes(tileId)) {
    return overlayAny(state.selected.overlay, p => vequal(p, { x: 0, y: 0 }));
  }
  else {
    return vequal(loc.p_in_world_int, { x: 0, y: 0 });
  }
}

export function filterExpiredAnimations(now_ms: number, anims: Animation[]): Animation[] {
  return anims.filter(anim => now_ms <= anim.start_ms + anim.duration_ms);
}
