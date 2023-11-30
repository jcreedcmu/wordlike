#version 300 es

const int CHUNK_SIZE = 16;

precision mediump float;
in vec2 v_uv; // range is [0,1] x [0,1]
out vec4 outputColor;

// World coordinates of the origin of the chunk
uniform vec2 u_chunk_origin_in_world;

// Size of the 'screen' in pixels
uniform vec2 u_canvasSize;

// Transformation matrix
uniform mat3 u_world_from_canvas;

// Sprite sheet
uniform sampler2D u_spriteTexture;

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

vec4 getColor() {
  vec3 p_in_canvas = vec3(v_uv * u_canvasSize, 1.0);
  p_in_canvas.y = u_canvasSize.y - p_in_canvas.y;
  vec2 p_in_world = (u_world_from_canvas * p_in_canvas).xy;

  vec2 p_in_world_int = floor(p_in_world);

  vec2 coords_within_chunk = p_in_world_int - u_chunk_origin_in_world;
  vec2 p_in_world_r = round(p_in_world);
  vec2 p_in_world_fp = p_in_world - floor(p_in_world);

  if (p_in_world_fp.y < 0.3) {
    return texture(u_chunkDataTexture, (coords_within_chunk + vec2(0.5,0.5)) / float(CHUNK_SIZE) );
  }

  if (p_in_world_int == vec2(0.,0.) && less_dist(p_in_world - p_in_world_int - vec2(0.5,0.5), 0.25)) {
    return vec4(0.5,0.5,0.5,1.);
  }


  vec2 off = abs(p_in_world - p_in_world_r);
  float ch_amount = max(crosshair(off.xy), crosshair(off.yx));
  vec4 bgcolor = texture(u_spriteTexture, (p_in_world_fp + vec2(1.,1.)) / 8. );
  vec3 whiteBack = bgcolor.rgb * bgcolor.a + vec3(1.) * (1. - bgcolor.a);
  return ch_amount * vec4(.06,.45,.64,1.) + (1.-ch_amount) * vec4(whiteBack, 1.);
}

void main() {
  outputColor = getColor();
}
