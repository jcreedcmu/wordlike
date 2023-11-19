import { getAssets } from "../core/assets";
import { bonusLayer } from "../core/bonus";
import { getPanicFraction } from "../core/clock";
import { LocatedWord, getGrid } from "../core/grid";
import { getOverlay, getOverlayLayer } from "../core/layer";
import { Animation, GameState, TileEntity } from "../core/state";
import { getTileId, get_hand_tiles, get_main_tiles, isSelectedForDrag } from "../core/tile-helpers";
import { debugOnce, logOnce } from "../util/debug";
import { fillRect, fillText, strokeRect } from "../util/dutil";
import { SE2, apply, compose, inverse, translate } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { boundRect, midpointOfRect } from "../util/util";
import { vadd, vm, vscale, vsub, vtrans } from "../util/vutil";
import { CanvasInfo } from "./use-canvas";
import { canvas_from_drag_tile, pan_canvas_from_world_of_state } from "./view-helpers";
import { canvas_bds_in_canvas, canvas_from_hand, canvas_from_toolbar, hand_bds_in_canvas, pause_button_bds_in_canvas, toolbar_bds_in_canvas, world_bds_in_canvas } from "./widget-helpers";

export function paintWithScale(ci: CanvasInfo, state: GameState) {
  const { d } = ci;
  d.save();
  d.scale(devicePixelRatio, devicePixelRatio);
  rawPaint(ci, state);
  d.restore();
}

const backgroundGray = '#eeeeee';

function drawAnimation(d: CanvasRenderingContext2D, pan_canvas_from_world: SE2, time_ms: number, anim: Animation): void {
  switch (anim.t) {
    case 'explosion': {
      const radius_in_world = 3 * (time_ms - anim.start_ms) / anim.duration_ms;
      const radvec: Point = { x: radius_in_world, y: radius_in_world };
      const rect_in_canvas = apply_to_rect(pan_canvas_from_world, {
        p: vsub(anim.center_in_world, radvec), sz: vscale(radvec, 2)
      });
      d.strokeStyle = '#ff0000';
      d.lineWidth = 3;
      d.beginPath();
      d.arc(rect_in_canvas.p.x + rect_in_canvas.sz.x / 2,
        rect_in_canvas.p.y + rect_in_canvas.sz.y / 2,
        rect_in_canvas.sz.y / 2,
        0, 360,
      );
      d.stroke();

    } break;
  }

}

export function drawPausedScreen(ci: CanvasInfo, state: GameState) {
  const { d } = ci;

  fillRect(d, canvas_bds_in_canvas, 'white');

  d.textAlign = 'center';
  d.textBaseline = 'middle';
  fillText(d, "paused", midpointOfRect(canvas_bds_in_canvas), 'black', '48px sans-serif');
}

export function rawPaint(ci: CanvasInfo, state: GameState) {

  if (state.paused) {
    drawPausedScreen(ci, state);
    return;
  }

  const worldClip = new Path2D();
  worldClip.rect(world_bds_in_canvas.p.x, world_bds_in_canvas.p.y,
    world_bds_in_canvas.sz.x, world_bds_in_canvas.sz.y);

  const { d } = ci;
  const ms = state.mouseState;
  const pan_canvas_from_world = pan_canvas_from_world_of_state(state);

  function canvas_from_tile(tile: TileEntity): SE2 {
    switch (tile.loc.t) {
      case 'hand':
        return compose(canvas_from_hand(), translate(tile.loc.p_in_hand_int));
      case 'world':
        return compose(pan_canvas_from_world, translate(tile.loc.p_in_world_int));
    }
  }

  function drawWorld() {
    fillRect(d, world_bds_in_canvas, 'white');

    d.save();
    d.clip(worldClip);

    const top_left_in_canvas = world_bds_in_canvas.p;
    const bot_right_in_canvas = vadd(world_bds_in_canvas.p, world_bds_in_canvas.sz);
    const top_left_in_world = vm(apply(inverse(pan_canvas_from_world), top_left_in_canvas), Math.floor);
    const bot_right_in_world = vm(apply(inverse(pan_canvas_from_world), bot_right_in_canvas), Math.ceil);

    for (let i = top_left_in_world.x; i <= bot_right_in_world.x; i++) {
      for (let j = top_left_in_world.y; j <= bot_right_in_world.y; j++) {

        const pt_in_canvas = apply(pan_canvas_from_world, { x: i, y: j });

        d.strokeStyle = '#0f73a2';
        d.lineWidth = 1;

        const CROSS_SIZE = 2;
        d.beginPath();
        d.moveTo(pt_in_canvas.x + 0.5, pt_in_canvas.y + 0.5 - CROSS_SIZE);
        d.lineTo(pt_in_canvas.x + 0.5, pt_in_canvas.y + 0.5 + CROSS_SIZE);

        d.moveTo(pt_in_canvas.x + 0.5 - CROSS_SIZE, pt_in_canvas.y + 0.5);
        d.lineTo(pt_in_canvas.x + 0.5 + CROSS_SIZE, pt_in_canvas.y + 0.5);
        d.stroke();
      }
    }

    // draw world tiles

    get_main_tiles(state).forEach(tile => {
      if (isSelectedForDrag(state, tile))
        return;
      let opts = undefined;

      opts = {
        connected: getGrid(state.connectedSet, tile.loc.p_in_world_int) ?? false,
        selected: state.selected ? getOverlay(state.selected.overlay, tile.loc.p_in_world_int) : undefined
      };
      drawTile(d, canvas_from_tile(tile), tile, opts);
    });


    // draw invalid words
    if (ms.t == 'up') {
      state.invalidWords.forEach(lw => {
        drawInvalidWord(d, pan_canvas_from_world, lw);
      });
    }

    // draw bonuses
    for (let i = top_left_in_world.x; i <= bot_right_in_world.x; i++) {
      for (let j = top_left_in_world.y; j <= bot_right_in_world.y; j++) {
        const p: Point = { x: i, y: j };
        switch (getOverlayLayer(state.bonusOverlay, bonusLayer, p)) {
          case 'bonus': {
            const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });
            d.strokeStyle = 'rgba(0,0,255,0.5)';
            d.lineWidth = 3;
            d.beginPath();
            d.arc(rect_in_canvas.p.x + rect_in_canvas.sz.x / 2,
              rect_in_canvas.p.y + rect_in_canvas.sz.y / 2,
              rect_in_canvas.sz.y * 0.4,
              0, 360,
            );
            d.stroke();
          } break;
          case 'empty':
            break;
          case 'block': {
            const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });
            fillRect(d, rect_in_canvas, 'gray');
          } break;
        }
      }
    }

    // draw origin
    const origin_rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p: { x: 0, y: 0 }, sz: { x: 1, y: 1 } });
    d.strokeStyle = 'rgba(0,0,0,0.5)';
    d.lineWidth = 2;
    d.beginPath();
    d.arc(origin_rect_in_canvas.p.x + origin_rect_in_canvas.sz.x / 2,
      origin_rect_in_canvas.p.y + origin_rect_in_canvas.sz.y / 2,
      origin_rect_in_canvas.sz.y * 0.3,
      0, 360,
    );
    d.stroke();

    d.restore();
  }

  function drawToolbar() {
    fillRect(d, toolbar_bds_in_canvas, backgroundGray);
    const toolbarImg = getAssets().toolbarImg;
    d.imageSmoothingEnabled = false;
    const S = toolbar_bds_in_canvas.sz.x;
    d.drawImage(toolbarImg, 0, 0, S, toolbarImg.height / toolbarImg.width * S);

    // indicate current tool
    const rect_in_canvas = apply_to_rect(
      canvas_from_toolbar(),
      { p: { x: 0, y: S * state.toolIndex }, sz: { x: S, y: S } }
    );
    fillRect(d, rect_in_canvas, 'rgba(255, 255, 0, 0.5)');
  }

  function drawPauseButton() {
    d.textAlign = 'center';
    d.textBaseline = 'middle';
    if (!state.lost) {
      fillText(d, "⏸", midpointOfRect(pause_button_bds_in_canvas), 'black', '48px sans-serif');
    }
    else {
      fillText(d, "⟳", midpointOfRect(pause_button_bds_in_canvas), 'black', '48px sans-serif');
    }
  }

  function drawHand() {
    fillRect(d, hand_bds_in_canvas, backgroundGray);

    // draw hand tiles
    get_hand_tiles(state).forEach(tile => {
      if (isSelectedForDrag(state, tile))
        return;
      drawTile(d, canvas_from_tile(tile), tile);
    });
  }

  function drawOtherUi() {
    // draw dragged tile on top
    if (ms.t == 'drag_tile') {
      if (state.selected) {
        const tile0 = getTileId(state, ms.id);
        state.selected.selectedIds.forEach(id => {
          const tile = getTileId(state, id);
          if (tile.loc.t == 'world' && tile0.loc.t == 'world') {
            drawTile(d,
              compose(canvas_from_drag_tile(state, ms), translate(vsub(tile.loc.p_in_world_int, tile0.loc.p_in_world_int))),
              tile);
          }
        });
      }

      const tile = getTileId(state, ms.id);
      drawTile(d,
        canvas_from_drag_tile(state, state.mouseState),
        tile);

    }

    // draw score
    const scoreLoc: Point = {
      x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x - 10,
      y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - 40
    };
    d.fillStyle = '#333';
    d.textBaseline = 'middle';
    d.textAlign = 'right';
    const fontSize = 40;
    d.font = `bold ${fontSize}px sans-serif`;
    d.fillText(`${state.score}`, scoreLoc.x, scoreLoc.y);

    // draw panic bar
    const PANIC_THICK = 15;
    if (state.panic !== undefined) {
      const panic_fraction = getPanicFraction(state.panic);
      const panic_rect_in_canvas: Rect = {
        p: {
          x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x * panic_fraction,
          y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - PANIC_THICK,
        },
        sz: {
          x: canvas_bds_in_canvas.sz.x * (1 - panic_fraction),
          y: PANIC_THICK,
        }
      };
      fillRect(d,
        panic_rect_in_canvas, panic_fraction < 0.5 ? 'green' :
        panic_fraction < 0.75 ? 'yellow' :
          panic_fraction < 0.875 ? 'orange' : 'red'
      );
    }

    // draw selection
    if (ms.t == 'drag_selection') {
      const sel_rect_in_canvas: Rect = boundRect([ms.orig_p, ms.p_in_canvas]);
      d.strokeStyle = "rgb(0,255,255,0.5)";
      d.lineWidth = 2;
      d.strokeRect(
        sel_rect_in_canvas.p.x, sel_rect_in_canvas.p.y,
        sel_rect_in_canvas.sz.x, sel_rect_in_canvas.sz.y
      );

    }
  }

  function drawAnimations(time_ms: number) {
    state.animations.forEach(anim => {
      drawAnimation(d, pan_canvas_from_world, time_ms, anim);
    });
  }

  if (!state.lost)
    drawToolbar();
  else {
    fillRect(d, toolbar_bds_in_canvas, backgroundGray);
  }
  drawPauseButton();
  drawWorld();
  drawHand();
  if (!state.lost) {
    drawOtherUi();
    drawAnimations(Date.now());
  }
  else {
    fillText(d, "You lost :(", midpointOfRect(canvas_bds_in_canvas), 'rgba(0,0,0,0.3)', '96px sans-serif');
  }
}

export class RenderPane {
  d: CanvasRenderingContext2D;
  constructor(public c: HTMLCanvasElement) {
    this.d = c.getContext('2d')!;
    c.width = canvas_bds_in_canvas.sz.x;
    c.height = canvas_bds_in_canvas.sz.y;
  }


}

function colorsOfTile(opts?: { connected?: boolean, selected?: boolean }): { fg: string, bg: string } {
  if (opts?.selected === true)
    return { fg: '#1f5198', bg: '#809fca' };
  if (opts?.connected === false)
    return { fg: '#5a220e', bg: '#f97451' };
  return { fg: '#3a320e', bg: '#c9b451' };
}

function drawInvalidWord(d: CanvasRenderingContext2D, canvas_from_world: SE2, word: LocatedWord) {
  const thickness = 0.1;
  const along = word.orientation; // vector pointing along the length of the word
  const perp = vtrans(along); // vector pointing perpendicular to it
  const rect_in_world: Rect = {
    p: word.p,
    sz: vadd(perp, vscale(along, word.word.length)),
  };
  const rect_in_canvas = apply_to_rect(canvas_from_world, rect_in_world);
  d.strokeStyle = '#7f0000';
  d.lineWidth = 3;
  const OFF = 3;
  d.strokeRect(rect_in_canvas.p.x + 0.5 + OFF, rect_in_canvas.p.y + 0.5 + OFF,
    rect_in_canvas.sz.x - 2 * OFF, rect_in_canvas.sz.y - 2 * OFF);
}

function halfOff(r: Rect): Rect {
  return { p: { x: r.p.x + 0.5, y: r.p.y + 0.5 }, sz: r.sz };
}

function drawTile(d: CanvasRenderingContext2D, canvas_from_tile: SE2, tile: TileEntity, opts?: { connected?: boolean, selected?: boolean }) {
  const rect_in_tile: Rect = { p: { x: 0, y: 0 }, sz: { x: 1, y: 1 } };
  const rect_in_canvas = apply_to_rect(canvas_from_tile, rect_in_tile);

  const { fg, bg } = colorsOfTile(opts);
  fillRect(d, halfOff(rect_in_canvas), bg);
  strokeRect(d, halfOff(rect_in_canvas), fg);

  d.fillStyle = fg;
  d.textBaseline = 'middle';
  d.textAlign = 'center';
  const fontSize = Math.round(0.6 * canvas_from_tile.scale.x);
  d.font = `bold ${fontSize}px sans-serif`;
  d.fillText(tile.letter.toUpperCase(), rect_in_canvas.p.x + rect_in_canvas.sz.x / 2 + 0.5,
    rect_in_canvas.p.y + rect_in_canvas.sz.y / 2 + 1.5);
}

export function make_pane(c: HTMLCanvasElement): RenderPane {
  return new RenderPane(c);
}
