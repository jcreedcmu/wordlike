import * as effectful from '../ui/use-effectful-reducer';
import { produce } from '../util/produce';
import { Action } from './action';
import { Effect, SoundEffect } from './effect-types';
import { getLowAction, resolveLowAction } from './low-actions';
import { mkGameSceneState } from './mkGameState';
import { SceneState } from './scene-state';


export function keyCaptured(keyCode: string): boolean {
  switch (keyCode) {
    case 'C-S-i': return false;
    case 'C-S-r': return false;
    case 'C-r': return false;
    case 'C-l': return false;
    default: return true;
  }
}

function effectOfSoundEffect(se: SoundEffect): Effect {
  return { t: 'soundEffect', sound: se };
}

function extractEffects(state: SceneState): { cleanState: SceneState, effects: Effect[] } {
  switch (state.t) {
    case 'game': {
      const effects: Effect[] = state.gameState.coreState.soundEffects.map(effectOfSoundEffect);
      return { cleanState: { t: 'game', revision: 0, gameState: produce(state.gameState, s => { s.coreState.soundEffects = []; }) }, effects }
    }
    case 'menu': // fallthrough intentional
    case 'instructions':
      return { cleanState: state, effects: [] };
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

        const state = resolveLowAction(scState, getLowAction(scState.gameState, action));
        const { cleanState, effects } = extractEffects(state);
        return { state: cleanState, effects };
      }
      else {
        return { state: scState, effects: [] };
      }
  }

}
