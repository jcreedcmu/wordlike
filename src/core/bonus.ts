import { Point } from '../util/types';
import { point_hash } from '../util/util';
import { vsnorm } from '../util/vutil';
import { deterministicLetterSample, getSample } from './distribution';
import { Layer, mkLayer } from './layer';
import { Tile, TileEntity } from './state';
import { MoveTile } from './state-helpers';

export type Bonus =
  | { t: 'bonus' }
  | { t: 'bomb' }
  | { t: 'empty' }
  | { t: 'block' }
  | { t: 'required', letter: string }
  ;

export function bonusGenerator(p: Point, seed: number): Bonus {
  if (vsnorm(p) <= 25) {
    return { t: 'empty' };
  }
  if (point_hash(p, seed) < 0.1) {
    const ph = point_hash(p, seed + 1000);
    if (ph < 0.1)
      return { t: 'bomb' };
    else
      return { t: 'bonus' };
  }
  function gradual(x: number): number {
    // graph in desmos: 1-\frac{1}{\log\left(1+x^{2}\right)+1}
    return 1 - 1 / (1 + Math.log(1 + x));
  }
  if (point_hash(p, seed) < gradual((p.x * p.x + p.y * p.y) / 1000)) {
    const ph = point_hash(p, seed + 1000);
    if (ph < 0.5) {
      return { t: 'required', letter: deterministicLetterSample(ph * 1e9) };
    }
    else {
      return { t: 'block' };
    }
  }
  return { t: 'empty' };
}

export function mkBonusLayer(seed: number): Layer<Bonus> {
  return mkLayer('bonus', p => bonusGenerator(p, seed));
}

export function isBlocking(tile: MoveTile, bonus: Bonus): boolean {
  if (bonus.t == 'empty')
    return false;
  if (bonus.t == 'required') {
    return !(bonus.letter == tile.letter);
  }
  return true;
}

export type BonusLayerId = string;
const _cachedBonusLayer: Record<BonusLayerId, Layer<Bonus>> = {};

const DETERMINISTIC_SEED = 46;
export function getBonusLayer(name: string): Layer<Bonus> {
  if (_cachedBonusLayer[name] == undefined) {
    _cachedBonusLayer[name] = mkBonusLayer(name == 'game' ? Date.now() : DETERMINISTIC_SEED);
  }
  return _cachedBonusLayer[name];
}
