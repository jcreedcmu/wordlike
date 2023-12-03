import { Dispatch } from "../core/action";
import { getAssets } from "../core/assets";
import { bonusOfStatePoint } from "../core/bonus-helpers";
import { CHUNK_SIZE } from "../core/chunk";
import { GameState } from "../core/state";
import { DEBUG, doOnce, doOnceEvery } from "../util/debug";
import { imageDataOfBuffer } from "../util/dutil";
import { attributeCreateAndSetFloats, attributeSetFloats, shaderProgram } from "../util/gl-util";
import { SE2, apply, compose, inverse, scale } from "../util/se2";
import { apply_to_rect } from "../util/se2-extra";
import { Point } from "../util/types";
import { rectPts } from "../util/util";
import { vadd, vdiag, vm, vscale } from "../util/vutil";
import { gl_from_canvas } from "./gl-helpers";
import { spriteLocOfBonus } from "./sprite-sheet";
import { resizeView } from "./ui-helpers";
import { CanvasGlInfo } from "./use-canvas";
import { pan_canvas_from_world_of_state } from "./view-helpers";
import { canvas_bds_in_canvas, world_bds_in_canvas } from "./widget-helpers";

export type GlEnv = {
  chunkImdat: ImageData,
  prog: WebGLProgram,
  chunkBoundsBuffer: WebGLBuffer,
}

const SPRITE_TEXTURE_UNIT = 0;
const CHUNK_DATA_TEXTURE_UNIT = 1;

function drawChunk(gl: WebGL2RenderingContext, env: GlEnv, p_in_chunk: Point, state: GameState, chunk_from_canvas: SE2): void {
  const { prog, chunkBoundsBuffer, chunkImdat } = env;

  const chunk_rect_in_chunk = { p: p_in_chunk, sz: vdiag(1.) };

  const gl_from_chunk = compose(gl_from_canvas, inverse(chunk_from_canvas));
  const chunk_rect_in_gl = apply_to_rect(gl_from_chunk, chunk_rect_in_chunk);

  const [p1, p2] = rectPts(chunk_rect_in_gl);
  attributeSetFloats(gl, chunkBoundsBuffer, [
    p1.x, p2.y, 0,
    p2.x, p2.y, 0,
    p1.x, p1.y, 0,
    p2.x, p1.y, 0
  ]);

  const u_chunk_origin_in_world = gl.getUniformLocation(prog, 'u_chunk_origin_in_world');
  gl.uniform2f(u_chunk_origin_in_world, p_in_chunk.x * CHUNK_SIZE, p_in_chunk.y * CHUNK_SIZE);

  const u_spriteTexture = gl.getUniformLocation(prog, 'u_spriteTexture');
  gl.uniform1i(u_spriteTexture, SPRITE_TEXTURE_UNIT);

  const u_chunkDataTexture = gl.getUniformLocation(prog, 'u_chunkDataTexture');
  gl.uniform1i(u_chunkDataTexture, CHUNK_DATA_TEXTURE_UNIT);

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

  // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Set chunk data
  for (let i = 0; i < CHUNK_SIZE; i++) {
    for (let j = 0; j < CHUNK_SIZE; j++) {
      const ix = 4 * (j * CHUNK_SIZE + i);
      const p_in_world = vadd({ x: i, y: j }, vscale(p_in_chunk, CHUNK_SIZE));
      const bonusPos = spriteLocOfBonus(bonusOfStatePoint(state.coreState, p_in_world));
      chunkImdat.data[ix + 0] = bonusPos.x;
      chunkImdat.data[ix + 1] = bonusPos.y;
      chunkImdat.data[ix + 2] = 0;
      chunkImdat.data[ix + 3] = 255;
    }
  }

  gl.activeTexture(gl.TEXTURE0 + CHUNK_DATA_TEXTURE_UNIT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, chunkImdat);


  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

}

const shouldDebug = { v: false };
export function renderGlPane(ci: CanvasGlInfo, env: GlEnv, state: GameState): void {
  const { d: gl } = ci;
  const { prog } = env;


  const actuallyRender = () => {
    gl.clearColor(1.0, 1.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(prog);

    const pan_canvas_from_world = pan_canvas_from_world_of_state(state);
    const chunk_from_canvas = compose(scale(vdiag(1 / CHUNK_SIZE)), inverse(pan_canvas_from_world));
    const top_left_in_canvas = world_bds_in_canvas.p;
    const bot_right_in_canvas = vadd(world_bds_in_canvas.p, world_bds_in_canvas.sz);
    const top_left_in_chunk = vm(apply(chunk_from_canvas, top_left_in_canvas), Math.floor);
    const bot_right_in_chunk = vm(apply(chunk_from_canvas, bot_right_in_canvas), Math.ceil);

    for (let i = top_left_in_chunk.x; i < bot_right_in_chunk.x; i++) {
      for (let j = top_left_in_chunk.y; j < bot_right_in_chunk.y; j++) {
        drawChunk(gl, env, { x: i, y: j }, state, chunk_from_canvas);
      }
    }
  };

  if (DEBUG.glProfiling) {
    const ext = gl.getExtension('EXT_disjoint_timer_query');
    if (ext == null) {
      doOnce('glDebugExtensionError', () => console.log(`Couldn't get EXT_disjoint_timer_query`));
      actuallyRender();
    }
    else {
      const query = gl.createQuery()!;
      const NUM_TRIALS = 10;
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

  // Sprite texture
  const spriteTexture = gl.createTexture();
  if (spriteTexture == null) {
    throw new Error(`couldn't create sprite texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + SPRITE_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, spriteTexture);

  const spriteImdat = imageDataOfBuffer(getAssets().spriteSheetBuf);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteImdat);

  // Chunk data texture
  const chunkDataTexture = gl.createTexture();
  if (chunkDataTexture == null) {
    throw new Error(`couldn't create chunk data texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + CHUNK_DATA_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, chunkDataTexture);

  const chunkImdat = new ImageData(CHUNK_SIZE, CHUNK_SIZE);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  // Chunk bounds vertex attribute array
  const chunkBoundsBuffer = attributeCreateAndSetFloats(gl, prog, "pos", 3, [
    0, 0, 0,
    0, 0, 0,
    0, 0, 0,
    0, 0, 0
  ]);
  if (chunkBoundsBuffer == null) {
    throw new Error(`Couldn't allocate chunk bounds buffer`);
  }

  return { prog, chunkBoundsBuffer, chunkImdat };
}
