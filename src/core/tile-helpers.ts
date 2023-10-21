import { Draft } from "immer";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { GameState, Tile, TileEntity, TileEntityOptionalId, TileOptionalId } from "./state";

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
      }];

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
      }];
    else
      return [];
  }).sort((a, b) => a.p_in_world_int.y - b.p_in_world_int.y);
}

export function removeTile(state: GameState, id: string): GameState {
  const loc = state.tile_entities[id].loc;
  switch (loc.t) {
    case 'world':
      return produce(state, s => {
        delete s.tile_entities[id];
      });
    case 'hand':
      const handTiles = get_hand_tiles(state);
      return produce(state, s => {
        for (let i = loc.p_in_hand_int.y; i < handTiles.length; i++) {
          s.tile_entities[handTiles[i].id].loc = { t: 'hand', p_in_hand_int: { x: 0, y: i - 1 } };
        }
        delete s.tile_entities[id];
      });
  }
}

function ensureId(tile: TileEntityOptionalId): TileEntity {
  const id = tile.id ?? `tile${tileIdCounter++}`;
  return { ...tile, id };
}

export function ensureTileId(tile: TileOptionalId): Tile {
  const id = tile.id ?? `tile${tileIdCounter++}`;
  return { ...tile, id };
}

export function addWorldTile(state: Draft<GameState>, tile: TileOptionalId): void {
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
          s.tile_entities[handTiles[i].id].loc = { t: 'hand', p_in_hand_int: { x: 0, y: i - 1 } };
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
      s.tile_entities[handTiles[i].id].loc = { t: 'hand', p_in_hand_int: { x: 0, y: i + 1 } };
    }
    s.tile_entities[id].loc = { t: 'hand', p_in_hand_int: { x: 0, y: ix } };
  });
}

export function removeAllTiles(state: GameState): GameState {
  return produce(state, s => { s.tile_entities = {}; });
}
