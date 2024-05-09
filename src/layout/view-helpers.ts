import { apply, compose, ident, inverse, SE2, translate } from '../util/se2';
import { vm, vsub } from '../util/vutil';
import { CoreState, GameState } from '../core/state';
import { MouseState } from '../core/state-types';
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
    case 'drag_mobile': // fallthrough intentional
    case 'drag_world_resource':
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
