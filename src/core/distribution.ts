import { DEBUG } from "../util/debug";
import { produce } from "../util/produce";
import { next_rand } from "../util/util";
import { CoreState, GameState } from "./state";

type LetterClass = 0 | 1;

export type DrawForce = undefined | 'vowel' | 'consonant';

export function getClass(index: number): LetterClass {
  return [0, 4, 8, 14, 20].includes(index) ? 0 : 1;
}

export type Energies =
  {
    // contains 26 values. The probability of a letter being picked next
    // is proportional to e^{-βE}
    byLetter: number[],
    byClass: number[], // vowel, consonant
  }

// contains 26 values, which sum to 1
export type Probs = number[];

// thermodynamic β
const default_beta = 2;

// proportionality constant for how much to adjust energies by
const default_increment = 4;

// Takes in a list of energies, returns a list of probabilities
export function distributionOf(energies: number[], beta: number): number[] {
  const minEnergy = Math.min(...energies);
  const calibratedEnergies = energies.map(e => e - minEnergy);
  const unnormalizedProbs = calibratedEnergies.map(energy => Math.exp(-beta * energy));
  const sum = unnormalizedProbs.reduce((a, b) => a + b);
  return unnormalizedProbs.map(prob => prob / sum);
}

const letterDistribution: Record<string, number> = {
  a: 10,
  b: 3,
  c: 4,
  d: 4,
  e: 14,
  f: 2,
  g: 4,
  h: 3,
  i: 10,
  j: 1,
  k: 1,
  l: 6,
  m: 3,
  n: 8,
  o: 9,
  p: 3,
  q: 1,
  r: 8,
  s: 5,
  t: 8,
  u: 6,
  v: 2,
  w: 2,
  x: 1,
  y: 2,
  z: 1,
};

const alphabet = Object.keys(letterDistribution).sort();
const letterDistributionNumbers = alphabet.map(letter => letterDistribution[letter]);
const initialLetterProbs = distributionOf(initialEnergiesOf(letterDistributionNumbers, 1), 1);

export function deterministicLetterSample(seed: number): string {
  return alphabet[getSample(seed, initialLetterProbs).sample];
}

function mkClassDistribution(): number[] {
  let counts = [0, 0];
  Object.keys(letterDistribution).forEach(k => {
    counts[getClass(k.charCodeAt(0) - 97)] += letterDistribution[k]
  });
  return counts;
}

const classDistribution = mkClassDistribution();

export function initialEnergies(): Energies {
  return {
    byLetter: initialEnergiesOf(letterDistributionNumbers, default_beta),
    byClass: initialEnergiesOf(classDistribution, default_beta),
  };
}

export function initialEnergiesOf(distribution: number[], beta: number): number[] {
  const energies: number[] = [];
  return distribution.map(v => (1 / beta) * Math.log(1 / v));
}

export function getSample(seed0: number, probs: Probs): { sample: number, seed: number } {
  const { seed, float } = next_rand(seed0);
  if (DEBUG.letterSample) {
    console.log(`float: ${float}`);
    let s = `probs:`;
    let dsum = 0;
    for (let i = 0; i < probs.length; i++) {
      dsum += probs[i];
      s += `\n${String.fromCharCode(97 + i)}: ${dsum}`;
    }
    console.log(s);
  }
  let sample = 0;
  let sum = 0;
  for (let i = 0; i < probs.length; i++) {
    sum += probs[i];
    if (float < sum) {
      sample = i;
      break;
    }
  }
  return { sample, seed };
}

function forceClassSample(classSample: number, drawForce: DrawForce): number {
  if (drawForce === undefined)
    return classSample;
  switch (drawForce) {
    case 'vowel': return 0;
    case 'consonant': return 1;
  }
}

export function getLetterSampleOf(seed0: number, energies0: Energies, letterDistribution: Record<string, number>, classDistribution: number[], alphabet: string[], beta: number, increment: number, drawForce: DrawForce): { seed: number, letter: string, energies: Energies } {

  const { seed: seed1, sample: classSample } = getSample(seed0, distributionOf(energies0.byClass, beta));
  const forcedClassSample = forceClassSample(classSample, drawForce);
  const modifiedLetterEnergies = energies0.byLetter.map((energy, ix) => getClass(ix) == forcedClassSample ? energy : Infinity);
  const { seed: seed2, sample: letterSample } = getSample(seed1, distributionOf(modifiedLetterEnergies, beta));
  const letter = alphabet[letterSample];
  const energies = produce(energies0, e => {
    e.byClass[forcedClassSample] += increment / classDistribution[forcedClassSample];
    e.byLetter[letterSample] += increment / letterDistribution[letter];
  });

  return { seed: seed2, energies, letter };
}

export function getLetterSample(seed0: number, energies0: Energies, drawForce: DrawForce): { seed: number, letter: string, energies: Energies } {
  return getLetterSampleOf(seed0, energies0, letterDistribution, classDistribution, alphabet, default_beta, default_increment, drawForce);
}
