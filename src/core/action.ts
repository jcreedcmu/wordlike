import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { PanicData, PauseData } from './clock';
import { ViewData, WidgetPoint } from './core-ui-types';
import { Intent } from './intent-types';
import { LandingMoveId } from './landing-resolve';
import { ProperLandingResult } from './landing-result';
import { SelectionState } from './selection';
import { SceneState } from './state';
import { InventoryItems, Location, MobileId, MouseState } from './state-types';
import { ResbarResource, Tool } from "./tool-types";

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
  | { t: 'restoreMobiles', ids: MobileId[] } // put held mobiles back in cache
  | { t: 'popCacheUpdateQueue', n: number }
  | { t: 'addMob' }
  | { t: 'startDragResource', wp: WidgetPoint, res: ResbarResource, res_ix: number } // XXX: rename to startDragResbar or something
  | { t: 'landResults', lrms: { lr: ProperLandingResult, move: LandingMoveId }[] }
  ;

export type LowAction =
  | { t: 'returnToMenu' }
  | { t: 'gameLowAction', action: GameLowAction }
  ;

// All of these p are p_in_canvas
export type GameAction =
  | { t: 'none' }
  | { t: 'key', code: string }
  | { t: 'mouseDown', button: number, p: Point, mods: Set<string> }
  | { t: 'mouseUp', p: Point }
  | { t: 'mouseMove', p: Point }
  | { t: 'wheel', p: Point, delta: number }
  | { t: 'tick' }
  | { t: 'popCacheUpdateQueue', n: number }
  ;

export type Action =
  | { t: 'resize', vd: ViewData }
  | { t: 'newGame', creative?: boolean }
  | { t: 'setSceneState', state: SceneState }
  | GameAction
  ;

export type Effect = { t: 'none' };

export type Dispatch = (action: Action) => void;
