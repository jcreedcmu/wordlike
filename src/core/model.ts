import { SE2 } from '../util/se2';
import { Point } from '../util/types';

// There are UiActions, which might have different behavior depending
// on view state, and other GameActions, which should be treated
// uniformly.
export type GameAction =
  | { t: 'none' }
  | UiAction
  ;

// I think I want to migrate some of these up to GameAction
export type UiAction =
  | { t: 'key', code: string }
  ;

export type Action =
  | GameAction
  ;

export type Effect =
  | { t: 'none' }
  ;

// If I need to add more state around settings, menus, saving, etc.,
// it might go here.
export type SceneState =
  | {
    t: 'game', gameState: GameState,

    // NOTE: this is sort of unused for now, but I'm leaving it here
    // in case I need a finer-grained equality check on SceneState.
    // It's updated in reduce.ts.
    revision: number,
  };

export type State = {
  sceneState: SceneState,
};

export type GameState = {
  canvas_of_world: SE2,
};

export function mkState(): State {
  return {
    sceneState: mkGameState(),
  };
}

export function mkGameState(): SceneState {
  return {
    t: 'game', gameState: {
      canvas_of_world: {
        scale: { x: 32, y: 32 },
        translate: { x: 320, y: 240 }
      }
    }, revision: 0
  };
}
