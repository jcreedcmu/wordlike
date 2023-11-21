import { Animation } from '../core/animations';
import { SE2 } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Point } from "../util/types";
import { unreachable } from "../util/util";
import { vscale, vsub } from "../util/vutil";
import { drawBonus } from "./drawBonus";

export function drawAnimation(d: CanvasRenderingContext2D, pan_canvas_from_world: SE2, time_ms: number, anim: Animation): void {
  switch (anim.t) {
    case 'explosion': {
      const radius_in_world = (2 * anim.radius + 1) * 0.5 * (time_ms - anim.start_in_game) / anim.duration_ms;
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
      return;
    } break;
    case 'point-decay': {
      const fraction = Math.min(1, Math.max(0, 1 - (time_ms - anim.start_in_game) / anim.duration_ms));
      drawBonus(d, pan_canvas_from_world, anim.p_in_world_int, fraction);
      return;
    } break;
  }
  unreachable(anim);
}
