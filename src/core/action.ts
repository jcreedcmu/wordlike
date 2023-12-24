import { ViewData } from '../ui/ui-helpers';
import { WidgetPoint } from '../ui/widget-helpers';
import { Point } from '../util/types';
import { Intent } from './intent';
import { GameState, SceneState } from './state';
import { Tool } from './tools';

export type GameLowAction =
  | { t: 'zoom', center: Point, amount: number }
  | { t: 'drawTile' }
  | { t: 'flipOrientation' }
  | { t: 'dynamiteTile', wp: WidgetPoint }
  | { t: 'dropTopHandTile' }
  | { t: 'debug' }
  | { t: 'incrementScore', amount: number }
  | { t: 'toggleGl' }
  | { t: 'setTool', tool: Tool }
  | { t: 'mouseDownIntent', intent: Intent, wp: WidgetPoint & { t: 'world' } }
  | { t: 'mouseMove', p: Point }
  | { t: 'setGameState', state: GameState } // XXX deprecate
  | { t: 'none' }
  | { t: 'repaint' }
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
