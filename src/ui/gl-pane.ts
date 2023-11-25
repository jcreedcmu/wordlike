import { Dispatch } from "../core/action";
import { getAssets } from "../core/assets";
import { GameState } from "../core/state";
import { attributeSetFloats, shaderProgram } from "../util/gl-util";
import { inverse } from "../util/se2";
import { resizeView } from "./ui-helpers";
import { CanvasGlInfo } from "./use-canvas";
import { pan_canvas_from_world_of_state } from "./view-helpers";
import { canvas_bds_in_canvas } from "./widget-helpers";

export type GlEnv = {
  prog: WebGLProgram,
}

export function renderGlPane(ci: CanvasGlInfo, env: GlEnv, state: GameState) {
  const { d: gl } = ci;
  const { prog } = env;

  gl.clearColor(0.0, 0.3, 0.3, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(prog);

  const windowSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(windowSize, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);
  const world_from_canvas_SE2 = inverse(pan_canvas_from_world_of_state(state));
  const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
  const s = world_from_canvas_SE2.scale;
  const t = world_from_canvas_SE2.translate;

  const world_from_canvas = [
    s.x, 0.0, 0.0,
    0.0, s.y, 0.0,
    t.x, t.y, 1.0,
  ];
  gl.uniformMatrix3fv(u_world_from_canvas, false, world_from_canvas);

  gl.viewport(0, 0, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

}

export function glInitialize(ci: CanvasGlInfo, dispatch: Dispatch): GlEnv {
  dispatch({ t: 'resize', vd: resizeView(ci.c) });
  const { d: gl } = ci;

  const frag = getAssets().frag;
  const vert = getAssets().vert;
  const prog = shaderProgram(gl, vert, frag);
  gl.useProgram(prog);
  attributeSetFloats(gl, prog, "pos", 3, [
    -1, 1, 0,
    1, 1, 0,
    -1, -1, 0,
    1, -1, 0
  ]);
  return { prog };
}
