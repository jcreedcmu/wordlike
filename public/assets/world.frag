#version 300 es
precision mediump float;

#include "common.frag"

const vec2 EMPTY_SPRITE = vec2(0.,7.);
const vec2 BLOCK_SPRITE = vec2(1.,0.);

const vec3 TILE_SELECTED_COLOR = vec3(.06, .25, .68);

const vec3 TILE_DISCONNECTED_COLOR = vec3(0.9, 0., 0.);

const float REQUIRED_BONUS_COLUMN = 12.;
const float TILE_COLUMN = 14.;

const int PREPASS_BUFFER_SIZE = 256; // XXX should be a uniform maybe?

const float NUM_SPRITES_PER_SHEET = 16.; // in both directions
const float SPRITE_SIZE = 32.;

const float CROSSHAIR_OPACITY = 0.3;
const float CROSSHAIR_LENGTH = 2.;

out vec4 outputColor;

// Minimum chunk identifier that occurs in prepass framebuffer
uniform vec2 u_min_p_in_chunk;

// Sprite sheet
uniform sampler2D u_spriteTexture;

// Prepass data
uniform sampler2D u_prepassTexture;

float crosshair(vec2 p) {
  if (p.x < (CROSSHAIR_LENGTH + 0.5) * u_world_from_canvas[0][0] && p.y < 0.5 * u_world_from_canvas[0][0])
    return 1.0;
  else
    return 0.0;
}

// p_in_world_fp is the fractional part of p_in_world. It is in [0,1]²
// sprite_coords is actually an ivec. It is in  [0,NUM_SPRITES_PER_SHEET]²
vec4 get_bonus_pixel(vec2 p_in_world_fp, vec2 sprite_coords) {

  // required letter bonus
  if (sprite_coords.x >= REQUIRED_BONUS_COLUMN) {
    int letter = int((sprite_coords.x - REQUIRED_BONUS_COLUMN) * NUM_SPRITES_PER_SHEET + sprite_coords.y);
    vec2 font_coords = vec2(letter / int( NUM_FONT_CELLS_PER_SHEET), letter % int(NUM_FONT_CELLS_PER_SHEET));
    float sdf = texture(u_fontTexture, (p_in_world_fp + font_coords) / NUM_FONT_CELLS_PER_SHEET).r;
    float amount = clamp(0.5 + get_sharpness() * (sdf - 0.5), 0., 1.);
    return vec4(vec3(0.,0.,1.), mix(0.0, 0.5, amount));
  }

  // Avoid glitches due to sprites leaking into each other on the sheet with
  // linear interpolation.
  p_in_world_fp = clamp(p_in_world_fp, 0.5/SPRITE_SIZE, 1. - 1./SPRITE_SIZE);

  return texture(u_spriteTexture, (p_in_world_fp + sprite_coords) / NUM_SPRITES_PER_SHEET);
}

int is_land(vec4 cell_data) {
  int ci = int(round(cell_data.x));
  return int(!(ci == 16 || (ci >> 4) >= 12));
}

vec4 get_terrain_pixel(vec2 p_in_world) {
  // Experimental "land and water" drawing

  // All these h-suffixed values are minus 0.5 in world coordinates from the "real" p.
  vec2 p_in_world_h = p_in_world - vec2(0.5);
  vec2 p_in_world_hint = floor(p_in_world_h);
  vec2 p_in_world_hfp = p_in_world_h - p_in_world_hint;

  vec2 ul_in_prepass = p_in_world_hint - u_min_p_in_chunk * 16.;

  int bit_1 = is_land(round(255.0 * texture(u_prepassTexture, (ul_in_prepass + vec2(0.5,0.5)) / float(PREPASS_BUFFER_SIZE) )));
  int bit_2 = is_land(round(255.0 * texture(u_prepassTexture, (ul_in_prepass + vec2(1.5,0.5)) / float(PREPASS_BUFFER_SIZE) )));
  int bit_4 = is_land(round(255.0 * texture(u_prepassTexture, (ul_in_prepass + vec2(0.5,1.5)) / float(PREPASS_BUFFER_SIZE) )));
  int bit_8 = is_land(round(255.0 * texture(u_prepassTexture, (ul_in_prepass + vec2(1.5,1.5)) / float(PREPASS_BUFFER_SIZE) )));

  vec2 bonus_coords = vec2(
                           2.,
                           (bit_8 << 3) +
                           (bit_4 << 2) +
                           (bit_2 << 1) +
                           (bit_1 << 0)
                           );

  return get_bonus_pixel(p_in_world_hfp, bonus_coords);
}

// a over b
vec4 blendOver(vec4 a, vec4 b) {
    float newAlpha = mix(b.a, 1.0, a.a);
    vec3 newColor = mix(b.a * b.rgb, a.rgb, a.a);
    float divideFactor = (newAlpha > 0.001 ? (1.0 / newAlpha) : 1.0);
    return vec4(divideFactor * newColor, newAlpha);
}

vec4 pre_get_bonus_pixel(vec2 p_in_world, vec2 p_in_world_fp, vec2 sprite_coords) {
  vec4 bonus_pixel = vec4(0.,0.,0.,0.);
  if (sprite_coords != EMPTY_SPRITE && sprite_coords != BLOCK_SPRITE) {
    bonus_pixel = get_bonus_pixel(p_in_world_fp, sprite_coords);
  }
  return blendOver(bonus_pixel, get_terrain_pixel(p_in_world));
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
// .b: some metadata.
//       bit 0: tile is selected
//       bit 1: tile is connected to origin
vec4 get_cell_pixel(vec2 p_in_world, vec2 p_in_world_fp, ivec3 cell_data) {
  int letter = cell_data.g;

  vec2 bonus_coords = vec2(cell_data.r >> 4, cell_data.r & 0xf);
  vec4 bonus_pixel = pre_get_bonus_pixel(p_in_world, p_in_world_fp, bonus_coords);

  vec4 tile_pixel = vec4(0.,0.,0.,0.);

  if (letter != 32) {
    tile_pixel = get_tile_pixel(p_in_world_fp, letter);

    int flags = int(cell_data.b);
    bool selected = (flags & 1) != 0;
    bool connected = (flags & 2) != 0;

    vec3 pixel = tile_pixel.rgb;
    pixel = mix(pixel, TILE_SELECTED_COLOR, float(selected) * 0.5);
    pixel = mix(pixel, TILE_DISCONNECTED_COLOR, float(!connected && !selected) * 0.4);
    tile_pixel = vec4(pixel, tile_pixel.a);
  }

  return blendOver(tile_pixel, bonus_pixel);
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

  vec4 cell_pixel = get_cell_pixel(p_in_world, p_in_world_fp, ivec3(cell_data));

  // maybe render origin
  vec4 main_color = blendOver(get_origin_pixel(p_in_world_int, p_in_world_fp), cell_pixel);

  vec2 off = abs(p_in_world - p_in_world_r);
  // Amount to show crosshairs ∈ [0,1]
  float ch_amount = max(crosshair(off.xy), crosshair(off.yx));
  vec4 ch_color = vec4(0., 0., 0., CROSSHAIR_OPACITY * ch_amount);

  return blendOver(ch_color, main_color);
}

void main() {
  outputColor = getColor();
}
