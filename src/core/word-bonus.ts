import { SE1 } from "../util/se1";
import { Point } from "../util/types";
import { now_in_game } from "./clock";
import { ActiveWordBonus, CoreState } from "./state";

export function mkActiveWordBonus(game_from_clock: SE1, p_in_world_int: Point): ActiveWordBonus {
  return {
    activation_time_in_game: now_in_game(game_from_clock),
    p_in_world_int: p_in_world_int,
    word: 'steeb',
  }
}
