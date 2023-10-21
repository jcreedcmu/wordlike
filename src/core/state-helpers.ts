import { WidgetPoint } from "../ui/widget-helpers";
import { logger } from "../util/debug";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vequal, vint } from "../util/vutil";
import { getAssets } from "./assets";
import { getLetterSample } from "./distribution";
import { checkConnected, checkGridWords, mkGridOfMainTiles } from "./grid";
import { getOverlayLayer, setOverlay } from "./layer";
import { GameState, Tile, TileEntity } from "./state";
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

export function isCollision(tiles: TileEntity[], points: Point[]) {
  return points.some(point => isOccupiedTiles(tiles, point));
}

export function isOccupied(state: GameState, p: Point): boolean {
  return isOccupiedTiles(get_tiles(state), p);
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

export function killTileOfState(state: GameState, wp: WidgetPoint): GameState {

  switch (wp.t) {
    case 'world': {
      const p_in_world_int = vint(wp.p_in_local);
      const tile = get_main_tiles(state).find(tile => vequal(tile.loc.p_in_world_int, p_in_world_int));
      if (tile == undefined)
        return state;
      return checkValid(produce(removeTile(state, tile.id), s => {
        s.score--;
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
          s.score--;
        }));
      }
      else {
        return state;
      }
    }
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
