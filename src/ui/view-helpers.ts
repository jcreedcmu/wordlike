import { apply, compose, ident, inverse, SE2, translate } from '../util/se2';
import { vm, vsub } from '../util/vutil';
import { CoreState, GameState, MouseState } from '../core/state';
import { Point, Rect } from '../util/types';
import { getDragWidgetPoint, getWidgetPoint } from './widget-helpers';
import { apply_to_rect, matchScale } from '../util/se2-extra';
import { drawWordBonusPanicBar } from './drawPanicBar';

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

export function drag_canvas_from_canvas_of_mouse_state(state: MouseState): SE2 {
  return state.t == 'drag_tile' ? translate(vsub(state.p_in_canvas, state.orig_p_in_canvas)) : ident();
}

// Given a mouse state that represents a dragged tile, what is the canvas_from_local for that tile
// in its currently dragged position?
//
// We know p0_in_canvas and p1_in_canvas
//
// If a tile is being dragged, we know
// getWidgetPoint(orig_p) = { p0_in_local0, local0_from_canvas }
// getWidgetPoint(p)      = { p1_in_local1, local1_from_canvas }
//
// we want the output transform, canvas_from_tile1, to be the inverse
// of tile1_from_canvas, which is the unique transform that has the property
//
// - tile1_from_canvas * p1_in_canvas = tile0_from_canvas * p0_in_canvas
// - tile1_from_canvas's scale factor is the same as that of local1_from_canvas
//
// tile is synonymous with tile0: it's the coordinate system of the tile before it was dragged
// drag_tile is synonymous with tile1: it's the coordinate system of the tile being dragged
export function canvas_from_drag_tile(state: CoreState, ms: MouseState): SE2 {
  switch (ms.t) {
    case 'drag_tile':
      const wp0 = getDragWidgetPoint(state, ms.orig_p_in_canvas);
      const wp1 = getDragWidgetPoint(state, ms.p_in_canvas);
      const local1_from_canvas = wp1.local_from_canvas;
      const local0_from_tile0 = translate(vm(wp0.p_in_local, Math.floor));
      const tile0_from_canvas = compose(inverse(local0_from_tile0), wp0.local_from_canvas);
      const canvas_from_tile1 = inverse(matchScale(local1_from_canvas, wp1.p_in_canvas, apply(tile0_from_canvas, wp0.p_in_canvas)));
      return canvas_from_tile1;
      break;
    default: return ident();
  }
}

export function cell_in_canvas(p: Point, canvas_from_world: SE2): Rect {
  return apply_to_rect(canvas_from_world, { p, sz: { x: 1, y: 1 } });
}

export function drawBubble(
  d: CanvasRenderingContext2D,
  text: string,
  textCenter: Point,
  coneApex: Point,
  progress: number | undefined = undefined
): void {
  if (progress !== undefined && progress > 1)
    return;
  const fontSize = 12;
  const lines = text.split('\n');
  if (progress !== undefined) {
    lines.push('');
  }
  d.font = `${fontSize}px sans-serif`;
  const maxWidth = Math.max(...lines.map(line => d.measureText(line).width));
  const MARGIN = 8;
  const RADIUS = 5;

  function bubble(color: string, thick: number): void {
    d.fillStyle = color;
    d.strokeStyle = color;
    d.lineWidth = thick;
    d.beginPath();

    d.roundRect(textCenter.x - maxWidth / 2 - MARGIN, textCenter.y - fontSize / 2 - MARGIN,
      maxWidth + MARGIN * 2, fontSize * lines.length + MARGIN * 2, RADIUS);

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
    d.fillText(lines[i], textCenter.x, textCenter.y + i * fontSize);
  }
  if (progress !== undefined) {
    const maxp = { x: textCenter.x + maxWidth / 2, y: textCenter.y - fontSize / 2 + fontSize * lines.length };
    const minp = { x: textCenter.x - maxWidth / 2, y: maxp.y - fontSize };
    minp.x = progress * maxp.x + (1 - progress) * minp.x;
    drawWordBonusPanicBar(d, { p: minp, sz: vsub(maxp, minp) }, progress);
  }
}
