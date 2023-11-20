import { Point } from "../util/types";
import { vadd } from "../util/vutil";

export type Animation =
  | { t: 'explosion', start_ms: number, duration_ms: number, center_in_world: Point, radius: number }
  | { t: 'point-decay', start_ms: number, duration_ms: number, p_in_world_int: Point }
  ;

export function mkPointDecayAnimation(p: Point): Animation {
  return {
    t: 'point-decay',
    duration_ms: 250,
    p_in_world_int: p,
    start_ms: Date.now(),
  };
}

export function mkExplosionAnimation(p: Point, radius: number): Animation {
  return {
    t: 'explosion',
    center_in_world: vadd(p, { x: 0.5, y: 0.5 }),
    duration_ms: (radius + 1) * 250,
    start_ms: Date.now(),
    radius,
  }
}
