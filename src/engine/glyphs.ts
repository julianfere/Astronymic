/**
 * Abecedario Astronymic.
 *
 * Cada letra se dibuja sobre un TRAMO entre dos estrellas mayores.
 * Convenciones (ver docs/ENGINE.md § 4):
 *  - `t` en [0, 1] se mide SIEMPRE desde el extremo izquierdo del tramo
 *    (el de menor x), sin importar hacia dónde se escribe.
 *  - `side`: 'up' = del lado de la normal que apunta hacia arriba de la página,
 *    'down' = el opuesto.
 *  - `dist`: 'near' = 24 u, 'far' = 46 u (unidades del motor).
 */

export type Side = 'up' | 'down';
export type Dist = 'near' | 'far';

export interface Mark {
  t: number;
  side: Side;
  dist?: Dist; // default 'near'
}

export type Glyph =
  | { kind: 'line'; marks: Mark[] }
  | { kind: 'triangle'; apex: Side; inner: boolean }
  | { kind: 'trapezoid'; apex: 'up' }
  | { kind: 'double' }
  | { kind: 'ticks' };

export type Letter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

const up = (t: number, dist: Dist = 'near'): Mark => ({ t, side: 'up', dist });
const down = (t: number, dist: Dist = 'near'): Mark => ({ t, side: 'down', dist });
const line = (...marks: Mark[]): Glyph => ({ kind: 'line', marks });

export const GLYPHS: Readonly<Record<Letter, Glyph>> = Object.freeze({
  // Vocales
  A: line(),
  E: line(up(0.55)),
  I: line(down(0.5)),
  O: line(up(0.3), up(0.7)),
  U: line(down(0.3), down(0.7)),

  // Consonantes
  B: { kind: 'triangle', apex: 'up', inner: false },
  C: { kind: 'triangle', apex: 'down', inner: false },
  D: line(up(0.27), down(0.44), up(0.68), down(0.85)),
  F: line(down(0.24), up(0.66), up(0.8)),
  G: line(down(0.32), down(0.5), down(0.68)),
  H: { kind: 'trapezoid', apex: 'up' },
  J: line(down(0.5, 'far')), // ⚠ ver ENGINE.md § 12: en la fuente I y J se ven iguales
  K: line(up(0.22), up(0.76), down(0.76)),
  L: line(down(0.2), up(0.8), down(0.8)),
  M: line(up(0.27), down(0.5), up(0.72)),
  N: line(down(0.25), up(0.5), down(0.75)),
  P: { kind: 'triangle', apex: 'up', inner: true },
  Q: { kind: 'triangle', apex: 'down', inner: true },
  R: line(up(0.5), down(0.5)),
  S: line(up(0.2), down(0.66), down(0.82)),
  T: line(up(0.32), down(0.72)),
  V: { kind: 'double' },
  W: { kind: 'ticks' },
  X: line(down(0.3), up(0.42), down(0.5), up(0.58), down(0.72)),
  Y: line(up(0.14), down(0.14), down(0.88)),
  Z: line(up(0.3), up(0.5), up(0.7)),
});

export const VOWELS: readonly Letter[] = ['A', 'E', 'I', 'O', 'U'];
export const CONSONANTS: readonly Letter[] = [
  'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N',
  'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z',
];

export const isLetter = (c: string): c is Letter => c in GLYPHS;
