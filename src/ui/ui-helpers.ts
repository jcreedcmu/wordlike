import { ViewData } from '../core/core-ui-types';
import { vint } from '../util/vutil';
import { canvas_bds_in_canvas } from "./widget-constants";

export function resizeView(c: HTMLCanvasElement): ViewData {
  const ratio = devicePixelRatio;

  const w = canvas_bds_in_canvas.sz.x;
  const h = canvas_bds_in_canvas.sz.y;

  c.width = w;
  c.height = h;

  const ow = w;
  const oh = h;

  c.width = ow * ratio;
  c.height = oh * ratio;

  c.style.width = ow + 'px';
  c.style.height = oh + 'px';

  const wsize = vint({ x: c.width / ratio, y: c.height / ratio });

  return { wsize };
}
