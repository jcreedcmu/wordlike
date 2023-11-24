import { Draft } from 'immer';
import { Point } from '../util/types';
import { lerp, point_hash, unreachable } from '../util/util';
import { vadd, vdiv, vint, vm, vmn, vsnorm, vsub } from '../util/vutil';
import { deterministicLetterSample, getSample } from './distribution';
import { Layer, mkLayer } from './layer';
import { CoreState, Tile, TileEntity } from './state';
import { MoveTile } from './state-helpers';
import { incrementScore } from './scoring';

export type ScoringBonus =
  | { t: 'bonus' }
  | { t: 'bomb' }
  | { t: 'required', letter: string }
  | { t: 'consonant' }
  | { t: 'vowel' }
  | { t: 'copy' }
  ;

export type Bonus =
  | ScoringBonus
  | { t: 'empty' }
  | { t: 'block' }
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
    else
      return { t: 'bonus' };
  }
  function gradual(x: number): number {
    // graph in desmos: 1-\frac{1}{\log\left(1+x^{2}\right)+1}
    return 1 - 1 / (1 + Math.log(1 + x));
  }
  if (vsnorm(p) > 100 && perlinterpolate(blockOrigin, vsub(dp, blockOrigin), seed) < 0.5) {
    const ph = point_hash(p, seed + 1000);
    if (ph < 0.5) {
      return { t: 'required', letter: deterministicLetterSample(ph * 1e9) };
    }
    else if (ph < 0.53) {
      return { t: 'copy' };
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

type Scoring = {
  bonus: ScoringBonus,
  p: Point
};

export function adjacentScoringOfBonus(bonus: Bonus, p: Point): Scoring[] {
  switch (bonus.t) {
    case 'bonus': return [{ bonus, p }];
    case 'bomb': return [{ bonus, p }];
    case 'vowel': return [{ bonus, p }];
    case 'consonant': return [{ bonus, p }];
    case 'copy': return [{ bonus, p }];
    default: return [];
  }
}

export function overlapScoringOfBonus(bonus: Bonus, p: Point): Scoring[] {
  switch (bonus.t) {
    case 'required': return [{ bonus, p }];
    default: return [];
  }
}

export function resolveScoring(state: Draft<CoreState>, scoring: Scoring): void {
  const bonus = scoring.bonus;
  switch (bonus.t) {
    case 'bonus': incrementScore(state); return;
    case 'bomb': state.inventory.bombs++; return;
    case 'required': incrementScore(state, 10); return;
    case 'vowel': state.inventory.vowels += 5; return
    case 'consonant': state.inventory.consonants += 5; return
    case 'copy': state.inventory.copies += 3; return
  }
  unreachable(bonus);
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
