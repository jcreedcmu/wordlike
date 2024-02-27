import { canvas_from_drag_mobile } from "./view-helpers";
import { getWidgetPoint } from "./widget-helpers";
import { compose, inverse } from '../util/se2';
import { Point } from "../util/types";
import { vm } from "../util/vutil";
import { resolveLandResult } from "../core/landing-resolve";
import { landMoveOnState } from "../core/landing-result";
import { CoreState, GameState } from "../core/state";
import { MouseState } from '../core/state-types';
import { get_hand_tiles } from "../core/tile-helpers";
import { pointFall, withCoreState, checkValid } from "../core/state-helpers";

export function tileFall(state: CoreState, ms: MouseState): Point {
  return vm(compose(
    inverse(state.canvas_from_world),
    canvas_from_drag_mobile(state, ms)).translate,
    Math.round);
}

export function dropTopHandTile(state: GameState): GameState {
  const cs = state.coreState;
  const handTiles = get_hand_tiles(cs);
  if (handTiles.length == 0) {
    return state;
  }
  const tile = handTiles[0];
  if (state.mouseState.t == 'up' && getWidgetPoint(cs, state.mouseState.p_in_canvas).t == 'world') {
    const p_in_world_int = pointFall(cs, state.mouseState.p_in_canvas);

    const lr = landMoveOnState({ src: { t: 'tile', letter: tile.letter }, p_in_world_int }, cs);
    if (lr.t != 'collision') {
      return withCoreState(state, cs => checkValid(resolveLandResult(cs, lr, { p_in_world_int, src: { t: 'mobile', id: tile.id } })));
    }
  }
  return state;
}
