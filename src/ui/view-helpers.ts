import { compose, ident, SE2, translate } from '../util/se2';
import { vsub } from '../util/vutil';
import { GameState, MouseState } from '../core/state';
import { Point } from '../util/types';

export function eph_canvas_from_canvas_of_mouse_state(state: MouseState): SE2 {
  if (state.t == 'drag_world') {
    return translate(vsub(state.p, state.orig_p));
  }
  else {
    return ident();
  }
}

export function eph_canvas_from_world_of_state(state: GameState): SE2 {
  return compose(eph_canvas_from_canvas_of_mouse_state(state.mouseState),
    state.canvas_from_world);
}

export function eph_tile_canvas_from_tile_canvas_of_mouse_state(state: MouseState): SE2 {
  return state.t == 'drag_main_tile' ? translate(vsub(state.p, state.orig_p)) : ident();
}
