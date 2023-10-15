import { ViewData } from '../app';
import { Point } from '../util/types';
import { SceneState } from './state';

// There are UiActions, which might have different behavior depending
// on view state, and other GameActions, which should be treated
// uniformly.

export type GameAction = { t: 'none'; } |
  UiAction;
// I think I want to migrate some of these up to GameAction

export type UiAction = { t: 'key'; code: string; } |
{ t: 'mouseDown'; button: number; p: Point; } |
{ t: 'mouseUp'; p: Point; } |
{ t: 'mouseMove'; p: Point; } |
{ t: 'wheel'; p: Point; delta: number; } |
{ t: 'repaint'; };

export type Action = { t: 'resize'; vd: ViewData; } |
{ t: 'newGame'; } |
{ t: 'setSceneState'; state: SceneState; } |
  GameAction;

export type Effect = { t: 'none'; };

export type Dispatch = (action: Action) => void;
