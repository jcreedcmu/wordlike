#version 300 es

precision mediump float;
out vec4 outputColor;

// Size of the 'screen' in pixels
uniform vec2 u_canvasSize;

void main() {
  // Constant red
  outputColor = vec4(1.0, 0.0, 0.0, 1.0);
}
