import { produce } from "../util/produce";
import { Point } from "../util/types";
import { next_rand, unreachable } from "../util/util";
import { vadd, vequal, vint, vm, vscale } from "../util/vutil";
import { MoveSource, landMoveOnState } from "./landing-result";
import { CoreState } from "./state";

export type Orientation = 'N' | 'W' | 'E' | 'S';

export function vec_of_orientation(or: Orientation): Point {
  switch (or) {
    case 'N': return { x: 0, y: -1 };
    case 'E': return { x: 1, y: 0 };
    case 'S': return { x: 0, y: 1 };
    case 'W': return { x: -1, y: 0 };
  }
}

// .. .. ..
// .. -> .. back_right_of(E) = (-1,1)
// rv .. ..

// rv .. ..
// .. vv .. back_right_of(S) = (-1,-1)
// .. .. ..
export function back_right_of(mob: MobState): Point {
  const { x, y } = vec_of_orientation(mob.orientation);
  return vadd(mob.p_in_world_int, { x: -(x + y), y: x - y });
}

export function forward_of(mob: MobState): Point {
  return vadd(mob.p_in_world_int, vec_of_orientation(mob.orientation));
}

export function left_of(mob: MobState): Point {
  const { x, y } = vec_of_orientation(mob.orientation);
  return vadd(mob.p_in_world_int, { x: y, y: -x });
}

export function right_of(mob: MobState): Point {
  const { x, y } = vec_of_orientation(mob.orientation);
  return vadd(mob.p_in_world_int, { x: -y, y: x });
}

export function back_of(mob: MobState): Point {
  const { x, y } = vec_of_orientation(mob.orientation);
  return vadd(mob.p_in_world_int, { x: -x, y: -y });
}

export function clockwise_of(or: Orientation): Orientation {
  switch (or) {
    case 'N': return 'E';
    case 'E': return 'S';
    case 'S': return 'W';
    case 'W': return 'N';
  }
}

export function ccw_of(or: Orientation): Orientation {
  switch (or) {
    case 'N': return 'W';
    case 'E': return 'N';
    case 'S': return 'E';
    case 'W': return 'S';
  }
}

export function reverse_of(or: Orientation): Orientation {
  switch (or) {
    case 'N': return 'S';
    case 'E': return 'W';
    case 'S': return 'N';
    case 'W': return 'E';
  }
}

export type MobType =
  | 'snail';

export const SNAIL_ADVANCE_TICKS = 120;

export type MobState = {
  t: MobType,
  // sort of an animation-state time variable.
  // counts how many ticks since we were really at p_in_world_int
  ticks: number,
  p_in_world_int: Point,
  orientation: Orientation,
}

// Effective position
export function eff_mob_in_world(mob: MobState): Point {
  switch (mob.t) {
    case 'snail': return vadd(mob.p_in_world_int, vscale(vec_of_orientation(mob.orientation), mob.ticks / SNAIL_ADVANCE_TICKS));
  }
}

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
        const forward = forward_of(mob);
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


export function collidesWithMob(mob: MobState, p_in_world_int: Point): boolean {
  switch (mob.t) {
    case 'snail': {
      return (vequal(p_in_world_int, mob.p_in_world_int) || (mob.ticks > 0 &&
        vequal(p_in_world_int, forward_of(mob))));
    }
  }
}

function towards_origin(p: Point): Orientation {
  const { x, y } = p;
  const ix = (y > x ? 1 : 0) + (y > -x ? 2 : 0);
  const orientations: Orientation[] = ['S', 'E', 'W', 'N'];
  return orientations[ix];
}

export function addRandomMob(state: CoreState): CoreState {
  const ATTEMPTS = 5;
  const RANGE = 10;
  const MAX_MOBS = 5;
  if (state.mobsState.mobs.length >= MAX_MOBS)
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
      return produce(state, s => {
        s.mobsState.mobs.push(newMob);
        s.seed = seed;
      });
    }
  }

  return produce(state, s => {
    s.seed = seed;
  });

}
