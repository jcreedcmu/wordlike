import { Animation } from "../core/animation-types";
import { fillText, pathCircle, strokeText } from '../util/dutil';
import { SE2 } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Point } from "../util/types";
import { midpointOfRect, unreachable } from "../util/util";
import { vscale, vsub } from "../util/vutil";
import { drawBonusPoint } from "./drawBonus";
import { canvas_bds_in_canvas } from "./widget-constants";

export function drawAnimation(d: CanvasRenderingContext2D, pan_canvas_from_world: SE2, time_ms: number, anim: Animation, glEnabled: boolean): void {
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
    }
    case 'point-decay': {
      if (!glEnabled) {
        const fraction = Math.min(1, Math.max(0, 1 - (time_ms - anim.start_in_game) / anim.duration_ms));
        drawBonusPoint(d, pan_canvas_from_world, anim.p_in_world_int, fraction);
      }
      return;
    }
    case 'fireworks': {
      d.textAlign = 'center';
      d.textBaseline = 'middle';
      anim.fireworks.forEach(fw => {
        const t_ms = time_ms - anim.start_in_game - fw.start_in_anim;
        if (t_ms <= fw.duration_ms && t_ms > 0) {
          const radius = fw.radius * (t_ms / fw.duration_ms);
          d.fillStyle = fw.color;
          pathCircle(d, fw.center_in_canvas, radius);
          d.fill();
        }
      });
      const mp = midpointOfRect(canvas_bds_in_canvas);
      strokeText(d, anim.message, mp, 'white', 4, '96px sans-serif');
      fillText(d, anim.message, mp, 'rgb(0,128,0)', '96px sans-serif');
      return;
    }
    default: unreachable(anim);
  }

}
