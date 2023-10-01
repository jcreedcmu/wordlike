import { apply, compose, ident, inverse, mkSE2, scale, translate } from '../src/util/se2';
import { Point } from '../src/util/types';

const xform1 = translate({ x: 1, y: 5 });
const xform2 = scale({ x: 2, y: 5 });
const xform3 = mkSE2({ x: 2, y: 5 }, { x: 1, y: 3 });
const point: Point = { x: 10, y: 100 };

describe('apply', () => {

  test(`should work correctly on trivial examples`, () => {
    expect(apply(xform1, { x: 10, y: 30 })).toEqual({ x: 11, y: 35 });
    expect(apply(xform2, { x: 10, y: 30 })).toEqual({ x: 20, y: 150 });
    expect(apply(xform3, point)).toEqual({ x: 21, y: 503 });
  });

  test(`should be group action with respect to compose`, () => {
    for (const [xa, xb] of [[xform1, xform2], [xform2, xform3], [xform1, xform3], [xform3, xform1]]) {
      expect(apply(xa, apply(xb, point))).toEqual(apply(compose(xa, xb), point));
    }
  });

});

describe('inverse', () => {

  test(`should satisfy the inverse law`, () => {
    for (const xf of [xform1, xform2, xform3]) {
      expect(compose(xf, inverse(xf))).toEqual(ident());
    }
  });

});
