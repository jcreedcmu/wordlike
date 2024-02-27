export const NUM_LETTERS = 26;

// I plan to have multiple letters (like 'ing' or 'sh' or etc.) in here eventually
export type AbstractLetter =
  | { t: 'single', letter: string } // represented as lowercase
  ;

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

export function lettersMatch(al1: AbstractLetter, al2: AbstractLetter): boolean {
  switch (al1.t) {
    case 'single': return al2.t == 'single' && al2.letter == al1.letter;
  }
}
