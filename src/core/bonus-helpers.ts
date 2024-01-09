import { Draft } from "immer";
import { Point } from "../util/types";
import { Bonus, getBonusLayer } from "./bonus";
import { getOverlayLayer, setOverlay } from "./layer";
import { CoreState } from "./state";
import { updateChunkCache } from "./chunk";
import { produce } from "../util/produce";

// XXX name?
export function getBonusFromLayer(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerSeed), p);
}

export function updateBonusLayer(state: CoreState, p_in_world_int: Point, bonus: Bonus, retainTile?: boolean): CoreState {
  const newState = produce(state, cs => {
    setOverlay(cs.bonusOverlay, p_in_world_int, bonus);
  });
  if (retainTile)
    return newState;

  const newCache = updateChunkCache(state._cachedTileChunkMap, state, p_in_world_int, { t: 'bonus', bonus });

  return produce(newState, cs => {
    cs._cachedTileChunkMap = newCache;
  });
}
