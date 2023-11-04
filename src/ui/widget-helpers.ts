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

export const DEFAULT_TILE_SCALE = 48;


export function canvas_from_hand(): SE2 {
  return {
    scale: { x: DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE },
    translate: { x: hand_bds_in_canvas.p.x + (HAND_WIDTH - DEFAULT_TILE_SCALE) / 2, y: 0 }
  };
}

// p is in the local coordinate system, i.e. "world" or "hand"
export type WidgetPoint =
  | { t: 'world', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2 }
  | { t: 'hand', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2 }
  ;

export function getWidgetPoint(state: GameState, p_in_canvas: Point): WidgetPoint {
  if (pointInRect(p_in_canvas, world_bds_in_canvas)) {
    return {
      t: 'world',
      p_in_local: apply(inverse(state.canvas_from_world), p_in_canvas),
      p_in_canvas,
      local_from_canvas: inverse(state.canvas_from_world),
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
