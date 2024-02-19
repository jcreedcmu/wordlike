import { Energies, distributionOf, getClass, getLetterSampleOf, getSample, initialEnergiesOf } from '../src/core/distribution';

describe('getSample', () => {

  test(`should work approximately as expected`, () => {

    const samples = [];
    let seed = 124;
    for (let i = 0; i < 20; i++) {
      const b = getSample(seed, [0.1, 0.3, 0.6]);
      seed = b.seed;
      samples.push(b.sample);
    }

    expect(samples).toEqual([
      2, 2, 2, 2, 2,
      1, 0, 2, 2, 2,
      1, 2, 1, 1, 1,
      0, 2, 2, 2, 2
    ]);
  });
});

describe('currentDistributionOf', () => {

  test(`should work as expected`, () => {
    expect(distributionOf(initialEnergiesOf([1, 4], 1), 1)).toEqual([0.2, 0.8]);
  });

});

describe('getLetterSample', () => {

  test(`should work approximately as expected`, () => {

    const samples = [];
    let energies: Energies = { byLetter: [0, 0, 0, 0, 0], byClass: [1, 1] };
    const letterDistribution = { A: 1, B: 3, C: 2, D: 1, E: 3 };
    const classDistribution = [
      1, // vowels,
      2, // consonants,
    ];
    const alphabet = ['A', 'B', 'C', 'D', 'E'];
    const counts: Record<string, number> = {};
    let seed = 121;
    for (let i = 0; i < 1000; i++) {
      const b = getLetterSampleOf(seed, energies, letterDistribution, classDistribution, alphabet, 1, 10, undefined);
      seed = b.seed;
      energies = b.energies;
      samples.push(b.letter);
      counts[b.letter] = (counts[b.letter] ?? 0) + 1;
    }

    expect(Math.abs(3 - counts.E / counts.A)).toBeLessThan(0.1);
    expect(Math.abs(2 - (counts.B + counts.C + counts.D) / (counts.A + counts.E))).toBeLessThan(0.1);


  });
});

describe('getClass', () => {
  describe('should be correct', () => {
    expect(getClass('A'.charCodeAt(0) - 65)).toBe(0);
    expect(getClass('E'.charCodeAt(0) - 65)).toBe(0);
    expect(getClass('I'.charCodeAt(0) - 65)).toBe(0);
    expect(getClass('O'.charCodeAt(0) - 65)).toBe(0);
    expect(getClass('U'.charCodeAt(0) - 65)).toBe(0);
    expect(getClass('Y'.charCodeAt(0) - 65)).toBe(1);
    expect(getClass('C'.charCodeAt(0) - 65)).toBe(1);
  });
});
