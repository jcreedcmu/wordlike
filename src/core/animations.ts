import { SE1 } from "../util/se1";
import { Point } from "../util/types";
import { vadd } from "../util/vutil";
import { now_in_game } from "./clock";

export type Animation =
  | { t: 'explosion', start_in_game: number, duration_ms: number, center_in_world: Point, radius: number }
  | { t: 'point-decay', start_in_game: number, duration_ms: number, p_in_world_int: Point }
  ;

export function mkPointDecayAnimation(p: Point, game_from_clock: SE1): Animation {
  return {
    t: 'point-decay',
    duration_ms: 250,
    p_in_world_int: p,
    start_in_game: now_in_game(game_from_clock),
  };
}

export function mkExplosionAnimation(p: Point, radius: number, game_from_clock: SE1): Animation {
  return {
    t: 'explosion',
    center_in_world: vadd(p, { x: 0.5, y: 0.5 }),
    duration_ms: (radius + 1) * 2500,
    start_in_game: now_in_game(game_from_clock),
    radius,
  }
}
