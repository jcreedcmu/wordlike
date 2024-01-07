#version 300 es
precision mediump float;

const vec3 TILE_LIGHT_COLOR= vec3( 0.9490196078431372, 0.8117647058823529, 0.4627450980392157 );
const vec3 TILE_DARK_COLOR = vec3( 0.8, 0.5725490196078431, 0.023529411764705882 );
const vec3 TILE_MED_COLOR = vec3( 0.8980392156862745, 0.7294117647058823, 0.2901960784313726 );
const vec3 BOARD_BG_COLOR = vec3(248. / 255., 234. / 255., 213. / 255.);
const vec3 TILE_FOREGROUND_COLOR = vec3(0.,0.,0.);


const float REQUIRED_BONUS_COLUMN = 12.;
const float TILE_COLUMN = 14.;

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

// Draw tile
uniform bool u_drawTile;

// Tile letter
uniform int u_tileLetter;

float crosshair(vec2 p) {
  if (p.x < 1.5 * u_world_from_canvas[0][0] && p.y < 0.5 * u_world_from_canvas[0][0])
    return 1.0;
  else
    return 0.0;
}

bool less_dist(vec2 v, float d) {
  return v.x * v.x + v.y * v.y < d * d;
}

float round_rect_sdf(vec2 position, vec2 halfSize, float cornerRadius) {
   position = abs(position) - halfSize + cornerRadius;
   return length(max(position, 0.0)) + min(max(position.x, position.y), 0.0) - cornerRadius;
}

// p is in [0,1] x [0,1].
// size is in [0,1]. if 1, it occupies the whole [0,1] x [0,1] square.
// if 0, it is a degenerate point at 0.5.
float round_rect_mask(vec2 p, float size, float sharp, float radius) {
  vec2 position = p - 0.5;
  vec2 halfSize = vec2(size, size) / 2.;
  return round_rect_sdf(position, halfSize, radius) < 0. ? 1.0 : 0.0;
  // float left = 0.5 - 0.5 * size;
  // float right = 0.5 + 0.5 * size;
  // return (p.x >= left && p.x <= right && p.y >= left && p.y <= right) ? 1.0 : 0.0;
}

float get_sharpness() {
  return 1. / (u_world_from_canvas[0][0] * 6.);
}

vec4 get_tile_pixel(vec2 p_in_tile, int letter) {
  vec2 font_coords = vec2(letter / int( NUM_FONT_CELLS_PER_SHEET), letter % int(NUM_FONT_CELLS_PER_SHEET));
  float sdf = texture(u_fontTexture, (p_in_tile + font_coords) / NUM_FONT_CELLS_PER_SHEET).r;
  float letter_amount = clamp(0.5 + get_sharpness() * (sdf - 0.5), 0., 1.);
  float outer_tile_amount = round_rect_mask(p_in_tile, 60./60., 1.0, 5./60.);
  float mez_tile_amount = round_rect_mask(p_in_tile, 56./60., 1.0, 3./60.);
  float inner_tile_amount = round_rect_mask(p_in_tile, 52./60., 1.0, 5./60.);
  vec4 background = vec4(TILE_DARK_COLOR, 0.);
  vec3 gradient = mix(TILE_LIGHT_COLOR, TILE_DARK_COLOR, clamp(2. * p_in_tile.y - 1., 0., 1.));
  background = mix(background, vec4(TILE_DARK_COLOR, 1.), outer_tile_amount);
  background = mix(background, vec4(gradient, 1.), mez_tile_amount);
  background = mix(background, vec4(TILE_MED_COLOR, 1.), inner_tile_amount);
  return mix(background, vec4(TILE_FOREGROUND_COLOR, 1.), letter_amount);
}

// p_in_world_fp is the fractional part of p_in_world. It is in [0,1]²
// sprite_coords is actually an ivec. It is in  [0,NUM_SPRITES_PER_SHEET]²
vec4 get_sprite_pixel(vec2 p_in_world_fp, vec2 sprite_coords) {
  // tile
  if (sprite_coords.x >= TILE_COLUMN) {
    int letter = int((sprite_coords.x - TILE_COLUMN) * NUM_SPRITES_PER_SHEET + sprite_coords.y);
    return get_tile_pixel(p_in_world_fp, letter);
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

vec4 getColor() {
  vec3 p_in_canvas = vec3(gl_FragCoord.xy, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_world = (u_world_from_canvas * p_in_canvas).xy;


  if (u_drawTile) {
    return get_tile_pixel(p_in_world, u_tileLetter);
  }

  vec2 p_in_world_int = floor(p_in_world);

  vec2 coords_within_chunk = p_in_world_int - u_chunk_origin_in_world;
  vec2 p_in_world_r = round(p_in_world);
  vec2 p_in_world_fp = p_in_world - floor(p_in_world); // fractional part

  vec2 sprite_coords = round(255.0 * texture(u_chunkDataTexture, (coords_within_chunk + vec2(0.5,0.5)) / float(CHUNK_SIZE) )).xy;

  float is_origin = float(u_chunk_origin_in_world == vec2(0.,0.) && coords_within_chunk == vec2(0.,0.));

  float vlen = length(p_in_world_fp - vec2(0.5));

  // origin alpha factor
  float oam = clamp(0.5 + 5. * get_sharpness() * (0.35 - vlen), 0., 1.)
    * clamp(0.5 + 5. * get_sharpness() * (vlen - 0.3), 0., 1.);

  vec4 origin_color = mix(vec4(0.,0.,0.,0.), vec4(0.,0.,0.,0.5), oam * is_origin);
  vec4 bgcolor = blendOver(origin_color, get_sprite_pixel(p_in_world_fp, sprite_coords));



  vec2 off = abs(p_in_world - p_in_world_r);
  float ch_amount = max(crosshair(off.xy), crosshair(off.yx));

  vec3 ch_color = mix(BOARD_BG_COLOR, vec3(0.), 0.4); // crosshairs color
  vec3 whiteBack = mix(BOARD_BG_COLOR, bgcolor.rgb, bgcolor.a);
  return vec4(mix(whiteBack, ch_color, ch_amount), 1.);
}

void main() {
  outputColor = getColor();
}
