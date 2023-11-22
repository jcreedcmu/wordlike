import { Spline, lerpSpline } from '../src/util/spline';

describe('lerpSpline', () => {
  test('should work correctly', () => {
    const spline: Spline = [
      { t: 0, vec: [1, 2, 3] },
      { t: 0.75, vec: [10, 11, 12] },
      { t: 1, vec: [20, 1, 2] },
    ];
    expect(lerpSpline(spline, -1)).toEqual([1, 2, 3]);
    expect(lerpSpline(spline, 0)).toEqual([1, 2, 3]);
    expect(lerpSpline(spline, 0.25)).toEqual([4, 5, 6]);
    expect(lerpSpline(spline, 0.875)).toEqual([15, 6, 7]);
    expect(lerpSpline(spline, 1)).toEqual([20, 1, 2]);
    expect(lerpSpline(spline, 2)).toEqual([20, 1, 2]);
  })
});
