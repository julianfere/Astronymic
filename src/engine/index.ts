import { planBranches } from './branches';
import { GLYPHS, type Letter } from './glyphs';
import { letterGeometry, MAIN } from './geometry';
import { layout, type Hub } from './layout';
import { outside } from './math';
import { normalize } from './normalize';
import { rngFor } from './rng';
import {
  CANVAS_H,
  CANVAS_W,
  CENTER,
  type Constellation,
  type GenerateOptions,
  type LetterStroke,
  type Point,
} from './types';

export * from './types';
export { normalize, MAX_LETTERS } from './normalize';
export { GLYPHS, VOWELS, CONSONANTS, isLetter } from './glyphs';
export type { Letter, Glyph } from './glyphs';
export { letterGeometry, MAIN, MINI, MINI_P, MINI_Q } from './geometry';

/** Margen que tienen que respetar los puntos de los glifos y las etiquetas. */
const POINT_MARGIN = 10;
const LABEL_MARGIN_X = 14;
const LABEL_MARGIN_Y = 18;

interface Assembled {
  nodes: Point[];
  letters: LetterStroke[];
}

/** Arma nodos y letras en orden de lectura: la letra i llega al nodo i + 1. */
function assemble(
  letters: readonly Letter[],
  isBranch: readonly boolean[],
  chain: readonly Point[],
  leaves: Map<number, Point>,
): Assembled {
  const nodes: Point[] = [chain[0]];
  const strokes: LetterStroke[] = [];
  let hubId = 0;
  let chainIdx = 0;
  letters.forEach((letter, index) => {
    const from = hubId;
    const P = nodes[from];
    let Q: Point;
    if (isBranch[index]) {
      Q = leaves.get(index) as Point;
    } else {
      chainIdx++;
      Q = chain[chainIdx];
    }
    const to = nodes.length;
    nodes.push(Q);
    if (!isBranch[index]) hubId = to;
    const g = letterGeometry(P, Q, GLYPHS[letter], MAIN);
    strokes.push({ index, letter, from, to, isBranch: isBranch[index], ...g });
  });
  return { nodes, letters: strokes };
}

/** Penalización por puntos de glifos o etiquetas fuera del lienzo. */
function boundsPenalty(a: Assembled): number {
  let pen = 0;
  const W = CANVAS_W;
  const H = CANVAS_H;
  for (const l of a.letters) {
    for (const s of l.segments) {
      pen += outside(s.a, POINT_MARGIN, W - POINT_MARGIN, POINT_MARGIN, H - POINT_MARGIN);
      pen += outside(s.b, POINT_MARGIN, W - POINT_MARGIN, POINT_MARGIN, H - POINT_MARGIN);
    }
    for (const s of l.stars) pen += outside(s.p, POINT_MARGIN, W - POINT_MARGIN, POINT_MARGIN, H - POINT_MARGIN);
    pen += outside(l.label, LABEL_MARGIN_X, W - LABEL_MARGIN_X, LABEL_MARGIN_Y, H - LABEL_MARGIN_Y);
  }
  return pen;
}

const scaleAbout = (p: Point, k: number): Point => ({
  x: CENTER.x + (p.x - CENTER.x) * k,
  y: CENTER.y + (p.y - CENTER.y) * k,
});

/**
 * Genera la constelación de un texto. Pura y determinista: misma entrada,
 * mismo resultado.
 */
export function generate(text: string, options: GenerateOptions = {}): Constellation {
  const seed = options.seed ?? 0;
  const useBranches = options.branches ?? true;
  const { word, letters, dropped } = normalize(text);
  const n = letters.length;
  if (n === 0) {
    return { word, dropped, seed, nodes: [], startNode: 0, letters: [], score: 0 };
  }

  const rnd = rngFor(word, seed);
  const isBranch = planBranches(n, useBranches, rnd);
  const hubs: Hub[] = [];
  let c = 0;
  isBranch.forEach((b, index) => {
    if (b) hubs.push({ index, c });
    else c++;
  });

  const lay = layout(c, hubs, rnd, (chain, leaves) =>
    boundsPenalty(assemble(letters, isBranch, chain, leaves)),
  );

  // Garantía final de límites: si algo quedó afuera, se achica todo hacia el
  // centro. Una escala uniforme conserva ángulos, cruces y sentido horario.
  let chain = lay.chain;
  let leaves = lay.leaves;
  let result = assemble(letters, isBranch, chain, leaves);
  for (let i = 0; i < 40 && boundsPenalty(result) > 0; i++) {
    chain = chain.map((p) => scaleAbout(p, 0.97));
    leaves = new Map([...leaves].map(([k, p]) => [k, scaleAbout(p, 0.97)]));
    result = assemble(letters, isBranch, chain, leaves);
  }

  return {
    word,
    dropped,
    seed,
    nodes: result.nodes,
    startNode: 0,
    letters: result.letters,
    score: lay.score,
  };
}
