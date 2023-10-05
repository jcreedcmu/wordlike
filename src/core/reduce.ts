import { produce } from '../util/produce';
import { apply, compose, ident, inverse, SE2, translate } from '../util/se2';
import { vequal, vm, vsub } from '../util/vutil';
import { Action, Effect, GameState, MouseState, SceneState } from './model';
import { eph_canvas_from_canvas_of_mouse_state, eph_tile_canvas_from_tile_canvas_of_mouse_state } from '../ui/view_helpers';
import { is_occupied } from './model_helpers';


function resolveDrag(state: GameState): GameState {
  return produce(state, s => {
    const ms = s.mouseState;
    switch (ms.t) {
      case 'drag_world': {
        s.canvas_from_world = compose(eph_canvas_from_canvas_of_mouse_state(s.mouseState), s.canvas_from_world);
        s.mouseState = { t: 'up' };
      } break;
      case 'drag_tile': {
        const new_tile_world_from_old_tile_world = compose(
          inverse(s.canvas_from_world),
          compose(
            eph_tile_canvas_from_tile_canvas_of_mouse_state(s.mouseState),
            s.canvas_from_world)
        );
        const new_tile_in_world_int =
          vm(apply(new_tile_world_from_old_tile_world, s.tiles[ms.ix].p_in_world_int), Math.round);

        if (!is_occupied(state, new_tile_in_world_int)) {
          s.tiles[ms.ix].p_in_world_int = new_tile_in_world_int;
        }
        s.mouseState = { t: 'up' };
      } break;
      case 'up': {
        throw new Error(`unexpected resolveDrag with up mouse button`);
      } break;
    }
  });
}

export function reduceGameAction(state: GameState, action: Action): [GameState, Effect[]] {
  switch (action.t) {
    case 'key': return [state, []];
    case 'none': return [state, []];
    case 'mouseDown': {
      const p_in_world_int = vm(apply(inverse(state.canvas_from_world), action.p), Math.floor);

      let i = 0;
      for (const tile of state.tiles) {
        if (vequal(p_in_world_int, tile.p_in_world_int)) {
          return [produce(state, s => { s.mouseState = { t: 'drag_tile', ix: i, orig_p: action.p, p: action.p } }), []];
        }
        i++;
      }

      return [produce(state, s => { s.mouseState = { t: 'drag_world', orig_p: action.p, p: action.p } }), []];
    }
    case 'mouseUp': return [resolveDrag(state), []];
    case 'mouseMove': return [produce(state, s => {
      if (s.mouseState.t == 'drag_world') {
        s.mouseState.p = action.p;
      }
      if (s.mouseState.t == 'drag_tile') {
        s.mouseState.p = action.p;
      }
    }), []];
  }
}

export function reduce(state: SceneState, action: Action): [SceneState, Effect[]] {
  switch (state.t) {
    case 'game':
      const [gs, effects] = reduceGameAction(state.gameState, action);
      return [produce(state, s => { s.gameState = gs; }), effects];
  }

}
