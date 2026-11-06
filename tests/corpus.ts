import { mulberry32 } from '../src/engine/rng';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Palabras fijas de varias longitudes. */
export const FIXED_WORDS = [
  'A', 'SHARK', 'LUNA', 'ORION', 'ESTRELLA', 'CONSTELACION', 'ASTRONYMIC', 'PERGAMINO',
  'VW', 'HB', 'QP', 'MATEO', 'BUENOSAIRES', 'ANDROMEDA', 'CASIOPEA', 'ABCDEFGHIJKLMN',
  'OPQRSTUVWXYZAB', 'ZZZZZZZZZZZZZZ', 'HVHVHVHVHVHVHV', 'XY', 'SOL', 'TIERRA',
];

/** Palabras fijas más palabras al azar (con semilla fija) hasta llegar a `size`. */
export function corpus(size: number, seed = 20261106): string[] {
  const rnd = mulberry32(seed);
  const words = FIXED_WORDS.slice(0, size);
  while (words.length < size) {
    const len = 1 + Math.floor(rnd() * 14);
    let w = '';
    for (let i = 0; i < len; i++) w += ALPHA[Math.floor(rnd() * 26)];
    words.push(w);
  }
  return words;
}
