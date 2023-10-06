import { distributionOf, getLetterSampleOf, getSample, initialEnergiesOf } from '../src/core/distribution';

describe('getSample', () => {

  test(`should work approximately as expected`, () => {

    const samples = [];
    let seed = 124;
    let sample = 0;
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
    expect(distributionOf(initialEnergiesOf({ 'a': 1, 'e': 4 }, 1), 1)).toEqual([0.2, 0.8]);
  });

});

describe('getLetterSample', () => {

  test(`should work approximately as expected`, () => {

    const samples = [];
    let energies = [10, 0];
    const letterDistribution = { a: 3, b: 1 };
    const alphabet = ['a', 'b'];
    let seed = 124;
    let sample = 0;
    for (let i = 0; i < 40; i++) {
      const b = getLetterSampleOf(seed, energies, letterDistribution, alphabet, 1, 1);
      seed = b.seed;
      energies = b.energies;
      samples.push(b.letter);
    }
    expect(samples).toEqual([
      // We heavily biased the energy vector in b's favor so we see a
      // bunch of b's initially
      'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b',
      // But eventually that bias runs out and we see roughly a 3-to-1
      // ratio of a's to b's after we catch up
      'a', 'b', 'a', 'a', 'a',
      'a', 'b', 'a', 'a', 'b',
      'a', 'a', 'b', 'a', 'a',
      'a', 'b', 'b', 'a', 'a',
      'a', 'b', 'a', 'a', 'b',
      'a', 'a', 'a', 'a', 'a'
    ]);

  });
});
