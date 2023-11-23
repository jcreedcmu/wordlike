import { ViewData } from '../ui/ui-helpers';
import { Point } from '../util/types';
import { SceneState } from './state';

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
  | { t: 'newGame' }
  | { t: 'setSceneState', state: SceneState }
  | GameAction
  ;

export type Effect = { t: 'none' };

export type Dispatch = (action: Action) => void;
