import { produce } from "../util/produce";
import { Point } from "../util/types";
import { Bonus, getBonusLayer } from "./bonus";
import { mkChunkUpdate } from "./chunk";
import { getOverlayLayer, setOverlay } from "./layer";
import { CacheUpdate, CoreState } from "./state";

// XXX name?
export function getBonusFromLayer(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerSeed), p);
}

export function updateBonusLayer(state: CoreState, p_in_world_int: Point, bonus: Bonus): CoreState {
  const newState = produce(state, cs => {
    setOverlay(cs.bonusOverlay, p_in_world_int, bonus);
  });

  const cacheUpdate: CacheUpdate = mkChunkUpdate(p_in_world_int, { t: 'bonus', bonus });

  return produce(newState, cs => {
    cs._cacheUpdateQueue.push(cacheUpdate);
  });
}
