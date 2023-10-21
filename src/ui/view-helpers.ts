import { apply, compose, ident, inverse, SE2, translate } from '../util/se2';
import { vm, vsub } from '../util/vutil';
import { GameState, MouseState } from '../core/state';
import { Point } from '../util/types';
import { getWidgetPoint } from './widget-helpers';
import { matchScale } from '../util/se2-extra';

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
    state.canvas_from_world);
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
export function canvas_from_drag_tile(state: GameState, ms: MouseState): SE2 {
  switch (ms.t) {
    case 'drag_tile':
      const wp0 = getWidgetPoint(state, ms.orig_p_in_canvas);
      const wp1 = getWidgetPoint(state, ms.p_in_canvas);
      const local1_from_canvas = wp1.local_from_canvas;
      const local0_from_tile0 = translate(vm(wp0.p_in_local, Math.floor));
      const tile0_from_canvas = compose(inverse(local0_from_tile0), wp0.local_from_canvas);
      const canvas_from_tile1 = inverse(matchScale(local1_from_canvas, wp1.p_in_canvas, apply(tile0_from_canvas, wp0.p_in_canvas)));
      return canvas_from_tile1;
      break;
    default: return ident();
  }
}

export function tile_from_drag_tile(state: GameState, ms: MouseState): SE2 {
  switch (ms.t) {
    case 'drag_tile':
      const wp0 = getWidgetPoint(state, ms.orig_p_in_canvas);
      const local0_from_tile0 = translate(vm(wp0.p_in_local, Math.floor));
      const tile0_from_canvas = compose(inverse(local0_from_tile0), wp0.local_from_canvas);
      return compose(tile0_from_canvas, canvas_from_drag_tile(state, ms));
      break;
    default: return ident();
  }
}
