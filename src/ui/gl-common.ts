import { getAssets } from "../core/assets";
import { indexOfLetter } from "../core/letters";
import { RenderableMobile } from '../core/state-types';
import { BufferAttr, attributeCreate, bufferSetFloats, shaderProgram } from "../util/gl-util";
import { SE2, compose, inverse, scale } from "../util/se2";
import { apply_to_rect, asMatrix } from "../util/se2-extra";
import { Point } from "../util/types";
import { pixelSnapRect, rectPts } from "../util/util";
import { vdiag, vscale } from "../util/vutil";
import { RenderCaches } from "./chunk-helpers";
import { gl_from_canvas } from "./gl-helpers";
import { spriteLocOfRes } from "./sprite-sheet";
import { canvas_bds_in_canvas } from "./widget-constants";

export const SPRITE_TEXTURE_UNIT = 0;
export const FONT_TEXTURE_UNIT = 1;
export const CELL_PREPASS_TEXTURE_UNIT = 2;
export const CANVAS_TEXTURE_UNIT = 3;
export const MOBILE_PREPASS_TEXTURE_UNIT = 4;

export type RectDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
  colorUniformLocation: WebGLUniformLocation,
};

export type WorldDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type TileDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type SpriteDrawer = {
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

// this holds some prepass data.
export type PrepassHelper = {
  // We render chunks into a buffer that has one pixel per cell, so
  // that the screen-resolution fragment shader can consult it.
  cellSize: Point,
  cellTexture: WebGLTexture,

  // We render mobiles by id into a buffer that has one pixel per mobile, so
  // that the screen-resolution fragment shader can consult it.
  mobileSize: Point,
  mobileTexture: WebGLTexture,
};

export type GlEnv = {
  gl: WebGL2RenderingContext,
  tileDrawer: TileDrawer,
  spriteDrawer: SpriteDrawer,
  worldDrawer: WorldDrawer,
  rectDrawer: RectDrawer,
  debugQuadDrawer: DebugQuadDrawer,
  canvasDrawer: CanvasDrawer,
  prepassHelper: PrepassHelper,
  bonusDrawer: BonusDrawer,
  _cache: RenderCaches,
}

export function mkWorldDrawer(gl: WebGL2RenderingContext): WorldDrawer {
  const prog = shaderProgram(gl, getAssets().worldShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null) {
    throw new Error(`Couldn't allocate position buffer`);
  }
  return { prog, position };
}

export function mkTileDrawer(gl: WebGL2RenderingContext): TileDrawer {
  const prog = shaderProgram(gl, getAssets().tileShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog, position };
}

export function mkSpriteDrawer(gl: WebGL2RenderingContext): SpriteDrawer {
  const prog = shaderProgram(gl, getAssets().spriteShaders);
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

function mkTexture(gl: WebGL2RenderingContext, textureUnit: number, size: Point): WebGLTexture {
  const texture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const data = new Uint8Array(size.x * size.y * 4); // avoid lazy texture initialization warning
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.x, size.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export function mkCanvasDrawer(gl: WebGL2RenderingContext): CanvasDrawer {
  const prog = shaderProgram(gl, getAssets().canvasShaders);
  gl.useProgram(prog);

  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);

  const texture = mkTexture(gl, CANVAS_TEXTURE_UNIT, vscale(canvas_bds_in_canvas.sz, devicePixelRatio));

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
  const cellSize = size;
  const mobileSize = size;
  return {
    cellSize, cellTexture: mkTexture(gl, CELL_PREPASS_TEXTURE_UNIT, cellSize),
    mobileSize, mobileTexture: mkTexture(gl, MOBILE_PREPASS_TEXTURE_UNIT, mobileSize),
  };
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
        }`,
    name: 'rect'
  });

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

export function drawOneMobile(env: GlEnv, m: RenderableMobile, canvas_from_tile: SE2): void {
  if (m.t == 'tile') {
    const { gl } = env;
    const { prog, position } = env.tileDrawer;
    gl.useProgram(prog);

    const chunk_rect_in_canvas = pixelSnapRect(apply_to_rect(canvas_from_tile, { p: vdiag(0), sz: { x: 1, y: 1 } }));
    const chunk_rect_in_gl = apply_to_rect(gl_from_canvas, chunk_rect_in_canvas);

    const [p1, p2] = rectPts(chunk_rect_in_gl);
    bufferSetFloats(gl, position, [
      p1.x, p2.y,
      p2.x, p2.y,
      p1.x, p1.y,
      p2.x, p1.y,
    ]);

    const u_tileLetter = gl.getUniformLocation(prog, 'u_tileLetter');
    gl.uniform1i(u_tileLetter, indexOfLetter(m.letter));

    const u_fontTexture = gl.getUniformLocation(prog, 'u_fontTexture');
    gl.uniform1i(u_fontTexture, FONT_TEXTURE_UNIT);

    const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
    gl.uniform2f(u_canvasSize, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);

    // The uniform from common.frag is called world_from_canvas, but this is a lie for this shader.
    // We're actually supplying cell_from_canvas.
    const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
    gl.uniformMatrix3fv(u_world_from_canvas, false, asMatrix(inverse(compose(scale(vdiag(devicePixelRatio)), canvas_from_tile))));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  else {
    const { gl } = env;
    const { prog, position } = env.spriteDrawer;
    gl.useProgram(prog);

    const chunk_rect_in_canvas = pixelSnapRect(apply_to_rect(canvas_from_tile, { p: vdiag(0), sz: { x: 1, y: 1 } }));
    const chunk_rect_in_gl = apply_to_rect(gl_from_canvas, chunk_rect_in_canvas);

    const [p1, p2] = rectPts(chunk_rect_in_gl);
    bufferSetFloats(gl, position, [
      p1.x, p2.y,
      p2.x, p2.y,
      p1.x, p1.y,
      p2.x, p1.y,
    ]);

    const spriteLoc = spriteLocOfRes(m.res);

    const u_spriteLoc = gl.getUniformLocation(prog, 'u_spriteLoc');
    gl.uniform2i(u_spriteLoc, spriteLoc.x, spriteLoc.y);

    const u_spriteTexture = gl.getUniformLocation(prog, 'u_spriteTexture');
    gl.uniform1i(u_spriteTexture, SPRITE_TEXTURE_UNIT);

    const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
    gl.uniform2f(u_canvasSize, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);

    // The uniform from common.frag is called world_from_canvas, but this is a lie for this shader.
    // We're actually supplying cell_from_canvas.
    const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
    gl.uniformMatrix3fv(u_world_from_canvas, false, asMatrix(inverse(compose(scale(vdiag(devicePixelRatio)), canvas_from_tile))));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export function drawOneSprite(env: GlEnv, spriteLoc: Point, canvas_from_sprite: SE2): void {
  const { gl } = env;
  const { prog, position } = env.spriteDrawer;
  gl.useProgram(prog);

  const chunk_rect_in_canvas = apply_to_rect(canvas_from_sprite, { p: vdiag(0), sz: { x: 1, y: 1 } });
  const chunk_rect_in_gl = apply_to_rect(gl_from_canvas, chunk_rect_in_canvas);

  const [p1, p2] = rectPts(chunk_rect_in_gl);
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  const u_spriteLoc = gl.getUniformLocation(prog, 'u_spriteLoc');
  gl.uniform2i(u_spriteLoc, spriteLoc.x, spriteLoc.y);

  const u_spriteTexture = gl.getUniformLocation(prog, 'u_spriteTexture');
  gl.uniform1i(u_spriteTexture, SPRITE_TEXTURE_UNIT);

  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);

  // The uniform from common.frag is called world_from_canvas, but this is a lie for this shader.
  // We're actually supplying sprite_from_canvas.
  const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
  gl.uniformMatrix3fv(u_world_from_canvas, false, asMatrix(inverse(compose(scale(vdiag(devicePixelRatio)), canvas_from_sprite))));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
