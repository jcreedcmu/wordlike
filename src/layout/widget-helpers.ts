import { DragWidgetPoint, WidgetPoint } from "../core/core-ui-types";
import { CoreState } from "../core/state";
import { getCurrentResources, getCurrentTools } from "../core/tools";
import { SE2, apply, inverse } from "../util/se2";
import { Point, Rect } from "../util/types";
import { lerp, pointInRect } from "../util/util";
import { vint } from "../util/vutil";
import { DEFAULT_TILE_SCALE, PANIC_THICK, TOOLBAR_WIDTH, canvas_bds_in_canvas, resbar_bds_in_canvas, toolbar_bds_in_canvas } from "../ui/widget-constants";
import { hand_bds_in_canvas, hand_tile_bds_in_canvas, panic_bds_in_canvas, rects } from "../ui/widget-layout";
import { activeButtonBarButtons } from "./button-bar";

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

export const button_bar_bds_in_canvas: Rect = {
  p: { x: canvas_bds_in_canvas.sz.x - TOOLBAR_WIDTH, y: canvas_bds_in_canvas.sz.y - TOOLBAR_WIDTH * activeButtonBarButtons.length },
  sz: { x: TOOLBAR_WIDTH, y: TOOLBAR_WIDTH * activeButtonBarButtons.length }
};

export const pause_button_bds_in_canvas: Rect = rects['pause'];

export function canvas_from_hand(): SE2 {
  return {
    scale: { x: DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE },
    translate: hand_tile_bds_in_canvas.p,
  };
}

export function canvas_from_widget(rect: Rect): SE2 {
  return {
    scale: { x: 1, y: 1 },
    translate: rect.p,
  };
}

export function getWidgetPoint(state: CoreState, p_in_canvas: Point): WidgetPoint {
  const toolbar_bds = effective_toolbar_bds_in_canvas(state);
  const resbar_bds = effective_resbar_bds_in_canvas(state);
  if (pointInRect(p_in_canvas, pause_button_bds_in_canvas)) {
    return {
      t: 'pauseButton',
      p_in_canvas,
    };
  }
  else if (pointInRect(p_in_canvas, button_bar_bds_in_canvas)) {
    const buttonbar_from_canvas = inverse(canvas_from_widget(button_bar_bds_in_canvas));
    const p_in_local = apply(buttonbar_from_canvas, p_in_canvas);
    return {
      t: 'buttonBar',
      p_in_local,
      p_in_canvas,
      button: activeButtonBarButtons[Math.floor(p_in_local.y / button_bar_bds_in_canvas.sz.x)],
    };
  }
  else if (pointInRect(p_in_canvas, toolbar_bds)) {
    const toolbar_from_canvas = inverse(canvas_from_widget(toolbar_bds_in_canvas));
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
    const resbar_from_canvas = inverse(canvas_from_widget(resbar_bds_in_canvas));
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
