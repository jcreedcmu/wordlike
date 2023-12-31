import { produce } from "../util/produce";
import { inverse } from "../util/se2";
import { apply_to_rect } from "../util/se2-extra";
import { boundRect, pointInRect } from "../util/util";
import { vadd, vsub } from "../util/vutil";
import { getCacheState } from "./cache-state";
import { updateChunkCacheMeta } from "./chunk";
import { Overlay, mkOverlay, overlayForEach, setOverlay } from "./layer";
import { CoreState, MouseState } from "./state";
import { getTileId, get_main_tiles } from "./tile-helpers";

export type SelectionOperation =
  | 'set'
  | 'union'
  | 'subtract'
  | 'intersection'
  ;

export type SelectionState = {
  overlay: Overlay<boolean>,
  selectedIds: string[],
};

export function resolveSelection(state: CoreState, ms: MouseState & { t: 'drag_selection' }): CoreState {
  const small_rect_in_canvas = boundRect([ms.orig_p, ms.p_in_canvas]);
  const small_rect_in_world = apply_to_rect(inverse(state.canvas_from_world), small_rect_in_canvas);
  const rect_in_world = {
    p: vsub(small_rect_in_world.p, { x: 1, y: 1 }),
    sz: vadd(small_rect_in_world.sz, { x: 1, y: 1 }),
  };
  const newSelectedIds =
    get_main_tiles(state)
      .filter(tile => pointInRect(tile.loc.p_in_world_int, rect_in_world))
      .map(tile => tile.id);
  const oldSelectedIds = state.selected == undefined ? [] : state.selected.selectedIds;

  const computedIds = evalSelectionOperation(ms.opn, oldSelectedIds, newSelectedIds);

  const selected: SelectionState = {
    overlay: mkOverlay(),
    selectedIds: computedIds,
  };

  computedIds.forEach(id => {
    const tile = getTileId(state, id);
    if (tile.loc.t == 'world') {
      setOverlay(selected.overlay, tile.loc.p_in_world_int, true);
    }
  });

  const realSelected = selected.selectedIds.length == 0 ? undefined : selected;
  return setSelected(state, realSelected);
}

function evalSelectionOperation(opn: SelectionOperation, a: string[], b: string[]): string[] {
  switch (opn) {
    case 'set': return b;
    case 'union': return [...new Set([...a, ...b])];
    case 'intersection': return a.filter(x => b.includes(x));
    case 'subtract': return a.filter(x => !b.includes(x));
  }
}

export function selectionOperationOfMods(mods: Set<string>): SelectionOperation {
  if (mods.has('shift') && mods.has('ctrl')) {
    return 'intersection';
  }
  if (mods.has('shift')) {
    return 'union';
  }
  if (mods.has('ctrl')) {
    return 'subtract';
  }
  return 'set';
}


export function setSelected(state: CoreState, sel: SelectionState | undefined): CoreState {
  getCacheState(state).selection.dirty = true;

  let cache = state._cachedTileChunkMap;

  if (state.selected) {
    overlayForEach(state.selected.overlay, p => {
      cache = updateChunkCacheMeta(cache, state, p, x => (x & (0xff & ~1)));
    });
  }

  if (sel) {
    overlayForEach(sel.overlay, p => {
      cache = updateChunkCacheMeta(cache, state, p, x => (x | 1));
    });
  }
  return produce(state, s => {
    s.selected = sel;
    s._cachedTileChunkMap = cache;
  });
}

export function deselect(state: CoreState): CoreState {
  return setSelected(state, undefined);
}
