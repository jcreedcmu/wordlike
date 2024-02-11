import { produce } from "../util/produce";
import { Point } from "../util/types";
import { LandingMove, LandingResult, MoveSource, ProperLandingResult } from "./landing-result";
import { MobType } from "./mobs";
import { CoreState } from "./state";
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
      return putMobileInWorld(state, src.id, move.p_in_world_int);
    case 'freshResource': {
      const cs1 = produce(state, cs => { cs.slowState.resource[src.res]--; });
      return addResourceMobile(cs1, move.p_in_world_int, src.res);
    }
  }
}

class CollisionException extends Error { }

export function requireNoCollision(lrs: LandingResult[]): ProperLandingResult[] | undefined {
  try {
    return lrs.map(lr => {
      if (lr.t == 'collision')
        throw new CollisionException();
      return lr;
    });
  }
  catch (e) {
    if (e instanceof CollisionException)
      return undefined;
    else
      throw e;
  }
}
