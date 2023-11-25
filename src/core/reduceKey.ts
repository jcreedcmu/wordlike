import { getWidgetPoint } from "../ui/widget-helpers";
import { debugTiles } from "../util/debug";
import { produce } from "../util/produce";
import { tryKillTileOfState } from "./kill-helpers";
import { getScore, incrementScore, setScore } from "./scoring";
import { GameState } from "./state";
import { addWorldTiles, checkValid, drawOfState, dropTopHandTile, withCoreState } from "./state-helpers";
import { removeAllTiles } from "./tile-helpers";
import { dynamiteIntent, reduceToolSelect } from "./tools";

export function reduceKey(state: GameState, code: string): GameState {
  switch (code) {
    case '<space>': {
      return withCoreState(state, cs => drawOfState(cs));
    }
    case '`':  // fallthrough intentional
    case '/': {
      const ms = state.mouseState;
      if (ms.t == 'drag_tile' && state.coreState.selected) {
        const flippedMs = produce(ms, mss => { mss.flipped = !mss.flipped; });
        return produce(state, s => { s.mouseState = flippedMs; });
      }
      return state;
    }
    case 'k': {
      return withCoreState(state, cs => tryKillTileOfState(cs, getWidgetPoint(cs, state.mouseState.p_in_canvas), dynamiteIntent));
    }
    case 'a': {
      return dropTopHandTile(state);
    }
    case 'S-d': {
      return withCoreState(state, cs => checkValid(produce(addWorldTiles(removeAllTiles(cs), debugTiles()), s => {
        setScore(s, 1000);
        s.inventory.bombs = 15;
        s.inventory.vowels = 15;
        s.inventory.consonants = 15;
        s.inventory.copies = 15;
      })));
    }
    case 'S-s': {
      return withCoreState(state, cs => checkValid(produce(cs, s => {
        incrementScore(s, 90);
      })));
    }
    case 'S-g': {
      return withCoreState(state, cs => produce(cs, s => {
        s.renderToGl = !s.renderToGl;
      }));
    }

    // Tool shortcuts
    case '<esc>': {
      return withCoreState(state, cs => produce(cs, s => {
        s.currentTool = 'pointer';
      }));
    }
    case 'b': {
      if (state.coreState.inventory.bombs >= 1) {
        return withCoreState(state, cs => produce(cs, s => {
          s.currentTool = 'bomb';
        }));
      }
    } break;
    case 'd': {
      if (getScore(state.coreState) >= 1) {
        return withCoreState(state, cs => produce(cs, s => {
          s.currentTool = 'dynamite';
        }));
      }
    } break;
    case 'v': {
      if (state.coreState.inventory.vowels >= 1) {
        return withCoreState(state, cs => reduceToolSelect(cs, 'vowel'));
      }
    } break;
    case 'c': {
      if (state.coreState.inventory.consonants >= 1) {
        return withCoreState(state, cs => reduceToolSelect(cs, 'consonant'));
      }

    } break;
    case 'x': {
      if (state.coreState.inventory.copies >= 1) {
        return withCoreState(state, cs => reduceToolSelect(cs, 'copy'));
      }
    } break;
  }
  return state;
}
