export function attributeCreateAndSetFloats(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram,
  attr_name: string,
  rsize: number,
  arr: number[]
): WebGLBuffer | null {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr),
    gl.STATIC_DRAW);
  const attr = gl.getAttribLocation(prog, attr_name);
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
  return buffer;
}

export function attributeSetFloats(
  gl: WebGL2RenderingContext,
  buffer: WebGLBuffer,
  arr: number[]
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
}

export function shaderProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
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
      throw "Could not compile " + tp +
      " shader:\n\n" + gl.getShaderInfoLog(s);
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
