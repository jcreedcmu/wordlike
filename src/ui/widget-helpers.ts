import { CoreState, Location } from "../core/state";
import { ResbarResource, Tool, getCurrentResources, getCurrentTools } from "../core/tools";
import { SE2, apply, inverse } from "../util/se2";
import { Point, Rect } from "../util/types";
import { lerp, pointInRect } from "../util/util";
import { vint } from "../util/vutil";
import { DEFAULT_TILE_SCALE, PANIC_THICK, canvas_bds_in_canvas, TOOLBAR_WIDTH, toolbar_bds_in_canvas, resbar_bds_in_canvas } from "./widget-constants";
import { panic_bds_in_canvas, rects, hand_tile_bds_in_canvas, hand_bds_in_canvas } from "./widget-layout";

export function rectOfPanic_in_canvas(panic_fraction: number): Rect {
  return {
    p: {
      x: panic_bds_in_canvas.p.x + lerp(0, panic_bds_in_canvas.sz.x, panic_fraction),
      y: panic_bds_in_canvas.p.y,
    },
    sz: {
      x: lerp(panic_bds_in_canvas.sz.x, 0, panic_fraction),
      y: PANIC_THICK,
    }
  };
}


export function effective_toolbar_bds_in_canvas(state: CoreState): Rect {
  const numTools = Math.max(5, getCurrentTools(state).length);
  return {
    p: { x: 0, y: 0 },
    sz: { x: TOOLBAR_WIDTH, y: Math.min(numTools * TOOLBAR_WIDTH, canvas_bds_in_canvas.sz.y) }
  }
}

export function effective_resbar_bds_in_canvas(state: CoreState): Rect {
  const numRes = getCurrentResources(state).length;
  return {
    p: { x: canvas_bds_in_canvas.sz.x - TOOLBAR_WIDTH, y: 0 },
    sz: { x: TOOLBAR_WIDTH, y: Math.min(numRes * TOOLBAR_WIDTH, canvas_bds_in_canvas.sz.y) }
  }
}

export const pause_button_bds_in_canvas: Rect = rects['pause'];

export function canvas_from_hand(): SE2 {
  return {
    scale: { x: DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE },
    translate: hand_tile_bds_in_canvas.p,
  };
}

export function canvas_from_toolbar(): SE2 {
  return {
    scale: { x: 1, y: 1 },
    translate: toolbar_bds_in_canvas.p,
  };
}

export function canvas_from_resbar(): SE2 {
  return {
    scale: { x: 1, y: 1 },
    translate: resbar_bds_in_canvas.p,
  };
}

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

export function getWidgetPoint(state: CoreState, p_in_canvas: Point): WidgetPoint {
  const toolbar_bds = effective_toolbar_bds_in_canvas(state);
  const resbar_bds = effective_resbar_bds_in_canvas(state);
  if (pointInRect(p_in_canvas, pause_button_bds_in_canvas)) {
    return {
      t: 'pauseButton',
      p_in_canvas,
    };
  }
  else if (pointInRect(p_in_canvas, toolbar_bds)) {
    const toolbar_from_canvas = inverse(canvas_from_toolbar());
    const p_in_local = apply(toolbar_from_canvas, p_in_canvas);
    const tool = getCurrentTools(state)[Math.floor(p_in_local.y / toolbar_bds_in_canvas.sz.x)];
    return {
      t: 'toolbar',
      p_in_local,
      p_in_canvas,
      local_from_canvas: toolbar_from_canvas,
      tool: tool,
    }
  }
  else if (pointInRect(p_in_canvas, resbar_bds)) {
    const resbar_from_canvas = inverse(canvas_from_resbar());
    const p_in_local = apply(resbar_from_canvas, p_in_canvas);
    const res = getCurrentResources(state)[Math.floor(p_in_local.y / resbar_bds.sz.x)];
    return {
      t: 'resbar',
      p_in_local,
      p_in_canvas,
      local_from_canvas: resbar_from_canvas,
      res,
    }
  }
  else if (!pointInRect(p_in_canvas, canvas_bds_in_canvas)
    // The reason for the following exception is this: If we
    // drag *down* towards hand but then slip out of
    // the canvas, we actually want to consider that in-hand to make
    // quick drops into the hand more Fitt's-law convenient.
    //
    // What happens when the following condition is false is
    // that we fall through to getDragWidgetPoint, and its default
    // when not in world is to say the point is in hand.
    && p_in_canvas.y < canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y
  ) {
    return { t: 'nowhere', p_in_canvas };
  }
  else
    return getDragWidgetPoint(state, p_in_canvas);
}

export function getDragWidgetPoint(state: CoreState, p_in_canvas: Point): DragWidgetPoint {
  if (pointInRect(p_in_canvas, hand_bds_in_canvas) || !pointInRect(p_in_canvas, canvas_bds_in_canvas)) {
    const p_in_local = apply(inverse(canvas_from_hand()), p_in_canvas);
    const p_in_hand_int = vint(p_in_local);
    const index = p_in_hand_int.x;
    const indexValid = p_in_hand_int.y == 0;
    return {
      t: 'hand',
      p_in_local,
      p_in_canvas,
      local_from_canvas: inverse(canvas_from_hand()),
      index,
      indexValid,
    };
  }
  else {
    return {
      t: 'world',
      p_in_local: apply(inverse(state.canvas_from_world), p_in_canvas),
      p_in_canvas,
      local_from_canvas: inverse(state.canvas_from_world),
    };
  }
}

export function locationOfWidgetPoint(wp: WidgetPoint): Location {
  switch (wp.t) {
    case 'world': return { t: 'world', p_in_world_int: vint(wp.p_in_local) };
    case 'hand': return wp.indexValid ? { t: 'hand', index: wp.index } : { t: 'nowhere' };
    case 'toolbar': return { t: 'nowhere' };
    case 'resbar': return { t: 'nowhere' };
    case 'pauseButton': return { t: 'nowhere' };
    case 'nowhere': return { t: 'nowhere' };
  }
}
