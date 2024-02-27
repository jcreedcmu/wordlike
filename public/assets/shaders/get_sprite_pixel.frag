const float REQUIRED_BONUS_COLUMN = 12.;
const float NUM_SPRITES_PER_SHEET = 16.; // in both directions
const float SPRITE_SIZE = 32.;

// Sprite Sheet
uniform sampler2D u_spriteTexture;

// p_in_sprite is the fractional part of p_in_world. It is in [0,1]²
// sprite_coords is actually an ivec. It is in  [0,NUM_SPRITES_PER_SHEET]²
vec4 get_sprite_pixel(vec2 p_in_sprite, vec2 sprite_coords) {

  // required letter bonus
  if (sprite_coords.x >= REQUIRED_BONUS_COLUMN) {
    int letter = int((sprite_coords.x - REQUIRED_BONUS_COLUMN) * NUM_SPRITES_PER_SHEET + sprite_coords.y);
    vec2 font_coords = vec2(letter / int( NUM_FONT_CELLS_PER_SHEET), letter % int(NUM_FONT_CELLS_PER_SHEET));
    float sdf = texture(u_fontTexture, (p_in_sprite + font_coords) / NUM_FONT_CELLS_PER_SHEET).r;
    float amount = clamp(0.5 + get_sharpness() * (sdf - 0.5), 0., 1.);
    return vec4(vec3(0.,0.,1.), mix(0.0, 0.5, amount));
  }

  // Avoid glitches due to sprites leaking into each other on the sheet with
  // linear interpolation.
  p_in_sprite = clamp(p_in_sprite, 0.5/SPRITE_SIZE, 1. - 1./SPRITE_SIZE);

  return texture(u_spriteTexture, (p_in_sprite + sprite_coords) / NUM_SPRITES_PER_SHEET);
}
