import { checkConnected, checkGridWordsHoriz, mkGrid, transpose } from '../src/core/grid';
import { Tile } from '../src/core/state';

function isWord(word: string): boolean {
  return word == 'foo' || word == 'fumble' || word == 'baz' || word == 'the' || word == 'nib';
}

function tilesOfString(x: string): Tile[] {
  return x.replace(/^\n/, '').split('\n').flatMap((line, y) => line.split('').flatMap((letter, x) => {
    if (letter == '.')
      return [];
    const tile: Tile = { letter, p_in_world_int: { x, y }, used: false };
    return [tile];
  }));
}

const tiles1: Tile[] = tilesOfString(`
.......t
.......h
..fumble
..o..a..
nib..z..
`);

const tiles2: Tile[] = tilesOfString(`
.......t
.......h
..fumble
..o..a..
..o..z.q
`);

describe('mkGrid', () => {
  test('should work', () => {
    expect(mkGrid(tiles1).rect.sz).toEqual({ x: 7, y: 4 });
  });

});

describe('checkGridWordsHoriz', () => {
  test('should work', () => {
    expect(checkGridWordsHoriz(mkGrid(tiles1), isWord)).toEqual(true);
    expect(checkGridWordsHoriz(transpose(mkGrid(tiles1)), isWord)).toEqual(false);

    // even though q is not a valid word, it's only length 1. The
    // connectedness test is what invalidates it.
    expect(checkGridWordsHoriz(mkGrid(tiles2), isWord)).toEqual(true);
  });

});

describe('checkConnected', () => {
  test('should work', () => {
    expect(checkConnected(mkGrid(tiles1))).toEqual(true);
    expect(checkConnected(mkGrid(tiles2))).toEqual(false);
  });

});
