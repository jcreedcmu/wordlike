import { GameState, SceneState, Tile } from "../core/state";
import { pan_canvas_from_world_of_state, drag_canvas_from_canvas_of_mouse_state, canvas_from_drag_tile } from "./view-helpers";
import { apply, compose, composen, ident, inverse, SE2, translate } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { vadd, vm, vscale, vtrans } from "../util/vutil";
import { getGrid, LocatedWord } from "../core/grid";
import { hand_bds_in_canvas, world_bds_in_canvas, canvas_bds_in_canvas } from "./widget-helpers";
import { canvas_from_hand } from "./widget-helpers";
import { CanvasInfo } from "./use-canvas";
import { getLayer, getOverlay } from "../core/layer";
import { PANIC_INTERVAL_MS, getPanicFraction } from "../core/clock";

export function paint(ci: CanvasInfo, state: GameState) {
  const { d } = ci;
  d.save();
  d.scale(devicePixelRatio, devicePixelRatio);
  const ms = state.mouseState;
  const pan_canvas_from_world = pan_canvas_from_world_of_state(state);

  d.fillStyle = 'white';
  d.fillRect(world_bds_in_canvas.p.x, world_bds_in_canvas.p.y, world_bds_in_canvas.sz.x, world_bds_in_canvas.sz.y);

  const top_left_in_world = vm(apply(inverse(pan_canvas_from_world), { x: 0, y: 0 }), Math.floor);
  const bot_right_in_world = vm(apply(inverse(pan_canvas_from_world), world_bds_in_canvas.sz), Math.ceil);

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

  // draw tiles
  state.main_tiles.forEach((tile, ix) => {
    if (!(ms.t == 'drag_main_tile' && ms.ix == ix)) {
      const world_from_tile = translate(tile.p_in_world_int);
      drawTile(d, compose(pan_canvas_from_world, world_from_tile), tile, getGrid(state.connectedSet, tile.p_in_world_int) ?? false);
    }
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
      if (getOverlay(state.bonusOverlay, state.bonusLayer, p) == 'bonus') {
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


  // draw hand tiles
  d.fillStyle = '#eeeeee';
  d.fillRect(hand_bds_in_canvas.p.x, hand_bds_in_canvas.p.y, hand_bds_in_canvas.sz.x, hand_bds_in_canvas.sz.y);

  state.hand_tiles.forEach((tile, ix) => {
    if (!(ms.t == 'drag_hand_tile' && ms.ix == ix)) {
      const hand_from_tile = translate({ x: 0, y: ix });
      drawTile(d, compose(canvas_from_hand(), hand_from_tile), tile);
    }
  });

  // draw dragged tile on top
  if (ms.t == 'drag_main_tile') {
    const tile = state.main_tiles[ms.ix];
    drawTile(d,
      canvas_from_drag_tile(state),
      tile);
  }

  if (ms.t == 'drag_hand_tile') {
    const tile = state.hand_tiles[ms.ix];
    drawTile(d,
      canvas_from_drag_tile(state),
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
        x: canvas_bds_in_canvas.p.x,
        y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - PANIC_THICK,
      },
      sz: {
        x: canvas_bds_in_canvas.sz.x * panic_fraction,
        y: PANIC_THICK,
      }
    };
    d.fillStyle = 'red';
    d.fillRect(
      panic_rect_in_canvas.p.x, panic_rect_in_canvas.p.y,
      panic_rect_in_canvas.sz.x, panic_rect_in_canvas.sz.y
    );
  }
  d.restore();
}

export class RenderPane {
  d: CanvasRenderingContext2D;
  constructor(public c: HTMLCanvasElement) {
    this.d = c.getContext('2d')!;
    c.width = canvas_bds_in_canvas.sz.x;
    c.height = canvas_bds_in_canvas.sz.y;
  }


}

function colorsOfTile(tile: Tile, connected?: boolean): { fg: string, bg: string } {
  if (connected == false)
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

function drawTile(d: CanvasRenderingContext2D, canvas_from_tile: SE2, tile: Tile, connected?: boolean) {
  const rect_in_tile: Rect = { p: { x: 0, y: 0 }, sz: { x: 1, y: 1 } };
  const rect_in_canvas = apply_to_rect(canvas_from_tile, rect_in_tile);

  const { fg, bg } = colorsOfTile(tile, connected);
  d.fillStyle = bg;
  d.fillRect(rect_in_canvas.p.x + 0.5, rect_in_canvas.p.y + 0.5, rect_in_canvas.sz.x, rect_in_canvas.sz.y);
  d.strokeStyle = fg;
  d.lineWidth = 1;
  d.strokeRect(rect_in_canvas.p.x + 0.5, rect_in_canvas.p.y + 0.5, rect_in_canvas.sz.x, rect_in_canvas.sz.y);

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
