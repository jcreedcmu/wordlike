import { Point, Rect } from "../util/types";
import { SE2 } from "../util/se2";

export const HAND_WIDTH = 100;

export const canvas_bds_in_canvas: Rect = { p: { x: 0, y: 0 }, sz: { x: 640, y: 480 } };
export const hand_bds_in_canvas: Rect = {
  p: { x: canvas_bds_in_canvas.sz.x - HAND_WIDTH, y: 0 },
  sz: { x: HAND_WIDTH, y: canvas_bds_in_canvas.sz.y }
};

export const world_bds_in_canvas: Rect = {
  p: { x: 0, y: 0 },
  sz: { x: canvas_bds_in_canvas.sz.x - HAND_WIDTH, y: canvas_bds_in_canvas.sz.y }
};

export const DEFAULT_TILE_SCALE = 48;


export function canvas_from_hand(): SE2 {
  return {
    scale: { x: DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE },
    translate: { x: hand_bds_in_canvas.p.x + (HAND_WIDTH - DEFAULT_TILE_SCALE) / 2, y: 0 }
  };
}

// coordinate system of p is the local canvas
type WidgetPoint =
  | { t: 'world', p: Point }
  | { t: 'hand', p: Point }
  ;
