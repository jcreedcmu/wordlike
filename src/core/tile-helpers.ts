import { Draft } from "immer";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vequal, vm } from "../util/vutil";
import { CoreState, GameState, HandTile, Location, MainTile, Tile, TileEntity, TileEntityOptionalId, TileOptionalId } from "./state";
import { Bonus } from "./bonus";
import { getBonusFromLayer } from "./bonus-helpers";
import { ensureId } from "./tile-id-helpers";

export type TileId = string;

function tileOfTileEntity(tile: TileEntity): Tile {
  switch (tile.loc.t) {
    case 'hand': return { letter: tile.letter, id: tile.id, p_in_world_int: tile.loc.p_in_hand_int };
    case 'world': return { letter: tile.letter, id: tile.id, p_in_world_int: tile.loc.p_in_world_int };
    case 'nowhere': throw new Error(`Trying to construct Tile out of nowhere tile`);
  }
}

export function getTileId(state: CoreState, id: string): TileEntity {
  return state.tile_entities[id];
}

export function getTileLoc(state: CoreState, id: string): Location {
  return state.tile_entities[id].loc;
}

export function setTileLoc(state: Draft<CoreState>, id: string, loc: Location): void {
  state.tile_entities[id].loc = loc;
}

export function get_tiles(state: CoreState): TileEntity[] {
  return Object.values(state.tile_entities);
}

export function get_main_tiles(state: CoreState): MainTile[] {
  const keys: string[] = Object.keys(state.tile_entities);
  function mainTilesOfString(k: string): MainTile[] {
    const tile = getTileId(state, k);
    const loc = tile.loc;
    if (loc.t == 'world') {
      return [{ ...tile, loc }];
    }
    else
      return [];
  }
  return keys.flatMap(mainTilesOfString);
}

export function get_hand_tiles(state: CoreState): HandTile[] {
  return Object.keys(state.tile_entities).flatMap(k => {
    const tile = getTileId(state, k);
    const loc = tile.loc;
    if (loc.t == 'hand')
      return [{ ...tile, loc }];
    else
      return [];
  }).sort((a, b) => a.loc.p_in_hand_int.y - b.loc.p_in_hand_int.y);
}

export function removeTile(state: CoreState, id: string): CoreState {
  const loc = getTileLoc(state, id);
  const nowhere = putTileNowhere(state, id);
  return produce(nowhere, s => {
    delete s.tile_entities[id];
  });
}

export function addWorldTile(state: Draft<CoreState>, tile: TileOptionalId): void {
  const newTile: TileEntity = ensureId({
    id: tile.id,
    letter: tile.letter, loc: { t: 'world', p_in_world_int: tile.p_in_world_int }
  });
  state.tile_entities[newTile.id] = newTile;
}

export function addHandTile(state: Draft<CoreState>, tile: Tile): void {
  const newTile: TileEntity = ensureId({
    id: tile.id,
    letter: tile.letter, loc: { t: 'hand', p_in_hand_int: tile.p_in_world_int }
  });
  state.tile_entities[newTile.id] = newTile;
}

export function putTileInWorld(state: CoreState, id: string, p_in_world_int: Point): CoreState {
  const nowhere = putTileNowhere(state, id);
  return produce(nowhere, s => {
    setTileLoc(s, id, { t: 'world', p_in_world_int });
  });
}

export function putTileInHand(state: CoreState, id: string, ix: number): CoreState {
  const nowhere = putTileNowhere(state, id);
  const handTiles = get_hand_tiles(nowhere);

  if (ix > handTiles.length)
    ix = handTiles.length;
  if (ix < 0)
    ix = 0;

  return produce(nowhere, s => {
    for (let i = ix; i < handTiles.length; i++) {
      setTileLoc(s, handTiles[i].id, { t: 'hand', p_in_hand_int: { x: 0, y: i + 1 } });
    }
    setTileLoc(s, id, { t: 'hand', p_in_hand_int: { x: 0, y: ix } });
  });
}

export function putTileNowhere(state: CoreState, id: string): CoreState {
  const loc = getTileLoc(state, id);
  const handTiles = get_hand_tiles(state);
  switch (loc.t) {
    case 'world':
      return produce(state, s => {
        setTileLoc(s, id, { t: 'nowhere' });
      });
    case 'hand':
      return produce(state, s => {
        for (let i = loc.p_in_hand_int.y; i < handTiles.length; i++) {
          setTileLoc(s, handTiles[i].id, { t: 'hand', p_in_hand_int: { x: 0, y: i - 1 } });
        }
        setTileLoc(s, id, { t: 'nowhere' });
      });
    case 'nowhere':
      return state;
  }
}

export function putTilesInHandFromNotHand(state: CoreState, ids: string[], ix: number): CoreState {
  const handTiles = get_hand_tiles(state);

  if (ix > handTiles.length)
    ix = handTiles.length;
  if (ix < 0)
    ix = 0;

  return produce(state, s => {
    for (let i = ix; i < handTiles.length; i++) {
      setTileLoc(s, handTiles[i].id, { t: 'hand', p_in_hand_int: { x: 0, y: i + ids.length } });
    }
    ids.forEach((id, moved_ix) => {
      setTileLoc(s, id, { t: 'hand', p_in_hand_int: { x: 0, y: ix + moved_ix } });
    });
  });
}

export function removeAllTiles(state: CoreState): CoreState {
  return produce(state, s => { s.tile_entities = {}; });
}

export function isSelectedForDrag(state: GameState, tile: TileEntity): boolean {
  if (state.mouseState.t != 'drag_tile')
    return false;
  if (state.coreState.selected === undefined) {
    return state.mouseState.id == tile.id;
  }
  else {
    return state.mouseState.id == tile.id || tile.loc.t == 'world' && state.coreState.selected.selectedIds.includes(tile.id);
  }
}

export type CellContents =
  | { t: 'tile', tile: TileEntity }
  | { t: 'bonus', bonus: Bonus }
  ;

export function cellAtPoint(state: CoreState, p_in_world: Point): CellContents {
  const tile = tileAtPoint(state, p_in_world);
  if (tile !== undefined)
    return { t: 'tile', tile };
  return { t: 'bonus', bonus: getBonusFromLayer(state, p_in_world) };
}

export function tileAtPoint(state: CoreState, p_in_world: Point): TileEntity | undefined {
  let hoverTile: TileEntity | undefined = undefined;
  const p_in_world_int = vm(p_in_world, Math.floor);
  for (const tile of get_main_tiles(state)) {
    if (vequal(p_in_world_int, tile.loc.p_in_world_int)) {
      return tile;
    }
  }
  return undefined;
}
