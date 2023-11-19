import { Point, Rect } from "../util/types";
import { SE2, apply, inverse } from "../util/se2";
import { pointInRect } from "../util/util";
import { GameState } from "../core/state";

export const HAND_WIDTH = 100;

export const canvas_bds_in_canvas: Rect = { p: { x: 0, y: 0 }, sz: { x: 800, y: 600 } };
export const hand_bds_in_canvas: Rect = {
  p: { x: canvas_bds_in_canvas.sz.x - HAND_WIDTH, y: 0 },
  sz: { x: HAND_WIDTH, y: canvas_bds_in_canvas.sz.y }
};

export const TOOLBAR_WIDTH = 64;

export const world_bds_in_canvas: Rect = {
  p: { x: TOOLBAR_WIDTH, y: 0 },
  sz: { x: canvas_bds_in_canvas.sz.x - HAND_WIDTH - TOOLBAR_WIDTH, y: canvas_bds_in_canvas.sz.y }
};

export const toolbar_bds_in_canvas: Rect = {
  p: { x: 0, y: 0 },
  sz: { x: TOOLBAR_WIDTH, y: canvas_bds_in_canvas.sz.y }
};

export const pause_button_bds_in_canvas: Rect = {
  p: { x: 0, y: canvas_bds_in_canvas.sz.y - TOOLBAR_WIDTH },
  sz: { x: TOOLBAR_WIDTH, y: TOOLBAR_WIDTH }
};

export const DEFAULT_TILE_SCALE = 48;

export function canvas_from_hand(): SE2 {
  return {
    scale: { x: DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE },
    translate: { x: hand_bds_in_canvas.p.x + (HAND_WIDTH - DEFAULT_TILE_SCALE) / 2, y: 0 }
  };
}

export function canvas_from_toolbar(): SE2 {
  return {
    scale: { x: 1, y: 1 },
    translate: toolbar_bds_in_canvas.p,
  };
}

// p is in the local coordinate system, i.e. "world" or "hand"
export type DragWidgetPoint =
  | { t: 'world', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2 }
  | { t: 'hand', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2 }
export type WidgetPoint =
  | DragWidgetPoint
  | { t: 'toolbar', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2, toolIndex: number }
  | { t: 'pauseButton', p_in_canvas: Point }
  ;

export function getWidgetPoint(state: GameState, p_in_canvas: Point): WidgetPoint {
  if (pointInRect(p_in_canvas, pause_button_bds_in_canvas)) {
    return {
      t: 'pauseButton',
      p_in_canvas,
    };
  }
  else if (pointInRect(p_in_canvas, toolbar_bds_in_canvas)) {
    const toolbar_from_canvas = inverse(canvas_from_toolbar());
    const p_in_local = apply(toolbar_from_canvas, p_in_canvas);
    return {
      t: 'toolbar',
      p_in_local,
      p_in_canvas,
      local_from_canvas: toolbar_from_canvas,
      toolIndex: Math.floor(p_in_local.y / toolbar_bds_in_canvas.sz.x),
    }
  }
  else return getDragWidgetPoint(state, p_in_canvas);
}

export function getDragWidgetPoint(state: GameState, p_in_canvas: Point): DragWidgetPoint {
  if (pointInRect(p_in_canvas, world_bds_in_canvas)) {
    return {
      t: 'world',
      p_in_local: apply(inverse(state.coreState.canvas_from_world), p_in_canvas),
      p_in_canvas,
      local_from_canvas: inverse(state.coreState.canvas_from_world),
    };
  }
  else {
    return {
      t: 'hand',
      p_in_local: apply(inverse(canvas_from_hand()), p_in_canvas),
      p_in_canvas,
      local_from_canvas: inverse(canvas_from_hand()),
    };
  }
}
