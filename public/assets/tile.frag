#version 300 es
precision mediump float;

out vec4 outputColor;

// Tile letter
uniform int u_tileLetter;

#include "common.frag"

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_world = (u_world_from_canvas * p_in_canvas).xy;

  return get_tile_pixel(p_in_world, u_tileLetter);
}

void main() {
  outputColor = getColor();
}
