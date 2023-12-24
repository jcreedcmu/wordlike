import { ViewData } from '../ui/ui-helpers';
import { WidgetPoint } from '../ui/widget-helpers';
import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { PauseData } from './clock';
import { Intent } from './intent';
import { SelectionState } from './selection';
import { CoreState, GameState, Location, MouseState, SceneState } from './state';
import { MoveTile } from './state-helpers';
import { Tool } from './tools';

export type GameLowAction =
  | { t: 'zoom', center: Point, amount: number }
  | { t: 'drawTile' }
  | { t: 'drawTileAndDeselect' } // XXX merge with above somehow
  | { t: 'flipOrientation' }
  | { t: 'dynamiteTile', wp: WidgetPoint }
  | { t: 'dropTopHandTile' }
  | { t: 'debug' }
  | { t: 'incrementScore', amount: number }
  | { t: 'toggleGl' }
  | { t: 'setTool', tool: Tool }
  | { t: 'mouseDownIntent', intent: Intent, wp: WidgetPoint }
  | { t: 'mouseMove', p: Point }
  | { t: 'setCoreState', state: CoreState } // XXX deprecate
  | { t: 'none' }
  | { t: 'repaint' }
  | { t: 'vacuousDown', wp: WidgetPoint }
  | { t: 'shuffle', wp: WidgetPoint } // XXX could be broken up into shuffle and vacuous down
  | { t: 'pause', wp: WidgetPoint } // XXX could be broken up into pause and vacuous down
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
  | { t: 'checkValid' }
  | { t: 'swap', id0: string, id1: string, loc0: Location, loc1: Location }
  ;

export type LowAction =
  | { t: 'setSceneState', state: SceneState } // XXX deprecate
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
