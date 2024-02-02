import { produce } from "../util/produce";
import { Point } from "../util/types";
import { unreachable } from "../util/util";
import { vadd, vequal, vscale } from "../util/vutil";

export type Orientation = 'N' | 'W' | 'E' | 'S';

export function vec_of_orientation(or: Orientation): Point {
  switch (or) {
    case 'N': return { x: 0, y: -1 };
    case 'E': return { x: 1, y: 0 };
    case 'S': return { x: 0, y: 1 };
    case 'W': return { x: -1, y: 0 };
  }
}

export function clockwise_of(or: Orientation): Orientation {
  switch (or) {
    case 'N': return 'E';
    case 'E': return 'S';
    case 'S': return 'W';
    case 'W': return 'N';
  }
}

export type MobType =
  | 'snail';

export const SNAIL_ADVANCE_TICKS = 360;

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

export function advanceMob(mob: MobState): MobState {
  switch (mob.t) {
    case 'snail':
      const newTicks = (mob.ticks + 1) % SNAIL_ADVANCE_TICKS;
      if (newTicks == 0) {
        const new_p_in_world_int = nextPosition(mob);
        return produce(mob, m => {
          m.ticks = newTicks;
          m.p_in_world_int = new_p_in_world_int;
          m.orientation = clockwise_of(m.orientation);
        });

      }
      else {
        return produce(mob, m => {
          m.ticks = newTicks;
        });
      }
  }
}

export function nextPosition(mob: MobState & { t: 'snail' }): Point {
  return vadd(mob.p_in_world_int, vec_of_orientation(mob.orientation));
}

export function collidesWithMob(mob: MobState, p_in_world_int: Point): boolean {
  switch (mob.t) {
    case 'snail': {
      return (vequal(p_in_world_int, mob.p_in_world_int) || (mob.ticks > 0 &&
        vequal(p_in_world_int, nextPosition(mob))));
    }
  }
}
