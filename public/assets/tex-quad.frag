#version 300 es
precision mediump float;

out vec4 outputColor;

uniform sampler2D u_texture;

// Size of the destination in pixels Might actually be a gl canvas,
// might be a framebuffer.
uniform vec2 u_canvasSize;

// Transformation matrix
uniform mat3 u_texture_from_canvas;

void main() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_texture = (u_texture_from_canvas * p_in_canvas).xy;

  outputColor = texture(u_texture, p_in_texture);

}
