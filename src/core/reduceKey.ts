import { canvas_bds_in_canvas, getWidgetPoint } from "../ui/widget-helpers";
import { midpointOfRect } from "../util/util";
import { GameLowAction } from "./action";
import { GameState } from "./state";

export function reduceKey(state: GameState, code: string): GameLowAction {
  switch (code) {
    case '=':  // fallthrough intentional
    case '+':
      if (state.mouseState.t == 'up') {
        return { t: 'zoom', center: state.mouseState.p_in_canvas, amount: -1 };
      }
      else
        return { t: 'zoom', center: midpointOfRect(canvas_bds_in_canvas), amount: -1 };
    case '-':
      if (state.mouseState.t == 'up') {
        return { t: 'zoom', center: state.mouseState.p_in_canvas, amount: 1 };
      }
      else
        return { t: 'zoom', center: midpointOfRect(canvas_bds_in_canvas), amount: 1 };
    case '<space>': return { t: 'drawTile' };
    case '`':  // fallthrough intentional
    case '/': return { t: 'flipOrientation' };
    case 'k': return { t: 'dynamiteTile', wp: getWidgetPoint(state.coreState, state.mouseState.p_in_canvas) }
    case 'a': return { t: 'dropTopHandTile' };
    case 'S-d': return { t: 'debug' };
    case 'S-f': return { t: 'debug2' };
    case 'S-m': return { t: 'addMob' };
    case 'S-s': return { t: 'incrementScore', amount: 90 };
    case 'S-g': return { t: 'toggleGl' };

    // Tool shortcuts
    case '<esc>': return { t: 'setTool', tool: 'pointer' }
    case 'b': return { t: 'setTool', tool: 'bomb' }
    case 'd': return { t: 'setTool', tool: 'dynamite' }
    case 'v': return { t: 'setTool', tool: 'vowel' }
    case 'c': return { t: 'setTool', tool: 'consonant' }
    case 'x': return { t: 'setTool', tool: 'copy' }
  }
  return { t: 'none' };
}
