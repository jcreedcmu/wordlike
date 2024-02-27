#version 300 es
precision mediump float;

out vec4 outputColor;

// Tile letter
uniform int u_tileLetter;

#include "common.frag"

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  // The uniform from common.frag is called world_from_canvas, but this is a lie for this shader.
  // We're actually supplied tile_from_canvas.
  vec2 p_in_tile = (u_world_from_canvas * p_in_canvas).xy;

  return get_tile_pixel(p_in_tile, u_tileLetter);
}

void main() {
  outputColor = getColor();
}
