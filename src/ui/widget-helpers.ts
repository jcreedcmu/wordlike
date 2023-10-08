import { Rect } from "../util/types";
import { SE2 } from "../util/se2";

export const HAND_WIDTH = 100;
export const WHOLE_CANVAS_in_canvas: Rect = { p: { x: 0, y: 0 }, sz: { x: 640, y: 480 } };
export const HAND_in_canvas: Rect = {
  p: { x: WHOLE_CANVAS_in_canvas.sz.x - HAND_WIDTH, y: 0 },
  sz: { x: HAND_WIDTH, y: WHOLE_CANVAS_in_canvas.sz.y }
};
export const MAIN_PANEL_in_canvas: Rect = {
  p: { x: 0, y: 0 },
  sz: { x: WHOLE_CANVAS_in_canvas.sz.x - HAND_WIDTH, y: WHOLE_CANVAS_in_canvas.sz.y }
};

export const DEFAULT_TILE_SCALE = 48;


export function hand_canvas_from_world(): SE2 {
  return {
    scale: { x: DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE },
    translate: { x: HAND_in_canvas.p.x + (HAND_WIDTH - DEFAULT_TILE_SCALE) / 2, y: 0 }
  };
}
