import { DEBUG } from "../util/debug";
import { produce } from "../util/produce";
import { next_rand } from "../util/util";
import { GameState } from "./state";

// contains 26 values. The probability of a letter being picked next
// is proportional to e^{-βE}
export type Energies = number[];

// contains 26 values, which sum to 1
export type Probs = number[];

// thermodynamic β
const default_beta = 2;

// proportionality constant for how much to adjust energies by
const default_increment = 4;

// returns a 26-length list of probabilities
export function currentDistribution(state: GameState): Probs {
  return distributionOf(state.energies, default_beta);
}

export function distributionOf(energies: Energies, beta: number): Probs {
  const unnormalizedProbs = energies.map(energy => Math.exp(-beta * energy));
  const sum = unnormalizedProbs.reduce((a, b) => a + b);
  return unnormalizedProbs.map(prob => prob / sum);
}

export const letterDistribution: Record<string, number> = {
  a: 8,
  b: 3,
  c: 4,
  d: 4,
  e: 12,
  f: 2,
  g: 4,
  h: 3,
  i: 8,
  j: 1,
  k: 1,
  l: 6,
  m: 3,
  n: 8,
  o: 7,
  p: 3,
  q: 1,
  r: 8,
  s: 5,
  t: 8,
  u: 4,
  v: 2,
  w: 2,
  x: 1,
  y: 2,
  z: 1,
};

const alphabet = Object.keys(letterDistribution).sort();

export function initialEnergies(): Energies {
  return initialEnergiesOf(letterDistribution, default_beta);
}

export function initialEnergiesOf(letterDistribution: Record<string, number>, beta: number): Energies {
  const energies: number[] = [];
  return Object.keys(letterDistribution).sort().map(letter =>
    (1 / beta) * Math.log(1 / letterDistribution[letter])
  );
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

export function getLetterSampleOf(seed0: number, energies0: Energies, letterDistribution: Record<string, number>, alphabet: string[], beta: number, increment: number): { seed: number, letter: string, energies: Energies } {
  const { seed, sample } = getSample(seed0, distributionOf(energies0, beta));
  const letter = alphabet[sample];
  const energies = produce(energies0, e => { e[sample] += increment / letterDistribution[letter] });
  return { seed, energies, letter };
}

export function getLetterSample(seed0: number, energies0: Energies): { seed: number, letter: string, energies: Energies } {
  return getLetterSampleOf(seed0, energies0, letterDistribution, alphabet, default_beta, default_increment);
}
