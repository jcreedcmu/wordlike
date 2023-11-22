import { PanicData, getPanicFraction } from "../core/clock";
import { fillRect } from "../util/dutil";
import { SE1 } from "../util/se1";
import { Spline, lerpSpline } from "../util/spline";
import { Rect } from "../util/types";
import { canvas_bds_in_canvas } from "./widget-helpers";

const PANIC_THICK = 15;

const panicColorSpline: Spline = [
  { t: 0, vec: [0, 128, 0] },
  { t: 0.5, vec: [255, 255, 0] },
  { t: 0.75, vec: [255, 128, 0] },
  { t: 1, vec: [255, 0, 0] },
]

function rectOfPanic_in_canvas(panic_fraction: number): Rect {
  return {
    p: {
      x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x * panic_fraction,
      y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - PANIC_THICK,
    },
    sz: {
      x: canvas_bds_in_canvas.sz.x * (1 - panic_fraction),
      y: PANIC_THICK,
    }
  };
}

export function drawPanicBar(d: CanvasRenderingContext2D, panic: PanicData | undefined, game_from_clock: SE1) {
  if (panic !== undefined) {
    const panic_fraction = getPanicFraction(panic, game_from_clock);

    const c = lerpSpline(panicColorSpline, panic_fraction);
    const color = `rgb(${c[0]},${c[1]},${c[2]})`;

    if (panic_fraction > 0.9 && Math.floor(200 * panic_fraction) % 2 == 0) {
      fillRect(d, rectOfPanic_in_canvas(0), '#ffff00');
    }
    fillRect(d, rectOfPanic_in_canvas(panic_fraction), color);
  }
}
