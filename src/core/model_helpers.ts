import { produce } from "../util/produce";
import { apply, inverse } from "../util/se2";
import { Point } from "../util/types";
import { vequal, vm } from "../util/vutil";
import { GameState } from "./model";

export function is_occupied(state: GameState, p: Point): boolean {
  return state.tiles.some(tile => vequal(tile.p_in_world_int, p));
}

export function peelOfState(state: GameState): GameState {
  const p_in_world_int = vm(apply(inverse(state.canvas_from_world), state.mouseState.p), Math.floor);
  return produce(state, s => {
    s.tiles.push({ letter: randomLetter(), p_in_world_int });
  });
}

export function randomLetter(): string {
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
}
