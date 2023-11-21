import { getAssets } from '../core/assets';
import { rectOfTool } from '../core/tools';
import { drawImage } from '../util/dutil';
import { SE2 } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Point } from "../util/types";
import { midpointOfRect } from "../util/util";

export function drawBonus(d: CanvasRenderingContext2D, pan_canvas_from_world: SE2, p: Point, fraction: number = 1) {
  const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });
  d.fillStyle = 'rgba(0,0,255,0.5)';
  d.beginPath();
  const m = midpointOfRect(rect_in_canvas);
  d.moveTo(m.x, m.y);
  d.arc(rect_in_canvas.p.x + rect_in_canvas.sz.x / 2,
    rect_in_canvas.p.y + rect_in_canvas.sz.y / 2,
    rect_in_canvas.sz.y * 0.4,
    0, 2 * Math.PI * fraction,
  );
  d.fill();

}

export function drawBonusBomb(d: CanvasRenderingContext2D, pan_canvas_from_world: SE2, p: Point, fraction: number = 1) {
  const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });
  const toolbarImg = getAssets().toolbarImg;
  drawImage(d, toolbarImg, rectOfTool('bomb'), rect_in_canvas);
}
