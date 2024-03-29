import { Draft } from "immer";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vequal, vm } from "../util/vutil";
import { Bonus } from "./bonus";
import { getBonusFromLayer } from "./bonus-helpers";
import { CacheUpdate, mkChunkUpdate, mkMobileUpdate } from './cache-types';
import { freshId } from "./id-helpers";
import { AbstractLetter } from "./letters";
import { CoreState, GameState } from "./state";
import { GenMoveTile, HandTile, Location, MainTile, MobileEntity, RenderableMobile, ResourceEntity, TileEntity, TileNoId } from './state-types';
import { MobileId } from './basic-types';
import { Resource } from "./tool-types";

export type TileId = string;

export function getRenderableMobile(m: MobileEntity): RenderableMobile {
  switch (m.t) {
    case 'tile': return { t: 'tile', letter: m.letter };
    case 'resource': return { t: 'resource', res: m.res, durability: m.durability };
  }
}

export function getMobileId(state: CoreState, id: MobileId): MobileEntity {
  return state.mobile_entities[id];
}

export function getMobileLoc(state: CoreState, id: MobileId): Location {
  return state.mobile_entities[id].loc;
}

function setMobileLoc(state: Draft<CoreState>, id: MobileId, loc: Location): void {
  state.mobile_entities[id].loc = loc;
}

export function moveToHandLoc(state: Draft<CoreState>, id: MobileId, loc: Location & { t: 'hand' }) {
  state.mobile_entities[id].loc = loc;
  // XXX update any hand cache?
}

export function get_tiles(state: CoreState): TileEntity[] {
  return Object.values(state.mobile_entities).flatMap(x => x.t == 'tile' ? [x] : []);
}

export function get_mobiles(state: CoreState): MobileEntity[] {
  return Object.values(state.mobile_entities);
}

export function mapMobiles<T>(state: CoreState, f: (m: MobileEntity) => T): T[] {
  return Object.keys(state.mobile_entities).map(k => f(state.mobile_entities[k]));
}

export function flatMapMobiles<T>(state: CoreState, f: (m: MobileEntity) => T[]): T[] {
  return Object.keys(state.mobile_entities).flatMap(k => f(state.mobile_entities[k]));
}

export function get_main_tiles(state: CoreState): MainTile[] {
  return flatMapMobiles(state, mobile => {
    const loc = mobile.loc;
    if (loc.t == 'world' && mobile.t == 'tile') {
      return [{ ...mobile, loc }];
    }
    else
      return [];
  });
}

export function get_hand_tiles(state: CoreState): HandTile[] {
  return flatMapMobiles(state, mobile => {
    const loc = mobile.loc;
    if (loc.t == 'hand' && mobile.t == 'tile')
      return [{ ...mobile, loc }];
    else
      return [];
  }).sort((a, b) => a.loc.index - b.loc.index);
}

export function removeMobile(state: CoreState, id: MobileId): CoreState {
  const nowhere = putMobileNowhere(state, id);
  return produce(nowhere, s => {
    delete s.mobile_entities[id];
  });
}


export function addWorldTileWithId(state: CoreState, tile: TileNoId, id: MobileId): CoreState {
  const newTile: TileEntity = { t: 'tile', id, letter: tile.letter, loc: { t: 'world', p_in_world_int: tile.p_in_world_int } };
  return produce(state, cs => {
    cs.mobile_entities[newTile.id] = newTile;
    cs._cacheUpdateQueue.push(mkChunkUpdate(tile.p_in_world_int, { t: 'addMobile', id: newTile.id }));
    cs._cacheUpdateQueue.push(mkMobileUpdate(newTile.id, getRenderableMobile(newTile)));
  });
}

export function addWorldTile(state: CoreState, tile: TileNoId): CoreState {
  const { cs, id } = freshId(state);
  return addWorldTileWithId(cs, tile, id);
}

export function addResourceMobile(state: CoreState, p_in_world_int: Point, res: Resource): CoreState {
  const { cs, id } = freshId(state);
  const mobile: MobileEntity = ({
    t: 'resource',
    id,
    loc: { t: 'world', p_in_world_int },
    durability: 255,
    res,
  });
  return produce(cs, s => {
    s.mobile_entities[mobile.id] = mobile;
    s._cacheUpdateQueue.push(mkChunkUpdate(p_in_world_int, { t: 'addMobile', id: mobile.id }));
    s._cacheUpdateQueue.push(mkMobileUpdate(mobile.id, getRenderableMobile(mobile)));
  });

}

export function addHandTileEntityWithId(state: CoreState, letter: AbstractLetter, index: number, id: MobileId): { tile: TileEntity, cs: CoreState } {
  const tile: TileEntity = { t: 'tile', id, letter, loc: { t: 'hand', index } };
  const cs = produce(state, cs => {
    cs.mobile_entities[tile.id] = tile;
    cs._cacheUpdateQueue.push(mkMobileUpdate(tile.id, getRenderableMobile(tile)));
  });
  return { tile, cs };
}

export function addHandTileEntity(state: CoreState, letter: AbstractLetter, index: number): { tile: TileEntity, cs: CoreState } {
  const { cs, id } = freshId(state);
  return addHandTileEntityWithId(cs, letter, index, id);
}

export function putMobileInWorld(state: CoreState, id: MobileId, p_in_world_int: Point, noclear?: 'noclear'): CoreState {
  const nowhere = putMobileNowhere(state, id, noclear);
  const mobile = getMobileId(state, id);
  const cacheUpdate = mkChunkUpdate(p_in_world_int, { t: 'addMobile', id: mobile.id });
  return produce(nowhere, s => {
    setMobileLoc(s, id, { t: 'world', p_in_world_int });
    s._cacheUpdateQueue.push(cacheUpdate);
  });
}

export function moveTiles(state: CoreState, moves: GenMoveTile[]): CoreState {
  let cs = state;
  // First remove all the tiles from the universe, emptying out cache
  for (const move of moves) {
    cs = putMobileNowhere(cs, move.id);
  }
  // Now tiles at their destinations
  for (const move of moves) {
    let cacheUpdate: CacheUpdate | undefined = undefined;
    const mobile = getMobileId(state, move.id);
    const loc = move.loc;
    switch (loc.t) {
      case 'world':
        cacheUpdate = mkChunkUpdate(loc.p_in_world_int, { t: 'addMobile', id: mobile.id });
        break;
      case 'nowhere':
        break;
      case 'hand': // XXX At least I don't *think* I need to do anything here... I'm not caching hand state yet.
        break;
    }
    cs = produce(cs, s => {
      setMobileLoc(s, move.id, loc);
      if (cacheUpdate)
        s._cacheUpdateQueue.push(cacheUpdate);
    });

  }
  return cs;
}

// ix may be < 0 or >= handsize
export function putTileInHand(state: CoreState, id: MobileId, ix: number): CoreState {
  const nowhere = putMobileNowhere(state, id);
  const handTiles = get_hand_tiles(nowhere);

  if (ix > handTiles.length)
    ix = handTiles.length;
  if (ix < 0)
    ix = 0;

  return produce(nowhere, s => {
    for (let i = ix; i < handTiles.length; i++) {
      setMobileLoc(s, handTiles[i].id, { t: 'hand', index: i + 1 });
    }
    setMobileLoc(s, id, { t: 'hand', index: ix });
  });
}

export function putMobileNowhere(state: CoreState, id: MobileId, noclear?: 'noclear'): CoreState {
  const loc = getMobileLoc(state, id);
  const handTiles = get_hand_tiles(state);


  switch (loc.t) {
    case 'world':
      const cacheUpdate: CacheUpdate = mkChunkUpdate(loc.p_in_world_int, { t: 'removeMobile' });
      return produce(state, s => {
        setMobileLoc(s, id, { t: 'nowhere' });
        if (!noclear)
          s._cacheUpdateQueue.push(cacheUpdate);
      });
    case 'hand':
      return produce(state, s => {
        for (let i = loc.index; i < handTiles.length; i++) {
          setMobileLoc(s, handTiles[i].id, { t: 'hand', index: i - 1 });
        }
        setMobileLoc(s, id, { t: 'nowhere' });
      });
    case 'nowhere':
      return state;
  }
}

// ix may be < 0 or >= handsize
export function putTilesInHandFromNotHand(state: CoreState, ids: MobileId[], ix: number): CoreState {
  const handTiles = get_hand_tiles(state);

  if (ix > handTiles.length)
    ix = handTiles.length;
  if (ix < 0)
    ix = 0;

  const cacheUpdates: CacheUpdate[] = [];

  for (const id of ids) {
    const mobile = getMobileId(state, id);
    // XXX: should be checking that this is really a tile
    if (mobile.loc.t == 'world') {
      const p = mobile.loc.p_in_world_int;
      cacheUpdates.push(mkChunkUpdate(p, { t: 'removeMobile' }));
    }
  }

  return produce(state, s => {
    s._cacheUpdateQueue.push(...cacheUpdates);
    for (let i = ix; i < handTiles.length; i++) {
      setMobileLoc(s, handTiles[i].id, { t: 'hand', index: i + ids.length });
    }
    ids.forEach((id, moved_ix) => {
      setMobileLoc(s, id, { t: 'hand', index: ix + moved_ix });
    });
  });
}

export function removeAllMobiles(state: CoreState): CoreState {
  return produce(state, s => { s.mobile_entities = {}; });
}

export function isSelectedForDrag(state: GameState, tile: TileEntity): boolean {
  if (state.mouseState.t != 'drag_mobile')
    return false;
  if (state.coreState.selected === undefined) {
    return state.mouseState.id == tile.id;
  }
  else {
    return state.mouseState.id == tile.id || tile.loc.t == 'world' && state.coreState.selected.selectedIds.includes(tile.id);
  }
}

export type CellContents =
  | { t: 'mobile', mobile: MobileEntity }
  | { t: 'bonus', bonus: Bonus }
  ;

export function cellAtPoint(state: CoreState, p_in_world: Point): CellContents {
  return cellAtPointForMobiles(state, p_in_world, get_mobiles(state));
}

export function mobileAtPoint(state: CoreState, p_in_world: Point): MobileEntity | undefined {
  return mobileAtPointForMobiles(p_in_world, get_mobiles(state));
}

export function cellAtPointForMobiles(state: CoreState, p_in_world: Point, mobiles: MobileEntity[]): CellContents {
  const mobile = mobileAtPointForMobiles(p_in_world, mobiles);
  if (mobile !== undefined)
    return { t: 'mobile', mobile };
  return { t: 'bonus', bonus: getBonusFromLayer(state, p_in_world) };
}

export function mobileAtPointForMobiles(p_in_world: Point, mobiles: MobileEntity[]): MobileEntity | undefined {
  const p_in_world_int = vm(p_in_world, Math.floor);
  for (const mobile of mobiles) {
    if (mobile.loc.t == 'world' && vequal(p_in_world_int, mobile.loc.p_in_world_int)) {
      return mobile;
    }
  }
  return undefined;
}

export function updateDurability(cs: CoreState, id: MobileId, durability: number): CoreState {
  const mobile = cs.mobile_entities[id];
  if (mobile.t != 'resource')
    throw Error(`invariant violation: expected resource in updateDurability`);
  const newMobile: ResourceEntity = { ...mobile, durability };
  return produce(cs, s => {
    s.mobile_entities[id] = newMobile;
    s._cacheUpdateQueue.push(mkMobileUpdate(mobile.id, getRenderableMobile(newMobile)));
  });
}
