import { checkConnected, checkGridWordsHoriz, checkGridWordsVert, getGrid, mkGrid, transpose } from '../src/core/grid';
import { Tile, TileOptionalId } from '../src/core/state';
import { ensureTileId } from '../src/core/tile-id-helpers';
import { vequal } from '../src/util/vutil';

function isWord(word: string): boolean {
  return word == 'foo' || word == 'fumble' || word == 'baz' || word == 'the' || word == 'nib';
}

function tilesOfString(x: string): Tile[] {
  return x.replace(/^\n/, '').split('\n').flatMap((line, y) => line.split('').flatMap((letter, x) => {
    if (letter == '.')
      return [];
    return [ensureTileId({ letter, p_in_world_int: { x, y } })];
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

describe('checking words', () => {

  test('works horizontally', () => {
    const horizResults = checkGridWordsHoriz(mkGrid(tiles1), isWord);

    expect(horizResults.validWords).toEqual([
      { word: 'fumble', p: { x: 2, y: 2 }, orientation: { x: 1, y: 0 } },
      { word: 'nib', p: { x: 0, y: 4 }, orientation: { x: 1, y: 0 } },
    ]);

    expect(horizResults.invalidWords).toEqual([]);
  });

  test('works vertically', () => {
    const vertResults = checkGridWordsVert(mkGrid(tiles1), isWord);
    expect(vertResults.invalidWords).toEqual([
      { word: 'fob', p: { x: 2, y: 2 }, orientation: { x: 0, y: 1 } },
    ]);

    expect(vertResults.validWords).toEqual([
      { word: 'baz', p: { x: 5, y: 2 }, orientation: { x: 0, y: 1 } },
      { word: 'the', p: { x: 7, y: 0 }, orientation: { x: 0, y: 1 } },
    ]);
  });

  test('is not distracted by isolated single letters', () => {
    // even though q is not a valid word, it's only length 1. The
    // connectedness test is what invalidates the overall layout.
    expect(checkGridWordsHoriz(mkGrid(tiles2), isWord).invalidWords.length).toEqual(0);
  });

});

describe('checkConnected', () => {
  test('should work', () => {
    const cr1 = checkConnected(mkGrid(tiles1), { x: 2, y: 4 });
    expect(cr1.allConnected).toEqual(true);
    const cr2 = checkConnected(mkGrid(tiles2), { x: 2, y: 4 });
    expect(cr2.allConnected).toEqual(false);
    expect(getGrid(cr2.connectedSet, { x: 7, y: 4 })).toBe(undefined);
    expect(getGrid(cr2.connectedSet, { x: 5, y: 4 })).toBe(true);
  });

});
