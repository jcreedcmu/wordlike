import { produce } from "../util/produce";
import { inverse } from "../util/se2";
import { apply_to_rect } from "../util/se2-extra";
import { boundRect, pointInRect } from "../util/util";
import { vadd, vsub } from "../util/vutil";
import { Overlay, mkOverlay, setOverlay } from "./layer";
import { CoreState, MouseState } from "./state";
import { get_main_tiles } from "./tile-helpers";

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
  const selected: SelectionState = {
    overlay: mkOverlay(),
    selectedIds: []
  };
  get_main_tiles(state).forEach(tile => {
    if (pointInRect(tile.loc.p_in_world_int, rect_in_world)) {
      setOverlay(selected.overlay, tile.loc.p_in_world_int, true);
      selected.selectedIds.push(tile.id);
    }
  });
  const realSelected = selected.selectedIds.length == 0 ? undefined : selected;
  return produce(state, s => {
    s.selected = realSelected;
  });
}
