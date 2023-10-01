import { produce } from '../util/produce';
import { compose, ident, SE2, translate } from '../util/se2';
import { vsub } from '../util/vutil';
import { Action, Effect, GameState, MouseState, SceneState } from './model';
import { eph_canvas_from_canvas_of_mouse_state } from './view_helpers';


function resolveDrag(state: GameState): GameState {
  return produce(state, s => {
    if (s.mouseState.t == 'down') {
      s.canvas_from_world = compose(eph_canvas_from_canvas_of_mouse_state(s.mouseState), s.canvas_from_world);
      s.mouseState = { t: 'up' };
    }
  });
}

export function reduceGameAction(state: GameState, action: Action): [GameState, Effect[]] {
  switch (action.t) {
    case 'key': return [state, []];
    case 'none': return [state, []];
    case 'mouseDown': return [produce(state, s => { s.mouseState = { t: 'down', orig_p: action.p, p: action.p } }), []];
    case 'mouseUp': return [resolveDrag(state), []];
    case 'mouseMove': return [produce(state, s => {
      if (s.mouseState.t == 'down') {
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
