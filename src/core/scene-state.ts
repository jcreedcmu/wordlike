import { GameState } from './state';

// If I need to add more state around settings, menus, saving, etc.,
// it might go here.

export type SceneState = {
  t: 'game'; gameState: GameState;
  // NOTE: this is sort of unused for now, but I'm leaving it here
  // in case I need a finer-grained equality check on SceneState.
  // It's updated in reduce.ts.
  revision: number;
} |
{ t: 'menu'; } |
{ t: 'instructions'; page: number; };

export type State = {
  sceneState: SceneState;
};

export function mkSceneState(): SceneState {
  return { t: 'menu' };
}
