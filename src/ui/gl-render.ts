import { Dispatch } from "../core/action";
import { getAssets } from "../core/assets";
import { ActiveChunkInfo, Chunk, WORLD_CHUNK_SIZE, activeChunks, getChunk } from "../core/chunk";
import { CoreState, GameState } from "../core/state";
import { pointFall } from "../core/state-helpers";
import { getTileId, get_hand_tiles, isSelectedForDrag } from "../core/tile-helpers";
import { BOMB_RADIUS, getCurrentTool } from "../core/tools";
import { DEBUG, doOnce, doOnceEvery, logger } from "../util/debug";
import { RgbColor, RgbaColor, imageDataOfBuffer } from "../util/dutil";
import { bufferSetFloats } from "../util/gl-util";
import { SE2, compose, inverse, scale, translate } from "../util/se2";
import { apply_to_rect, asMatrix } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { rectPts } from "../util/util";
import { vadd, vdiag, vmul, vsub } from "../util/vutil";
import { renderPanicBar } from "./drawPanicBar";
import { CHUNK_DATA_TEXTURE_UNIT, FONT_TEXTURE_UNIT, GlEnv, PREPASS_FB_TEXTURE_UNIT, SPRITE_TEXTURE_UNIT, endFrameBuffer, mkDebugQuadDrawer, mkFrameBuffer, mkRectDrawer, mkTexQuadDrawer, mkTileDrawer, mkWorldDrawer, useFrameBuffer } from "./gl-common";
import { gl_from_canvas } from "./gl-helpers";
import { canvas_from_hand_tile } from "./render";
import { resizeView } from "./ui-helpers";
import { CanvasGlInfo } from "./use-canvas";
import { canvas_from_drag_tile, cell_in_canvas, pan_canvas_from_world_of_state } from "./view-helpers";
import { canvas_bds_in_canvas, getWidgetPoint, hand_bds_in_canvas } from "./widget-helpers";

const backgroundGrayRgb: RgbColor = [238, 238, 238];
const shadowColorRgba: RgbaColor = [128, 128, 100, Math.floor(0.4 * 255)];

// This is for a frame buffer into which I render one pixel per world
// *cell*, containing information about bonuses and tile occupancy at
// that cell. I think 256 is probably big enough to cover, because
// maybe at max zoom-out a cell could be like 8 pixels, and 8 * 512 =
// 2048 should be as big as any reasonable screen.
//
// (A 4k monitor has twice as many pixels, but in that case I think
// max-zoom-out should have a cell be 16 double-resolution pixels...
// having >100 × 100 cells per screen is already probably plenty)
const PREPASS_FRAME_BUFFER_SIZE: Point = { x: 256, y: 256 };

export const prepass_from_gl: SE2 = {
  scale: { x: PREPASS_FRAME_BUFFER_SIZE.x / 2, y: PREPASS_FRAME_BUFFER_SIZE.y / 2 },
  translate: { x: PREPASS_FRAME_BUFFER_SIZE.x / 2, y: PREPASS_FRAME_BUFFER_SIZE.y / 2 },
};

export const gl_from_prepass: SE2 = inverse(prepass_from_gl);

// the prepass coordinate system is (0,0) at the upper left of the
// prepass framebuffer, and is measured in framebuffer pixels.

// the chunk_local coordinate system is (0,0) at the upper left of the
// chunk, and extends to chunk.size at the bottom right.

// the chunk_texture coordinate system is (0,0) at the upper left of the
// chunk, and extends to (1,1) at the bottom right.
function drawPrepassChunk(gl: WebGL2RenderingContext, env: GlEnv, chunk: Chunk, prepass_from_chunk_local: SE2): void {
  const { prog, position } = env.texQuadDrawer;
  gl.useProgram(prog);
  const rect_in_chunk_local = { p: vdiag(0), sz: chunk.size };
  const rect_in_prepass = apply_to_rect(prepass_from_chunk_local, rect_in_chunk_local);
  const rect_in_gl = apply_to_rect(gl_from_prepass, rect_in_prepass);

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
  gl.uniform1i(u_texture, CHUNK_DATA_TEXTURE_UNIT);
  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, PREPASS_FRAME_BUFFER_SIZE.x, PREPASS_FRAME_BUFFER_SIZE.y);

  // - the chunk texture coordinate frame is the relevant texture coordinate frame
  // - the prepass framebuffer is playing the role of 'canvas'
  const u_chunk_texture_from_prepass = gl.getUniformLocation(prog, 'u_texture_from_canvas');
  const chunk_local_from_chunk_texture = scale(chunk.size);
  const chunk_texture_from_prepass = inverse(compose(prepass_from_chunk_local, chunk_local_from_chunk_texture));
  gl.uniformMatrix3fv(u_chunk_texture_from_prepass, false, asMatrix(chunk_texture_from_prepass));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function drawOneTile(gl: WebGL2RenderingContext, env: GlEnv, letter: string, state: GameState, canvas_from_chunk_local: SE2): void {
  const { prog, position } = env.tileDrawer;
  gl.useProgram(prog);

  const chunk_rect_in_canvas = apply_to_rect(canvas_from_chunk_local, { p: vdiag(0), sz: { x: 1, y: 1 } });
  const chunk_rect_in_gl = apply_to_rect(gl_from_canvas, chunk_rect_in_canvas);

  const [p1, p2] = rectPts(chunk_rect_in_gl);
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  const u_tileLetter = gl.getUniformLocation(prog, 'u_tileLetter');
  gl.uniform1i(u_tileLetter, letter.charCodeAt(0) - 97);

  const u_fontTexture = gl.getUniformLocation(prog, 'u_fontTexture');
  gl.uniform1i(u_fontTexture, FONT_TEXTURE_UNIT);

  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);

  const world_from_canvas_SE2 = inverse(canvas_from_chunk_local);
  const s = world_from_canvas_SE2.scale;
  const t = world_from_canvas_SE2.translate;

  const world_from_canvas = [
    s.x, 0.0, 0.0,
    0.0, s.y, 0.0,
    t.x, t.y, 1.0,
  ];
  const u_world_from_canvas = gl.getUniformLocation(prog, 'u_world_from_canvas');
  gl.uniformMatrix3fv(u_world_from_canvas, false, world_from_canvas);
  gl.viewport(0, 0, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function glFillRecta(gl: WebGL2RenderingContext, env: GlEnv, rect_in_canvas: Rect, color: RgbaColor): void {
  gl.useProgram(env.rectDrawer.prog);
  const rect_in_gl = apply_to_rect(gl_from_canvas, rect_in_canvas);
  const [p1, p2] = rectPts(rect_in_gl);
  bufferSetFloats(gl, env.rectDrawer.position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);
  gl.uniform4fv(env.rectDrawer.colorUniformLocation, [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function glFillRect(gl: WebGL2RenderingContext, env: GlEnv, rect_in_canvas: Rect, color: RgbColor): void {
  glFillRecta(gl, env, rect_in_canvas, [...color, 255]);
}

function drawHand(gl: WebGL2RenderingContext, env: GlEnv, state: CoreState): void {
  glFillRect(gl, env, hand_bds_in_canvas, backgroundGrayRgb);
}

function renderPrepass(gl: WebGL2RenderingContext, env: GlEnv, state: CoreState, canvas_from_world: SE2): ActiveChunkInfo {
  // start drawing into framebuffer
  useFrameBuffer(gl, env.fb);

  // clear framebuffer
  gl.clearColor(0.03, 0.03, 0.05, 0.05); // predivided by DEBUG_COLOR_SCALE
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Try drawing a prepass chunk into the framebuffer

  // XXX I think I want to have activeChunks return just a bit
  // larger of a region than it currently is.
  //
  // My reasoning is this. Every fragment in the canvas is something
  // I need to render. I can map this fragment point to a world
  // point p. To render point p, I need to sample the bonus-cell
  // value at p + (±0.5, ±0.5). To do that I need to know about the
  // bonus data at ⌊p + (±0.5, ±0.5)⌋.
  const aci = activeChunks(canvas_from_world);
  aci.ps_in_chunk.forEach(p => {
    const chunk = getChunk(state._cachedTileChunkMap, p);
    if (chunk == undefined) {
      logger('missedChunkRendering', `missing data for debug2 chunk`);
      return;
    }
    drawPrepassChunk(gl, env, chunk, translate(vmul(WORLD_CHUNK_SIZE, vsub(p, aci.min_p_in_chunk))));
  });

  // go back to drawing to canvas
  endFrameBuffer(gl);

  return aci;
}


function drawWorld(gl: WebGL2RenderingContext, env: GlEnv, state: GameState, canvas_from_world: SE2, aci: ActiveChunkInfo): void {
  const { prog, position } = env.worldDrawer;
  gl.useProgram(prog);

  const canvas_rect_in_gl = apply_to_rect(gl_from_canvas, canvas_bds_in_canvas);
  // XXX PERF this rect should never change, so we don't need to set it every time
  const [p1, p2] = rectPts(canvas_rect_in_gl);
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  const u_spriteTexture = gl.getUniformLocation(prog, 'u_spriteTexture');
  gl.uniform1i(u_spriteTexture, SPRITE_TEXTURE_UNIT);
  const u_fontTexture = gl.getUniformLocation(prog, 'u_fontTexture');
  gl.uniform1i(u_fontTexture, FONT_TEXTURE_UNIT);
  const u_chunkDataTexture = gl.getUniformLocation(prog, 'u_prepassTexture');
  gl.uniform1i(u_chunkDataTexture, PREPASS_FB_TEXTURE_UNIT);
  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);
  const u_min_p_in_chunk = gl.getUniformLocation(prog, 'u_min_p_in_chunk');
  gl.uniform2f(u_min_p_in_chunk, aci.min_p_in_chunk.x, aci.min_p_in_chunk.y);

  const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
  gl.uniformMatrix3fv(u_world_from_canvas, false, asMatrix(inverse(canvas_from_world)));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

const shouldDebug = { v: false };
let oldState: GameState | null = null;
export function renderGlPane(ci: CanvasGlInfo, env: GlEnv, state: GameState): void {

  if (0) {
    if (oldState != null && JSON.stringify(state) == JSON.stringify(oldState)) {
      console.log('skipping');
      return;
    }
    else {
      console.log('rendering');
    }
  }
  oldState = state;

  const { d: gl } = ci;

  const actuallyRender = () => {
    const cs = state.coreState;
    const ms = state.mouseState;

    // render the prepass
    const canvas_from_world = pan_canvas_from_world_of_state(state);
    const aci = renderPrepass(gl, env, cs, canvas_from_world);

    // clear canvas & initialize blending
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // draw world
    drawWorld(gl, env, state, canvas_from_world, aci);

    // draw bomb shadow
    const currentTool = getCurrentTool(cs);
    if (currentTool == 'bomb' && getWidgetPoint(cs, ms.p_in_canvas).t == 'world') {
      const radius = BOMB_RADIUS;
      for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
          glFillRecta(gl, env, cell_in_canvas(vadd({ x, y }, pointFall(cs, ms.p_in_canvas)), canvas_from_world), shadowColorRgba);
        }
      }
    }

    // draw hand
    drawHand(gl, env, state.coreState);

    // draw panic bar
    if (state.coreState.winState.t != 'lost' && state.coreState.panic) {
      const rr = renderPanicBar(state.coreState.panic, state.coreState.game_from_clock);
      glFillRect(gl, env, rr.rect, rr.color);
    }

    // Here's where we draw dragged tiles in general
    // draw dragged tiles from selection
    if (ms.t == 'drag_tile') {

      const tile0 = getTileId(cs, ms.id);

      if (cs.selected) {
        const tiles = cs.selected.selectedIds.map(id => getTileId(cs, id));
        // draw dragged tiles
        tiles.forEach(tile => {
          if (tile.loc.t == 'world' && tile0.loc.t == 'world') {
            let drag_tile_from_other_tile = translate(vsub(tile.loc.p_in_world_int, tile0.loc.p_in_world_int));
            if (ms.flipped) {
              drag_tile_from_other_tile = {
                scale: drag_tile_from_other_tile.scale, translate: {
                  x: drag_tile_from_other_tile.translate.y,
                  y: drag_tile_from_other_tile.translate.x,
                }
              };
            }

            const canvas_from_other_tile = compose(canvas_from_drag_tile(cs, ms), drag_tile_from_other_tile);
            drawOneTile(gl, env, tile.letter, state, canvas_from_other_tile);
          }
        });
      }
      else {
        const tile = getTileId(cs, ms.id);
        drawOneTile(gl, env, tile.letter, state, canvas_from_drag_tile(cs, ms));
      }
    }

    // draw hand tiles
    get_hand_tiles(cs).forEach(tile => {
      if (isSelectedForDrag(state, tile))
        return;
      drawOneTile(gl, env, tile.letter, state, canvas_from_hand_tile(tile.loc.p_in_hand_int.y));
    });

    //// show the prepass framebuffer for debugging reasons
    // debugPrepass(gl, env, state.coreState);
  };

  if (DEBUG.glProfiling) {
    const ext = gl.getExtension('EXT_disjoint_timer_query');
    if (ext == null) {
      doOnce('glDebugExtensionError', () => console.log(`Couldn't get EXT_disjoint_timer_query`));
      actuallyRender();
    }
    else {
      let alreadyRendered = false;
      doOnceEvery('glTiming', 20, () => {
        alreadyRendered = true;
        const query = gl.createQuery()!;
        const NUM_TRIALS = 10;
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        for (let i = 0; i < NUM_TRIALS; i++) {
          actuallyRender();
        }
        gl.endQuery(ext.TIME_ELAPSED_EXT);

        setTimeout(() => {
          const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
          if (available) {
            console.log('opengl frame elapsed ms', gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 / NUM_TRIALS);
          }
          else {
            console.log('not available');
          }
        }, 1000);
      });
      if (!alreadyRendered)
        actuallyRender();
    }
  }
  else {
    actuallyRender();
  }
}

export function glInitialize(ci: CanvasGlInfo, dispatch: Dispatch): GlEnv {
  dispatch({ t: 'resize', vd: resizeView(ci.c) });
  const { d: gl } = ci;

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

  // Font texture
  const fontTexture = gl.createTexture();
  if (fontTexture == null) {
    throw new Error(`couldn't create font texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + FONT_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, fontTexture);

  const fontImdat = imageDataOfBuffer(getAssets().fontSheetBuf);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fontImdat);

  return {
    tileDrawer: mkTileDrawer(gl),
    worldDrawer: mkWorldDrawer(gl),
    rectDrawer: mkRectDrawer(gl),
    texQuadDrawer: mkTexQuadDrawer(gl),
    debugQuadDrawer: mkDebugQuadDrawer(gl),
    fb: mkFrameBuffer(gl, PREPASS_FRAME_BUFFER_SIZE),
  };
}
