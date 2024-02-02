import { Point } from "../util/types";
import { vadd, vscale } from "../util/vutil";

export type Orientation = 'N' | 'W' | 'E' | 'S';

export function vec_of_orientation(or: Orientation): Point {
  switch (or) {
    case 'N': return { x: 0, y: -1 };
    case 'E': return { x: 1, y: 0 };
    case 'S': return { x: 0, y: 1 };
    case 'W': return { x: -1, y: 0 };
  }
}

export type MobType =
  | 'snail';

export const SNAIL_ADVANCE_TICKS = 60;

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
