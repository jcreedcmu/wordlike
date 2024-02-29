import { ButtonBarButton } from '../layout/button-bar';
import { produce } from '../util/produce';
import { GameLowAction } from './action';
import { CoreState } from './state';

export const globalActionQueue: GameLowAction[] = [];

export function handleButtonBarButton(state: CoreState, button: ButtonBarButton): CoreState {
  switch (button) {
    case 'bugReport': return produce(state, s => { s.modals = { bugReport: { data: JSON.stringify({ state, actions: globalActionQueue }) } } });
    case 'settings': return produce(state, s => { s.modals = { settings: {} } });
  }
}
