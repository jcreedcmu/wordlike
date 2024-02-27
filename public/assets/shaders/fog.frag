int is_fog(vec4 cell_data) {
  int ci = int(round(cell_data.b));
  return int((ci & 0x4) == 0);
}

// a map from [0,1] to [0,1] that keeps a lot of the function in the middle range
float fog_easing(float x) {
  return 0.5*x*x*x-1.5*x*x+2.*x; // derivative 2 at 0, derivative 0.5 at 1
  //  return 2.*x*x*x-3.*x*x+2.*x;
  //  return 3.*x*x*x-6.*x*x+4.*x; // derivative 3 at 0, derivative 1 at 1
  //  return 1.*x*x*x-3.*x*x+3.*x; // derivative 3 at 0, derivative 0 at 1
  //  return 1.*x*x*x-2.*x*x+2.*x; // derivative 2 at 0, derivative 1 at 1
  //  return -1.*x*x+2.*x; // derivative 2 at 0, derivative 0 at 1
  //  return sqrt(x);
}

/*
 * A function that takes in a point that is thought of as an offset
 * from a (visible) cell center, in world coordinates, and outputs a
 * number in [0,1] which is "how much fog" there should be there.
 *
 * Expecations:
 * - the entire visible cell is visible, i.e. x ∈ [-0.5,0.5]² ⇒ fog(x) = 0
 * - we don't "shed light" on any cells beyond those that are adjacent to us,
 *   i.e. x ∉ [-1.5,1.5]² ⇒ fog(x) = 1
 */
float fog_sdf(vec2 p) {
  // Thinking in terms of "Box - exact" SDF from https://iquilezles.org/articles/distfunctions2d/
  // except we don't need to be accurate in the interior of the box.
  vec2 d = abs(p) - vec2(0.5);
  return fog_easing(clamp(length(max(d, 0.0)), 0., 1.));
}

vec4 get_fog_pixel_aux(vec2 contrib_ul_in_prepass, vec2 offset_in_world, vec2 p_in_world_fp) {
  vec2 cell_center_in_prepass = contrib_ul_in_prepass + vec2(0.5,0.5) + offset_in_world;
  int bit = is_fog(round(255.0 * texture(u_cellPrepassTexture, cell_center_in_prepass / float(CELL_PREPASS_BUFFER_SIZE) )));

  vec2 sample_pt = p_in_world_fp - offset_in_world  - vec2(0.5);
  float circle = fog_sdf(sample_pt);
  float aa = 1.-((1.-float(bit)) *  (1.- circle)) ;
  return vec4(0.,0.,0.,aa);
}

vec4 get_fog_pixel(vec2 p_in_world) {
  // "fog-of-war" drawing

  vec2 p_in_world_int = floor(p_in_world);
  vec2 p_in_world_fp = p_in_world - p_in_world_int;

  vec2 ul_in_prepass = p_in_world_int - u_min_p_in_chunk * CHUNK_SIZE;

  // return min(min(min(
  //                    min(get_fog_pixel_aux(ul_in_prepass, vec2(0,0), p_in_world_fp),
  //                        get_fog_pixel_aux(ul_in_prepass, vec2(0,-1), p_in_world_fp)),
  //                    min(get_fog_pixel_aux(ul_in_prepass, vec2(0,1), p_in_world_fp),
  //                        get_fog_pixel_aux(ul_in_prepass, vec2(-1,0), p_in_world_fp))
  //                    ),
  //                min(
  //                    min(get_fog_pixel_aux(ul_in_prepass, vec2(-1,-1), p_in_world_fp),
  //                        get_fog_pixel_aux(ul_in_prepass, vec2(-1,1), p_in_world_fp)),
  //                    min(get_fog_pixel_aux(ul_in_prepass, vec2(1,0), p_in_world_fp),
  //                        get_fog_pixel_aux(ul_in_prepass, vec2(1,-1), p_in_world_fp))
  //                    )),
  //            get_fog_pixel_aux(ul_in_prepass, vec2(1,1), p_in_world_fp));

  return get_fog_pixel_aux(ul_in_prepass, vec2(0,0), p_in_world_fp)
     * get_fog_pixel_aux(ul_in_prepass, vec2(-1,0), p_in_world_fp)
     * get_fog_pixel_aux(ul_in_prepass, vec2(1,0), p_in_world_fp)
    * get_fog_pixel_aux(ul_in_prepass, vec2(0,-1), p_in_world_fp)
    * get_fog_pixel_aux(ul_in_prepass, vec2(-1,-1), p_in_world_fp)
    * get_fog_pixel_aux(ul_in_prepass, vec2(1,-1), p_in_world_fp)
    * get_fog_pixel_aux(ul_in_prepass, vec2(0,1), p_in_world_fp)
    * get_fog_pixel_aux(ul_in_prepass, vec2(-1,1), p_in_world_fp)
    * get_fog_pixel_aux(ul_in_prepass, vec2(1,1), p_in_world_fp)
    ;
}
