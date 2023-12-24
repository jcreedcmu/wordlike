import { ViewData } from '../ui/ui-helpers';
import { WidgetPoint } from '../ui/widget-helpers';
import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { PanicData, PauseData } from './clock';
import { Intent } from './intent';
import { SelectionState } from './selection';
import { CoreState, GameState, InventoryItems, Location, MouseState, SceneState } from './state';
import { MoveTile } from './state-helpers';
import { Tool } from './tools';

export type GameLowAction =
  | { t: 'zoom', center: Point, amount: number }
  | { t: 'drawTile' }
  | { t: 'deselect' }
  | { t: 'flipOrientation' }
  | { t: 'dynamiteTile', wp: WidgetPoint }
  | { t: 'dropTopHandTile' }
  | { t: 'debug' }
  | { t: 'incrementScore', amount: number }
  | { t: 'toggleGl' }
  | { t: 'setTool', tool: Tool }
  | { t: 'mouseDownIntent', intent: Intent, wp: WidgetPoint }
  | { t: 'mouseMove', p: Point }
  | { t: 'none' }
  | { t: 'repaint' }
  | { t: 'vacuousDown', wp: WidgetPoint }
  | { t: 'shuffle' }
  | { t: 'pause' }
  | { t: 'multiple', actions: GameLowAction[] }
  | { t: 'startDragHandTile', wp: WidgetPoint, p_in_hand_int: Point }
  | { t: 'unpause', paused: PauseData }
  | { t: 'vacuousDownAnd', wp: WidgetPoint, action: GameLowAction }
  | { t: 'andMouseUp', p_in_canvas: Point, action: GameLowAction }
  | { t: 'dragSelectionEnd', ms: MouseState & { t: 'drag_selection' } }
  | { t: 'set_canvas_from_world', canvas_from_world: SE2 }
  | { t: 'putTilesInWorld', moves: MoveTile[] }
  | { t: 'putTileInWorld', id: string, p_in_world_int: Point }
  | { t: 'putTilesInHandFromNotHand', ids: string[], ix: number }
  | { t: 'putTileInHand', id: string, ix: number }
  | { t: 'setSelected', sel: SelectionState | undefined }
  | { t: 'checkValid' } // XXX break this up into more low-level actions
  | { t: 'swap', id0: string, id1: string, loc0: Location, loc1: Location }
  | { t: 'decrement', which: keyof InventoryItems }
  | { t: 'drawConsonant' }
  | { t: 'drawVowel' }
  | { t: 'setPanic', panic: PanicData }
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
  | { t: 'repaint' }
  ;

export type Action =
  | { t: 'resize', vd: ViewData }
  | { t: 'newGame', creative?: boolean }
  | { t: 'setSceneState', state: SceneState }
  | GameAction
  ;

export type Effect = { t: 'none' };

export type Dispatch = (action: Action) => void;
