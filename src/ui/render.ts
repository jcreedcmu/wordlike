import { SceneState, Tile } from "../core/model";
import { eph_canvas_from_world_of_state, eph_tile_canvas_from_tile_canvas_of_mouse_state } from "./view_helpers";
import { apply, compose, inverse, SE2 } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Rect } from "../util/types";
import { vm } from "../util/vutil";

const PANE = { x: 640, y: 480 };

export class RenderPane {
  d: CanvasRenderingContext2D;
  constructor(public c: HTMLCanvasElement) {
    this.d = c.getContext('2d')!;
    c.width = PANE.x;
    c.height = PANE.y;
  }
  draw(state: SceneState) {
    const { c, d } = this;
    const ms = state.gameState.mouseState;
    const eph_canvas_from_world = eph_canvas_from_world_of_state(state.gameState);

    d.fillStyle = 'white';
    d.fillRect(0, 0, PANE.x, PANE.y);

    const top_left_in_world = vm(apply(inverse(eph_canvas_from_world), { x: 0, y: 0 }), Math.floor);
    const bot_right_in_world = vm(apply(inverse(eph_canvas_from_world), PANE), Math.ceil);

    for (let i = top_left_in_world.x; i <= bot_right_in_world.x; i++) {
      for (let j = top_left_in_world.y; j <= bot_right_in_world.y; j++) {

        const pt_in_canvas = apply(eph_canvas_from_world, { x: i, y: j });

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
    state.gameState.tiles.forEach((tile, ix) => {
      if (!(ms.t == 'drag_tile' && ms.ix == ix)) {
        drawTile(d, eph_canvas_from_world, tile);
      }
    });

    if (ms.t == 'drag_tile') {
      const tile = state.gameState.tiles[ms.ix];
      drawTile(d, compose(eph_tile_canvas_from_tile_canvas_of_mouse_state(state.gameState.mouseState), eph_canvas_from_world), tile);
    }

  }
}

function drawTile(d: CanvasRenderingContext2D, canvas_from_world: SE2, tile: Tile) {
  const rect_in_world: Rect = { p: tile.p_in_world_int, sz: { x: 1, y: 1 } };
  const rect_in_canvas = apply_to_rect(canvas_from_world, rect_in_world);

  d.fillStyle = '#c9b451';
  d.fillRect(rect_in_canvas.p.x + 0.5, rect_in_canvas.p.y + 0.5, rect_in_canvas.sz.x, rect_in_canvas.sz.y);
  d.strokeStyle = '#3a320e';
  d.lineWidth = 1;
  d.strokeRect(rect_in_canvas.p.x + 0.5, rect_in_canvas.p.y + 0.5, rect_in_canvas.sz.x, rect_in_canvas.sz.y);

  d.fillStyle = '#3a320e';
  d.textBaseline = 'middle';
  d.textAlign = 'center';
  d.font = 'bold 30px  sans-serif';
  d.fillText(tile.letter, rect_in_canvas.p.x + rect_in_canvas.sz.x / 2 + 0.5,
    rect_in_canvas.p.y + rect_in_canvas.sz.y / 2 + 1.5);
}

export function make_pane(c: HTMLCanvasElement): RenderPane {
  return new RenderPane(c);
}
