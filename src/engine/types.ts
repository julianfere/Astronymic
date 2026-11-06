import type { Letter } from './glyphs';

export interface Point {
  x: number;
  y: number;
}

/** order ∈ [0, 1]: cuándo se traza dentro de la letra. */
export interface Segment {
  a: Point;
  b: Point;
  order: number;
}

export interface MinorStar {
  p: Point;
  r: number;
  order: number;
  role: 'mark' | 'apex' | 'inner';
}

export interface LetterStroke {
  /** Posición en la palabra. */
  index: number;
  letter: Letter;
  /** Id del nodo P (de donde sale). */
  from: number;
  /** Id del nodo Q (adonde llega). */
  to: number;
  isBranch: boolean;
  /** En sentido de escritura: `a` es el extremo más cercano a P. */
  segments: Segment[];
  /** El `order` usa t medido desde P. */
  stars: MinorStar[];
  label: Point;
}

export interface Constellation {
  /** Palabra normalizada. */
  word: string;
  dropped: boolean;
  seed: number;
  /** nodes[0] es la estrella inicial. */
  nodes: Point[];
  startNode: 0;
  /** En orden de lectura. */
  letters: LetterStroke[];
  /** Puntaje final del layout (0 = perfecto). */
  score: number;
}

export interface GenerateOptions {
  seed?: number;
  branches?: boolean;
}

export const CANVAS_W = 1000;
export const CANVAS_H = 720;
export const CENTER: Point = Object.freeze({ x: 500, y: 360 });
