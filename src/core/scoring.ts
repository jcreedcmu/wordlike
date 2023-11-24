import { Draft } from "immer";
import { CoreState } from "./state";

export function getScore(state: CoreState) {
  return state.scoring.score;
}

export function incrementScore(state: Draft<CoreState>, amount: number = 1): void {
  state.scoring.score += amount;
}

export function setScore(state: Draft<CoreState>, amount: number): void {
  state.scoring.score = amount;
}
