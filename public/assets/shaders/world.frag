#version 300 es
precision mediump float;

#include "common.frag"
#include "get_sprite_pixel.frag"

// Prepass data
uniform sampler2D u_cellPrepassTexture;
uniform sampler2D u_mobilePrepassTexture;

// Minimum chunk identifier that occurs in prepass framebuffer
uniform vec2 u_min_p_in_chunk;

const float CHUNK_SIZE = 8.;
const int CELL_PREPASS_BUFFER_SIZE = 256; // XXX should be a uniform maybe?
const int MOBILE_PREPASS_BUFFER_SIZE = 256; // XXX should be a uniform maybe?

#include "fog.frag"

const vec2 EMPTY_SPRITE = vec2(0.,7.);
const ivec2 WATER_SPRITE = ivec2(1,0);
const int WATER_SPRITE_BYTE = (WATER_SPRITE.x << 4) + WATER_SPRITE.y;

const vec3 TILE_SELECTED_COLOR = vec3(.06, .25, .68);

const vec3 TILE_DISCONNECTED_COLOR = vec3(0.9, 0., 0.);


const float CROSSHAIR_OPACITY = 0.3;
const float CROSSHAIR_LENGTH = 2.;

const float LAND_WATER_TRANSITIONS_X_OFFSET = 8.;
const float FOG_OF_WAR_TRANSITIONS_X_OFFSET = 9.;

out vec4 outputColor;

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

  vec2 ul_in_cell_prepass = p_in_world_hint - u_min_p_in_chunk * CHUNK_SIZE;

  int bit_1 = is_land(round(255.0 * texture(u_cellPrepassTexture, (ul_in_cell_prepass + vec2(0.5,0.5)) / float(CELL_PREPASS_BUFFER_SIZE) )));
  int bit_2 = is_land(round(255.0 * texture(u_cellPrepassTexture, (ul_in_cell_prepass + vec2(1.5,0.5)) / float(CELL_PREPASS_BUFFER_SIZE) )));
  int bit_4 = is_land(round(255.0 * texture(u_cellPrepassTexture, (ul_in_cell_prepass + vec2(0.5,1.5)) / float(CELL_PREPASS_BUFFER_SIZE) )));
  int bit_8 = is_land(round(255.0 * texture(u_cellPrepassTexture, (ul_in_cell_prepass + vec2(1.5,1.5)) / float(CELL_PREPASS_BUFFER_SIZE) )));

  vec2 sprite_coords = vec2(
                           LAND_WATER_TRANSITIONS_X_OFFSET,
                           (bit_8 << 3) +
                           (bit_4 << 2) +
                           (bit_2 << 1) +
                           (bit_1 << 0)
                           );

  return get_sprite_pixel(p_in_world_hfp, sprite_coords);
}

// a over b
vec4 blendOver(vec4 a, vec4 b) {
    float newAlpha = mix(b.a, 1.0, a.a);
    vec3 newColor = mix(b.a * b.rgb, a.rgb, a.a);
    float divideFactor = (newAlpha > 0.001 ? (1.0 / newAlpha) : 1.0);
    return vec4(divideFactor * newColor, newAlpha);
}

// A wrapper around get_sprite_pixel which incorporates the terrain underneath the sprite.
vec4 get_base_layer_sprite_pixel(vec2 p_in_world, vec2 p_in_world_fp, vec2 sprite_coords) {
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

vec4 with_durability_bar(vec2 p_in_world_fp, vec4 sprite_pixel, int durability) {
  if (durability == 255)
    return sprite_pixel;
  float dur = float(durability) / 255.;
  vec4 bar_pixel = mix(vec4(0.,0.,0.,1.), vec4(0.,1.,0.,1.), float(p_in_world_fp.x > 1. - dur));
  return mix(sprite_pixel, bar_pixel, float(p_in_world_fp.y > 0.9));
}

vec4 get_mobile_pixel(vec2 p_in_world_fp, ivec2 mobile_channel, int metadata_channel) {
  // This is in mobile_data format
  ivec4 mobile_data = ivec4(round(255.0 * texture(u_mobilePrepassTexture, (vec2(mobile_channel) + vec2(0.5,0.5)) / float(MOBILE_PREPASS_BUFFER_SIZE))));

  if (mobile_data.r == 1) { // tile
    int letter = mobile_data.TILE_LETTER_CHANNEL;
    bool selected = (metadata_channel & 1) != 0;
    bool connected = (metadata_channel & 2) != 0;

    vec4 mobile_pixel = get_tile_pixel(p_in_world_fp, letter);
    vec3 pixel = mobile_pixel.rgb;
    pixel = mix(pixel, TILE_SELECTED_COLOR, float(selected) * 0.5);
    pixel = mix(pixel, TILE_DISCONNECTED_COLOR, float(!connected && !selected) * 0.4);
    return vec4(pixel, mobile_pixel.a);
  }
  else { // resource
    int sprite_coords = mobile_data.RESOURCE_SPRITE_CHANNEL;
    int durability = mobile_data.RESOURCE_DURABILITY_CHANNEL;
    vec2 sprite_coords_vec = vec2(sprite_coords >> 4, sprite_coords & 0xf);
    vec4 sprite_pixel = get_sprite_pixel(p_in_world_fp, sprite_coords_vec);
    return with_durability_bar(p_in_world_fp, sprite_pixel, durability);
  }
}

// cell_data holds cached information about this particular square world cell, in cell_data format
vec4 get_cell_pixel(vec2 p_in_world, vec2 p_in_world_fp, ivec4 cell_data) {
  int bonus_channel = cell_data.BONUS_CHANNEL;
  int metadata_channel = cell_data.METADATA_CHANNEL;
  ivec2 mobile_channel = ivec2(cell_data.MOBILE_CHANNEL_L, cell_data.MOBILE_CHANNEL_H);

  vec2 bonus_coords = vec2(bonus_channel >> 4, bonus_channel & 0xf);

  vec4 base_pixel = get_base_layer_sprite_pixel(p_in_world, p_in_world_fp, bonus_coords);

  if (mobile_channel != ivec2(0,0)) {
    // mobile_channel ≠ 0 means there is a mobile to render
    vec4 mobile_pixel = get_mobile_pixel(p_in_world_fp, mobile_channel, metadata_channel);
    base_pixel = blendOver(mobile_pixel, base_pixel);
  }

  return blendOver(get_fog_pixel(p_in_world), base_pixel);
}

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_world = (u_world_from_canvas * p_in_canvas).xy;

  vec2 p_in_world_int = floor(p_in_world);

  vec2 p_in_cell_prepass = p_in_world_int - u_min_p_in_chunk * CHUNK_SIZE;
  vec2 p_in_world_r = round(p_in_world);
  vec2 p_in_world_fp = p_in_world - floor(p_in_world); // fractional part

  vec4 cell_data = round(255.0 * texture(u_cellPrepassTexture, (p_in_cell_prepass + vec2(0.5,0.5)) / float(CELL_PREPASS_BUFFER_SIZE) ));

  vec4 cell_pixel = get_cell_pixel(p_in_world, p_in_world_fp, ivec4(cell_data));

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
