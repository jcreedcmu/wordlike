import { Animation } from '../core/animations';
import { bufferSetFloats } from '../util/gl-util';
import { SE2, compose, inverse, scale, translate } from '../util/se2';
import { apply_to_rect, asMatrix } from '../util/se2-extra';
import { Point } from '../util/types';
import { rectPts, unreachable } from "../util/util";
import { vdiag } from '../util/vutil';
import { GlEnv, drawOneMobile } from './gl-common';
import { gl_from_canvas } from './gl-helpers';
import { canvas_bds_in_canvas } from './widget-helpers';

function drawBonusPoint(env: GlEnv, canvas_from_world: SE2, p_in_world: Point, fraction: number): void {
  const { gl } = env;
  const { prog } = env.bonusDrawer;
  const { position } = env.tileDrawer;
  gl.useProgram(prog);

  const canvas_from_tile = compose(canvas_from_world, translate(p_in_world));
  const tile_rect_in_canvas = apply_to_rect(canvas_from_tile, { p: vdiag(0), sz: { x: 1, y: 1 } });
  const tile_rect_in_gl = apply_to_rect(gl_from_canvas, tile_rect_in_canvas);

  const [p1, p2] = rectPts(tile_rect_in_gl);
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);

  const u_tile_from_canvas = gl.getUniformLocation(prog, "u_tile_from_canvas");
  gl.uniformMatrix3fv(u_tile_from_canvas, false, asMatrix(inverse(compose(scale(vdiag(devicePixelRatio)), canvas_from_tile))));

  const u_fraction = gl.getUniformLocation(prog, "u_fraction");
  gl.uniform1f(u_fraction, fraction);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

}

export function drawGlAnimation(env: GlEnv, canvas_from_world: SE2, anim: Animation, time_ms: number): void {
  switch (anim.t) {
    case 'explosion': {
      //   const radius_in_world = (2 * anim.radius + 1) * 0.5 * (time_ms - anim.start_in_game) / anim.duration_ms;
      //   const radvec: Point = { x: radius_in_world, y: radius_in_world };
      //   const rect_in_canvas = apply_to_rect(canvas_from_world, {
      //     p: vsub(anim.center_in_world, radvec), sz: vscale(radvec, 2)
      //   });
      //   d.strokeStyle = '#ff0000';
      //   d.lineWidth = 3;
      //   d.beginPath();
      //   d.arc(rect_in_canvas.p.x + rect_in_canvas.sz.x / 2,
      //     rect_in_canvas.p.y + rect_in_canvas.sz.y / 2,
      //     rect_in_canvas.sz.y / 2,
      //     0, 360,
      //   );
      //   d.stroke();
      //   return;
      return;
    }
    case 'point-decay': {
      const fraction = Math.min(1, Math.max(0, 1 - (time_ms - anim.start_in_game) / anim.duration_ms));
      drawBonusPoint(env, canvas_from_world, anim.p_in_world_int, fraction);

      return;
    }
    case 'fireworks': {
      // d.textAlign = 'center';
      // d.textBaseline = 'middle';
      // anim.fireworks.forEach(fw => {
      //   const t_ms = time_ms - anim.start_in_game - fw.start_in_anim;
      //   if (t_ms <= fw.duration_ms && t_ms > 0) {
      //     const radius = fw.radius * (t_ms / fw.duration_ms);
      //     d.fillStyle = fw.color;
      //     pathCircle(d, fw.center_in_canvas, radius);
      //     d.fill();
      //   }
      // });
      // const mp = midpointOfRect(canvas_bds_in_canvas);
      // strokeText(d, anim.message, mp, 'white', 4, '96px sans-serif');
      // fillText(d, anim.message, mp, 'rgb(0,128,0)', '96px sans-serif');
      return;
    }
    default: unreachable(anim);
  }

}
