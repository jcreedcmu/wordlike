import { Point } from '../util/types';
import { lerp, point_hash } from '../util/util';
import { vadd, vdiv, vint, vm, vsnorm, vsub } from '../util/vutil';
import { deterministicLetterSample } from './distribution';
import { Layer, mkLayer } from './layer';
import { AbstractLetter } from './letters';

export type Scoring = {
  bonus: ScoringBonus | { t: 'wordAchieved', word: string },
  p_in_world_int: Point,
  destroy: boolean,
};

export type ScoringBonus =
  | { t: 'tree' }
  | { t: 'mountain' }
  | { t: 'bomb' }
  | { t: 'required', letter: AbstractLetter }
  | { t: 'consonant' }
  | { t: 'vowel' }
  | { t: 'copy' }
  | { t: 'word' }
  | { t: 'time' }
  | { t: 'dynamite' }
  | { t: 'magnifying-glass' }
  ;

export type Bonus =
  | ScoringBonus
  | { t: 'empty' }
  | { t: 'water' }
  ;

const BLOCK_SIZE = 5;

// maps [0,1] to [0,1], and has zero derivative at 0 and 1
function smoothStep(x: number): number {
  return (6 * x * x - 15 * x + 10) * x * x * x;
}

// fraction should have both coordinates in [0,1]
export function perlinterpolate(p_int: Point, fraction: Point, seed: number): number {
  const ps = [
    point_hash(p_int, seed),
    point_hash(vadd({ x: 1, y: 0 }, p_int), seed),
    point_hash(vadd({ x: 0, y: 1 }, p_int), seed),
    point_hash(vadd({ x: 1, y: 1 }, p_int), seed),
  ];
  const ts = vm(fraction, smoothStep);
  return lerp(lerp(ps[0], ps[1], ts.x), lerp(ps[2], ps[3], ts.x), ts.y);
}

export function bonusGenerator(p: Point, seed: number): Bonus {
  if (vsnorm(p) <= 25) {
    return { t: 'empty' };
  }

  const dp = vdiv(p, BLOCK_SIZE);
  const blockOrigin = vint(dp);

  if (point_hash(p, seed) < 0.1) {
    const ph = point_hash(p, seed + 1000);
    if (ph < 0.1) {
      return { t: 'bomb' };
    }
    else if (ph < 0.12) {
      return { t: 'consonant' };
    }
    else if (ph < 0.2) {
      return { t: 'vowel' };
    }
    else if (ph < 0.4) {
      return { t: 'dynamite' };
    }
    else if (ph < 0.5) {
      return { t: 'mountain' };
    }
    else if (ph < 0.6) {
      return { t: 'magnifying-glass' };
    }
    else
      return { t: 'tree' };
  }
  if (vsnorm(p) > 100 && perlinterpolate(blockOrigin, vsub(dp, blockOrigin), seed) < 0.5) {
    const ph = point_hash(p, seed + 1000);
    if (ph < 0.5) {
      return { t: 'required', letter: { t: 'single', letter: deterministicLetterSample(ph * 1e9) } };
    }
    else if (ph < 0.53) {
      return { t: 'copy' };
    }
    else if (ph < 0.6) {
      return { t: 'word' };
    }
    else if (ph < 0.62) {
      return { t: 'time' };
    } else {
      return { t: 'water' };
    }
  }
  return { t: 'empty' };
}

export function mkBonusLayer(seed: number): Layer<Bonus> {
  return mkLayer('bonus', p => bonusGenerator(p, seed));
}

export function isBlockingPoint(bonus: Bonus): boolean {
  if (bonus.t == 'empty')
    return false;
  if (bonus.t == 'required') {
    return true;
  }
  return true;
}

export function adjacentScoringOfBonus(bonus: Bonus, p_in_world_int: Point): Scoring[] {
  switch (bonus.t) {
    case 'tree': return [{ bonus, p_in_world_int, destroy: true }];
    case 'bomb': return [{ bonus, p_in_world_int, destroy: true }];
    case 'vowel': return [{ bonus, p_in_world_int, destroy: true }];
    case 'consonant': return [{ bonus, p_in_world_int, destroy: true }];
    case 'copy': return [{ bonus, p_in_world_int, destroy: true }];
    case 'word': return [{ bonus, p_in_world_int, destroy: true }];
    case 'time': return [{ bonus, p_in_world_int, destroy: true }];
    case 'dynamite': return [{ bonus, p_in_world_int, destroy: true }];
    case 'required': return [];
    case 'empty': return [];
    case 'water': return [];
    case 'mountain': return [{ bonus, p_in_world_int, destroy: true }];
    case 'magnifying-glass': return [{ bonus, p_in_world_int, destroy: true }];
  }
}

export function overlapScoringOfBonus(bonus: Bonus, p_in_world_int: Point): Scoring[] {
  switch (bonus.t) {
    case 'required': return [{ bonus, p_in_world_int, destroy: true }];
    default: return [];
  }
}

// Bonus Layer Generation

export type BonusLayerId = string;
const _cachedBonusLayer: Record<BonusLayerId, Layer<Bonus>> = {};

const DETERMINISTIC_SEED = 46;
export function getBonusLayer(seed: number = DETERMINISTIC_SEED): Layer<Bonus> {
  const name = `game-${seed}`;
  if (_cachedBonusLayer[name] == undefined) {
    _cachedBonusLayer[name] = mkBonusLayer(seed);
  }
  return _cachedBonusLayer[name];
}
