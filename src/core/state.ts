import { world_bds_in_canvas } from '../ui/widget-helpers';
import * as se1 from '../util/se1';
import { SE1 } from '../util/se1';
import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { vsnorm } from '../util/vutil';
import { Animation } from './animations';
import { Bonus, ScoringBonus } from './bonus';
import { BIT_VISIBLE, ChunkUpdate } from './chunk';
import { PanicData, PauseData } from './clock';
import { Energies, initialEnergies } from './distribution';
import { Grid, LocatedWord, mkGridOf } from './grid';
import { Overlay, mkOverlay, setOverlay } from './layer';
import { AbstractLetter } from './letters';
import { MobState } from './mobs';
import { SelectionOperation, SelectionState } from './selection';
import { MobileId } from './id-helpers';
import { ResbarResource, Resource, Tool } from './tools';
import { WinState } from './winState';

export type Scoring = {
  bonus: ScoringBonus | { t: 'wordAchieved', word: string },
  p_in_world_int: Point,
  destroy: boolean,
};

export type MoveMobile = { mobile: RenderableMobile, id: MobileId, p_in_world_int: Point };
export type MoveMobileNoId = { mobile: RenderableMobile, p_in_world_int: Point };
export type GenMoveTile = { id: MobileId, loc: Location };

export type MouseState =
  | { t: 'up', p_in_canvas: Point }
  | { t: 'down', p_in_canvas: Point }
  // drag_world means we're panning
  | { t: 'drag_world', orig_p: Point, p_in_canvas: Point }
  // drag_selection means we're actually dragging out the selection rectangle
  | { t: 'drag_selection', orig_p: Point, p_in_canvas: Point, opn: SelectionOperation }
  | { t: 'exchange_tiles', orig_loc: Location, orig_p_in_canvas: Point, p_in_canvas: Point, id: MobileId }
  // drag_mobile means we're dragging one or more mobiles starting from a position in-world, or in-hand
  | {
    t: 'drag_mobile',
    orig_loc: Location,
    orig_p_in_canvas: Point,
    p_in_canvas: Point,
    id: MobileId,
    flipped: boolean,
  }
  // drag_resource means we're dragging a resource starting from a position in the resbar.
  // XXX: consider how this could perhaps be merged with drag_mobile
  | {
    t: 'drag_resource',
    p_in_canvas: Point,
    orig_p_in_canvas: Point,
    res: ResbarResource,
    res_ix: number,
  }
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
  id: MobileId,
  p_in_world_int: Point,
  letter: AbstractLetter,
}

export type TileOptionalId = {
  id?: MobileId,
  p_in_world_int: Point,
  letter: AbstractLetter,
}

export const HAND_TILE_LIMIT = 10;

export type HandLoc = { t: 'hand', index: number };
export type MainLoc = { t: 'world', p_in_world_int: Point };
export type NowhereLoc = { t: 'nowhere' };
export type Location =
  | HandLoc
  | MainLoc
  | NowhereLoc
  ;

export type TileEntity = {
  t: 'tile',
  id: MobileId,
  loc: Location,
  letter: AbstractLetter,
};

export type ResourceEntity = {
  t: 'resource',
  id: MobileId,
  loc: Location,
  res: Resource,
  durability: number, // XXX: should this be more tied to the particular resource?
};

export type MobileEntity =
  | TileEntity
  | ResourceEntity
  ;

// This should contain enough information to render a mobile assuming we
// already know its location.
export type RenderableMobile =
  | { t: 'tile', letter: AbstractLetter }
  | { t: 'resource', res: Resource }
  ;

export type PreTileEntity = {
  loc: Location,
  letter: AbstractLetter,
};

export type MainTile = TileEntity & { loc: MainLoc };
export type HandTile = TileEntity & { loc: HandLoc };

export type TileEntityOptionalId = {
  id: MobileId | undefined,
  loc: Location,
  letter: AbstractLetter,
};

export type ScoreState = {
  score: number,
  highWaterMark: number,
}

export type ActiveWordBonus = {
  word: string,
  activation_time_in_game: number,
  p_in_world_int: Point,
};

export type WordBonusState = {
  numAllocated: number,
  active: ActiveWordBonus[],
}

export type InventoryItems = {
  dynamites: number,
  bombs: number,
  vowels: number,
  consonants: number,
  copies: number,
  times: number,
  glasses: number,
};

export type ResourceItems = Record<ResbarResource, number>;

// state such that, if it updates, should induce redraw of Canvas2d content
export type SlowState = {
  generation: number, // an arbitrary mechanism for forcing a redraw
  inventory: InventoryItems,
  resource: ResourceItems,
  scoring: ScoreState,
  currentTool: Tool,
  invalidWords: LocatedWord[],
  renderToGl: boolean,
  paused: PauseData | undefined,
  winState: WinState,
}

export type CacheUpdate = {
  p_in_world_int: Point,
  chunkUpdate: ChunkUpdate,
};

export type MobsState = {
  mobs: Record<string, MobState>,
}
// State other than mouse state
export type CoreState = {
  slowState: SlowState,
  animations: Animation[],

  // indexed by position
  mobile_entities: Record<string, MobileEntity>,
  // indexed by position
  seen_cells: Overlay<boolean>,

  connectedSet: Grid<boolean>,
  energies: Energies,
  canvas_from_world: SE2,
  seed: number, // changes during game play, determines which letters are drawn
  bonusOverlay: Overlay<Bonus>,
  selected?: SelectionState,
  panic: PanicData | undefined,
  game_from_clock: SE1,
  wordBonusState: WordBonusState,
  mobsState: MobsState,
  bonusLayerSeed: number,  // immutable during game play
  _cacheUpdateQueue: CacheUpdate[],
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
const INITIAL_SEEN_CELLS_RADIUS = 5.5;

export function mkGameState(seed: number, creative: boolean, bonusLayerSeed: number): GameState {
  const rad = INITIAL_SEEN_CELLS_RADIUS;
  const irad = Math.ceil(rad);

  const seen_cells: Overlay<boolean> = mkOverlay();
  const _cacheUpdateQueue: CacheUpdate[] = [];
  for (let x = -irad; x <= irad; x++) {
    for (let y = -irad; y <= irad; y++) {
      const p_in_world_int = { x, y };
      if (vsnorm(p_in_world_int) <= rad * rad) {
        setOverlay(seen_cells, p_in_world_int, true);
        _cacheUpdateQueue.push({ p_in_world_int, chunkUpdate: { t: 'setBit', bit: BIT_VISIBLE } });
      }
    }
  }
  return {
    coreState: {
      slowState: {
        generation: 0,
        inventory: {
          dynamites: 5,
          bombs: 0,
          vowels: 0,
          consonants: 0,
          copies: 0,
          times: 0,
          glasses: 0,
        },
        resource: {
          wood: 0,
          stone: 0,
        },
        scoring: { score: 0, highWaterMark: 0 },
        currentTool: 'pointer',
        invalidWords: [],
        renderToGl: true,
        paused: undefined,
        winState: { t: creative ? 'creative' : 'playing' },
      },
      wordBonusState: {
        active: [],
        numAllocated: 0,
      },
      animations: [],
      mobile_entities: {},
      seen_cells,
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
      panic: undefined,
      game_from_clock: se1.translate(-Date.now()),
      bonusLayerSeed,
      mobsState: { mobs: {} },
      _cacheUpdateQueue,
    },
    mouseState: { t: 'up', p_in_canvas: { x: 0, y: 0 } },
  };
}
