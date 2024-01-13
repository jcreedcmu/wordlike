// Size of the 'screen' in pixels
uniform vec2 u_canvasSize;

// Transformation matrix
uniform mat3 u_world_from_canvas;

// Font Sheet
uniform sampler2D u_fontTexture;

const vec3 TILE_LIGHT_COLOR= vec3( 0.9490196078431372, 0.8117647058823529, 0.4627450980392157 );
const vec3 TILE_DARK_COLOR = vec3( 0.8, 0.5725490196078431, 0.023529411764705882 );
const vec3 TILE_MED_COLOR = vec3( 0.8980392156862745, 0.7294117647058823, 0.2901960784313726 );
const vec3 TILE_FOREGROUND_COLOR = vec3(0.,0.,0.);

const float NUM_FONT_CELLS_PER_SHEET = 8.; // in both directions

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
