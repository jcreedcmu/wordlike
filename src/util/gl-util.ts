import { ShaderProgramText } from "../core/assets";

export type BufferAttr = {
  attr: number,
  buffer: WebGLBuffer,
  rsize: number,
}

export function attributeCreate(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  attr_name: string,
  rsize: number,
): BufferAttr | null {
  const buffer = gl.createBuffer();
  if (buffer == null)
    return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const attr = gl.getAttribLocation(prog, attr_name);
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
  return { attr, buffer, rsize };
}

export function bufferSetFloats(
  gl: WebGL2RenderingContext,
  ba: BufferAttr,
  arr: number[],
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, ba.buffer);
  gl.vertexAttribPointer(ba.attr, ba.rsize, gl.FLOAT, false, 0, 0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.DYNAMIC_DRAW);
}

export function shaderProgram(gl: WebGL2RenderingContext, shader: ShaderProgramText) {
  const { vert: vs, frag: fs, name } = shader;
  const prog = gl.createProgram();
  if (prog == null) {
    throw `Couldn't create WebGL program`;
  }
  const addshader = (tp: 'vertex' | 'fragment', source: string) => {
    const s = gl.createShader((tp == 'vertex') ?
      gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (s == null) {
      throw `Couldn't create ${tp} shader`;
    }
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(s);
      if (msg) {
        const re = /ERROR: 0:(\d+):/;
        let m;
        if (m = re.exec(msg)) {
          const line = parseInt(m[1]) - 1;
          const context = 2;
          const contextLines = source.split('\n').slice(line - context, line + context + 1);
          contextLines.splice(context + 1, 0, contextLines[context].replace(/\S/g, '^'));
          console.error(contextLines.join('\n'));
        }
      }
      //      console.error(source);
      throw `Could not compile ${tp} shader for "${name}":\n\n${msg}`;
    }
    gl.attachShader(prog, s);
  };
  addshader('vertex', vs);
  addshader('fragment', fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw "Could not link the shader program!";
  }
  return prog;
}
