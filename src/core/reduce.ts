import { produce } from '../util/produce';
import { apply, compose, composen, ident, inverse, scale, SE2, translate } from '../util/se2';
import { vequal, vm, vmul, vscale, vsub } from '../util/vutil';
import { Action, Effect, GameState, MouseState, SceneState } from './state';
import { eph_canvas_from_canvas_of_mouse_state, eph_tile_canvas_from_tile_canvas_of_mouse_state } from '../ui/view-helpers';
import { checkAllWords, is_occupied, killTileOfState, peelOfState } from './state-helpers';
import { getWidgetPoint, WidgetPoint } from '../ui/widget-helpers';
import { Point } from '../util/types';


function resolveDrag(state: GameState): GameState {
  const ms = state.mouseState;
  switch (ms.t) {
    case 'drag_world': {

      const new_canvas_from_world = compose(eph_canvas_from_canvas_of_mouse_state(state.mouseState), state.canvas_from_world);

      return produce(state, s => {
        s.canvas_from_world = new_canvas_from_world;
        s.mouseState = { t: 'up', p: ms.p };
      });
    } break;
    case 'drag_main_tile': {

      const new_tile_world_from_old_tile_world = compose(
        inverse(state.canvas_from_world),
        compose(
          eph_tile_canvas_from_tile_canvas_of_mouse_state(state.mouseState),
          state.canvas_from_world)
      );
      const new_tile_in_world_int =
        vm(apply(new_tile_world_from_old_tile_world, state.main_tiles[ms.ix].p_in_world_int), Math.round);

      const afterDrop = produce(state, s => {
        if (!is_occupied(state, new_tile_in_world_int)) {
          s.main_tiles[ms.ix].p_in_world_int = new_tile_in_world_int;
        }
        s.mouseState = { t: 'up', p: ms.p };
      });

      return checkAllWords(afterDrop);
    } break;
    case 'up': {
      throw new Error(`unexpected resolveDrag with up mouse button`);
    } break;


    case 'drag_hand_tile': {
      return produce(state, s => {
        s.mouseState = { t: 'up', p: ms.p };
      });
    }
  }
}

export function reduceMouseDown(state: GameState, wp: WidgetPoint, p_in_canvas: Point): GameState {
  switch (wp.t) {
    case 'world': {
      const p_in_world_int = vm(wp.p, Math.floor);

      let i = 0;
      for (const tile of state.main_tiles) {
        if (vequal(p_in_world_int, tile.p_in_world_int)) {
          return produce(state, s => {
            s.mouseState = {
              t: 'drag_main_tile',
              ix: i,
              orig_p: p_in_canvas,
              p: p_in_canvas,
            }
          });
        }
        i++;
      }

      return produce(state, s => {
        s.mouseState = {
          t: 'drag_world',
          orig_p: p_in_canvas,
          p: p_in_canvas,
        }
      });
    } break;

    case 'hand': {
      const p_in_hand_int = vm(wp.p, Math.floor);

      if (p_in_hand_int.x == 0 && p_in_hand_int.y >= 0 && p_in_hand_int.y < state.hand_tiles.length) {
        return produce(state, s => {
          s.mouseState = {
            t: 'drag_hand_tile',
            ix: p_in_hand_int.y,
            orig_p: p_in_canvas,
            p: p_in_canvas,
          }
        });
      }
      else
        return state;
    }
  }
}

export function reduceGameAction(state: GameState, action: Action): [GameState, Effect[]] {
  switch (action.t) {
    case 'key': {
      if (action.code == '<space>') {
        return [peelOfState(state), []];
      }
      if (action.code == 'k') {
        return [killTileOfState(state), []];
      }
      return [state, []];
    }
    case 'none': return [state, []];
    case 'wheel': {
      const sf = action.delta < 0 ? 1.1 : 1 / 1.1;
      const zoomed_canvas_of_unzoomed_canvas = composen(
        translate(action.p),
        scale({ x: sf, y: sf }),
        translate(vscale(action.p, -1)),
      );
      return [produce(state, s => {
        s.canvas_from_world = compose(zoomed_canvas_of_unzoomed_canvas, s.canvas_from_world);
      }), []];
    }
    case 'mouseDown': {
      return [reduceMouseDown(state, getWidgetPoint(state, action.p), action.p), []]
    }
    case 'mouseUp': return [resolveDrag(state), []];
    case 'mouseMove': return [produce(state, s => {
      s.mouseState.p = action.p;
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
