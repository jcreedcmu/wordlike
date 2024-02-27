// There are two clock domains I care about:
// game: milliseconds elapsed since game start *not* during a pause
// clock: milliseconds since epoch

import { DEBUG } from "../util/debug";
import { SE1, apply } from "../util/se1";
import { ActiveWordBonus } from './state-types';

export type PanicData = {
  lastClear_in_game: number,
  currentTime_in_game: number,
};

export type PauseData = {
  pauseTime_in_clock: number,
}

export const PANIC_INTERVAL_MS = DEBUG.acceleratePanic ? 10000 : 90000;
export const WORD_BONUS_INTERVAL_MS = DEBUG.accelerateWordBonus ? 10000 : 300_000;

export function getPanicFraction(panic: PanicData, game_from_clock: SE1) {
  return (now_in_game(game_from_clock) - panic.lastClear_in_game) / PANIC_INTERVAL_MS;
}

export function getWordBonusFraction(wordBonus: ActiveWordBonus, game_from_clock: SE1) {
  return (now_in_game(game_from_clock) - wordBonus.activation_time_in_game) / WORD_BONUS_INTERVAL_MS;
}

export function now_in_game(game_from_clock: SE1) {
  return apply(game_from_clock, Date.now());
}

// XXX Not sure anything below this line is used? //////////////////////


// The idea here is that we want to have a clock that ticks every
// MILLISECONDS_PER_TICK ms, but we also want to manage a timeout that
// triggers on the soonest tick when anything interesting could
// possibly happen.

export const MILLISECONDS_PER_TICK = 200;

export type ClockState = {
  originEpochMs: number,
  timeoutId: number | undefined,
}

export function mkClockState(): ClockState {
  return {
    originEpochMs: Date.now(),
    timeoutId: undefined,
  }
}

export function nowTicks(clock: ClockState): number {
  return Math.floor((Date.now() - clock.originEpochMs) / MILLISECONDS_PER_TICK);
}

export type WakeTime =
  | { t: 'live' } // there's something actively updating itself in the UI:
  // do updates as often as possible
  | { t: 'infinite' } // there's active updates. Don't update until this fact changes.
  | { t: 'tick', tick: number }; // the next active update is at tick `tick`.

export function clockedNextWake(clock: ClockState, nextWake: WakeTime): number {
  switch (nextWake.t) {
    case 'live': return nowTicks(clock) + 1;
    case 'infinite': return Infinity;
    case 'tick': return nextWake.tick;
  }
}

export function delayUntilTickMs(clock: ClockState, tick: number): number {
  return clock.originEpochMs + MILLISECONDS_PER_TICK * tick - Date.now();
}
