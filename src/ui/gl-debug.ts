import { getChunk } from "../core/chunk";
import { CoreState } from "../core/state";
import { logger } from "../util/debug";
import { bufferSetFloats } from "../util/gl-util";
import { inverse, mkSE2 } from "../util/se2";
import { apply_to_rect, asMatrix } from "../util/se2-extra";
import { Point } from "../util/types";
import { rectPts } from "../util/util";
import { vdiag } from "../util/vutil";
import { CHUNK_DATA_TEXTURE_UNIT, GlEnv, PREPASS_TEXTURE_UNIT } from "./gl-common";
import { gl_from_canvas } from "./gl-helpers";
import { canvas_bds_in_canvas } from "./widget-helpers";

// Scale up the colors by this much during debugging so I can see what's going on
const DEBUG_COLOR_SCALE = 10.0;

function drawChunkDebugging(gl: WebGL2RenderingContext, env: GlEnv, _state: CoreState, offset_in_canvas: Point, src_texture: number) {
  const { prog, position } = env.debugQuadDrawer;
  gl.useProgram(prog);
  const sz_in_canvas = vdiag(256);
  const rect_in_canvas = { p: offset_in_canvas, sz: sz_in_canvas };
  const rect_in_gl = apply_to_rect(gl_from_canvas, rect_in_canvas);

  const chunkCache = env._cachedTileChunkMap;
  const chunk = getChunk(chunkCache, { x: 0, y: 0 });
  if (chunk == undefined) {
    logger('missedChunkRendering', `missing data for chunk in debugging`);
    return;
  }
  gl.activeTexture(gl.TEXTURE0 + CHUNK_DATA_TEXTURE_UNIT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, chunk.imdat);

  const [p1, p2] = rectPts(rect_in_gl);
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);
  const u_texture = gl.getUniformLocation(prog, 'u_texture')!;
  gl.uniform1i(u_texture, src_texture);
  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);

  const u_colorScale = gl.getUniformLocation(prog, 'u_colorScale');
  gl.uniform1f(u_colorScale, DEBUG_COLOR_SCALE);

  const canvas_from_texture = mkSE2(rect_in_canvas.sz, rect_in_canvas.p);
  const u_texture_from_canvas = gl.getUniformLocation(prog, 'u_texture_from_canvas');
  gl.uniformMatrix3fv(u_texture_from_canvas, false, asMatrix(inverse(canvas_from_texture)));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function debugPrepass(gl: WebGL2RenderingContext, env: GlEnv, state: CoreState): void {
  // debug the state of the prepass
  drawChunkDebugging(gl, env, state, { x: 100, y: 0 }, PREPASS_TEXTURE_UNIT);
}
