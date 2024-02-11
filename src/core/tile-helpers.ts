import { Draft } from "immer";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vequal, vm } from "../util/vutil";
import { Bonus } from "./bonus";
import { getBonusFromLayer } from "./bonus-helpers";
import { CacheUpdate, CoreState, GameState, GenMoveTile, HandTile, Location, MainTile, MobileEntity, MoveMobile, RenderableMobile, TileEntity, TileOptionalId } from "./state";
import { addId, ensureId, freshId } from "./tile-id-helpers";
import { Resource } from "./tools";

export type TileId = string;

export function getRenderableMobile(m: MobileEntity): RenderableMobile {
  switch (m.t) {
    case 'tile': return { t: 'tile', letter: m.letter };
    case 'resource': return { t: 'resource', res: m.res };
  }
}

export function getMobileId(state: CoreState, id: string): MobileEntity {
  return state.mobile_entities[id];
}

export function getMobileLoc(state: CoreState, id: string): Location {
  return state.mobile_entities[id].loc;
}

function setMobileLoc(state: Draft<CoreState>, id: string, loc: Location): void {
  state.mobile_entities[id].loc = loc;
}

export function moveToHandLoc(state: Draft<CoreState>, id: string, loc: Location & { t: 'hand' }) {
  state.mobile_entities[id].loc = loc;
  // XXX update any hand cache?
}

export function get_tiles(state: CoreState): TileEntity[] {
  return Object.values(state.mobile_entities).flatMap(x => x.t == 'tile' ? [x] : []);
}

export function get_mobiles(state: CoreState): MobileEntity[] {
  return Object.values(state.mobile_entities);
}

export function get_main_tiles(state: CoreState): MainTile[] {
  const keys: string[] = Object.keys(state.mobile_entities);
  function mainTilesOfString(k: string): MainTile[] {
    const mobile = getMobileId(state, k);
    const loc = mobile.loc;
    if (loc.t == 'world' && mobile.t == 'tile') {
      return [{ ...mobile, loc }];
    }
    else
      return [];
  }
  return keys.flatMap(mainTilesOfString);
}

export function get_hand_tiles(state: CoreState): HandTile[] {
  return Object.keys(state.mobile_entities).flatMap(k => {
    const mobile = getMobileId(state, k);
    const loc = mobile.loc;
    if (loc.t == 'hand' && mobile.t == 'tile')
      return [{ ...mobile, loc }];
    else
      return [];
  }).sort((a, b) => a.loc.index - b.loc.index);
}

export function removeMobile(state: CoreState, id: string): CoreState {
  const loc = getMobileLoc(state, id);
  const nowhere = putMobileNowhere(state, id);
  return produce(nowhere, s => {
    delete s.mobile_entities[id];
  });
}

export function addWorldTile(state: Draft<CoreState>, tile: TileOptionalId): void {
  const newTile: TileEntity = ensureId({
    id: tile.id,
    letter: tile.letter, loc: { t: 'world', p_in_world_int: tile.p_in_world_int }
  });
  state.mobile_entities[newTile.id] = newTile;
  state._cacheUpdateQueue.push({ p_in_world_int: tile.p_in_world_int, chunkUpdate: { t: 'addMobile', mobile: { t: 'tile', letter: tile.letter } } });
}

export function addResourceMobile(state: CoreState, p_in_world_int: Point, res: Resource): CoreState {
  const mobile: MobileEntity = ({
    t: 'resource',
    id: freshId(),
    loc: { t: 'world', p_in_world_int },
    res,
  });
  return produce(state, s => {
    s.mobile_entities[mobile.id] = mobile;
    s._cacheUpdateQueue.push({ p_in_world_int, chunkUpdate: { t: 'addMobile', mobile: { t: 'resource', res } } });
  });
}

export function addHandTileEntity(state: Draft<CoreState>, letter: string, index: number, forceId?: string): TileEntity {
  const newTile: TileEntity = addId({ letter, loc: { t: 'hand', index } }, forceId);
  state.mobile_entities[newTile.id] = newTile;
  return newTile;
}

export function putMobileInWorld(state: CoreState, id: string, p_in_world_int: Point, noclear?: 'noclear'): CoreState {
  const nowhere = putMobileNowhere(state, id, noclear);
  const mobile = getMobileId(state, id);
  const cacheUpdate: CacheUpdate = {
    p_in_world_int,
    chunkUpdate: { t: 'addMobile', mobile: getRenderableMobile(mobile) }
  };
  return produce(nowhere, s => {
    setMobileLoc(s, id, { t: 'world', p_in_world_int });
    s._cacheUpdateQueue.push(cacheUpdate);
  });
}

// XXX deprecated?
export function putMobilesInWorld(state: CoreState, moves: MoveMobile[]): CoreState {
  let cs = state;
  for (const move of moves) {
    cs = putMobileNowhere(cs, move.id);
  }
  for (const move of moves) {
    const cacheUpdate: CacheUpdate = {
      p_in_world_int: move.p_in_world_int,
      chunkUpdate: { t: 'addMobile', mobile: move.mobile }
    };

    cs = produce(cs, s => {
      setMobileLoc(s, move.id, { t: 'world', p_in_world_int: move.p_in_world_int });
      s._cacheUpdateQueue.push(cacheUpdate);
    });
  }
  return cs;
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
        cacheUpdate = { p_in_world_int: loc.p_in_world_int, chunkUpdate: { t: 'addMobile', mobile: getRenderableMobile(mobile) } };
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
export function putTileInHand(state: CoreState, id: string, ix: number): CoreState {
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

export function putMobileNowhere(state: CoreState, id: string, noclear?: 'noclear'): CoreState {
  const loc = getMobileLoc(state, id);
  const handTiles = get_hand_tiles(state);


  switch (loc.t) {
    case 'world':
      const cacheUpdate: CacheUpdate = { p_in_world_int: loc.p_in_world_int, chunkUpdate: { t: 'removeMobile' } };
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
export function putTilesInHandFromNotHand(state: CoreState, ids: string[], ix: number): CoreState {
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
      cacheUpdates.push({ p_in_world_int: p, chunkUpdate: { t: 'removeMobile' } });
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
  return mobileAtPointForMobiles(state, p_in_world, get_mobiles(state));
}

export function cellAtPointForMobiles(state: CoreState, p_in_world: Point, mobiles: MobileEntity[]): CellContents {
  const mobile = mobileAtPointForMobiles(state, p_in_world, mobiles);
  if (mobile !== undefined)
    return { t: 'mobile', mobile };
  return { t: 'bonus', bonus: getBonusFromLayer(state, p_in_world) };
}

export function mobileAtPointForMobiles(state: CoreState, p_in_world: Point, mobiles: MobileEntity[]): MobileEntity | undefined {
  const p_in_world_int = vm(p_in_world, Math.floor);
  for (const mobile of mobiles) {
    if (mobile.loc.t == 'world' && vequal(p_in_world_int, mobile.loc.p_in_world_int)) {
      return mobile;
    }
  }
  return undefined;
}
