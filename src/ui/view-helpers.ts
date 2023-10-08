import { compose, ident, SE2, translate } from '../util/se2';
import { vsub } from '../util/vutil';
import { GameState, MouseState } from '../core/state';
import { Point } from '../util/types';
import { getWidgetPoint } from './widget-helpers';
import { matchScale } from '../util/se2-extra';

export function pan_canvas_from_canvas_of_mouse_state(state: MouseState): SE2 {
  if (state.t == 'drag_world') {
    return translate(vsub(state.p, state.orig_p));
  }
  else {
    return ident();
  }
}

export function pan_canvas_from_world_of_state(state: GameState): SE2 {
  return compose(pan_canvas_from_canvas_of_mouse_state(state.mouseState),
    state.canvas_from_world);
}

export function drag_canvas_from_canvas_of_mouse_state(state: MouseState): SE2 {
  return state.t == 'drag_main_tile' || state.t == 'drag_hand_tile' ? translate(vsub(state.p, state.orig_p)) : ident();
}

// XXX still a stub

// Given a mouse state that represents a dragged tile, what is the canvas_from_local for that tile
// in its currently dragged position?
//
// We know p0_in_canvas and p1_in_canvas
//
// If a tile is being dragged, we know
// getWidgetPoint(orig_p), call this p0_in_local0
// getWidgetPoint(p), call this      p1_in_local1
//
// we want the output transform, canvas_from_tile1, to have the property that
//
// tile1_from_canvas * p1_in_canvas = tile0_from_canvas * p0_in_canvas
//
// but it should have the same scale factor as canvas_from_local1

export function canvas_from_drag_tile(state: GameState): SE2 {
  const ms = state.mouseState;
  switch (ms.t) {
    case 'drag_main_tile':
      return ident();
      break;
    case 'drag_hand_tile':
      const wp0 = getWidgetPoint(state, ms.orig_p);
      const wp1 = getWidgetPoint(state, ms.p);
      return ident();
      break;
    default: return ident();
  }
}
