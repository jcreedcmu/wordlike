import { produce } from "../util/produce";
import { Point } from "../util/types";
import { LandingMove, LandingResult, MoveSource, ProperLandingResult } from "./landing-result";
import { MobType } from "./mobs";
import { CoreState, MoveMobile } from "./state";
import { checkValid } from "./state-helpers";
import { addResourceMobile, putMobileInWorld } from "./tile-helpers";
import { Resource } from "./tools";

// A thing that can be moved onto something else
export type MoveSourceId =
  | { t: 'mobile', id: string }
  | { t: 'freshResource', res: Resource }
  ;

export type LandingMoveId = { src: MoveSourceId, p_in_world_int: Point };

export function resolveLandResult(state: CoreState, lr: ProperLandingResult, move: LandingMoveId): CoreState {
  const src = move.src;
  switch (src.t) {
    case 'mobile':
      return putMobileInWorld(state, src.id, move.p_in_world_int, 'noclear');
    case 'freshResource': {
      const cs1 = produce(state, cs => { cs.slowState.resource[src.res]--; });
      return addResourceMobile(cs1, move.p_in_world_int, src.res);
    }
  }
}

class CollisionException extends Error { }

export function requireNoCollision(lr: LandingResult): ProperLandingResult | undefined {
  if (lr.t == 'collision')
    return undefined;
  else
    return lr;
}

export function landingMoveIdOfMoveMobile(m: MoveMobile): LandingMoveId {
  return {
    src: { t: 'mobile', id: m.id },
    p_in_world_int: m.p_in_world_int
  };
}
