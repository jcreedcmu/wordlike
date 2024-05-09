import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vadd, vsnorm } from "../util/vutil";
import { BIT_VISIBLE } from "./chunk";
import { Overlay, combineOverlay, getOverlay, mkOverlay, overlayPoints, setOverlay } from "./layer";
import { CoreState } from "./state";
import { CacheUpdate, mkChunkUpdate } from './cache-types';
import { MainTile } from "./state-types";

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

// The reason we take in tiles rather than fetching
//   const tiles = get_world_tiles(state);
// is that not all tiles are eligible to trigger bonuses. Principally,
// tiles in "safe storage". So we expect the caller to tell us what
// the legitimate bonus-triggering tiles are.
export function updateFogOfWar(state: CoreState, tiles: MainTile[]): CoreState {
  const recentlySeen: Overlay<boolean> = mkOverlay();
  tiles.forEach(({ loc: { p_in_world_int: center } }) => {
    updateFogOfWarAtPointAux(state, recentlySeen, center, PLACED_MOBILE_SEEN_CELLS_RADIUS);
  });
  return updateFogOfWarApply(state, recentlySeen);
}
