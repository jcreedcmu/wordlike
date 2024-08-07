import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { PanicData, PauseData } from './clock';
import { ViewData, WidgetPoint } from './core-ui-types';
import { Intent } from './intent-types';
import { LandingMoveId } from "./landing-types";
import { ProperLandingResult } from './landing-result';
import { SelectionState } from './selection';
import { SceneState } from './scene-state';
import { InventoryItems, Location, MouseState } from './state-types';
import { MobileId } from './basic-types';
import { ResbarResource, Tool } from "./tool-types";
import { ButtonBarButton } from '../layout/button-bar';
import { Bonus } from './bonus';

export type GameLowAction =
  | { t: 'zoom', center: Point, amount: number }
  | { t: 'drawTile' }
  | { t: 'deselect' }
  | { t: 'flipOrientation' }
  | { t: 'dynamiteTile', wp: WidgetPoint }
  | { t: 'dropTopHandTile' }
  | { t: 'debug' }
  | { t: 'debug2' }
  | { t: 'incrementScore', amount: number }
  | { t: 'toggleGl' }
  | { t: 'setTool', tool: Tool }
  | { t: 'mouseDownIntent', intent: Intent, wp: WidgetPoint }
  | { t: 'mouseMove', p: Point }
  | { t: 'none' }
  | { t: 'tick' }
  | { t: 'vacuousDown', wp: WidgetPoint }
  | { t: 'shuffle' }
  | { t: 'pause' }
  | { t: 'buttonBar', button: ButtonBarButton }
  | { t: 'multiple', actions: GameLowAction[] }
  | { t: 'startDragHandTile', wp: WidgetPoint, index: number }
  | { t: 'unpause', paused: PauseData }
  | { t: 'vacuousDownAnd', wp: WidgetPoint, action: GameLowAction }
  | { t: 'andMouseUp', p_in_canvas: Point, action: GameLowAction }
  | { t: 'dragSelectionEnd', ms: MouseState & { t: 'drag_selection' } }
  | { t: 'set_canvas_from_world', canvas_from_world: SE2 }
  | { t: 'putTilesInHandFromNotHand', ids: MobileId[], ix: number } // ix may be < 0 or >= handsize
  | { t: 'putTileInHand', id: MobileId, ix: number } // ix may be < 0 or >= handsize
  | { t: 'setSelected', sel: SelectionState | undefined }
  | { t: 'checkValid' } // XXX break this up into more low-level actions
  | { t: 'swap', id0: MobileId, id1: MobileId, loc0: Location, loc1: Location }
  | { t: 'decrement', which: keyof InventoryItems }
  | { t: 'drawConsonant' }
  | { t: 'drawVowel' }
  | { t: 'setPanic', panic: PanicData }
  | { t: 'errorRestoreMobiles', ids: MobileId[] } // put held mobiles back in cache
  | { t: 'errorRestoreBonuses', restore: { bonus: Bonus, p_in_world_int: Point }[] } // put held mobiles back in cache
  | { t: 'popCacheUpdateQueue', n: number }
  | { t: 'addMob' }
  | { t: 'startDragResource', wp: WidgetPoint, res: ResbarResource, res_ix: number } // XXX: rename to startDragResbar or something
  | { t: 'landResults', lrms: { lr: ProperLandingResult, move: LandingMoveId }[] }
  | { t: 'cancelModals' }
  | { t: 'saveSettings' }
  | { t: 'setAudioVolume', volume: number }
  ;

export type LowAction =
  | { t: 'returnToMenu' }
  | { t: 'gameLowAction', action: GameLowAction }
  ;

// All of these p are p_in_canvas
export type GamePresAction =
  | { t: 'none' }
  | { t: 'key', code: string }
  | { t: 'mouseUp', p: Point }
  | { t: 'mouseMove', p: Point }
  | { t: 'wheel', p: Point, delta: number }
  | { t: 'tick' }
  | { t: 'popCacheUpdateQueue', n: number }
  | { t: 'cancelModals' }
  | { t: 'saveSettings' }
  | { t: 'setAudioVolume', volume: number }
  | { t: 'multiple', actions: GamePresAction[] }
  ;

export type GameAction =
  | GamePresAction
  | { t: 'mouseDown', button: number, p: Point, mods: Set<string> }
  ;

export type Action =
  | { t: 'resize', vd: ViewData }
  | { t: 'newGame', creative?: boolean }
  | { t: 'setSceneState', state: SceneState }
  | GameAction
  ;

export type Dispatch = (action: Action) => void;
