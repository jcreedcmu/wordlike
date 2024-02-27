import { produce } from "../util/produce";
import { Point } from "../util/types";
import { tryKillTileOfStateLoc } from "./kill-helpers";
import { LandingResult, ProperLandingResult } from "./landing-result";
import { CoreState } from "./state";
import { MobileId, MoveMobile } from './state-types';
import { addResourceMobile, mobileAtPoint, putMobileInWorld, putMobileNowhere, removeMobile } from "./tile-helpers";
import { fillWaterIntent } from "./tool-intents";
import { ResbarResource } from "./tool-types";

// A thing that can be moved onto something else
export type MoveSourceId =
  | { t: 'mobile', id: MobileId }
  | { t: 'freshResource', res: ResbarResource }
  ;

export type LandingMoveId = { src: MoveSourceId, p_in_world_int: Point };

export function removeSource(state: CoreState, src: MoveSourceId): CoreState {
  switch (src.t) {
    case 'mobile': return putMobileNowhere(state, src.id, 'noclear');
    case 'freshResource': return produce(state, cs => {
      cs.slowState.resource[src.res]--;
    });
  }
}

export function resolveLandResult(_state: CoreState, lr: ProperLandingResult, move: LandingMoveId): CoreState {
  const src = move.src;
  const state = removeSource(_state, move.src);

  switch (lr.t) {
    case 'place': {
      switch (src.t) {
        case 'mobile': return putMobileInWorld(state, src.id, move.p_in_world_int, 'noclear');
        case 'freshResource': return addResourceMobile(state, move.p_in_world_int, src.res);
      }
    }
    case 'replaceResource': {
      const { res } = lr;
      let cs = state;
      if (move.src.t == 'mobile')
        cs = removeMobile(cs, move.src.id);
      const mobile = mobileAtPoint(cs, move.p_in_world_int);
      if (mobile != undefined)
        cs = removeMobile(cs, mobile.id);
      cs = addResourceMobile(cs, move.p_in_world_int, res);
      return cs;
    }
    case 'fillWater': {
      return tryKillTileOfStateLoc(state, { t: 'world', p_in_world_int: move.p_in_world_int }, fillWaterIntent);
    }
    case 'removeMob': {
      return produce(state, cs => {
        delete cs.mobsState.mobs[lr.id];
      });
    }
  }
}

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
