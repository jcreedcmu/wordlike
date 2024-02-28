import { produce } from "../util/produce";
import { mkChunkUpdate } from "./cache-types";
import { tryKillTileOfStateLoc } from "./kill-helpers";
import { LandingResult, ProperLandingResult } from "./landing-result";
import { LandingMoveId, MoveSourceId } from "./landing-types";
import { CoreState } from "./state";
import { MoveMobile } from './state-types';
import { addResourceMobile, getMobileId, mobileAtPoint, putMobileInWorld, putMobileNowhere, removeMobile, updateDurability } from "./tile-helpers";
import { fillWaterIntent } from "./tool-intents";

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
    case 'replaceResourceMinusDur': {
      const { res } = lr;
      let cs = _state;
      if (move.src.t != 'mobile')
        throw new Error(`durability effects only make sense on resources`);

      // Maybe modify or remove source
      const srcMobile = getMobileId(_state, move.src.id);
      if (srcMobile.t != 'resource')
        throw new Error(`durability effects only make sense on resources`);
      const loc = srcMobile.loc;
      if (loc.t != 'world')
        throw new Error(`durability effects only make sense on resources in world`);
      const newDur = srcMobile.durability - lr.dur;
      if (newDur <= 0) {
        cs = removeMobile(cs, srcMobile.id);
      }
      else {
        cs = updateDurability(cs, srcMobile.id, newDur);
        cs = produce(cs, s => {
          s._cacheUpdateQueue.push(mkChunkUpdate(loc.p_in_world_int, { t: 'restoreMobile', id: srcMobile.id }));
        });
      }

      // Remove target
      const tgtMobile = mobileAtPoint(cs, move.p_in_world_int);
      if (tgtMobile != undefined)
        cs = removeMobile(cs, tgtMobile.id);

      // Add new resource
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
