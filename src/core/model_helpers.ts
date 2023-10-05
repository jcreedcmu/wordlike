import { Point } from "../util/types";
import { vequal } from "../util/vutil";
import { GameState } from "./model";

export function is_occupied(state: GameState, p: Point): boolean {
  return state.tiles.some(tile => vequal(tile.p_in_world_int, p));
}
