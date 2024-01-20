import { Draft } from "immer";
import { CoreState } from "./state";

export const PROGRESS_ANIMATION_POINTS = 100;

export function getScore(state: CoreState) {
  return state.slowState.scoring.score;
}

export function getHighWaterMark(state: CoreState) {
  return state.slowState.scoring.highWaterMark;
}

export function incrementScore(state: Draft<CoreState>, amount: number = 1): void {
  state.slowState.scoring.score += amount;
}

export function setScore(state: Draft<CoreState>, amount: number): void {
  state.slowState.scoring.score = amount;
}

export function setHighWaterMark(state: Draft<CoreState>, amount: number): void {
  state.slowState.scoring.highWaterMark = amount;
}
