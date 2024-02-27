import { SE2 } from "../util/se2";
import { Point } from "../util/types";
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
  | { t: 'nowhere', p_in_canvas: Point } // outside canvas bounds
  ;
