import { produce } from "../util/produce";
import { Point } from "../util/types";
import { next_rand } from "../util/util";
import { getAssets } from "./assets";
import { now_in_game } from "./clock";
import { CoreState } from "./state";
import { ActiveWordBonus } from './state-types';

export function mkActiveWordBonus(state: CoreState, p_in_world_int: Point): { wordBonus: ActiveWordBonus, state: CoreState } {
  const { state: state1, word } = getNextWord(state);
  return {
    wordBonus: {
      activation_time_in_game: now_in_game(state.game_from_clock),
      p_in_world_int: p_in_world_int,
      word,
    }, state: state1
  };
}

export function getWordSample(seed0: number, length: number): { seed: number, word: string } {
  const cands = Object.keys(getAssets().dictionary).filter(x => x.length == length);
  const { float, seed } = next_rand(seed0);
  const word = cands[Math.floor(float * cands.length)];
  return { seed, word };
}

const lengthSchedule: number[] = [
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
];

export function getNextWord(state: CoreState): { state: CoreState, word: string } {
  const wordBonusesAllocated = state.wordBonusState.numAllocated;
  const length = lengthSchedule[Math.min(lengthSchedule.length - 1, wordBonusesAllocated)];
  const { seed, word } = getWordSample(state.seed, length);
  return {
    word,
    state: produce(state, s => {
      s.seed = seed;
      s.wordBonusState.numAllocated = wordBonusesAllocated + 1;
    })
  };
}
