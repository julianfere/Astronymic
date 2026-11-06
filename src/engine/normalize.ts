import type { Letter } from './glyphs';

export const MAX_LETTERS = 14;

export interface Normalized {
  word: string;
  letters: Letter[];
  /** true si se descartó algún carácter que no era espacio. */
  dropped: boolean;
}

const COMBINING = /[̀-ͯ]/g;
const SPACE = /\s/;

/** Texto → letras válidas (ENGINE § 3). */
export function normalize(text: string): Normalized {
  const base = text.toUpperCase().normalize('NFD').replace(COMBINING, '');
  let word = '';
  let dropped = false;
  for (const ch of base) {
    if (ch >= 'A' && ch <= 'Z') word += ch;
    else if (!SPACE.test(ch)) dropped = true;
  }
  word = word.slice(0, MAX_LETTERS);
  return { word, letters: word.split('') as Letter[], dropped };
}
