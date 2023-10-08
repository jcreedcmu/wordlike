import { compose, ident, SE2, translate } from '../util/se2';
import { vsub } from '../util/vutil';
import { GameState, MouseState } from '../core/state';
import { Point } from '../util/types';

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
