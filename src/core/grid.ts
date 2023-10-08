import { DEBUG } from "../util/debug";
import { Point, Rect } from "../util/types";
import { boundRect } from "../util/util";
import { vtrans } from "../util/vutil";
import { Tile } from "./state";

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

// returns an arbitrary point that is defined in grid
function firstSet<T>(grid: Grid<T>): Point {
  let rv = 0;
  for (let yo = 0; yo <= grid.rect.sz.y; yo++) {
    const y = yo + grid.rect.p.y;
    for (let xo = 0; xo <= grid.rect.sz.x + 1; xo++) {
      const x = xo + grid.rect.p.x;
      if (isSetGrid(grid, { x, y })) {
        return { x, y };
      }
    }
  }
  throw new Error(`no values defined when trying to compute firstSet`);
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

export function mkGrid(tiles: Tile[]): Grid<string> {
  const elems: Record<string, string> = {};
  tiles.forEach(tile => {
    elems[unparseCoord(tile.p_in_world_int)] = tile.letter;
  });
  return {
    rect: boundRect(tiles.map(tile => tile.p_in_world_int)),
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
}

export type CheckResult = {
  validWords: LocatedWord[],
  invalidWords: LocatedWord[]
};

// returns true if every horizontally-consecutive sequence of at least
// 2 characters in grid is a word according to isWord.
export function checkGridWordsHoriz(grid: Grid<string>, isWord: (x: string) => boolean): CheckResult {
  let validWords: LocatedWord[] = [];
  let invalidWords: LocatedWord[] = [];
  let wordSoFar = '';
  let allValid = true;
  // returns false if we've discovered a non-word
  function endWord(p: Point) {
    if (wordSoFar.length > 1 && !isWord(wordSoFar)) {
      if (DEBUG.words)
        console.log(`nonword: ${wordSoFar}`);
      invalidWords.push({ word: wordSoFar, orientation: { x: 1, y: 0 }, p });
      wordSoFar = '';
    }
    else {
      if (wordSoFar.length > 1) {
        validWords.push({ word: wordSoFar, orientation: { x: 1, y: 0 }, p });
      }
      wordSoFar = '';
    }
  }
  for (let yo = 0; yo <= grid.rect.sz.y; yo++) {
    const y = yo + grid.rect.p.y;
    for (let xo = 0; xo <= grid.rect.sz.x + 1; xo++) {
      const x = xo + grid.rect.p.x;
      const letter = getGrid(grid, { x, y });
      if (letter == undefined) {
        endWord({ x: x - wordSoFar.length, y });
      }
      else {
        wordSoFar += letter;
      }
    }
    endWord({ x: grid.rect.sz.x - wordSoFar.length, y });
  }
  return { validWords, invalidWords };
}

function transposeLocatedWord(lw: LocatedWord): LocatedWord {
  return {
    word: lw.word,
    orientation: vtrans(lw.orientation),
    p: vtrans(lw.p),
  };
}

// returns true if every vertically-consecutive sequence of at least
// 2 characters in grid is a word according to isWord.
export function checkGridWordsVert(grid: Grid<string>, isWord: (x: string) => boolean): CheckResult {
  const { validWords, invalidWords } = checkGridWordsHoriz(transpose(grid), isWord);
  return {
    validWords: validWords.map(transposeLocatedWord),
    invalidWords: invalidWords.map(transposeLocatedWord),
  };
}

// returns true if every horizontally- or vertically-consecutive
// sequence of at least 2 tiles in grid is a word according to isWord.
export function checkGridWords(grid: Grid<string>, isWord: (x: string) => boolean): CheckResult {
  const { validWords: validHorizWords, invalidWords: invalidHorizWords } = checkGridWordsHoriz(grid, isWord);
  const { validWords: validVertWords, invalidWords: invalidVertWords } = checkGridWordsVert(grid, isWord);
  return {
    validWords: [...validHorizWords, ...validVertWords],
    invalidWords: [...invalidHorizWords, ...invalidVertWords],
  };
}

// returns true if all the elements of grid are orthogonally connected
export function checkConnected<T>(grid: Grid<T>): boolean {
  // Underpopulated grids are not considered connected. Even though
  // mathematically it seems reasonable to consider them connected
  // subsets of ℤ², for the purposes of the game, they shouldn't
  // trigger "freshness clearing" of tiles.
  if (Object.keys(grid.elems).length < 2)
    return false;

  // We don't really need the bounding rect for the 'already seen' grid.
  const seen: Grid<boolean> = { elems: {}, rect: { p: { x: 0, y: 0 }, sz: { x: 0, y: 0 } } };

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

  explore(firstSet(grid));
  return (numSetRemaining == 0);
}
