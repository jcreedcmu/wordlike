import { checkGridHoriz, mkGrid, transpose } from '../src/core/grid';
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

const tiles: Tile[] = tilesOfString(`
.......t
.......h
..fumble
..o..a..
nib..z..
`);

describe('mkGrid', () => {
  test('should work', () => {
    expect(mkGrid(tiles).rect.sz).toEqual({ x: 7, y: 4 });
  });

});

describe('checkGridHoriz', () => {
  test('should work', () => {
    expect(checkGridHoriz(mkGrid(tiles), isWord)).toEqual(true);
    expect(checkGridHoriz(transpose(mkGrid(tiles)), isWord)).toEqual(false);
  });

});
