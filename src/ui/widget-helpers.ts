import { CoreState, HAND_TILE_LIMIT } from "../core/state";
import { Tool, getCurrentTools } from "../core/tools";
import { SE2, apply, inverse } from "../util/se2";
import { Point, Rect } from "../util/types";
import { lerp, pointInRect } from "../util/util";
import { vdiag, vint } from "../util/vutil";
import { centerX, fixedRect, layout, nameRect, packHoriz, packVert, padHoriz, padRect, stretchRectX, stretchRectY } from "./layout";
import { GLOBAL_BORDER } from "./render";


const HAND_HORIZ_PADDING = 10;
const HAND_VERT_PADDING = 10;
const HAND_VERT_MARGIN = 12;
const HAND_HORIZ_MARGIN = 16;
export const PANIC_THICK = 10;

export const canvas_bds_in_canvas: Rect = { p: { x: 0, y: 0 }, sz: { x: 1024, y: 768 } };
export const DEFAULT_TILE_SCALE = 48;

const SHUFFLE_WIDTH = DEFAULT_TILE_SCALE + 2 * HAND_VERT_PADDING + 2 * HAND_VERT_MARGIN + PANIC_THICK + GLOBAL_BORDER;

const pauseButton = packVert(
  nameRect('pause', fixedRect(vdiag(DEFAULT_TILE_SCALE + 2 * HAND_VERT_PADDING - HAND_VERT_MARGIN))),
  fixedRect({ x: 0, y: HAND_VERT_MARGIN }),
);
const innerHand = nameRect('inner_hand',
  padRect(10,
    nameRect('hand_tiles', fixedRect({ x: HAND_TILE_LIMIT * DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE }))));

const scoreRect = nameRect('score', fixedRect({ x: 100, y: 0 }));


const widgetTree = packVert(
  stretchRectY(1),
  centerX(
    nameRect('hand',
      packHoriz(
        fixedRect({ y: 0, x: HAND_HORIZ_MARGIN }),
        packVert(
          fixedRect({ x: 0, y: HAND_VERT_MARGIN }),
          nameRect('panic', { t: 'rect', single: { base: { x: 0, y: PANIC_THICK }, stretch: { x: 1, y: 0 } } }),
          fixedRect({ x: 0, y: HAND_VERT_MARGIN }),
          packHoriz(
            pauseButton,
            fixedRect({ y: 0, x: HAND_HORIZ_MARGIN }),
            innerHand,
            fixedRect({ y: 0, x: HAND_HORIZ_MARGIN }),
            scoreRect,
          ),
        ),
        fixedRect({ y: 0, x: HAND_HORIZ_MARGIN }),
      ))
  ),
  fixedRect({ x: 0, y: GLOBAL_BORDER / 2 }),
);
const rects = layout(canvas_bds_in_canvas, widgetTree);

export const score_bds_in_canvas = rects['score'];
export const hand_bds_in_canvas = rects['hand'];
export const inner_hand_bds_in_canvas = rects['inner_hand'];
export const hand_tile_bds_in_canvas = rects['hand_tiles'];
export const panic_bds_in_canvas = rects['panic'];

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

export const pause_button_bds_in_canvas: Rect = rects['pause'];

export const shuffle_button_bds_in_canvas: Rect = {
  p: {
    x: canvas_bds_in_canvas.sz.x - SHUFFLE_WIDTH,
    y: canvas_bds_in_canvas.sz.y - 1.9 * BAR_WIDTH - 10,
  },
  sz: { x: SHUFFLE_WIDTH, y: BAR_WIDTH }
};

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
  else if (pointInRect(p_in_canvas, effective_toolbar_bds_in_canvas(state))) {
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
