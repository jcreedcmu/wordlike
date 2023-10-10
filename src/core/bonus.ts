import { Point } from '../util/types';
import { point_hash } from '../util/util';

export type Bonus =
  | 'bonus'
  | 'empty';

export function bonusGenerator(p: Point): Bonus {
  if (point_hash(p) < 0.1) {
    return 'bonus';
  }
  return 'empty';
}
