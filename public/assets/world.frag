#version 300 es
precision mediump float;

#include "common.frag"
#include "get_sprite_pixel.frag"

const float CHUNK_SIZE = 8.;

const vec2 EMPTY_SPRITE = vec2(0.,7.);
const ivec2 WATER_SPRITE = ivec2(1,0);
const int WATER_SPRITE_BYTE = (WATER_SPRITE.x << 4) + WATER_SPRITE.y;

const vec3 TILE_SELECTED_COLOR = vec3(.06, .25, .68);

const vec3 TILE_DISCONNECTED_COLOR = vec3(0.9, 0., 0.);

const int PREPASS_BUFFER_SIZE = 256; // XXX should be a uniform maybe?

const float CROSSHAIR_OPACITY = 0.3;
const float CROSSHAIR_LENGTH = 2.;

out vec4 outputColor;

// Minimum chunk identifier that occurs in prepass framebuffer
uniform vec2 u_min_p_in_chunk;

// Prepass data
uniform sampler2D u_prepassTexture;

float crosshair(vec2 p) {
  if (p.x < (CROSSHAIR_LENGTH + 0.5) * u_world_from_canvas[0][0] && p.y < 0.5 * u_world_from_canvas[0][0])
    return 1.0;
  else
    return 0.0;
}

int is_land(vec4 cell_data) {
  int ci = int(round(cell_data.x));
  return int(!(ci == WATER_SPRITE_BYTE || (ci >> 4) >= 12));
}

vec4 get_terrain_pixel(vec2 p_in_world) {
  // "land and water" drawing

  // All these h-suffixed values are minus 0.5 in world coordinates from the "real" p.
  vec2 p_in_world_h = p_in_world - vec2(0.5);
  vec2 p_in_world_hint = floor(p_in_world_h);
  vec2 p_in_world_hfp = p_in_world_h - p_in_world_hint;

  vec2 ul_in_prepass = p_in_world_hint - u_min_p_in_chunk * CHUNK_SIZE;

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

  return get_sprite_pixel(p_in_world_hfp, bonus_coords);
}

// a over b
vec4 blendOver(vec4 a, vec4 b) {
    float newAlpha = mix(b.a, 1.0, a.a);
    vec3 newColor = mix(b.a * b.rgb, a.rgb, a.a);
    float divideFactor = (newAlpha > 0.001 ? (1.0 / newAlpha) : 1.0);
    return vec4(divideFactor * newColor, newAlpha);
}

vec4 pre_get_sprite_pixel(vec2 p_in_world, vec2 p_in_world_fp, vec2 sprite_coords) {
  vec4 bonus_pixel = vec4(0.,0.,0.,0.);
  if (sprite_coords != EMPTY_SPRITE && sprite_coords != vec2(WATER_SPRITE)) {
    bonus_pixel = get_sprite_pixel(p_in_world_fp, sprite_coords);
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

// cell_data holds cached information about this particular square world cell.
//
// See src/core/chunk.ts (search "cell_data format") for documentation
// on the format of cell_data
vec4 get_cell_pixel(vec2 p_in_world, vec2 p_in_world_fp, ivec3 cell_data) {
  int channel_g = cell_data.g;
  int flags = cell_data.b;
  bool selected = (flags & 1) != 0;
  bool connected = (flags & 2) != 0;

  vec2 bonus_coords = vec2(cell_data.r >> 4, cell_data.r & 0xf);

  vec4 bonus_pixel = pre_get_sprite_pixel(p_in_world, p_in_world_fp, bonus_coords);

  vec4 mobile_pixel = vec4(0.,0.,0.,0.);

  // if high bit is set, that means we're doing letter tiles
  if ((channel_g & 128) != 0) {
    int letter = channel_g & 0x7f;

    // 32 is space
    if (letter != 32) {
      mobile_pixel = get_tile_pixel(p_in_world_fp, letter);

      vec3 pixel = mobile_pixel.rgb;
      pixel = mix(pixel, TILE_SELECTED_COLOR, float(selected) * 0.5);
      pixel = mix(pixel, TILE_DISCONNECTED_COLOR, float(!connected && !selected) * 0.4);
      mobile_pixel = vec4(pixel, mobile_pixel.a);
    }
  }
  // if high bit is clear, that means we're doing mobile resources
  else {
    mobile_pixel = get_sprite_pixel(p_in_world_fp, vec2(channel_g >> 4, channel_g & 0xf));
  }

  return blendOver(mobile_pixel, bonus_pixel);
}

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_world = (u_world_from_canvas * p_in_canvas).xy;

  vec2 p_in_world_int = floor(p_in_world);

  vec2 p_in_prepass = p_in_world_int - u_min_p_in_chunk * CHUNK_SIZE;
  vec2 p_in_world_r = round(p_in_world);
  vec2 p_in_world_fp = p_in_world - floor(p_in_world); // fractional part

  vec4 cell_data = round(255.0 * texture(u_prepassTexture, (p_in_prepass + vec2(0.5,0.5)) / float(PREPASS_BUFFER_SIZE) ));

  vec4 cell_pixel = get_cell_pixel(p_in_world, p_in_world_fp, ivec3(cell_data.rgb));

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
