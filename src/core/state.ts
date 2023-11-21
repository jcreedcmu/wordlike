import { Animation } from './animations';
import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { Bonus, bonusGenerator, mkBonusLayer } from './bonus';
import { PanicData, PauseData } from './clock';
import { Energies, initialEnergies } from './distribution';
import { Grid, LocatedWord, mkGridOf } from './grid';
import { Layer, Overlay, mkLayer, mkOverlay } from './layer';
import { Tool } from './tools';

export type MouseState =
  | { t: 'up', p_in_canvas: Point }
  | { t: 'down', p_in_canvas: Point }
  | { t: 'drag_world', orig_p: Point, p_in_canvas: Point }
  | { t: 'drag_selection', orig_p: Point, p_in_canvas: Point }
  | { t: 'drag_tile', orig_loc: Location, orig_p_in_canvas: Point, p_in_canvas: Point, id: string }
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
  id: string,
  p_in_world_int: Point,
  letter: string,
}

export type TileOptionalId = {
  id?: string,
  p_in_world_int: Point,
  letter: string,
}

export const HAND_TILE_LIMIT = 10;

export type HandLoc = { t: 'hand', p_in_hand_int: Point };
export type MainLoc = { t: 'world', p_in_world_int: Point };
export type Location =
  | HandLoc
  | MainLoc
  ;

export type TileEntity = {
  id: string,
  loc: Location,
  letter: string,
};

export type MainTile = TileEntity & { loc: MainLoc };
export type HandTile = TileEntity & { loc: HandLoc };

export type TileEntityOptionalId = {
  id: string | undefined,
  loc: Location,
  letter: string,
};

export type SelectionState = {
  overlay: Overlay<boolean>,
  selectedIds: string[],
};

export type CoreState = {
  animations: Animation[],
  currentTool: Tool,
  tile_entities: Record<string, TileEntity>,
  invalidWords: LocatedWord[],
  connectedSet: Grid<boolean>,
  energies: Energies,
  canvas_from_world: SE2,
  seed: number,
  bonusOverlay: Overlay<Bonus>,
  selected?: SelectionState,
  score: number,
  lost: boolean,
  panic: PanicData | undefined,
  paused: PauseData | undefined,
};

export type GameState = {
  coreState: CoreState,
  mouseState: MouseState,
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
    coreState: {
      animations: [],
      currentTool: 'pointer',
      tile_entities: {},
      invalidWords: [],
      bonusOverlay: mkOverlay<Bonus>(),
      canvas_from_world: {
        scale: { x: 48, y: 48 },
        translate: { x: 200, y: 240 }
      },
      connectedSet: mkGridOf([]),
      energies: initialEnergies(),
      seed,
      score: 0,
      lost: false,
      panic: undefined,
      paused: undefined,
    },
    mouseState: { t: 'up', p_in_canvas: { x: 0, y: 0 } },
  };
}

let _cachedBonusLayer: Layer<Bonus> | undefined = undefined;

export function getBonusLayer(): Layer<Bonus> {
  if (_cachedBonusLayer == undefined) {
    _cachedBonusLayer = mkBonusLayer(Date.now());
  }
  return _cachedBonusLayer;
}
