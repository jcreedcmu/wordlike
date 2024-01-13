import { Dispatch } from "../core/action";
import { getAssets } from "../core/assets";
import { getBonusFromLayer } from "../core/bonus-helpers";
import { getCachedSelection } from "../core/cache-state";
import { Chunk, WORLD_CHUNK_SIZE, activeChunks, getChunk, mkChunk } from "../core/chunk";
import { CoreState, GameState } from "../core/state";
import { pointFall } from "../core/state-helpers";
import { getTileId, get_hand_tiles, isSelectedForDrag } from "../core/tile-helpers";
import { BOMB_RADIUS, getCurrentTool } from "../core/tools";
import { DEBUG, doOnce, doOnceEvery, logger } from "../util/debug";
import { RgbColor, RgbaColor, imageDataOfBuffer } from "../util/dutil";
import { BufferAttr, attributeCreate, bufferSetFloats, shaderProgram } from "../util/gl-util";
import { SE2, apply, compose, composen, inverse, scale, translate } from "../util/se2";
import { apply_to_rect } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { rectPts } from "../util/util";
import { vadd, vdiag, vinv, vm, vscale, vsub } from "../util/vutil";
import { renderPanicBar } from "./drawPanicBar";
import { gl_from_canvas } from "./gl-helpers";
import { canvas_from_hand_tile } from "./render";
import { spriteLocOfBonus, spriteLocOfChunkValue } from "./sprite-sheet";
import { resizeView } from "./ui-helpers";
import { CanvasGlInfo } from "./use-canvas";
import { canvas_from_drag_tile, cell_in_canvas, pan_canvas_from_world_of_state } from "./view-helpers";
import { canvas_bds_in_canvas, canvas_from_hand, getWidgetPoint, hand_bds_in_canvas, world_bds_in_canvas } from "./widget-helpers";

const backgroundGrayRgb: RgbColor = [238, 238, 238];
const shadowColorRgba: RgbaColor = [128, 128, 100, Math.floor(0.4 * 255)];

export type RectDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
  colorUniformLocation: WebGLUniformLocation,
};

export type ChunkDrawer = {
  prog: WebGLProgram,
  chunkImdat: ImageData,
  position: BufferAttr,
};

export type TileDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type GlEnv = {
  tileDrawer: TileDrawer,
  chunkDrawer: ChunkDrawer,
  rectDrawer: RectDrawer,
}

const SPRITE_TEXTURE_UNIT = 0;
const CHUNK_DATA_TEXTURE_UNIT = 1;
const FONT_TEXTURE_UNIT = 2;

function drawChunk(
  gl: WebGL2RenderingContext,
  env: GlEnv,
  p_in_chunk: Point,
  state: GameState,
  chunk_from_canvas: SE2,
  world_from_canvas_SE2: SE2
): void {
  const { prog, position, chunkImdat } = env.chunkDrawer;
  gl.useProgram(prog);

  const chunk_rect_in_chunk = { p: p_in_chunk, sz: vdiag(1.) };

  const gl_from_chunk = compose(gl_from_canvas, inverse(chunk_from_canvas));
  const chunk_rect_in_gl = apply_to_rect(gl_from_chunk, chunk_rect_in_chunk);

  const [p1, p2] = rectPts(chunk_rect_in_gl);
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  const u_chunk_origin_in_world = gl.getUniformLocation(prog, 'u_chunk_origin_in_world');
  gl.uniform2f(u_chunk_origin_in_world, p_in_chunk.x * WORLD_CHUNK_SIZE.x, p_in_chunk.y * WORLD_CHUNK_SIZE.y);

  const u_spriteTexture = gl.getUniformLocation(prog, 'u_spriteTexture');
  gl.uniform1i(u_spriteTexture, SPRITE_TEXTURE_UNIT);

  const u_fontTexture = gl.getUniformLocation(prog, 'u_fontTexture');
  gl.uniform1i(u_fontTexture, FONT_TEXTURE_UNIT);

  const u_chunkDataTexture = gl.getUniformLocation(prog, 'u_chunkDataTexture');
  gl.uniform1i(u_chunkDataTexture, CHUNK_DATA_TEXTURE_UNIT);

  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);

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

  const ms = state.mouseState;
  const chunkCache = ms.t == 'drag_tile' ? ms._chunkCache : state.coreState._cachedTileChunkMap;
  const chunk = getChunk(chunkCache, p_in_chunk);

  if (chunk == undefined) {
    logger('missedChunkRendering', `missing data for chunk ${JSON.stringify(p_in_chunk)}`);
    return;
  }

  // Set chunk data
  for (let x = 0; x < chunk.size.x; x++) {
    for (let y = 0; y < chunk.size.y; y++) {
      const ix = 4 * (y * chunk.size.x + x);
      const index = x + y * chunk.size.x;
      const spritePos = chunk.spritePos[index];
      chunkImdat.data[ix + 0] = spritePos.x;
      chunkImdat.data[ix + 1] = spritePos.y;
      chunkImdat.data[ix + 2] = chunk.metadata[index];
      chunkImdat.data[ix + 3] = 255; // Am I even using this?
    }
  }

  gl.activeTexture(gl.TEXTURE0 + CHUNK_DATA_TEXTURE_UNIT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, chunkImdat);


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
  const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
  gl.uniformMatrix3fv(u_world_from_canvas, false, world_from_canvas);
  gl.viewport(0, 0, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function glFillRecta(gl: WebGL2RenderingContext, env: GlEnv, rect_in_canvas: Rect, color: RgbaColor): void {
  gl.useProgram(env.rectDrawer.prog);
  const hand_bds_in_gl = apply_to_rect(gl_from_canvas, rect_in_canvas);
  const [p1, p2] = rectPts(hand_bds_in_gl);
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

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // XXX some redundant transforms going on here, we also compute chunk_from_canvas in chunk.ts
    const canvas_from_world = pan_canvas_from_world_of_state(state);
    const chunk_from_canvas = compose(scale(vinv(WORLD_CHUNK_SIZE)), inverse(canvas_from_world));
    const chunks = activeChunks(canvas_from_world);
    chunks.forEach(p => {
      drawChunk(gl, env, p, state, chunk_from_canvas, inverse(pan_canvas_from_world_of_state(state)));
    });

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
    chunkDrawer: mkChunkDrawer(gl),
    rectDrawer: mkRectDrawer(gl)
  };
}

function mkChunkDrawer(gl: WebGL2RenderingContext): ChunkDrawer {
  const prog = shaderProgram(gl, getAssets().chunkShaders);

  // Chunk data texture
  const chunkDataTexture = gl.createTexture();
  if (chunkDataTexture == null) {
    throw new Error(`couldn't create chunk data texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + CHUNK_DATA_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, chunkDataTexture);

  const chunkImdat = new ImageData(WORLD_CHUNK_SIZE.x, WORLD_CHUNK_SIZE.y);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  // Chunk bounds vertex attribute array
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null) {
    throw new Error(`Couldn't allocate position buffer`);
  }

  return { prog, position, chunkImdat };
}

function mkTileDrawer(gl: WebGL2RenderingContext): TileDrawer {
  const prog = shaderProgram(gl, getAssets().tileShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog, position };
}

function mkRectDrawer(gl: WebGL2RenderingContext): RectDrawer {
  // Create rect drawer data
  const prog = shaderProgram(gl, {
    vert: `
        attribute vec3 pos;
        void main() {
            gl_Position = vec4(pos, 1.);
        }`,
    frag: `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
            gl_FragColor = u_color;
        }`});

  const colorUniformLocation = gl.getUniformLocation(prog, "u_color")!;
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog: prog, position, colorUniformLocation };
}
