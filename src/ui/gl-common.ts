import { getAssets } from "../core/assets";
import { WORLD_CHUNK_SIZE } from "../core/chunk";
import { GameState } from "../core/state";
import { BufferAttr, attributeCreate, bufferSetFloats, shaderProgram } from "../util/gl-util";
import { SE2, compose, inverse, scale } from "../util/se2";
import { apply_to_rect, asMatrix } from "../util/se2-extra";
import { Point } from "../util/types";
import { rectPts } from "../util/util";
import { vdiag } from "../util/vutil";
import { canvas_from_gl, gl_from_canvas } from "./gl-helpers";
import { canvas_bds_in_canvas } from "./widget-helpers";

export const SPRITE_TEXTURE_UNIT = 0;
export const CHUNK_DATA_TEXTURE_UNIT = 1;
export const FONT_TEXTURE_UNIT = 2;
export const PREPASS_TEXTURE_UNIT = 3;
export const CANVAS_TEXTURE_UNIT = 4;

export type RectDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
  colorUniformLocation: WebGLUniformLocation,
};

export type WorldDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
  chunkImdat: ImageData,
};

export type TileDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type DebugQuadDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type CanvasDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
  texture: WebGLTexture,
};

export type BonusDrawer = {
  prog: WebGLProgram,
};

export type PrepassHelper = {
  size: Point,
  texture: WebGLTexture,
};

export type GlEnv = {
  gl: WebGL2RenderingContext,
  tileDrawer: TileDrawer,
  worldDrawer: WorldDrawer,
  rectDrawer: RectDrawer,
  debugQuadDrawer: DebugQuadDrawer,
  canvasDrawer: CanvasDrawer,
  prepassHelper: PrepassHelper,
  bonusDrawer: BonusDrawer,
}

export function mkWorldDrawer(gl: WebGL2RenderingContext): WorldDrawer {
  const prog = shaderProgram(gl, getAssets().worldShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null) {
    throw new Error(`Couldn't allocate position buffer`);
  }

  // Chunk data texture
  const chunkDataTexture = gl.createTexture();
  if (chunkDataTexture == null) {
    throw new Error(`couldn't create chunk data texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + CHUNK_DATA_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, chunkDataTexture);

  const chunkImdat = new ImageData(WORLD_CHUNK_SIZE.x, WORLD_CHUNK_SIZE.y);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ix = 4 * (y * 16 + x);
      chunkImdat.data[ix + 0] = 7;
      chunkImdat.data[ix + 1] = 32;
      chunkImdat.data[ix + 2] = 0;
      chunkImdat.data[ix + 3] = 0;
    }
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, chunkImdat);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  return { prog, position, chunkImdat };
}

export function mkTileDrawer(gl: WebGL2RenderingContext): TileDrawer {
  const prog = shaderProgram(gl, getAssets().tileShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog, position };
}

export function mkDebugQuadDrawer(gl: WebGL2RenderingContext): DebugQuadDrawer {
  const prog = shaderProgram(gl, getAssets().debugQuadShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog, position };
}

export function mkCanvasDrawer(gl: WebGL2RenderingContext): CanvasDrawer {
  const prog = shaderProgram(gl, getAssets().canvasShaders);
  gl.useProgram(prog);

  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);

  const texture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + CANVAS_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const data = null;
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
    canvas_bds_in_canvas.sz.x * devicePixelRatio,
    canvas_bds_in_canvas.sz.y * devicePixelRatio, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  // set the filtering so we don't need mips
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const [p1, p2] = rectPts(apply_to_rect(gl_from_canvas, canvas_bds_in_canvas));
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  return { prog, position, texture };
}

export function mkPrepassHelper(gl: WebGL2RenderingContext, size: Point): PrepassHelper {
  const texture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + PREPASS_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const data = new Uint8Array(size.x * size.y * 4); // avoid lazy texture initialization warning
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.x, size.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  // set the filtering so we don't need mips
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return { size, texture };
}

export function mkRectDrawer(gl: WebGL2RenderingContext): RectDrawer {
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

  const colorUniformLocation = gl.getUniformLocation(prog, 'u_color')!;
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog: prog, position, colorUniformLocation };
}

export function mkBonusDrawer(gl: WebGL2RenderingContext): BonusDrawer {
  const prog = shaderProgram(gl, getAssets().bonusShaders);
  return { prog };
}

export function glCopyCanvas(env: GlEnv, c: HTMLCanvasElement): void {
  const { gl } = env;
  gl.activeTexture(gl.TEXTURE0 + CANVAS_TEXTURE_UNIT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, c.width, c.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, c);
}

export function drawOneTile(env: GlEnv, letter: string, canvas_from_tile: SE2): void {
  const { gl } = env;
  const { prog, position } = env.tileDrawer;
  gl.useProgram(prog);

  const chunk_rect_in_canvas = apply_to_rect(canvas_from_tile, { p: vdiag(0), sz: { x: 1, y: 1 } });
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
  gl.uniform2f(u_canvasSize, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);

  const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
  gl.uniformMatrix3fv(u_world_from_canvas, false, asMatrix(inverse(compose(scale(vdiag(devicePixelRatio)), canvas_from_tile))));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
