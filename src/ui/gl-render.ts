import { Dispatch } from "../core/action";
import { getAssets } from "../core/assets";
import { GameState } from "../core/state";
import { DEBUG, doOnce, doOnceEvery } from "../util/debug";
import { imageDataOfImage } from "../util/dutil";
import { attributeSetFloats, shaderProgram } from "../util/gl-util";
import { inverse } from "../util/se2";
import { resizeView } from "./ui-helpers";
import { CanvasGlInfo } from "./use-canvas";
import { pan_canvas_from_world_of_state } from "./view-helpers";
import { canvas_bds_in_canvas } from "./widget-helpers";

export type GlEnv = {
  prog: WebGLProgram,
}
const SPRITE_TEXTURE_UNIT = 0;

export function renderGlPane(ci: CanvasGlInfo, env: GlEnv, state: GameState) {
  const { d: gl } = ci;
  const { prog } = env;


  const actuallyRender = () => {
    gl.clearColor(0.0, 0.3, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(prog);

    attributeSetFloats(gl, prog, "pos", 3, [
      -1, 1, 0,
      1, 1, 0,
      -1, -1, 0,
      1, -1, 0
    ]);

    const u_spriteTexture = gl.getUniformLocation(prog, 'u_spriteTexture');
    gl.uniform1i(u_spriteTexture, SPRITE_TEXTURE_UNIT);

    const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
    gl.uniform2f(u_canvasSize, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);

    const world_from_canvas_SE2 = inverse(pan_canvas_from_world_of_state(state));
    const s = world_from_canvas_SE2.scale;
    const t = world_from_canvas_SE2.translate;

    const world_from_canvas = [
      s.x, 0.0, 0.0,
      0.0, s.y, 0.0,
      t.x, t.y, 1.0,
    ];
    const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
    gl.uniformMatrix3fv(u_world_from_canvas, false, world_from_canvas);

    gl.viewport(0, 0, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  if (DEBUG.glProfiling) {
    const ext = gl.getExtension('EXT_disjoint_timer_query');
    if (ext == null) {
      doOnce('glDebugExtensionError', () => console.log(`Couldn't get EXT_disjoint_timer_query`));
      actuallyRender();
    }
    else {
      const query = gl.createQuery()!;
      const NUM_TRIALS = 100;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      for (let i = 0; i < NUM_TRIALS; i++) {
        actuallyRender();
      }
      gl.endQuery(ext.TIME_ELAPSED_EXT);

      setTimeout(() => {
        const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
        doOnceEvery('glTiming', 20, () => {
          if (available) {
            console.log('elapsed ms', gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 / NUM_TRIALS);
          }
          else {
            console.log('not available');
          }
        });
      }, 1000);
    }
  }
  else {
    actuallyRender();
  }


}

export function glInitialize(ci: CanvasGlInfo, dispatch: Dispatch): GlEnv {
  dispatch({ t: 'resize', vd: resizeView(ci.c) });
  const { d: gl } = ci;

  const frag = getAssets().frag;
  const vert = getAssets().vert;
  const prog = shaderProgram(gl, vert, frag);
  gl.useProgram(prog);

  const spriteTexture = gl.createTexture();
  if (spriteTexture == null) {
    throw new Error(`couldn't create texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + SPRITE_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, spriteTexture);

  const imdat = imageDataOfImage(getAssets().toolbarImg);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imdat);

  return { prog };
}
