import { getAssets } from "../core/assets";
import { WORLD_CHUNK_SIZE } from "../core/chunk";
import { BufferAttr, attributeCreate, shaderProgram } from "../util/gl-util";
import { Point } from "../util/types";
import { canvas_bds_in_canvas } from "./widget-helpers";

export const SPRITE_TEXTURE_UNIT = 0;
export const CHUNK_DATA_TEXTURE_UNIT = 1;
export const FONT_TEXTURE_UNIT = 2;
export const PREPASS_FB_TEXTURE_UNIT = 3;

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

export type WorldDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type TileDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type TexQuadDrawer = {
  prog: WebGLProgram,
  position: BufferAttr,
};

export type FrameBufferHelper = {
  buffer: WebGLFramebuffer,
  size: Point,
  texture: WebGLTexture,
};

export type GlEnv = {
  tileDrawer: TileDrawer,
  chunkDrawer: ChunkDrawer,
  worldDrawer: WorldDrawer,
  rectDrawer: RectDrawer,
  texQuadDrawer: TexQuadDrawer,
  debugQuadDrawer: TexQuadDrawer,
  fb: FrameBufferHelper,
}

// Partially deprecated? May need to keep the CHUNK_DATA_TEXTURE_UNIT around
export function mkChunkDrawer(gl: WebGL2RenderingContext): ChunkDrawer {
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

  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null) {
    throw new Error(`Couldn't allocate position buffer`);
  }

  return { prog, position, chunkImdat };
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

export function mkTexQuadDrawer(gl: WebGL2RenderingContext): TexQuadDrawer {
  const prog = shaderProgram(gl, getAssets().texQuadShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog, position };
}

export function mkDebugQuadDrawer(gl: WebGL2RenderingContext): TexQuadDrawer {
  const prog = shaderProgram(gl, getAssets().debugQuadShaders);
  const position = attributeCreate(gl, prog, 'pos', 2);
  if (position == null)
    throw new Error(`couldn't allocate position buffer`);
  return { prog, position };
}

export function mkFrameBuffer(gl: WebGL2RenderingContext, size: Point): FrameBufferHelper {
  const texture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + PREPASS_FB_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const data = null;
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size.x, size.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  // set the filtering so we don't need mips
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const buffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);

  // attach the texture as the first color attachment
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { buffer, size, texture };
}

export function useFrameBuffer(gl: WebGL2RenderingContext, fb: FrameBufferHelper): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb.buffer);
  gl.viewport(0, 0, fb.size.x, fb.size.y);
}

export function endFrameBuffer(gl: WebGL2RenderingContext): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas_bds_in_canvas.sz.x, canvas_bds_in_canvas.sz.y);
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
