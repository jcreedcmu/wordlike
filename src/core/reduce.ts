import { Action, Effect, SceneState } from './model';

export function reduce(state: SceneState, action: Action): [SceneState, Effect[]] {
  switch (state.t) {
    case 'game':
  }
  return [state, []];
}
