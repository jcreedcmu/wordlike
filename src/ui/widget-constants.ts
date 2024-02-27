import { Rect } from "../util/types";

export const GLOBAL_BORDER = 5;
export const HAND_VERT_PADDING = 10;
export const HAND_VERT_MARGIN = 12;
export const HAND_HORIZ_MARGIN = 16;
export const PANIC_THICK = 10;
export const SPACER_WIDTH = 5;

export const canvas_bds_in_canvas: Rect = { p: { x: 0, y: 0 }, sz: { x: 1024, y: 768 } };
export const DEFAULT_TILE_SCALE = 48;

export const BAR_WIDTH = 64;
export const TOOLBAR_WIDTH = 52;

export const world_bds_in_canvas: Rect = {
  p: { x: 0, y: 0 },
  sz: { x: canvas_bds_in_canvas.sz.x, y: canvas_bds_in_canvas.sz.y }
};
// This gives a bound on what could possibly be in the toolbar

export const toolbar_bds_in_canvas: Rect = {
  p: { x: 0, y: 0 },
  sz: { x: TOOLBAR_WIDTH, y: canvas_bds_in_canvas.sz.y }
};
// This gives a bound on what could possibly be in the resbar

export const resbar_bds_in_canvas: Rect = {
  p: { x: canvas_bds_in_canvas.sz.x - TOOLBAR_WIDTH, y: 0 },
  sz: { x: TOOLBAR_WIDTH, y: canvas_bds_in_canvas.sz.y }
};
