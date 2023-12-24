import * as effectful from '../ui/use-effectful-reducer';
import { Action, Effect } from './action';
import { getLowActions, resolveLowActions } from './low-actions';
import { SceneState, mkGameSceneState } from './state';


export function keyCaptured(keyCode: string): boolean {
  switch (keyCode) {
    case 'C-S-i': return false;
    case 'C-S-r': return false;
    case 'C-r': return false;
    default: return true;
  }
}

export function reduce(scState: SceneState, action: Action): effectful.Result<SceneState, Effect> {
  switch (action.t) {
    case 'resize': return { state: scState, effects: [] }; // XXX maybe stash viewdata this in state somewhere?
    case 'newGame':
      return {
        state: mkGameSceneState(Date.now(), action.creative ?? false, Date.now()), effects: [],
      };
    case 'setSceneState':
      return { state: action.state, effects: [] };
    default:
      if (scState.t == 'game') {
        const state = resolveLowActions(scState, getLowActions(scState.gameState, action));
        return { state, effects: [] };
      }
      else {
        return { state: scState, effects: [] };
      }
  }

}
