import { canvas_from_drag_tile, pan_canvas_from_canvas_of_mouse_state } from '../ui/view-helpers';
import { canvas_from_hand, getWidgetPoint, WidgetPoint } from '../ui/widget-helpers';
import { produce } from '../util/produce';
import { compose, composen, inverse, scale, translate } from '../util/se2';
import { Point } from '../util/types';
import { vequal, vm, vscale } from '../util/vutil';
import { Action, Effect, GameState, SceneState } from './state';
import { checkAllWords, is_occupied, killTileOfState, drawOfState } from './state-helpers';
import * as effectful from '../ui/use-effectful-reducer';

function resolveDrag(state: GameState): GameState {
  const ms = state.mouseState;
  switch (ms.t) {
    case 'drag_world': {

      const new_canvas_from_world = compose(pan_canvas_from_canvas_of_mouse_state(state.mouseState), state.canvas_from_world);

      return produce(state, s => {
        s.canvas_from_world = new_canvas_from_world;
        s.mouseState = { t: 'up', p: ms.p };
      });
    } break;

    case 'drag_main_tile': {

      const wp = getWidgetPoint(state, ms.p);
      if (wp.t == 'world') {
        // effectively the same as the purely translational world_from_tile
        const new_tile_in_world_int: Point = vm(compose(
          inverse(state.canvas_from_world),
          canvas_from_drag_tile(state)).translate,
          Math.round);

        const afterDrop = produce(state, s => {
          if (!is_occupied(state, new_tile_in_world_int)) {
            s.main_tiles[ms.ix].p_in_world_int = new_tile_in_world_int;
          }
          s.mouseState = { t: 'up', p: ms.p };
        });
        return checkAllWords(afterDrop);
      }
      else {
        // effectively the same as the purely translational hand_from_tile
        const new_tile_in_hand_int: Point = vm(compose(
          inverse(canvas_from_hand()),
          canvas_from_drag_tile(state)).translate,
          Math.round);

        const tile = state.main_tiles[ms.ix];
        const afterDrop = produce(state, s => {
          s.main_tiles.splice(ms.ix, 1);
          s.hand_tiles.splice(new_tile_in_hand_int.y, 0, tile);
          s.mouseState = { t: 'up', p: ms.p };
        });
        return checkAllWords(afterDrop);
      }

    } break;
    case 'up': {
      throw new Error(`unexpected resolveDrag with up mouse button`);
    } break;


    case 'drag_hand_tile': {

      const wp = getWidgetPoint(state, ms.p);
      if (wp.t == 'world') {
        // effectively the same as the purely translational world_from_tile
        const new_tile_in_world_int: Point = vm(compose(
          inverse(state.canvas_from_world),
          canvas_from_drag_tile(state)).translate,
          Math.round);

        const tile = state.hand_tiles[ms.ix];
        const afterDrop = produce(state, s => {
          if (!is_occupied(state, new_tile_in_world_int)) {
            s.hand_tiles.splice(ms.ix, 1);
            s.main_tiles.push({ ...tile, p_in_world_int: new_tile_in_world_int })
          }
          s.mouseState = { t: 'up', p: ms.p };
        });
        return checkAllWords(afterDrop);
      }
      else {
        return produce(state, s => {
          s.mouseState = { t: 'up', p: ms.p };
        });
      }
    }
  }
}

export function reduceMouseDown(state: GameState, wp: WidgetPoint): GameState {
  switch (wp.t) {
    case 'world': {
      const p_in_world_int = vm(wp.p_in_local, Math.floor);

      let i = 0;
      for (const tile of state.main_tiles) {
        if (vequal(p_in_world_int, tile.p_in_world_int)) {
          return produce(state, s => {
            s.mouseState = {
              t: 'drag_main_tile',
              ix: i,
              orig_p: wp.p_in_canvas,
              p: wp.p_in_canvas,
            }
          });
        }
        i++;
      }

      return produce(state, s => {
        s.mouseState = {
          t: 'drag_world',
          orig_p: wp.p_in_canvas,
          p: wp.p_in_canvas,
        }
      });
    } break;

    case 'hand': {
      const p_in_hand_int = vm(wp.p_in_local, Math.floor);

      if (p_in_hand_int.x == 0 && p_in_hand_int.y >= 0 && p_in_hand_int.y < state.hand_tiles.length) {
        return produce(state, s => {
          s.mouseState = {
            t: 'drag_hand_tile',
            ix: p_in_hand_int.y,
            orig_p: wp.p_in_canvas,
            p: wp.p_in_canvas,
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
        return [drawOfState(state), []];
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
      return [reduceMouseDown(state, getWidgetPoint(state, action.p)), []]
    }
    case 'mouseUp': return [resolveDrag(state), []];
    case 'mouseMove': return [produce(state, s => {
      s.mouseState.p = action.p;
    }), []];
    case 'resize': return [state, []]; // XXX maybe stash viewdata this in state somewhere?
  }
}

export function reduce(state: SceneState, action: Action): effectful.Result<SceneState, Effect> {
  switch (state.t) {
    case 'game':
      const [gs, effects] = reduceGameAction(state.gameState, action);
      return { state: produce(state, s => { s.gameState = gs; }), effects };
  }

}
