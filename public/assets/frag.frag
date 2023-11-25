#version 300 es

precision mediump float;
in vec2 v_uv; // range is [0,1] x [0,1]
out vec4 outputColor;

// Size of the 'screen' in pixels
uniform vec2 u_canvasSize;

void main() {
  vec2 pos = v_uv * u_canvasSize;
if (pos.y > 100.)
  outputColor = vec4(pos.y - floor(pos.y), 0.5, 0.0, 1.0) ;
 else
  outputColor = vec4(pos.x / 799.0, 0.5, 0.0, 1.0);
}
