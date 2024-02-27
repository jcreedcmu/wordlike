import { SE2, inverse } from "../util/se2";
import { canvas_bds_in_canvas } from "./widget-constants";

export const canvas_from_gl: SE2 = {
  scale: { x: canvas_bds_in_canvas.sz.x / 2, y: -canvas_bds_in_canvas.sz.y / 2 },
  translate: { x: canvas_bds_in_canvas.sz.x / 2, y: canvas_bds_in_canvas.sz.y / 2 },
};

export const gl_from_canvas: SE2 = inverse(canvas_from_gl);
