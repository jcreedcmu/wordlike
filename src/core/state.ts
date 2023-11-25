import { world_bds_in_canvas } from '../ui/widget-helpers';
import * as se1 from '../util/se1';
import { SE1 } from '../util/se1';
import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { Animation } from './animations';
import { Bonus } from './bonus';
import { PanicData, PauseData } from './clock';
import { Energies, initialEnergies } from './distribution';
import { Grid, LocatedWord, mkGridOf } from './grid';
import { Overlay, mkOverlay } from './layer';
import { SelectionOperation, SelectionState } from './selection';
import { Tool } from './tools';
import { WinState } from './winState';

export type MouseState =
  | { t: 'up', p_in_canvas: Point }
  | { t: 'down', p_in_canvas: Point }
  | { t: 'drag_world', orig_p: Point, p_in_canvas: Point }
  | { t: 'drag_selection', orig_p: Point, p_in_canvas: Point, opn: SelectionOperation }
  | { t: 'exchange_tiles', orig_loc: Location, orig_p_in_canvas: Point, p_in_canvas: Point, id: string }
  | { t: 'drag_tile', orig_loc: Location, orig_p_in_canvas: Point, p_in_canvas: Point, id: string, flipped: boolean }
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
  | { t: 'instructions', page: number }
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

export type ScoreState = {
  score: number,
  highWaterMark: number,
}

export type CoreState = {
  renderToGl: boolean,
  animations: Animation[],
  currentTool: Tool,
  tile_entities: Record<string, TileEntity>,
  invalidWords: LocatedWord[],
  connectedSet: Grid<boolean>,
  energies: Energies,
  canvas_from_world: SE2,
  seed: number, // changes during game play, determines which letters are drawn
  bonusOverlay: Overlay<Bonus>,
  selected?: SelectionState,
  scoring: ScoreState,
  winState: WinState,
  panic: PanicData | undefined,
  paused: PauseData | undefined,
  game_from_clock: SE1,
  inventory: {
    bombs: number,
    vowels: number,
    consonants: number,
    copies: number,
  }
  bonusLayerSeed: number,  // immutable during game play
};

export type GameState = {
  coreState: CoreState,
  mouseState: MouseState,
};

export function mkSceneState(): SceneState {
  return { t: 'menu' };
}

export function mkGameSceneState(seed: number, creative: boolean, bonusLayerSeed: number): SceneState {
  return {
    t: 'game',
    gameState: mkGameState(seed, creative, bonusLayerSeed), revision: 0
  };
}

const DEFAULT_SCALE = 48.001;
const epsilon = 0.0001;

export function mkGameState(seed: number, creative: boolean, bonusLayerSeed: number): GameState {
  return {
    coreState: {
      renderToGl: false,
      animations: [],
      currentTool: 'pointer',
      tile_entities: {},
      invalidWords: [],
      bonusOverlay: mkOverlay<Bonus>(),
      canvas_from_world: {
        scale: { x: DEFAULT_SCALE, y: DEFAULT_SCALE },
        translate: {
          x: epsilon + world_bds_in_canvas.p.x + world_bds_in_canvas.sz.x / 2 - DEFAULT_SCALE / 2,
          y: epsilon + world_bds_in_canvas.p.y + world_bds_in_canvas.sz.y / 2 - DEFAULT_SCALE / 2
        }
      },
      connectedSet: mkGridOf([]),
      energies: initialEnergies(),
      seed,
      scoring: { score: 0, highWaterMark: 0 },
      winState: { t: creative ? 'creative' : 'playing' },
      panic: undefined,
      paused: undefined,
      game_from_clock: se1.translate(-Date.now()),
      inventory: {
        bombs: 0,
        vowels: 0,
        consonants: 0,
        copies: 0,
      },
      bonusLayerSeed,
    },
    mouseState: { t: 'up', p_in_canvas: { x: 0, y: 0 } },
  };
}
