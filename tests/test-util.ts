import { Rect } from '../src/util/types';
import { scaleRectToCenter } from '../src/util/util';

describe('scaleRectToCenter', () => {
  test('should work with growing simple square', () => {
    const rect: Rect = { p: { x: 0, y: 0 }, sz: { x: 100, y: 100 } };
    const out = scaleRectToCenter(rect, 2);
    expect(out).toEqual({ p: { x: -50, y: -50 }, sz: { x: 200, y: 200 } });
  });

  test('should work with shrinking square', () => {
    const rect: Rect = { p: { x: 0, y: 0 }, sz: { x: 100, y: 100 } };
    const out = scaleRectToCenter(rect, 1 / 10);
    expect(out).toEqual({ p: { x: 45, y: 45 }, sz: { x: 10, y: 10 } });
  });

  test('should work with shrinking rectangle', () => {
    const rect: Rect = { p: { x: 100, y: 100 }, sz: { x: 100, y: 200 } };
    const out = scaleRectToCenter(rect, 1 / 10);
    expect(out).toEqual({ p: { x: 145, y: 190 }, sz: { x: 10, y: 20 } });
  });

});
