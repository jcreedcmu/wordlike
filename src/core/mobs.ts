import { Point } from "../util/types";
import { vadd, vequal, vscale } from "../util/vutil";
import { MobileId } from './basic-types';

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

export type MobStateNoId = {
  t: MobType,
  // sort of an animation-state time variable.
  // counts how many ticks since we were really at p_in_world_int
  ticks: number,
  p_in_world_int: Point,
  orientation: Orientation,
}

export type MobState = MobStateNoId & { id: MobileId };

// Effective position
export function eff_mob_in_world(mob: MobState): Point {
  switch (mob.t) {
    case 'snail': return vadd(mob.p_in_world_int, vscale(vec_of_orientation(mob.orientation), mob.ticks / SNAIL_ADVANCE_TICKS));
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

export function towards_origin(p: Point): Orientation {
  const { x, y } = p;
  const ix = (y > x ? 1 : 0) + (y > -x ? 2 : 0);
  const orientations: Orientation[] = ['S', 'E', 'W', 'N'];
  return orientations[ix];
}
