import { SE1 } from '../util/se1';
import { SE2 } from '../util/se2';
import { SlowState, MobileEntity, WordBonusState, MobsState, MouseState } from './state-types';
import { CacheUpdate } from './cache-types';
import { Animation } from "./animation-types";
import { Bonus } from './bonus';
import { PanicData } from './clock';
import { Energies } from './distribution';
import { Grid } from './grid';
import { Overlay } from './layer';
import { SelectionState } from './selection';

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
