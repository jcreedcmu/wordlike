import { ViewData } from '../app';
import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { Bonus, bonusGenerator } from './bonus';
import { PanicData } from './clock';
import { Energies, initialEnergies } from './distribution';
import { Grid, LocatedWord, mkGrid, mkGridOf } from './grid';
import { Layer, Overlay, mkLayer, mkOverlay } from './layer';

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
  | { t: 'mouseDown', button: number, p: Point }
  | { t: 'mouseUp', p: Point }
  | { t: 'mouseMove', p: Point }
  | { t: 'wheel', p: Point, delta: number }
  | { t: 'repaint' }
  ;

export type Action =
  | { t: 'resize', vd: ViewData }
  | { t: 'newGame' }
  | { t: 'setSceneState', state: SceneState }
  | GameAction
  ;

export type Effect =
  | { t: 'none' }
  ;

export type MouseState =
  | { t: 'up', p: Point }
  | { t: 'down', p: Point }
  | { t: 'drag_world', orig_p: Point, p: Point }
  | { t: 'drag_main_tile', orig_p: Point, p: Point, ix: number }
  | { t: 'drag_hand_tile', orig_p: Point, p: Point, ix: number }
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
  }
  | { t: 'menu' }
  | { t: 'instructions' }
  ;

export type State = {
  sceneState: SceneState,
};

export type Tile = {
  p_in_world_int: Point,
  used: boolean,
  letter: string,
}

export type GameState = {
  main_tiles: Tile[],
  hand_tiles: Tile[],
  invalidWords: LocatedWord[],
  connectedSet: Grid<boolean>,
  energies: Energies,
  canvas_from_world: SE2,
  mouseState: MouseState,
  seed: number,
  bonusLayer: Layer<Bonus>,
  bonusOverlay: Overlay<Bonus>,
  score: number,
  panic: PanicData | undefined,
};

export function mkSceneState(): SceneState {
  return { t: 'menu' };
}

export function mkGameSceneState(seed?: number): SceneState {
  return {
    t: 'game',
    gameState: mkGameState(seed), revision: 0
  };
}

export function mkGameState(seed?: number): GameState {
  seed = seed ?? 12345678;
  return {
    invalidWords: [],
    connectedSet: mkGridOf([]),
    energies: initialEnergies(),
    seed,
    main_tiles: ''.split('').map((x, i) => ({
      letter: x,
      p_in_world_int: { x: i, y: 0 },
      used: false,
    })),
    hand_tiles: [],
    canvas_from_world: {
      scale: { x: 48, y: 48 },
      translate: { x: 200, y: 240 }
    },
    mouseState: { t: 'up', p: { x: 0, y: 0 } },
    bonusLayer: mkLayer(bonusGenerator),
    bonusOverlay: mkOverlay<Bonus>(),
    score: 0,
    panic: undefined,
  };
}
