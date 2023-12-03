import { Point } from "../util/types";
import { Bonus, getBonusLayer } from "./bonus";
import { getOverlayLayer } from "./layer";
import { CoreState } from "./state";

export function bonusOfStatePoint(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerSeed), p);
}
