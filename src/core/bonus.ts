import { Point } from '../util/types';
import { point_hash } from '../util/util';
import { vsnorm } from '../util/vutil';
import { Layer, mkLayer } from './layer';

export type Bonus =
  | 'bonus'
  | 'empty'
  | 'block';

export function bonusGenerator(p: Point, seed: number): Bonus {
  if (vsnorm(p) <= 25) {
    return 'empty';
  }
  if (point_hash(p, seed) < 0.1) {
    return 'bonus';
  }
  if (point_hash(p, seed) < 0.1 + (p.x * p.x + p.y * p.y) / 1000) {
    return 'block';
  }
  return 'empty';
}

export function mkBonusLayer(seed: number): Layer<Bonus> {
  return mkLayer('bonus', p => bonusGenerator(p, seed));
}

export function isBlocking(bonus: Bonus): boolean {
  return bonus != 'empty';
}
