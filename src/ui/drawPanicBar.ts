import { PanicData, getPanicFraction } from "../core/clock";
import { RgbColor, fillRect } from "../util/dutil";
import { SE1 } from "../util/se1";
import { Spline, lerpSpline } from "../util/spline";
import { Rect } from "../util/types";
import { vadd, vint, vscale, vsub } from "../util/vutil";
import { rectOfPanic_in_canvas } from "./widget-helpers";
import { hand_bds_in_canvas } from "./widget-layout";

const flashColor: RgbColor = [255, 0, 0];

const panicColorSpline: Spline = [
  { t: 0, vec: [0, 128, 0] },
  { t: 0.5, vec: [255, 255, 0] },
  { t: 0.75, vec: [255, 128, 0] },
  { t: 1, vec: [255, 0, 0] },
]

export type RenderableRect = { rect: Rect, color: [number, number, number] };

const WORD_BONUS_MARGIN = 8;
const WORD_BONUS_SIZE = { x: 200, y: 32 };

export function wordBubbleRect(index: number): Rect {
  return {
    p: vint(vadd(hand_bds_in_canvas.p, vscale({ x: 0, y: WORD_BONUS_MARGIN + WORD_BONUS_SIZE.y }, -(index + 1)))),
    sz: WORD_BONUS_SIZE
  };
}

export function wordBubblePanicBounds(index: number): Rect {
  const rect = wordBubbleRect(index);
  const maxp = { x: rect.p.x + rect.sz.x - 10, y: rect.p.y + rect.sz.y - 10 };
  const minp = { x: rect.p.x + rect.sz.x - 90, y: rect.p.y + 10 };
  return { p: minp, sz: vsub(maxp, minp) };
}

export function wordBubblePanicRect(index: number, progress: number): RenderableRect {
  const bounds = wordBubblePanicBounds(index);
  const rect = {
    p: { x: bounds.p.x + progress * bounds.sz.x, y: bounds.p.y },
    sz: { x: bounds.sz.x * (1 - progress), y: bounds.sz.y },
  };
  return {
    rect, color: lerpSpline(panicColorSpline, progress) as RgbColor
  };
}

export function renderPanicBar(panic: PanicData, game_from_clock: SE1): RenderableRect {
  const panic_fraction = getPanicFraction(panic, game_from_clock);

  const c: RgbColor = lerpSpline(panicColorSpline, panic_fraction) as RgbColor;

  if (panic_fraction > 0.9 && Math.floor(200 * panic_fraction) % 2 == 0) {
    return { rect: rectOfPanic_in_canvas(0), color: flashColor };
  }
  return { rect: rectOfPanic_in_canvas(panic_fraction), color: c };
}


export function drawWordBonusPanicBar(d: CanvasRenderingContext2D, rect: Rect, fraction: number) {
  drawRenderableRect(d, { color: lerpSpline(panicColorSpline, fraction) as RgbColor, rect });
}

export function drawRenderableRect(d: CanvasRenderingContext2D, rr: RenderableRect) {
  const c = rr.color;
  const color = `rgb(${c[0]},${c[1]},${c[2]})`;
  fillRect(d, rr.rect, color);
}
