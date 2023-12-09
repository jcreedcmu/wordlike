#version 300 es
precision mediump float;

const int CHUNK_SIZE = 16;
const float NUM_SPRITES_PER_SHEET = 16.; // in both directions
const float SPRITE_SIZE = 32.;

const float NUM_FONT_CELLS_PER_SHEET = 8.; // in both directions
const float FONT_CELL_SIZE = 64.;

out vec4 outputColor;

// World coordinates of the origin of the chunk
uniform vec2 u_chunk_origin_in_world;

// Size of the 'screen' in pixels
uniform vec2 u_canvasSize;

// Transformation matrix
uniform mat3 u_world_from_canvas;

// Sprite sheet
uniform sampler2D u_spriteTexture;

// Font Sheet
uniform sampler2D u_fontTexture;

// Chunk data
uniform sampler2D u_chunkDataTexture;

float crosshair(vec2 p) {
  if (p.x < 2.5 * u_world_from_canvas[0][0] && p.y < 0.5 * u_world_from_canvas[0][0])
    return 1.0;
  else
    return 0.0;
}

bool less_dist(vec2 v, float d) {
  return v.x * v.x + v.y * v.y < d * d;
}

// p_in_world_fp is the fractional part of p_in_world. It is in [0,1]²
// sprite_coords is actually an ivec. It is in  [0,NUM_SPRITES_PER_SHEET]²
vec4 get_sprite_pixel(vec2 p_in_world_fp, vec2 sprite_coords, float sharpness) {
  if (sprite_coords.x == 12. || sprite_coords.x == 13.) {
    int letter = int((sprite_coords.x - 12.) * NUM_SPRITES_PER_SHEET + sprite_coords.y);
    vec2 font_coords = vec2(letter / int( NUM_FONT_CELLS_PER_SHEET), letter % int(NUM_FONT_CELLS_PER_SHEET));
    float sdf = texture(u_fontTexture, (p_in_world_fp + font_coords) / NUM_FONT_CELLS_PER_SHEET).r;
    float amount = clamp(0.5 + sharpness * (sdf - 0.5), 0., 1.);
    return vec4(amount * vec3(0.6) + (1. - amount) * vec3(1.), 1.);
  }
  return texture(u_spriteTexture, (p_in_world_fp + sprite_coords) / NUM_SPRITES_PER_SHEET);
}

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_world = (u_world_from_canvas * p_in_canvas).xy;

  vec2 p_in_world_int = floor(p_in_world);

  vec2 coords_within_chunk = p_in_world_int - u_chunk_origin_in_world;
  vec2 p_in_world_r = round(p_in_world);
  vec2 p_in_world_fp = p_in_world - floor(p_in_world); // fractional part

  // Avoid glitches due to sprites leaking into each other on the sheet with
  // linear interpolation.
  p_in_world_fp = clamp(p_in_world_fp, 0.5/SPRITE_SIZE, 1. - 1./SPRITE_SIZE);

  vec2 sprite_coords = round(255.0 * texture(u_chunkDataTexture, (coords_within_chunk + vec2(0.5,0.5)) / float(CHUNK_SIZE) )).xy;
  vec4 bgcolor = get_sprite_pixel(p_in_world_fp, sprite_coords, 1. / (u_world_from_canvas[0][0] * 6.));

  vec2 off = abs(p_in_world - p_in_world_r);
  float ch_amount = max(crosshair(off.xy), crosshair(off.yx));

  vec3 whiteBack = bgcolor.rgb * bgcolor.a + vec3(1.) * (1. - bgcolor.a);
  return ch_amount * vec4(.06,.45,.64,1.) + (1.-ch_amount) * vec4(whiteBack, 1.);
}

void main() {
  outputColor = getColor();
}
