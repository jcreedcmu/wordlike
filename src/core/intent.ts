import { WidgetPoint } from '../ui/widget-helpers';
import { produce } from '../util/produce';
import { vm } from '../util/vutil';
import { GameState, TileEntity } from './state';
import { tryKillTileOfState } from './kill-helpers';
import { Tool, bombIntent, copyIntent, dynamiteIntent } from './tools';
import { SelectionOperation, selectionOperationOfMods } from './selection';
import { vacuous_down, deselect } from './reduce';
import { checkValid, drawSpecific, withCoreState } from './state-helpers';
import { addHandTile, tileAtPoint } from './tile-helpers';

export type KillIntent =
  | { t: 'kill', radius: number, cost: number }
  | { t: 'bomb' };

export type Intent =
  | { t: 'dragTile', id: string }
  | { t: 'vacuous' }
  | { t: 'panWorld' }
  | { t: 'exchangeTiles', id: string }
  | { t: 'startSelection', opn: SelectionOperation }
  | { t: 'copy' }
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
        if (mods.has('meta')) {
          return { t: 'exchangeTiles', id: hoverTile.id };
        }
        else {
          return { t: 'dragTile', id: hoverTile.id };
        }
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
    case 'time': throw new Error(`shoudn't be able have time tool active`);
    case 'copy': return copyIntent;
  }
}

export function reduceIntent(state: GameState, intent: Intent, wp: WidgetPoint): GameState {
  switch (intent.t) {
    case 'dragTile': {
      if (wp.t != 'world' && wp.t != 'hand') return vacuous_down(state, wp);
      const p_in_world_int = vm(wp.p_in_local, Math.floor);
      let state2 = state;
      if (state.coreState.selected) {
        // If we start dragging a tile not in the selection, we should deselect it first
        if (!state.coreState.selected.selectedIds.includes(intent.id)) {
          state2 = withCoreState(state, cs => deselect(cs));
        }
      }
      return produce(state2, s => {
        s.mouseState = {
          t: 'drag_tile',
          orig_loc: { t: 'world', p_in_world_int },
          id: intent.id,
          orig_p_in_canvas: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
          flipped: false,
        };
      });
    }
    case 'exchangeTiles': {
      // FIXME: only works for world tiles right now
      if (wp.t != 'world') return vacuous_down(state, wp);
      const p_in_world_int = vm(wp.p_in_local, Math.floor);
      return produce(state, s => {
        s.mouseState = {
          t: 'exchange_tiles',
          orig_loc: { t: 'world', p_in_world_int },
          id: intent.id,
          orig_p_in_canvas: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
        };
      });
    }
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
    case 'kill': return withCoreState(vacuous_down(state, wp), cs => tryKillTileOfState(cs, wp, intent));
    case 'bomb': return withCoreState(vacuous_down(state, wp), cs => tryKillTileOfState(cs, wp, intent));
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
    case 'copy': {
      if (wp.t == 'world') {
        const hoverTile = tileAtPoint(state.coreState, wp.p_in_local);
        if (hoverTile == undefined)
          return state;
        const res = drawSpecific(state.coreState, hoverTile.letter);
        if (res == undefined)
          return state;
        res.cs = produce(res.cs, s => {
          s.selected = undefined;
          s.inventory.copies--;
        });
        return produce(state, s => {
          s.coreState = checkValid(res.cs);
          s.mouseState = {
            t: 'drag_tile',
            orig_loc: { t: 'hand', p_in_hand_int: { x: 0, y: 0 } }, // XXX: Seems like this orig_loc being wrong is harmless?
            id: res.newId,
            orig_p_in_canvas: wp.p_in_canvas,
            p_in_canvas: wp.p_in_canvas,
            flipped: false,
          };
        });

      }
      else {
        return state;
      }

    }
  }
}
