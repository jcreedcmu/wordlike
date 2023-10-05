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
  | { t: 'mouseDown', p: Point }
  | { t: 'mouseUp', p: Point }
  | { t: 'mouseMove', p: Point }
  ;

export type Action =
  | GameAction
  ;

export type Effect =
  | { t: 'none' }
  ;

export type MouseState =
  | { t: 'up' }
  | { t: 'drag_world', orig_p: Point, p: Point }
  | { t: 'drag_tile', orig_p: Point, p: Point }
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
  tile_in_world_int: Point,
  canvas_from_world: SE2,
  mouseState: MouseState,
};

export function mkState(): State {
  return {
    sceneState: mkGameState(),
  };
}

export function mkGameState(): SceneState {
  return {
    t: 'game',
    gameState: {
      tile_in_world_int: { x: 0, y: 0 },
      canvas_from_world: {
        scale: { x: 48, y: 48 },
        translate: { x: 320, y: 240 }
      },
      mouseState: { t: 'up' },
    }, revision: 0
  };
}
