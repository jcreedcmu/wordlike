import { PanicData, getPanicFraction } from "../core/clock";
import { ActiveWordBonus } from "../core/state";
import { RgbColor, fillRect } from "../util/dutil";
import { SE1 } from "../util/se1";
import { Spline, lerpSpline } from "../util/spline";
import { Rect } from "../util/types";
import { RenderableRect } from "./render";
import { canvas_bds_in_canvas, rectOfPanic_in_canvas } from "./widget-helpers";


const flashColor: RgbColor = [255, 0, 0];

const panicColorSpline: Spline = [
  { t: 0, vec: [0, 128, 0] },
  { t: 0.5, vec: [255, 255, 0] },
  { t: 0.75, vec: [255, 128, 0] },
  { t: 1, vec: [255, 0, 0] },
]


export function renderPanicBar(panic: PanicData, game_from_clock: SE1): RenderableRect {
  const panic_fraction = getPanicFraction(panic, game_from_clock);

  const c: RgbColor = lerpSpline(panicColorSpline, panic_fraction) as RgbColor;

  if (panic_fraction > 0.9 && Math.floor(200 * panic_fraction) % 2 == 0) {
    return { rect: rectOfPanic_in_canvas(0), color: flashColor };
  }
  return { rect: rectOfPanic_in_canvas(panic_fraction), color: c };
}


export function drawWordBonusPanicBar(d: CanvasRenderingContext2D, rect: Rect, fraction: number) {
  const c = lerpSpline(panicColorSpline, fraction);
  const color = `rgb(${c[0]},${c[1]},${c[2]})`;
  fillRect(d, rect, color);
}
