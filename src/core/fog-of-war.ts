import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vadd, vsnorm } from "../util/vutil";
import { BIT_VISIBLE } from "./chunk";
import { Overlay, combineOverlay, getOverlay, mkOverlay, overlayPoints, setOverlay } from "./layer";
import { CoreState } from "./state";
import { CacheUpdate, mkChunkUpdate } from './cache-types';
import { get_main_tiles as get_world_tiles } from "./tile-helpers";

export const PLACED_MOBILE_SEEN_CELLS_RADIUS = 2.5;

// imperatively updates recentlySeen
function updateFogOfWarAtPointAux(state: CoreState, recentlySeen: Overlay<boolean>, center: Point, radius: number): void {
  const irad = Math.ceil(radius);
  for (let x = -irad; x <= irad; x++) {
    for (let y = -irad; y <= irad; y++) {
      const off = { x, y };
      const p_in_world_int = vadd(center, off);
      if (vsnorm(off) <= radius * radius && !getOverlay(state.seen_cells, p_in_world_int) && !getOverlay(recentlySeen, p_in_world_int)) {
        setOverlay(recentlySeen, p_in_world_int, true);
      }
    }
  }
}

function updateFogOfWarApply(state: CoreState, recentlySeen: Overlay<boolean>): CoreState {
  const cacheUpdates: CacheUpdate[] = overlayPoints(recentlySeen).map(p =>
    mkChunkUpdate(p, { t: 'setBit', bit: BIT_VISIBLE })
  );
  const combined = combineOverlay(state.seen_cells, recentlySeen);
  return produce(state, s => {
    s._cacheUpdateQueue.push(...cacheUpdates);
    s.seen_cells = combined;
  });
}

export function updateFogOfWarAtPoint(state: CoreState, center: Point, radius: number): CoreState {
  const recentlySeen: Overlay<boolean> = mkOverlay();
  updateFogOfWarAtPointAux(state, recentlySeen, center, radius);
  return updateFogOfWarApply(state, recentlySeen);
}

// updates for all world tiles
export function updateFogOfWar(state: CoreState): CoreState {
  const recentlySeen: Overlay<boolean> = mkOverlay();
  get_world_tiles(state).forEach(({ loc: { p_in_world_int: center } }) => {
    updateFogOfWarAtPointAux(state, recentlySeen, center, PLACED_MOBILE_SEEN_CELLS_RADIUS);
  });
  return updateFogOfWarApply(state, recentlySeen);
}
