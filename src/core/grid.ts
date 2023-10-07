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

function getGrid<T>(grid: Grid<T>, p: Point): T {
  return grid.elems[unparseCoord(p)];
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

export function checkGridHoriz(grid: Grid<string>, isWord: (x: string) => boolean): boolean {
  let wordSoFar = '';
  // returns false if we've discovered a non-word
  function endWord() {
    if (wordSoFar.length > 1 && !isWord(wordSoFar)) {
      if (DEBUG.words)
        console.log(`nonword: ${wordSoFar}`);
      return false;
    }
    else {
      wordSoFar = '';
      return true;
    }
  }
  console.log(grid.rect.sz);
  for (let yo = 0; yo <= grid.rect.sz.y; yo++) {
    const y = yo + grid.rect.p.y;
    for (let xo = 0; xo <= grid.rect.sz.x + 1; xo++) {
      const x = xo + grid.rect.p.x;
      const letter = getGrid(grid, { x, y });
      if (letter == undefined) {
        if (!endWord()) return false;
      }
      else {
        wordSoFar += letter;
      }
    }
    if (!endWord()) return false;
  }
  return true;
}

export function checkGrid(grid: Grid<string>, isWord: (x: string) => boolean): boolean {
  return checkGridHoriz(grid, isWord) && checkGridHoriz(transpose(grid), isWord);
}
