import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { Energies, initialEnergies } from './distribution';

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
  | { t: 'wheel', p: Point, delta: number }
  ;

export type Action =
  | GameAction
  ;

export type Effect =
  | { t: 'none' }
  ;

export type MouseState =
  | { t: 'up', p: Point }
  | { t: 'drag_world', orig_p: Point, p: Point }
  | { t: 'drag_tile', orig_p: Point, p: Point, ix: number }
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

export type Tile = {
  p_in_world_int: Point,
  used: boolean,
  letter: string,
}

export type GameState = {
  tiles: Tile[],
  energies: Energies,
  canvas_from_world: SE2,
  mouseState: MouseState,
  seed: number,
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
      energies: initialEnergies(),
      seed: 12345678,
      tiles: 'steeb'.split('').map((x, i) => ({
        letter: x,
        p_in_world_int: { x: i, y: 0 },
        used: false,
      })),
      canvas_from_world: {
        scale: { x: 48, y: 48 },
        translate: { x: 320, y: 240 }
      },
      mouseState: { t: 'up', p: { x: 0, y: 0 } },
    }, revision: 0
  };
}
