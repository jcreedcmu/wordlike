import { CoreState, HAND_TILE_LIMIT } from "../core/state";
import { Tool, getCurrentTools } from "../core/tools";
import { SE2, apply, inverse } from "../util/se2";
import { Point, Rect } from "../util/types";
import { pointInRect } from "../util/util";
import { vint } from "../util/vutil";

export const HAND_WIDTH = 100;
export const HAND_MARGIN = 32;

export const canvas_bds_in_canvas: Rect = { p: { x: 0, y: 0 }, sz: { x: 1024, y: 768 } };
export const DEFAULT_TILE_SCALE = 48;

const hand_bds_length = HAND_TILE_LIMIT * DEFAULT_TILE_SCALE + 2 * HAND_MARGIN;

export const hand_bds_in_canvas: Rect = {
  p: {
    x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x / 2 - hand_bds_length / 2,
    y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - HAND_WIDTH
  },
  sz: {
    x: hand_bds_length,
    y: HAND_WIDTH,
  }
};

export const BAR_WIDTH = 64;
export const TOOLBAR_WIDTH = 52;

export const world_bds_in_canvas: Rect = {
  p: { x: 0, y: 0 },
  sz: { x: canvas_bds_in_canvas.sz.x, y: canvas_bds_in_canvas.sz.y }
};

// This gives a bound on what could possibly be in the toolbar
export const toolbar_bds_in_canvas: Rect = {
  p: { x: 0, y: 0 },
  sz: { x: TOOLBAR_WIDTH, y: canvas_bds_in_canvas.sz.y }
};

export function effective_toolbar_bds_in_canvas(state: CoreState): Rect {
  const numTools = Math.max(5, getCurrentTools(state).length);
  return {
    p: { x: 0, y: 0 },
    sz: { x: TOOLBAR_WIDTH, y: Math.min(numTools * TOOLBAR_WIDTH, canvas_bds_in_canvas.sz.y) }
  }
}

export const pause_button_bds_in_canvas: Rect = {
  p: { x: 0, y: canvas_bds_in_canvas.sz.y - TOOLBAR_WIDTH },
  sz: { x: TOOLBAR_WIDTH, y: TOOLBAR_WIDTH }
};

export const shuffle_button_bds_in_canvas: Rect = {
  p: {
    x: canvas_bds_in_canvas.sz.x - HAND_WIDTH,
    y: canvas_bds_in_canvas.sz.y - 1.9 * BAR_WIDTH - 10,
  },
  sz: { x: HAND_WIDTH, y: BAR_WIDTH }
};

export function canvas_from_hand(): SE2 {
  return {
    scale: { x: DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE },
    translate: { y: hand_bds_in_canvas.p.y + (HAND_WIDTH - DEFAULT_TILE_SCALE) / 2, x: hand_bds_in_canvas.p.x + HAND_MARGIN }
  };
}

export function canvas_from_toolbar(): SE2 {
  return {
    scale: { x: 1, y: 1 },
    translate: toolbar_bds_in_canvas.p,
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
    // index into hand tiles. When undefined, it means the point was not in the proper hand area at all
    // The number *is* allowed to be negative or beyond the last tile currently in the hand,
    // so callers should do their own clamping if necessary
    index: number | undefined
  }

export type WidgetPoint =
  | DragWidgetPoint
  | { t: 'toolbar', p_in_local: Point, p_in_canvas: Point, local_from_canvas: SE2, tool: Tool }
  | { t: 'pauseButton', p_in_canvas: Point }
  | { t: 'shuffleButton', p_in_canvas: Point }
  | { t: 'nowhere', p_in_canvas: Point } // outside canvas bounds
  ;

export function getWidgetPoint(state: CoreState, p_in_canvas: Point): WidgetPoint {
  if (pointInRect(p_in_canvas, pause_button_bds_in_canvas)) {
    return {
      t: 'pauseButton',
      p_in_canvas,
    };
  }
  if (pointInRect(p_in_canvas, shuffle_button_bds_in_canvas)) {
    return {
      t: 'shuffleButton',
      p_in_canvas,
    };
  }
  else if (pointInRect(p_in_canvas, toolbar_bds_in_canvas)) {
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
  else if (!pointInRect(p_in_canvas, canvas_bds_in_canvas)
    // The reason for the following exception is this: If we
    // drag to the *right* towards hand but then slip out of
    // the canvas, we actually want to consider that in-hand to make
    // quick drops into the hand more Fitt's-law convenient.
    //
    // What happens when p_in_canvas.x >= hand_bds_in_canvas.p.x is
    // that we fall through to getDragWidgetPoint, and its default
    // when not in world is to say the point is in hand.
    && p_in_canvas.x < hand_bds_in_canvas.p.x
  ) {
    return { t: 'nowhere', p_in_canvas };
  }
  else
    return getDragWidgetPoint(state, p_in_canvas);
}

export function getDragWidgetPoint(state: CoreState, p_in_canvas: Point): DragWidgetPoint {
  if (pointInRect(p_in_canvas, hand_bds_in_canvas)) {
    const p_in_local = apply(inverse(canvas_from_hand()), p_in_canvas);
    const p_in_hand_int = vint(p_in_local);
    const index = p_in_hand_int.y == 0 ? p_in_hand_int.x : undefined;
    return {
      t: 'hand',
      p_in_local,
      p_in_canvas,
      local_from_canvas: inverse(canvas_from_hand()),
      index: index,
    };
  }
  else { // we must be in "world" if nothing else
    return {
      t: 'world',
      p_in_local: apply(inverse(state.canvas_from_world), p_in_canvas),
      p_in_canvas,
      local_from_canvas: inverse(state.canvas_from_world),
    };
  }
}
