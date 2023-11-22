import { PanicData, getPanicFraction } from "../core/clock";
import { fillRect } from "../util/dutil";
import { SE1 } from "../util/se1";
import { Rect } from "../util/types";
import { canvas_bds_in_canvas } from "./widget-helpers";

const PANIC_THICK = 15;

export function drawPanicBar(d: CanvasRenderingContext2D, panic: PanicData | undefined, game_from_clock: SE1) {
  if (panic !== undefined) {
    const panic_fraction = getPanicFraction(panic, game_from_clock);
    const panic_rect_in_canvas: Rect = {
      p: {
        x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x * panic_fraction,
        y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - PANIC_THICK,
      },
      sz: {
        x: canvas_bds_in_canvas.sz.x * (1 - panic_fraction),
        y: PANIC_THICK,
      }
    };
    fillRect(d,
      panic_rect_in_canvas, panic_fraction < 0.5 ? 'green' :
      panic_fraction < 0.75 ? 'yellow' :
        panic_fraction < 0.875 ? 'orange' : 'red'
    );
  }
}
