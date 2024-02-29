import { SE2 } from "../util/se2";
import { Point } from "../util/types";
import { vint } from "../util/vutil";
import { Location } from "./state-types";
import { ResbarResource, Tool } from "./tool-types";

export type ViewData = {
  wsize: Point,
};

// The crucial thing about DragWidgetPoint is that it must define the
// field p_in_local. Semantically it is a potentially valid drag
// target.
export type DragWidgetPoint =
  | { t: 'world', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2 }

  | {
    t: 'hand',
    p_in_local: Point,
    p_in_canvas: Point,
    local_from_canvas: SE2,
    // When indexValid is false, it means the point was not precisely over the area where tiles go.
    // Dropping tiles may prefer to tolerate this being false
    indexValid: boolean,
    // Effective index into hand tiles. The number *is* allowed to be
    // negative or beyond the last tile currently in the hand, so
    // callers should do their own clamping if necessary
    index: number
  }

export type WidgetPoint =
  | DragWidgetPoint
  | { t: 'toolbar', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2, tool: Tool }
  | { t: 'resbar', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2, res: ResbarResource }
  | { t: 'pauseButton', p_in_canvas: Point }
  | { t: 'bugReportButton', p_in_canvas: Point }
  | { t: 'nowhere', p_in_canvas: Point } // outside canvas bounds
  ;

export function locationOfWidgetPoint(wp: WidgetPoint): Location {
  switch (wp.t) {
    case 'world': return { t: 'world', p_in_world_int: vint(wp.p_in_local) };
    case 'hand': return wp.indexValid ? { t: 'hand', index: wp.index } : { t: 'nowhere' };
    case 'toolbar': return { t: 'nowhere' };
    case 'resbar': return { t: 'nowhere' };
    case 'pauseButton': return { t: 'nowhere' };
    case 'bugReportButton': return { t: 'nowhere' };
    case 'nowhere': return { t: 'nowhere' };
  }
}
