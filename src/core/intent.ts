import { WidgetPoint } from '../ui/widget-helpers';
import { produce } from '../util/produce';
import { Point } from '../util/types';
import { vm } from '../util/vutil';
import { Bonus } from './bonus';
import { tryKillTileOfState } from './kill-helpers';
import { vacuous_down } from './low-actions';
import { SelectionOperation, deselect, selectionOperationOfMods } from './selection';
import { CacheUpdate, GameState } from './state';
import { checkValid, drawSpecific, withCoreState } from './state-helpers';
import { CellContents, getMobileLoc, mobileAtPoint } from './tile-helpers';
import { Tool, bombIntent, copyIntent, dynamiteIntent, magnifyIntent } from './tools';
import { updateFogOfWarAtPoint } from './fog-of-war';
import { getOverlay } from './layer';
import { MobileId } from './tile-id-helpers';

export type KillIntent =
  | { t: 'kill', radius: number }
  | { t: 'bomb' }
  | { t: 'fillWater' }
  ;

export type Intent =
  | { t: 'dragMobile', id: MobileId }
  | { t: 'vacuous' }
  | { t: 'panWorld' }
  | { t: 'exchangeMobiles', id: MobileId }
  | { t: 'startSelection', opn: SelectionOperation }
  | { t: 'copy' }
  | { t: 'magnify' }
  | KillIntent
  ;

function dynamiteableCell(cell: CellContents): boolean {
  return cell.t == 'mobile' || (cell.t == 'bonus' && killableBonus(dynamiteIntent, cell.bonus));
}

export function killableBonus(intent: KillIntent, bonus: Bonus): boolean {
  switch (intent.t) {
    case 'fillWater':
      return !(bonus.t == 'required' || bonus.t == 'empty');
    case 'kill':
    case 'bomb':
      return !(bonus.t == 'water' || bonus.t == 'required' || bonus.t == 'empty');
  }

}

export function getIntentOfMouseDown(tool: Tool, button: number, mods: Set<string>, hoverCell: CellContents, pinned: boolean): Intent {
  if (button == 2 || button == 4)
    return { t: 'panWorld' };

  switch (tool) {
    case 'pointer':
      if (hoverCell.t == 'mobile') {
        const hoverMobile = hoverCell.mobile;
        if (pinned)
          return { t: 'panWorld' };
        if (mods.has('meta')) {
          return { t: 'exchangeMobiles', id: hoverMobile.id };
        }
        else {
          return { t: 'dragMobile', id: hoverMobile.id };
        }
      }
      return { t: 'startSelection', opn: selectionOperationOfMods(mods) };
    case 'hand': return { t: 'panWorld' };
    case 'dynamite':
      if (dynamiteableCell(hoverCell)) {
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
    case 'magnifying-glass': return magnifyIntent;
  }
}

export function reduceIntent(state: GameState, intent: Intent, wp: WidgetPoint): GameState {

  switch (intent.t) {
    case 'dragMobile': {
      const cs = state.coreState;
      if (wp.t != 'world' && wp.t != 'hand') return vacuous_down(state, wp);
      const p_in_world_int = vm(wp.p_in_local, Math.floor);
      let state2 = state;
      const sel = cs.selected;

      // toErase is needed for the GL board rendering cache.
      // We're erasing any tiles that are "picked up".
      // If a selection is active *and* the tile we clicked on is in the selection,
      // then we're dragging all the selected tiles. Otherwise we're dragging the clicked tile.
      const toErase: Point[] = sel && sel.selectedIds.includes(intent.id)
        ? sel.selectedIds.map(id => {
          const loc = getMobileLoc(cs, id);
          if (loc.t !== 'world')
            throw new Error('selected nonworld tile');
          return loc.p_in_world_int;
        })
        : [p_in_world_int];
      const cacheUpdates: CacheUpdate[] = toErase.map(p_in_world_int => ({ p_in_world_int, chunkUpdate: { t: 'removeMobile' } }));

      if (sel) {
        // If we start dragging a tile not in the selection, we should deselect it first
        if (!sel.selectedIds.includes(intent.id)) {
          state2 = withCoreState(state, cs => deselect(cs));
        }
      }
      return produce(state2, s => {
        s.coreState._cacheUpdateQueue.push(...cacheUpdates);
        s.mouseState = {
          t: 'drag_mobile',
          orig_loc: { t: 'world', p_in_world_int },
          id: intent.id,
          orig_p_in_canvas: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
          flipped: false,
        };
      });
    }
    case 'exchangeMobiles': {
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
    case 'fillWater': return withCoreState(vacuous_down(state, wp), cs => tryKillTileOfState(cs, wp, intent));
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
        const hoverMobile = mobileAtPoint(state.coreState, wp.p_in_local);
        if (hoverMobile == undefined)
          return state;
        if (hoverMobile.t != 'tile')
          return state;
        const res = drawSpecific(state.coreState, hoverMobile.letter);
        if (res == undefined)
          return state;
        let newCs = produce(deselect(res.cs), s => {
          s.slowState.inventory.copies--;
        });
        return produce(state, s => {
          s.coreState = checkValid(newCs);
          s.mouseState = {
            t: 'drag_mobile',
            orig_loc: { t: 'hand', index: 0 }, // XXX: Seems like this orig_loc being wrong is harmless?
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
    case 'magnify': {
      if (wp.t != 'world')
        return vacuous_down(state, wp);
      if (state.coreState.slowState.inventory.glasses <= 0)
        return vacuous_down(state, wp);

      const p_in_world_int = vm(wp.p_in_local, Math.floor);

      if (!getOverlay(state.coreState.seen_cells, p_in_world_int))
        return vacuous_down(state, wp);

      let cs = state.coreState;
      cs = produce(cs, cs => { cs.slowState.inventory.glasses--; });
      if (cs.slowState.inventory.glasses <= 0) {
        cs = produce(cs, cs => { cs.slowState.currentTool = 'pointer'; });
      }
      cs = updateFogOfWarAtPoint(cs, p_in_world_int, 5.5);
      return produce(state, s => { s.coreState = cs; });
    }
  }
}
