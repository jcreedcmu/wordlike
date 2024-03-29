import { world_bds_in_canvas } from "../ui/widget-constants";
import { randomColor } from "../util/dutil";
import { SE1 } from "../util/se1";
import { Point } from "../util/types";
import { randPointInRect, range } from "../util/util";
import { vadd } from "../util/vutil";
import { Animation } from "./animation-types";
import { now_in_game } from "./clock";

export function mkPointDecayAnimation(p: Point, game_from_clock: SE1): Animation {
  return {
    t: 'point-decay',
    duration_ms: 500,
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

function mkFireworksAnimation(game_from_clock: SE1, message: string, num_fireworks: number, duration_ms: number): Animation {
  return {
    t: 'fireworks',
    message,
    duration_ms: duration_ms,
    start_in_game: now_in_game(game_from_clock),
    fireworks: range(num_fireworks).map(_ => {
      return {
        start_in_anim: Math.random() * (duration_ms - 1000),
        duration_ms: Math.random() * 500 + 500,
        color: randomColor(),
        radius: Math.random() * 50 + 50,
        center_in_canvas: randPointInRect(world_bds_in_canvas),
      };
    })
  };
}


export function mkWinAnimation(game_from_clock: SE1): Animation {
  return mkFireworksAnimation(game_from_clock, 'You Win!', 40, 5000);
}

export function mkScoreAnimation(game_from_clock: SE1, points: number): Animation {
  return mkFireworksAnimation(game_from_clock, `${points} points!`, 10, 1000);
}
