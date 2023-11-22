
export type SplinePoint = {
  t: number,
  vec: number[],
}

export type Spline = SplinePoint[];

export function lerpSpline(spline: Spline, t: number): number[] {
  if (spline.length == 0)
    throw new Error(`can't interpolate empty spline`);
  if (spline.length == 1)
    return spline[0].vec;

  for (const [ix, after] of spline.entries()) {
    if (t < after.t) {
      if (ix == 0) {
        return spline[0].vec;
      }
      const before = spline[ix - 1];
      if (after.t - before.t == 0) {
        throw new Error(`illegal duplication of points in spline`);
      }
      const progress = (t - before.t) / (after.t - before.t);
      console.log(`t ${t} before.t ${before.t} after.t ${after.t} progress ${progress}`)
      if (before.vec.length != after.vec.length) {
        throw new Error(`mismatch of vector lengths in spine`);
      }
      return before.vec.map((bv, i) => {
        const av = after.vec[i];
        return progress * av + (1 - progress) * bv;
      });
    }
  }
  return spline[spline.length - 1].vec;
}
