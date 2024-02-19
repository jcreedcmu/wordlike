import { apply, compose, ident, inverse, SE2, translate } from '../util/se2';
import { vadd, vm, vsub } from '../util/vutil';
import { CoreState, GameState, MouseState } from '../core/state';
import { Point, Rect } from '../util/types';
import { getDragWidgetPoint } from './widget-helpers';
import { apply_to_rect, matchScale } from '../util/se2-extra';

export function pan_canvas_from_canvas_of_mouse_state(state: MouseState): SE2 {
  if (state.t == 'drag_world') {
    return translate(vsub(state.p_in_canvas, state.orig_p));
  }
  else {
    return ident();
  }
}

export function pan_canvas_from_world_of_state(state: GameState): SE2 {
  return compose(pan_canvas_from_canvas_of_mouse_state(state.mouseState),
    state.coreState.canvas_from_world);
}

// Given a mouse state that represents a dragged mobile, what is the canvas_from_local for that mobile
// in its currently dragged position?
//
// We know p0_in_canvas and p1_in_canvas
//
// If a mobile is being dragged, we know
// getWidgetPoint(orig_p) = { p0_in_local0, local0_from_canvas }
// getWidgetPoint(p)      = { p1_in_local1, local1_from_canvas }
//
// we want the output transform, canvas_from_mobile1, to be the inverse
// of mobile1_from_canvas, which is the unique transform that has the property
//
// - mobile1_from_canvas * p1_in_canvas = mobile0_from_canvas * p0_in_canvas
// - mobile1_from_canvas's scale factor is the same as that of local1_from_canvas
//
// mobile is synonymous with mobile0: it's the coordinate system of the mobile before it was dragged
// drag_mobile is synonymous with mobile1: it's the coordinate system of the mobile being dragged
export function canvas_from_drag_mobile(state: CoreState, ms: MouseState): SE2 {
  switch (ms.t) {
    case 'drag_mobile':
      const wp0 = getDragWidgetPoint(state, ms.orig_p_in_canvas);
      const wp1 = getDragWidgetPoint(state, ms.p_in_canvas);
      const local1_from_canvas = wp1.local_from_canvas;
      const local0_from_mobile0 = translate(vm(wp0.p_in_local, Math.floor));
      const mobile0_from_canvas = compose(inverse(local0_from_mobile0), wp0.local_from_canvas);
      const canvas_from_mobile1 = inverse(matchScale(local1_from_canvas, wp1.p_in_canvas, apply(mobile0_from_canvas, wp0.p_in_canvas)));
      return canvas_from_mobile1;
    default: return ident();
  }
}

export function cell_in_canvas(p: Point, canvas_from_world: SE2): Rect {
  return apply_to_rect(canvas_from_world, { p, sz: { x: 1, y: 1 } });
}

export const BUBBLE_FONT_SIZE = 12;


export function drawBubble(
  d: CanvasRenderingContext2D,
  text: string,
  textCenter: Point,
  coneApex: Point,
  progress: number | undefined = undefined,
): void {
  if (progress !== undefined && progress > 1)
    return;
  const lines = text.split('\n');
  if (progress !== undefined) {
    lines.push('');
  }
  d.font = `${BUBBLE_FONT_SIZE}px sans-serif`;
  const maxWidth = Math.max(...lines.map(line => d.measureText(line).width));
  drawBubbleAux(d, lines, textCenter, coneApex, maxWidth, progress);
}

export function drawBubbleAux(
  d: CanvasRenderingContext2D,
  lines: string[],
  textCenter: Point,
  coneApex: Point,
  maxWidth: number,
  _progress: number | undefined = undefined,
): void {
  d.font = `${BUBBLE_FONT_SIZE}px sans-serif`;
  const MARGIN = 8;
  const RADIUS = 5;

  function bubble(color: string, thick: number): void {
    d.fillStyle = color;
    d.strokeStyle = color;
    d.lineWidth = thick;
    d.beginPath();

    d.roundRect(textCenter.x - maxWidth / 2 - MARGIN, textCenter.y - BUBBLE_FONT_SIZE / 2 - MARGIN,
      maxWidth + MARGIN * 2, BUBBLE_FONT_SIZE * lines.length + MARGIN * 2, RADIUS);

    const OFFSET = textCenter.y < coneApex.y ? 10 : -10;
    d.moveTo(textCenter.x - OFFSET, textCenter.y);
    d.lineTo(textCenter.x + OFFSET, textCenter.y);
    d.lineTo(coneApex.x, coneApex.y);
    d.lineTo(textCenter.x - OFFSET, textCenter.y);

    d.fill();
    if (thick != 0)
      d.stroke();
  }
  bubble('black', 2);
  bubble('white', 0);

  d.fillStyle = 'black';
  d.textAlign = 'center';
  d.textBaseline = 'middle';

  for (let i = 0; i < lines.length; i++) {
    d.fillText(lines[i], textCenter.x, textCenter.y + i * BUBBLE_FONT_SIZE);
  }
}

export function textCenterOfBubble(canvas_from_world: SE2, p_in_world_int: Point): Point {
  return vadd({ x: -24, y: -24 }, apply(canvas_from_world, vadd(p_in_world_int, { x: 0.4, y: 0 })));
}

export function apexOfBubble(canvas_from_world: SE2, p_in_world_int: Point): Point {
  return apply(canvas_from_world, vadd(p_in_world_int, { x: 0.4, y: 0.4 }));
}
