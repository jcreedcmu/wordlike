import { SPRITE_SHEET_SIZE } from "../ui/sprite-sheet";
import { Point } from "../util/types";

export const NUM_LETTERS = 26;

// I plan to have multiple letters (like 'ing' or 'sh' or etc.) in here eventually
export type AbstractLetter =
  | { t: 'single', letter: string } // represented as lowercase
  ;

// XXX: do I actually use this? I thought I separated tile data and sprite data
export function spriteLocOfLetter(al: AbstractLetter): Point {
  switch (al.t) {
    case 'single':
      const letterIndex = al.letter.charCodeAt(0) - 97;
      return {
        x: 14 + Math.floor(letterIndex / SPRITE_SHEET_SIZE.y),
        y: letterIndex % SPRITE_SHEET_SIZE.y,
      };

  }
}

export function byteOfLetter(al: AbstractLetter): number {
  return 128 + al.letter.charCodeAt(0) - 97;
}

export function stringOfLetter(al: AbstractLetter): string {
  switch (al.t) {
    case 'single': return al.letter;
  }
}

export function indexOfLetter(al: AbstractLetter): number {
  return al.letter.charCodeAt(0) - 97;
}

export function letterOfIndex(i: number): AbstractLetter {
  if (i < 26) {
    return { t: 'single', letter: String.fromCharCode(97 + i) };
  }
  throw new Error(`Unknown abstract letter index ${i}`);
}
