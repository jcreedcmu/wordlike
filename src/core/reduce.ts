import * as effectful from '../ui/use-effectful-reducer';
import { canvas_from_drag_tile, pan_canvas_from_canvas_of_mouse_state } from '../ui/view-helpers';
import { WidgetPoint, canvas_from_hand, getWidgetPoint } from '../ui/widget-helpers';
import { debugTiles } from '../util/debug';
import { produce } from '../util/produce';
import { compose, composen, inverse, scale, translate } from '../util/se2';
import { apply_to_rect } from '../util/se2-extra';
import { Point } from '../util/types';
import { boundRect, pointInRect } from '../util/util';
import { vadd, vequal, vm, vscale, vsub } from '../util/vutil';
import { Action, Effect, GameAction } from './action';
import { getPanicFraction } from './clock';
import { Overlay, mkOverlay, setOverlay } from './layer';
import { GameState, SceneState, SelectionState, mkGameSceneState } from './state';
import { addWorldTiles, checkValid, drawOfState, isOccupied, killTileOfState } from './state-helpers';
import { get_hand_tiles, get_main_tiles, putTileInHand, putTileInWorld, removeAllTiles } from "./tile-helpers";

function resolveMouseup(state: GameState): GameState {
  return produce(resolveMouseupInner(state), s => {
    s.mouseState = { t: 'up', p_in_canvas: state.mouseState.p_in_canvas };
  });
}

function resolveMouseupInner(state: GameState): GameState {
  const ms = state.mouseState;

  switch (ms.t) {
    case 'drag_selection': {
      const small_rect_in_canvas = boundRect([ms.orig_p, ms.p_in_canvas]);
      const small_rect_in_world = apply_to_rect(inverse(state.canvas_from_world), small_rect_in_canvas);
      const rect_in_world = {
        p: vsub(small_rect_in_world.p, { x: 1, y: 1 }),
        sz: vadd(small_rect_in_world.sz, { x: 1, y: 1 }),
      };
      const selected: SelectionState = {
        overlay: mkOverlay(),
        selectedIds: []
      };
      get_main_tiles(state).forEach(tile => {
        if (pointInRect(tile.loc.p_in_world_int, rect_in_world)) {
          setOverlay(selected.overlay, tile.loc.p_in_world_int, true);
          selected.selectedIds.push(tile.id);
        }
      });
      return produce(state, s => {
        s.selected = selected;
      });
    }
    case 'drag_world': {

      const new_canvas_from_world = compose(pan_canvas_from_canvas_of_mouse_state(ms), state.canvas_from_world);

      return produce(state, s => {
        s.canvas_from_world = new_canvas_from_world;
      });
    }

    case 'drag_tile': {

      const wp = getWidgetPoint(state, ms.p_in_canvas);
      if (wp.t == 'world') {
        // effectively the same as the purely translational world_from_tile
        const new_tile_in_world_int: Point = vm(compose(
          inverse(state.canvas_from_world),
          canvas_from_drag_tile(state, state.mouseState)).translate,
          Math.round);

        const afterDrop = !isOccupied(state, new_tile_in_world_int)
          ? putTileInWorld(state, ms.id, new_tile_in_world_int)
          : state;

        return checkValid(afterDrop);
      }
      else {
        // effectively the same as the purely translational hand_from_tile
        const new_tile_in_hand_int: Point = vm(compose(
          inverse(canvas_from_hand()),
          canvas_from_drag_tile(state, state.mouseState)).translate,
          Math.round);

        return ms.orig_loc.t == 'world'
          ? checkValid(putTileInHand(state, ms.id, new_tile_in_hand_int.y))
          : state;
      }

    }


    case 'up': return state; // no drag to resolve
    case 'down': return state;
  }
}

export function reduceMouseDown(state: GameState, wp: WidgetPoint, button: number, mods: Set<string>): GameState {

  function drag_world(): GameState {
    return produce(state, s => {
      s.mouseState = {
        t: 'drag_world',
        orig_p: wp.p_in_canvas,
        p_in_canvas: wp.p_in_canvas,
      }
    });
  }

  function deselect(state: GameState): GameState {
    return produce(state, s => { s.selected = undefined; });
  }

  function vacuous_down(): GameState {
    return produce(state, s => { s.mouseState = { t: 'down', p_in_canvas: wp.p_in_canvas }; });
  }

  switch (wp.t) {
    case 'world': {
      if (mods.has('ctrl')) {
        return produce(deselect(state), s => {
          s.mouseState = {
            t: 'drag_selection',
            orig_p: wp.p_in_canvas,
            p_in_canvas: wp.p_in_canvas,
          }
        });
      }
      const p_in_world_int = vm(wp.p_in_local, Math.floor);
      if (button == 1) {
        let i = 0;

        for (const tile of get_main_tiles(state)) {
          if (vequal(p_in_world_int, tile.loc.p_in_world_int)) {
            if (vequal(p_in_world_int, { x: 0, y: 0 })) {
              return drag_world();
            }

            return produce(state, s => {
              s.mouseState = {
                t: 'drag_tile',
                orig_loc: { t: 'world', p_in_world_int },
                id: tile.id!,
                orig_p_in_canvas: wp.p_in_canvas,
                p_in_canvas: wp.p_in_canvas,
              }
            });
          }
          i++;
        }
        return deselect(drag_world());
      }
      else if (button == 2) {
        return deselect(drag_world());
      }
      else {
        return vacuous_down();
      }
    } break;

    case 'hand': {
      const p_in_hand_int = vm(wp.p_in_local, Math.floor);
      const tiles = get_hand_tiles(state);
      if (p_in_hand_int.x == 0 && p_in_hand_int.y >= 0 && p_in_hand_int.y < tiles.length) {
        return produce(state, s => {
          s.mouseState = {
            t: 'drag_tile',
            orig_loc: { t: 'hand', p_in_hand_int },
            id: tiles[p_in_hand_int.y].id,
            orig_p_in_canvas: wp.p_in_canvas,
            p_in_canvas: wp.p_in_canvas,
          }
        });
      }
      else
        return drawOfState(state);
    }
  }
}

export function reduceGameAction(state: GameState, action: GameAction): effectful.Result<SceneState, Effect> {
  function gs(state: GameState): effectful.Result<SceneState, Effect> {
    return { state: { t: 'game', gameState: state, revision: 0 }, effects: [] };
  }
  switch (action.t) {
    case 'key': {
      if (action.code == '<space>') {
        return gs(drawOfState(state));
      }
      if (action.code == 'k') {
        return gs(state.score > 0 ?
          killTileOfState(state, getWidgetPoint(state, state.mouseState.p_in_canvas)) : state);
      }
      if (action.code == 'd') {
        return gs(checkValid(addWorldTiles(removeAllTiles(state), debugTiles())));
      }
      return gs(state);
    }
    case 'none': return gs(state);
    case 'wheel': {
      const sf = action.delta < 0 ? 1.1 : 1 / 1.1;
      const zoomed_canvas_of_unzoomed_canvas = composen(
        translate(action.p),
        scale({ x: sf, y: sf }),
        translate(vscale(action.p, -1)),
      );
      return gs(produce(state, s => {
        s.canvas_from_world = compose(zoomed_canvas_of_unzoomed_canvas, s.canvas_from_world);
      }));
    }
    case 'mouseDown': {
      return gs(reduceMouseDown(state, getWidgetPoint(state, action.p), action.button, action.mods));
    }
    case 'mouseUp': return gs(resolveMouseup(state));
    case 'mouseMove': return gs(produce(state, s => {
      s.mouseState.p_in_canvas = action.p;
    }));
    case 'repaint':
      if (state.panic !== undefined) {
        if (getPanicFraction(state.panic) > 1) {
          return { state: { t: 'menu' }, effects: [] };
        }
        return gs(produce(state, s => { s.panic!.currentTime = Date.now(); }));
      }
      else {
        return gs(state);
      }
  }
}

export function reduce(scState: SceneState, action: Action): effectful.Result<SceneState, Effect> {
  switch (action.t) {
    case 'resize': return { state: scState, effects: [] }; // XXX maybe stash viewdata this in state somewhere?
    case 'newGame':
      return { state: mkGameSceneState(Date.now()), effects: [] };
    case 'setSceneState':
      return { state: action.state, effects: [] };
    default:
      if (scState.t == 'game') {
        return reduceGameAction(scState.gameState, action);
      }
      else {
        return { state: scState, effects: [] };
      }
  }


}
