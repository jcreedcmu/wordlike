import { DEBUG } from "../util/debug";
import { PANIC_INTERVAL_MS, PanicData, now_in_game } from "./clock";
import { CoreState } from "./state";

export function freshPanic(state: CoreState): PanicData {
  const currentTime_in_game = now_in_game(state.game_from_clock);
  const debug_offset = DEBUG.skipAheadPanic ? PANIC_INTERVAL_MS - 10000 : 0;
  return { currentTime_in_game, lastClear_in_game: currentTime_in_game - debug_offset };
}
