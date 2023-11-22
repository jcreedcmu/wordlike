import { WidgetPoint } from '../ui/widget-helpers';
import { produce } from '../util/produce';
import { vm } from '../util/vutil';
import { GameState, TileEntity } from './state';
import { tryKillTileOfState } from './kill-helpers';
import { Tool, bombIntent, dynamiteIntent } from './tools';
import { SelectionOperation, selectionOperationOfMods } from './selection';
import { vacuous_down, deselect } from './reduce';

export type KillIntent =
  | { t: 'kill'; radius: number; cost: number; }
  | { t: 'bomb'; };

export type Intent =
  | { t: 'dragTile'; id: string; }
  | { t: 'vacuous'; }
  | { t: 'panWorld'; }
  | { t: 'startSelection'; opn: SelectionOperation; }
  | KillIntent
  ;

export function getIntentOfMouseDown(tool: Tool, wp: WidgetPoint, button: number, mods: Set<string>, hoverTile: TileEntity | undefined, hoverBlock: boolean, pinned: boolean): Intent {
  if (button == 2)
    return { t: 'panWorld' };

  switch (tool) {
    case 'pointer':
      if (hoverTile) {
        if (pinned)
          return { t: 'panWorld' };
        return { t: 'dragTile', id: hoverTile.id };
      }
      return { t: 'startSelection', opn: selectionOperationOfMods(mods) };
    case 'hand': return { t: 'panWorld' };
    case 'dynamite':
      if (hoverTile || hoverBlock) {
        return dynamiteIntent;
      }
      else {
        return { t: 'vacuous' };
      }
    case 'bomb':
      return bombIntent;
    case 'vowel': throw new Error(`shoudn't be able have vowel tool active`);
    case 'consonant': throw new Error(`shoudn't be able have consonant tool active`);
  }
}

export function reduceIntent(state: GameState, intent: Intent, wp: WidgetPoint): GameState {
  switch (intent.t) {
    case 'dragTile':
      if (wp.t != 'world' && wp.t != 'hand') return vacuous_down(state, wp);
      const p_in_world_int = vm(wp.p_in_local, Math.floor);
      let state2 = state;
      if (state.coreState.selected) {
        // If we start dragging a tile not in the selection, we should deselect it first
        if (!state.coreState.selected.selectedIds.includes(intent.id)) {
          state2 = deselect(state);
        }
      }
      return produce(state2, s => {
        s.mouseState = {
          t: 'drag_tile',
          orig_loc: { t: 'world', p_in_world_int },
          id: intent.id,
          orig_p_in_canvas: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
        };
      });
    case 'vacuous': return vacuous_down(state, wp);
    case 'panWorld':
      if (wp.t != 'world') return vacuous_down(state, wp);
      return produce(state, s => {
        s.mouseState = {
          t: 'drag_world',
          orig_p: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
        };
      });
    case 'kill': return tryKillTileOfState(vacuous_down(state, wp), wp, intent);
    case 'bomb': return tryKillTileOfState(vacuous_down(state, wp), wp, intent);
    case 'startSelection':
      if (wp.t != 'world') return vacuous_down(state, wp);
      return produce(state, s => {
        s.mouseState = {
          t: 'drag_selection',
          orig_p: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
          opn: intent.opn,
        };
      });
  }
}
