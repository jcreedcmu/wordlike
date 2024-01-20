#version 300 es
precision mediump float;

out vec4 outputColor;

// Size of the destination in pixels Might actually be a gl canvas,
// might be a framebuffer.
uniform vec2 u_canvasSize;

// Transformation matrix
uniform mat3 u_tile_from_canvas;

// Angle
uniform float u_fraction;
const float PI = 3.14159265358979;

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_tile = (u_tile_from_canvas * p_in_canvas).xy;
  vec2 off = p_in_tile - vec2(0.5, 0.5);
  float angle = (atan(off.y, off.x) + PI) / (2.*PI);
  float alpha =  float(length(off) < 0.4) * float(angle < u_fraction) * 0.75;
  return vec4(0., 0., 1., alpha);
}

void main() {
  outputColor = getColor();
}
