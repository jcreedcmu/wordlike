import { produce } from "../util/produce";
import { Point } from "../util/types";
import { mapval, next_rand } from "../util/util";
import { vint, vm } from "../util/vutil";
import { freshId } from "./id-helpers";
import { MoveSource, landMoveOnState } from "./landing-result";
import { MobState, Orientation, SNAIL_ADVANCE_TICKS, back_of, back_right_of, ccw_of, clockwise_of, forward_of, left_of, reverse_of, right_of, towards_origin } from "./mobs";
import { CoreState } from "./state";
import { MobsState } from "./state-types";

// These are some mob-related functions that depend on landing-results or corestate or state-types

export function advanceMob(state: CoreState, mob: MobState): MobState {
  function advanceWith(or: Orientation): MobState {
    const newTicks = (mob.ticks + 1) % SNAIL_ADVANCE_TICKS;
    if (newTicks == 0) {
      const new_p_in_world_int = forward_of(mob);
      // move snail to next position
      return produce(mob, m => {
        m.ticks = newTicks;
        m.p_in_world_int = new_p_in_world_int;
        m.orientation = or;
      });
    }
    else {
      return produce(mob, m => {
        m.ticks = newTicks;
        m.orientation = or;
      });
    }
  }

  const src: MoveSource = { t: 'mob', mobType: mob.t };
  function isOccupied(p: Point): boolean {
    const lr = landMoveOnState({ src, p_in_world_int: p }, state);
    return lr.t != 'place';
  }

  switch (mob.t) {
    case 'snail':
      if (mob.ticks == 0) {
        if (isOccupied(back_right_of(mob)) && !isOccupied(right_of(mob)))
          return advanceWith(clockwise_of(mob.orientation));
        if (!isOccupied(forward_of(mob)))
          return advanceWith(mob.orientation);
        if (!isOccupied(left_of(mob)))
          return advanceWith(ccw_of(mob.orientation));
        if (!isOccupied(back_of(mob)))
          return advanceWith(reverse_of(mob.orientation));
        return mob; // don't advance
      }
      return advanceWith(mob.orientation);
  }
}

export function addRandomMob(state: CoreState): CoreState {
  const ATTEMPTS = 5;
  const RANGE = 10;
  const MAX_MOBS = 5;
  if (Object.keys(state.mobsState.mobs).length >= MAX_MOBS)
    return state;
  let seed = state.seed;
  for (let i = 0; i < ATTEMPTS; i++) {
    const { seed: seed1, float: x } = next_rand(seed);
    const { seed: seed2, float: y } = next_rand(seed1);
    seed = seed2;
    const p_in_world_int = vint(vm({ x, y }, p => (p * 2 - 1) * RANGE));

    const src: MoveSource = { t: 'mob', mobType: 'snail' };
    if (landMoveOnState({ src, p_in_world_int }, state).t == 'place') {
      const orientation = towards_origin(p_in_world_int);
      const newMob: MobState = { t: 'snail', ticks: 0, p_in_world_int, orientation };
      return produce(addMob(state, newMob), s => {
        s.seed = seed;
      });
    }
  }
  // Fallthrough; didn't succeed at adding mob, but still shoud update seed.
  return produce(state, s => {
    s.seed = seed;
  });

}

export function addMob(state: CoreState, newMob: MobState): CoreState {
  const id = freshId();
  return produce(state, s => {
    s.mobsState.mobs[id] = newMob;
  })
}

export function addMobWithId(state: CoreState, newMob: MobState, id: string): CoreState {
  return produce(state, s => {
    s.mobsState.mobs[id] = newMob;
  })
}

export function mkMobsState(): MobsState {
  return { mobs: {} };
}

export function mobsMap<T>(state: MobsState, k: (mob: MobState, id: string) => T): T[] {
  return Object.keys(state.mobs).map(id => k(state.mobs[id], id));
}

export function mobsMapVal(state: MobsState, k: (mob: MobState, id: string) => MobState): MobsState {
  return { mobs: mapval(state.mobs, k) };
}
