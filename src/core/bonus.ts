import { Point } from '../util/types';
import { point_hash } from '../util/util';

export type Bonus =
  | 'bonus'
  | 'empty'
  | 'block';

export function bonusGenerator(p: Point): Bonus {
  if (point_hash(p) < 0.1) {
    return 'bonus';
  }
  if (point_hash(p) < 0.1 + (p.x * p.x + p.y * p.y) / 1000) {
    return 'block';
  }
  return 'empty';
}
