import { SE1 } from '../util/se1';
import { SE2 } from '../util/se2';
import { Animation } from "./animation-types";
import { Bonus } from './bonus';
import { CacheUpdate } from './cache-types';
import { PanicData, PauseData } from './clock';
import { Energies } from './distribution';
import { SoundEffect } from './effect-types';
import { LocatedWord, UbGrid } from './grid';
import { Overlay } from './layer';
import { SelectionState } from './selection';
import { SettingsState } from './settings-types';
import { InventoryItems, MobileEntity, MobsState, ModalDialogs, MouseState, ResourceItems, ScoreState, WordBonusState } from './state-types';
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
  soundEffects: SoundEffect[],

  // indexed by position
  mobile_entities: Record<string, MobileEntity>,
  // indexed by position
  seen_cells: Overlay<boolean>,

  connectedSet: UbGrid<boolean>,
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
  modals: ModalDialogs,
  settings: SettingsState,
};

export type GameState = {
  coreState: CoreState,
  mouseState: MouseState,
};
