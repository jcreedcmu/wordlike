import { Draft } from "immer";
import { Point } from "../util/types";
import { Bonus, getBonusLayer } from "./bonus";
import { getOverlayLayer, setOverlay } from "./layer";
import { CoreState } from "./state";
import { updateChunkCache } from "./chunk";

// XXX name?
export function getBonusFromLayer(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerSeed), p);
}

export function setBonusLayer(cs: Draft<CoreState>, p_in_world_int: Point, bonus: Bonus): void {
  setOverlay(cs.bonusOverlay, p_in_world_int, bonus);
  updateChunkCache(cs._cachedTileChunkMap, cs, p_in_world_int, { t: 'bonus', bonus });
}
