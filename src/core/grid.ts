import { DEBUG } from "../util/debug";
import { Point, Rect } from "../util/types";
import { boundRect } from "../util/util";
import { vtrans } from "../util/vutil";
import { AbstractLetter, stringOfLetter } from "./letters";
import { MainTile, TileNoId } from './state-types';

// Implements a spatially-bounded sparse map from coordinates to T

export type Grid<T> = {
  rect: Rect,
  elems: Record<string, T>
};

function parseCoord(x: string): Point {
  const parts = x.split(',');
  return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
}

function unparseCoord(p: Point): string {
  return `${p.x},${p.y}`;
}

export function getGrid<T>(grid: Grid<T>, p: Point): T {
  return grid.elems[unparseCoord(p)];
}

// XXX: doesn't update bounds
function setGrid<T>(grid: Grid<T>, p: Point, v: T): void {
  grid.elems[unparseCoord(p)] = v;
}

function isSetGrid<T>(grid: Grid<T>, p: Point): boolean {
  return getGrid(grid, p) !== undefined;
}

// returns how many elements in grid are defined
function numSet<T>(grid: Grid<T>): number {
  let rv = 0;
  for (let yo = 0; yo <= grid.rect.sz.y; yo++) {
    const y = yo + grid.rect.p.y;
    for (let xo = 0; xo <= grid.rect.sz.x + 1; xo++) {
      const x = xo + grid.rect.p.x;
      if (isSetGrid(grid, { x, y })) {
        rv++;
      }
    }
  }
  return rv;
}


export function emptyGrid<T>(): Grid<T> {
  return {
    rect: boundRect([]),
    elems: {}
  };
}

export function mkGridOf<T>(elms: { p: Point, v: T }[]): Grid<T> {
  const elems: Record<string, T> = {};
  elms.forEach(elm => {
    elems[unparseCoord(elm.p)] = elm.v;
  });
  return {
    rect: boundRect(elms.map(elm => elm.p)),
    elems
  };
}

export function mkGrid(tiles: TileNoId[]): Grid<AbstractLetter> {
  const elems: Record<string, AbstractLetter> = {};
  tiles.forEach(tile => {
    elems[unparseCoord(tile.p_in_world_int)] = tile.letter;
  });
  return {
    rect: boundRect(tiles.map(tile => tile.p_in_world_int)),
    elems
  };
}

export function mkGridOfMainTiles(tiles: MainTile[]): Grid<AbstractLetter> {
  const elems: Record<string, AbstractLetter> = {};
  tiles.forEach(tile => {
    elems[unparseCoord(tile.loc.p_in_world_int)] = tile.letter;
  });
  return {
    rect: boundRect(tiles.map(tile => tile.loc.p_in_world_int)),
    elems
  };
}

export function transpose<T>(grid: Grid<T>): Grid<T> {
  const elems: Record<string, T> = {};
  for (const k of Object.keys(grid.elems)) {
    elems[unparseCoord(vtrans(parseCoord(k)))] = grid.elems[k];
  }
  return {
    rect: { p: vtrans(grid.rect.p), sz: vtrans(grid.rect.sz) },
    elems
  }
}

export type LocatedWord = {
  p: Point,
  orientation: Point, // {x:1,y:0} or {x:0,y:1}
  word: string,
  length: number, // this is measured in tiles, which may not be equal to `word.length` as a string
}

export type CheckResult = {
  validWords: LocatedWord[],
  invalidWords: LocatedWord[]
};

// returns true if every horizontally-consecutive sequence of at least
// 2 characters in grid is a word according to isWord.
export function checkGridWordsHoriz(grid: Grid<AbstractLetter>, isWord: (x: string) => boolean): CheckResult {
  let validWords: LocatedWord[] = [];
  let invalidWords: LocatedWord[] = [];
  let wordSoFar = '';
  let wordLengthSoFar = 0;
  // returns false if we've discovered a non-word
  function endWord(p: Point) {
    if (wordLengthSoFar > 1 && !isWord(wordSoFar)) {
      if (DEBUG.words)
        console.log(`nonword: ${wordSoFar}`);
      invalidWords.push({ word: wordSoFar, length: wordLengthSoFar, orientation: { x: 1, y: 0 }, p });
      wordSoFar = '';
      wordLengthSoFar = 0;
    }
    else {
      if (wordLengthSoFar > 1) {
        validWords.push({ word: wordSoFar, length: wordLengthSoFar, orientation: { x: 1, y: 0 }, p });
      }
      wordSoFar = '';
      wordLengthSoFar = 0;
    }
  }
  for (let yo = 0; yo <= grid.rect.sz.y; yo++) {
    const y = yo + grid.rect.p.y;
    for (let xo = 0; xo <= grid.rect.sz.x + 1; xo++) {
      const x = xo + grid.rect.p.x;
      const letter = getGrid(grid, { x, y });
      if (letter == undefined) {
        endWord({ x: x - wordLengthSoFar, y });
      }
      else {
        wordSoFar += stringOfLetter(letter);
        wordLengthSoFar += 1;
      }
    }
    endWord({ x: grid.rect.sz.x - wordLengthSoFar, y });
  }
  return { validWords, invalidWords };
}

function transposeLocatedWord(lw: LocatedWord): LocatedWord {
  return {
    word: lw.word,
    orientation: vtrans(lw.orientation),
    p: vtrans(lw.p),
    length: lw.length,
  };
}

// returns true if every vertically-consecutive sequence of at least
// 2 characters in grid is a word according to isWord.
export function checkGridWordsVert(grid: Grid<AbstractLetter>, isWord: (x: string) => boolean): CheckResult {
  const { validWords, invalidWords } = checkGridWordsHoriz(transpose(grid), isWord);
  return {
    validWords: validWords.map(transposeLocatedWord),
    invalidWords: invalidWords.map(transposeLocatedWord),
  };
}

// returns true if every horizontally- or vertically-consecutive
// sequence of at least 2 tiles in grid is a word according to isWord.
export function checkGridWords(grid: Grid<AbstractLetter>, isWord: (x: string) => boolean): CheckResult {
  const { validWords: validHorizWords, invalidWords: invalidHorizWords } = checkGridWordsHoriz(grid, isWord);
  const { validWords: validVertWords, invalidWords: invalidVertWords } = checkGridWordsVert(grid, isWord);
  return {
    validWords: [...validHorizWords, ...validVertWords],
    invalidWords: [...invalidHorizWords, ...invalidVertWords],
  };
}

export type ConnectedResult = {
  allConnected: boolean,
  connectedSet: Grid<boolean>,
};

// returns true if all the elements of grid are orthogonally connected
export function checkConnected<T>(grid: Grid<T>, startFrom: Point = { x: 0, y: 0 }): ConnectedResult {
  // We don't really need the bounding rect for the 'already seen' grid.
  const seen: Grid<boolean> = { elems: {}, rect: { p: { x: 0, y: 0 }, sz: { x: 0, y: 0 } } };

  // Underpopulated grids are not considered connected. Even though
  // mathematically it seems reasonable to consider them connected
  // subsets of ℤ², for the purposes of the game, they shouldn't
  // trigger "freshness clearing" of tiles.
  if (Object.keys(grid.elems).length < 2)
    return { allConnected: false, connectedSet: seen };

  let numSetRemaining = numSet(grid);

  function explore(p: Point) {
    if (!isSetGrid(grid, p)) return;
    if (isSetGrid(seen, p)) return;
    setGrid(seen, p, true);
    numSetRemaining--;
    explore({ x: p.x + 1, y: p.y });
    explore({ x: p.x - 1, y: p.y });
    explore({ x: p.x, y: p.y + 1 });
    explore({ x: p.x, y: p.y - 1 });
  }

  explore(startFrom);
  return { allConnected: numSetRemaining == 0, connectedSet: seen };
}

export function gridKeys<T>(x: Grid<T>): Point[] {
  return Object.keys(x.elems).map(k => parseCoord(k));
}
