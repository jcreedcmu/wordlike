import { produce } from "../util/produce";
import { getScore } from "./scoring";
import { GameState } from "./state";
import { withCoreState } from "./state-helpers";
import { reduceToolSelect } from "./tools";

export function tryReduceShortcut(state: GameState, code: string): GameState | undefined {
  if (code == '<esc>') {
    return withCoreState(state, cs => produce(cs, s => {
      s.currentTool = 'pointer';
    }));
  }
  if (code == 'b') {
    if (state.coreState.inventory.bombs >= 1) {
      return withCoreState(state, cs => produce(cs, s => {
        s.currentTool = 'bomb';
      }));
    }
    else return undefined;
  }
  if (code == 'd') {
    if (getScore(state.coreState) >= 1) {
      return withCoreState(state, cs => produce(cs, s => {
        s.currentTool = 'dynamite';
      }));
    }
  }
  if (code == 'v') {
    if (state.coreState.inventory.vowels >= 1) {
      return withCoreState(state, cs => reduceToolSelect(cs, 'vowel'));
    }
  }
  if (code == 'c') {
    if (state.coreState.inventory.consonants >= 1) {
      return withCoreState(state, cs => reduceToolSelect(cs, 'consonant'));
    }
  }
  if (code == 'x') {
    if (state.coreState.inventory.copies >= 1) {
      return withCoreState(state, cs => reduceToolSelect(cs, 'copy'));
    }
  }
  return undefined;
}
