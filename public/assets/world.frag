#version 300 es
precision mediump float;

#include "common.frag"

const vec3 BOARD_BG_COLOR = vec3(248. / 255., 234. / 255., 213. / 255.);

const vec2 BONUS_POINT_SPRITE = vec2(1.,1.);

const vec3 TILE_SELECTED_COLOR = vec3(.06, .25, .68);

const float REQUIRED_BONUS_COLUMN = 12.;
const float TILE_COLUMN = 14.;

const int PREPASS_BUFFER_SIZE = 256; // XXX should be a uniform maybe?

const float NUM_SPRITES_PER_SHEET = 16.; // in both directions
const float SPRITE_SIZE = 32.;

out vec4 outputColor;

// Minimum chunk identifier that occurs in prepass framebuffer
uniform vec2 u_min_p_in_chunk;

// Sprite sheet
uniform sampler2D u_spriteTexture;

// Prepass data
uniform sampler2D u_prepassTexture;

float crosshair(vec2 p) {
  if (p.x < 1.5 * u_world_from_canvas[0][0] && p.y < 0.5 * u_world_from_canvas[0][0])
    return 1.0;
  else
    return 0.0;
}

// p_in_world_fp is the fractional part of p_in_world. It is in [0,1]²
// sprite_coords is actually an ivec. It is in  [0,NUM_SPRITES_PER_SHEET]²
vec4 get_bonus_pixel(vec2 p_in_world_fp, vec2 sprite_coords) {
  // special case for the single-point sprite.
  if (sprite_coords == BONUS_POINT_SPRITE) {

    float vlen = length(p_in_world_fp - vec2(0.5));
    float amount = clamp(0.5 + 5. * get_sharpness() * (vlen - 0.4), 0., 1.);
    return vec4(0., 0., 1., mix(0.5, 0.0, amount));
  }

  // required bonus
  if (sprite_coords.x >= REQUIRED_BONUS_COLUMN) {
    int letter = int((sprite_coords.x - REQUIRED_BONUS_COLUMN) * NUM_SPRITES_PER_SHEET + sprite_coords.y);
    vec2 font_coords = vec2(letter / int( NUM_FONT_CELLS_PER_SHEET), letter % int(NUM_FONT_CELLS_PER_SHEET));
    float sdf = texture(u_fontTexture, (p_in_world_fp + font_coords) / NUM_FONT_CELLS_PER_SHEET).r;
    float amount = clamp(0.5 + get_sharpness() * (sdf - 0.5), 0., 1.);
    return vec4(amount * vec3(0.6) + (1. - amount) * vec3(1.), 1.);
  }

  // Avoid glitches due to sprites leaking into each other on the sheet with
  // linear interpolation.
  p_in_world_fp = clamp(p_in_world_fp, 0.5/SPRITE_SIZE, 1. - 1./SPRITE_SIZE);

  return texture(u_spriteTexture, (p_in_world_fp + sprite_coords) / NUM_SPRITES_PER_SHEET);
}

vec4 blendOver(vec4 a, vec4 b) {
    float newAlpha = mix(b.a, 1.0, a.a);
    vec3 newColor = mix(b.a * b.rgb, a.rgb, a.a);
    float divideFactor = (newAlpha > 0.001 ? (1.0 / newAlpha) : 1.0);
    return vec4(divideFactor * newColor, newAlpha);
}

vec4 get_origin_pixel(vec2 p_in_world_int, vec2 p_in_world_fp) {
  float is_origin = float(p_in_world_int == vec2(0.,0.));

  float vlen = length(p_in_world_fp - vec2(0.5));

  // origin alpha factor
  float oam = clamp(0.5 + 5. * get_sharpness() * (0.35 - vlen), 0., 1.)
    * clamp(0.5 + 5. * get_sharpness() * (vlen - 0.3), 0., 1.);

  return mix(vec4(0.,0.,0.,0.), vec4(0.,0.,0.,0.5), oam * is_origin);
}

// grid_data holds cached information about this particular square world cell.
// .r: which bonus we should show here. High 4 bits are x coord on the sprite sheet, low 4 bits are y.
// .g: which letter tile we should draw here, 32 = none, 0 = A, ..., 25 = Z
// .b: some metadata. bit 0 is whether it's selected
vec4 get_cell_pixel(vec2 p_in_world_fp, ivec3 cell_data) {
  int letter = cell_data.g;

  if (letter == 32) {
    vec2 bonus_coords = vec2(cell_data.r >> 4, cell_data.r & 0xf);
    return get_bonus_pixel(p_in_world_fp, bonus_coords);
  }

  return get_tile_pixel(p_in_world_fp, letter);
}

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_world = (u_world_from_canvas * p_in_canvas).xy;

  vec2 p_in_world_int = floor(p_in_world);

  vec2 p_in_prepass = p_in_world_int - u_min_p_in_chunk * 16.;
  vec2 p_in_world_r = round(p_in_world);
  vec2 p_in_world_fp = p_in_world - floor(p_in_world); // fractional part

  vec4 cell_data = round(255.0 * texture(u_prepassTexture, (p_in_prepass + vec2(0.5,0.5)) / float(PREPASS_BUFFER_SIZE) ));

  vec4 cell_pixel = get_cell_pixel(p_in_world_fp, ivec3(cell_data));

  float selected_amount = float(int(cell_data.b) & 1) * 0.5;
  cell_pixel = vec4(mix(cell_pixel.rgb, TILE_SELECTED_COLOR, selected_amount), cell_pixel.a);

  // maybe render origin
  vec4 main_color = blendOver(get_origin_pixel(p_in_world_int, p_in_world_fp), cell_pixel);

  vec2 off = abs(p_in_world - p_in_world_r);
  // Amount to show crosshairs ∈ [0,1]
  float ch_amount = max(crosshair(off.xy), crosshair(off.yx));
  vec3 ch_color = mix(BOARD_BG_COLOR, vec3(0.), 0.4); // crosshairs color

  vec3 whiteBack = mix(BOARD_BG_COLOR, main_color.rgb, main_color.a);
  return vec4(mix(whiteBack, ch_color, ch_amount), 1.);
}

void main() {
  outputColor = getColor();
}
