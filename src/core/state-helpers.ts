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
import { GameState, Tile, TileEntity, TileEntityOptionalId } from "./state";

// FIXME: global counter
let tileIdCounter = 1000;

function tileOfTileEntity(tile: TileEntity): Tile {
  switch (tile.loc.t) {
    case 'hand': return { letter: tile.letter, id: tile.id, p_in_world_int: tile.loc.p_in_hand_int };
    case 'world': return { letter: tile.letter, id: tile.id, p_in_world_int: tile.loc.p_in_world_int };
  }
}

export function getTileId(state: GameState, id: string): Tile {
  return tileOfTileEntity(state.tile_entities[id]);
}

export function get_main_tiles(state: GameState): Tile[] {
  return Object.keys(state.tile_entities).flatMap(k => {
    const tile = state.tile_entities[k];
    if (tile.loc.t == 'world')
      return [{
        id: tile.id,
        p_in_world_int: tile.loc.p_in_world_int,
        letter: tile.letter
      }]
    else
      return [];
  });
}

export function get_hand_tiles(state: GameState): Tile[] {
  return Object.keys(state.tile_entities).flatMap(k => {
    const tile = state.tile_entities[k];
    if (tile.loc.t == 'hand')
      return [{
        id: tile.id,
        p_in_world_int: tile.loc.p_in_hand_int,
        letter: tile.letter
      }]
    else
      return [];
  }).sort((a, b) => a.p_in_world_int.y - b.p_in_world_int.y);
}

export function removeTile(state: GameState, id: string): GameState {
  return produce(state, s => {
    delete s.tile_entities[id];
  });
}

function ensureId(tile: TileEntityOptionalId): TileEntity {
  const id = tile.id ?? `tile${tileIdCounter++}`;
  return { ...tile, id };
}

export function addWorldTile(state: Draft<GameState>, tile: Tile): void {
  const newTile: TileEntity = ensureId({
    id: tile.id,
    letter: tile.letter, loc: { t: 'world', p_in_world_int: tile.p_in_world_int }
  });
  state.tile_entities[newTile.id] = newTile;
}

export function addHandTile(state: Draft<GameState>, tile: Tile): void {
  const newTile: TileEntity = ensureId({
    id: tile.id,
    letter: tile.letter, loc: { t: 'hand', p_in_hand_int: tile.p_in_world_int }
  });
  state.tile_entities[newTile.id] = newTile;
}

export function putTileInWorld(state: GameState, id: string, p_in_world_int: Point): GameState {
  const loc = state.tile_entities[id].loc;
  const handTiles = get_hand_tiles(state);
  switch (loc.t) {
    case 'world':
      return produce(state, s => {
        s.tile_entities[id].loc = { t: 'world', p_in_world_int };
      });
    case 'hand':
      return produce(state, s => {
        for (let i = loc.p_in_hand_int.y; i < handTiles.length; i++) {
          s.tile_entities[handTiles[i].id!].loc = { t: 'hand', p_in_hand_int: { x: 0, y: i - 1 } }; // FIXME undefined
        }
        s.tile_entities[id].loc = { t: 'world', p_in_world_int };
      });
  }

}

// XXX: assumes tile was in world before
export function putTileInHand(state: GameState, id: string, ix: number): GameState {
  const tile = getTileId(state, id);
  const handTiles = get_hand_tiles(state);

  return produce(state, s => {
    for (let i = ix; i < handTiles.length; i++) {
      s.tile_entities[handTiles[i].id!].loc = { t: 'hand', p_in_hand_int: { x: 0, y: i + 1 } };
    }
    s.tile_entities[id].loc = { t: 'hand', p_in_hand_int: { x: 0, y: ix } };
  });
}

////////////////////////////////////////////////////////////////
// ultimately, functions above this point should be the only things accessing main_tiles or hand_tiles,
// other than perhaps state initialization in state.ts.
////////////////////////////////////////////////////////////////

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

export function isOccupied(state: GameState, p: Point): boolean {
  return get_main_tiles(state).some(tile => vequal(tile.p_in_world_int, p));
}

export function drawOfState(state: GameState): GameState {
  const handLength = get_hand_tiles(state).length;
  const { letter, energies, seed } = getLetterSample(state.seed, state.energies);
  return checkValid(produce(state, s => {
    s.seed = seed;
    s.energies = energies;
    addHandTile(s, { letter, p_in_world_int: { x: 0, y: handLength } });
  }));
}

export function killTileOfState(state: GameState): GameState {
  const p_in_world_int = vm(apply(inverse(state.canvas_from_world), state.mouseState.p_in_canvas), Math.floor);
  const tile = get_main_tiles(state).find(tile => vequal(tile.p_in_world_int, p_in_world_int));
  if (tile == undefined || tile.id == undefined) // FIXME: eventually tile.id should be mandatory
    return state;
  return checkValid(produce(removeTile(state, tile.id), s => {
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
