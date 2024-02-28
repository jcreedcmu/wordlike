import { SE1 } from '../util/se1';
import { SE2 } from '../util/se2';
import { MobileEntity, WordBonusState, MobsState, MouseState, InventoryItems, ResourceItems, ScoreState } from './state-types';
import { CacheUpdate } from './cache-types';
import { Animation } from "./animation-types";
import { Bonus } from './bonus';
import { PanicData, PauseData } from './clock';
import { Energies } from './distribution';
import { Grid, LocatedWord } from './grid';
import { Overlay } from './layer';
import { SelectionState } from './selection';
import { Tool } from "./tool-types";
import { WinState } from './winState';

// state such that, if it updates, should induce redraw of Canvas2d content
export type SlowState = {
  generation: number; // an arbitrary mechanism for forcing a redraw
  inventory: InventoryItems;
  resource: ResourceItems;
  scoring: ScoreState;
  currentTool: Tool;
  invalidWords: LocatedWord[];
  renderToGl: boolean;
  paused: PauseData | undefined;
  winState: WinState;
};

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

  idCounter: number,
};

export type GameState = {
  coreState: CoreState,
  mouseState: MouseState,
};

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

export function mkSceneState(): SceneState {
  return { t: 'menu' };
}
