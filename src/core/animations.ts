import { world_bds_in_canvas } from "../ui/widget-helpers";
import { randomColor } from "../util/dutil";
import { SE1 } from "../util/se1";
import { Point } from "../util/types";
import { randPointInRect, range } from "../util/util";
import { vadd } from "../util/vutil";
import { now_in_game } from "./clock";

type Firework = {
  start_in_anim: number,
  duration_ms: number,
  radius: number,
  color: string,
  center_in_canvas: Point,
}

export type Animation =
  | { t: 'explosion', start_in_game: number, duration_ms: number, center_in_world: Point, radius: number }
  | { t: 'point-decay', start_in_game: number, duration_ms: number, p_in_world_int: Point }
  | { t: 'fireworks', start_in_game: number, duration_ms: number, fireworks: Firework[], message: string }
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
    duration_ms: (radius + 1) * 250,
    start_in_game: now_in_game(game_from_clock),
    radius,
  }
}

function mkFireworksAnimation(game_from_clock: SE1, message: string): Animation {
  return {
    t: 'fireworks',
    message,
    duration_ms: 3000,
    start_in_game: now_in_game(game_from_clock),
    fireworks: range(20).map(x => {
      return {
        start_in_anim: Math.random() * 2000,
        duration_ms: Math.random() * 500 + 500,
        color: randomColor(),
        radius: Math.random() * 50 + 50,
        center_in_canvas: randPointInRect(world_bds_in_canvas),
      };
    })
  };
}


export function mkWinAnimation(game_from_clock: SE1): Animation {
  return mkFireworksAnimation(game_from_clock, 'You Win!');
}

export function mkScoreAnimation(game_from_clock: SE1, points: number): Animation {
  return mkFireworksAnimation(game_from_clock, `${points} points!`);
}
