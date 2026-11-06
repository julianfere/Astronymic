import { angleOf, crosses, dist, mod, outside, steep, steepOf } from './math';
import type { Rng } from './rng';
import { CENTER, type Point } from './types';

/** Una rama: la letra `index` sale del nodo de cadena `c`. */
export interface Hub {
  index: number;
  c: number;
}

export const MAX_CHAIN_STEEP = 56;
export const MAX_SPUR_STEEP = 52;
/** Ninguna línea puede superar esta inclinación (ENGINE § 9.6). */
export const HARD_STEEP = 75;
/** Penalización de una violación dura: hace que el intento casi nunca gane. */
const HARD = 5000;
/**
 * Recargo fijo por pasarse del límite de inclinación, aunque sea por décimas:
 * sin él, la búsqueda acepta tramos de 56,5° porque casi no suman puntaje.
 */
const STEEP_STEP = 150;

const TRIES = 400;
/** Intentos extra si los 400 no lograron respetar HARD_STEEP. */
const EXTRA_TRIES = 4000;

const FRACTIONS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78];

/**
 * Cadenas largas (k ≥ 7): con pasos parejos de ~44°, todo tramo que cruza un
 * costado de la elipse (0° o 180°) queda casi vertical. Por eso se fija un
 * nodo en cada costado y se alternan pasos largos y cortos: cada media vuelta
 * suma 180° y ningún tramo tiene su punto medio cerca de un costado.
 */
const LOCK_FROM = 7;
const LOCK_STEPS = [56, 34, 34, 56];
const LOCK = { jitter: 6, radial: 0.04 };

/** Cuántos de esos pasos son de arriba o abajo (no tocan un costado). */
function innerSteps(phase: number, count: number): number {
  let s = 0;
  for (let i = 0; i < count; i++) {
    const j = (phase + i) % LOCK_STEPS.length;
    if (j !== 0 && j !== LOCK_STEPS.length - 1) s++;
  }
  return s;
}

/** Grados recorridos por `count` pasos empezando en la posición `phase` del patrón. */
function lockedSweep(phase: number, count: number): number {
  let s = 0;
  for (let i = 0; i < count; i++) s += LOCK_STEPS[(phase + i) % LOCK_STEPS.length];
  return s;
}

export interface SpurResult {
  /** Hoja de cada rama, por índice de letra. */
  leaves: Map<number, Point>;
  pen: number;
}

/** Ubica las hojas de las ramas (ENGINE § 8.2). */
export function placeSpurs(chain: readonly Point[], hubs: readonly Hub[], rnd: Rng): SpurResult {
  const leaves = new Map<number, Point>();
  let pen = 0;
  const segs: [Point, Point][] = [];
  for (let i = 0; i < chain.length - 1; i++) segs.push([chain[i], chain[i + 1]]);
  const nodes: Point[] = chain.slice();

  for (const hub of hubs) {
    const H = chain[hub.c];
    const B = chain[hub.c - 1];
    const N = chain[hub.c + 1];
    const aB = angleOf(H, B);
    const aN = angleOf(H, N);
    // Barrido HORARIO desde el tramo de llegada hasta la continuación.
    const sweep = mod(aN - aB, 360);
    const len = 175 + 45 * rnd();
    let placed: Point | null = null;
    let fallback: Point | null = null;
    let bestBad = Infinity;

    for (const f0 of FRACTIONS) {
      const f = f0 + (rnd() - 0.5) * 0.06;
      const ang = aB + sweep * f;
      let bad = 0;
      if (sweep * f < 30) bad += (30 - sweep * f) * 10;
      if (sweep * (1 - f) < 30) bad += (30 - sweep * (1 - f)) * 10;
      const st = steep(ang);
      if (st > MAX_SPUR_STEEP) bad += (st - MAX_SPUR_STEEP) * 12 + STEEP_STEP;
      if (st > HARD_STEEP) bad += HARD;
      const rad = (ang * Math.PI) / 180;
      const leaf = { x: H.x + len * Math.cos(rad), y: H.y + len * Math.sin(rad) };
      bad += outside(leaf, 70, 930, 70, 650);
      for (const [s0, s1] of segs) {
        if (s0 !== H && s1 !== H && crosses(H, leaf, s0, s1)) bad += 300;
      }
      for (const p of nodes) {
        if (p === H) continue;
        const d = dist(p, leaf);
        if (d < 110) bad += (110 - d) * 2;
      }
      if (bad === 0) {
        placed = leaf;
        break;
      }
      if (bad < bestBad) {
        bestBad = bad;
        fallback = leaf;
      }
    }
    if (!placed) {
      placed = fallback as Point;
      pen += bestBad + 50;
    }
    leaves.set(hub.index, placed);
    segs.push([H, placed]);
    nodes.push(placed);
  }
  return { leaves, pen };
}

/** Puntaje de la cadena sola (ENGINE § 7.3, sin ramas). */
export function chainScore(pts: readonly Point[]): number {
  const k = pts.length - 1;
  let score = 0;
  for (let i = 0; i < k; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const st = steepOf(a, b);
    const len = dist(a, b);
    if (st > MAX_CHAIN_STEEP) score += (st - MAX_CHAIN_STEEP) * 12 + STEEP_STEP;
    if (st > HARD_STEEP) score += HARD;
    if (len < 165) score += (165 - len) * 2;
    for (let m = i + 2; m < k; m++) if (crosses(a, b, pts[m], pts[m + 1])) score += 300;
  }
  for (const p of pts) score += outside(p, 80, 920, 85, 640);
  for (let i = 0; i <= k; i++) {
    for (let j = i + 2; j <= k; j++) {
      const d = dist(pts[i], pts[j]);
      if (d < 120) score += (120 - d) * 2;
    }
  }
  return score;
}

/** true si ningún tramo (cadena o rama) supera HARD_STEEP. */
function respectsHard(chain: readonly Point[], hubs: readonly Hub[], leaves: Map<number, Point>): boolean {
  for (let i = 0; i < chain.length - 1; i++) if (steepOf(chain[i], chain[i + 1]) > HARD_STEEP) return false;
  for (const h of hubs) {
    const leaf = leaves.get(h.index);
    if (!leaf || steepOf(chain[h.c], leaf) > HARD_STEEP) return false;
  }
  return true;
}

export interface LayoutResult {
  chain: Point[];
  leaves: Map<number, Point>;
  score: number;
}

/** Penalización adicional calculada por quien llama (por ejemplo, glifos fuera del lienzo). */
export type ExtraPenalty = (chain: readonly Point[], leaves: Map<number, Point>) => number;

/** Cadena principal de `k` tramos más sus ramas (ENGINE § 7.2). */
export function layout(k: number, hubs: readonly Hub[], rnd: Rng, extra?: ExtraPenalty): LayoutResult {
  const { x: cx, y: cy } = CENTER;
  if (k === 1) {
    const tilt = (rnd() - 0.5) * 220;
    return { chain: [{ x: 250, y: cy - tilt / 2 }, { x: 750, y: cy + tilt / 2 }], leaves: new Map(), score: 0 };
  }

  const locked = k >= LOCK_FROM;
  const sweep = k <= 6 ? 58 * k : Math.min(44 * k, 600);
  const shrink = (locked ? lockedSweep(0, k) : sweep) > 320 ? 0.5 : 0.12;
  const scale = hubs.length ? 0.74 : 1;

  let best: Point[] | null = null;
  let bestLeaves = new Map<number, Point>();
  let bestScore = Infinity;
  let bestOk = false;

  for (let tries = 0; tries < TRIES + EXTRA_TRIES; tries++) {
    if (tries >= TRIES && bestOk) break;
    const start = rnd() * 360;
    const pts: Point[] = [];
    if (locked) {
      // Un nodo en cada costado (0° o 180°) y pasos de LOCK_STEPS alrededor.
      // El radio solo se achica en los pasos de arriba y abajo: así los tramos
      // que tocan un costado no se inclinan por la espiral.
      const side = start < 180 ? 0 : 180;
      const phase = Math.floor(rnd() * LOCK_STEPS.length);
      const size = (0.86 + 0.2 * rnd()) * scale;
      const inner = innerSteps(phase, k) || 1;
      for (let i = 0; i <= k; i++) {
        const t = innerSteps(phase, i) / inner;
        const ang = ((side + lockedSweep(0, phase) + lockedSweep(phase, i) + (rnd() - 0.5) * LOCK.jitter) * Math.PI) / 180;
        const rr = (1 - shrink * t) * size * (1 + (rnd() - 0.5) * LOCK.radial);
        pts.push({ x: cx + 380 * rr * Math.cos(ang), y: cy + 250 * rr * Math.sin(ang) });
      }
    } else {
      for (let i = 0; i <= k; i++) {
        const t = i / k;
        const ang = ((start + sweep * t + (rnd() - 0.5) * 18) * Math.PI) / 180;
        const rr = (1 - shrink * t) * (0.86 + 0.2 * rnd()) * scale;
        pts.push({ x: cx + 380 * rr * Math.cos(ang), y: cy + 250 * rr * Math.sin(ang) });
      }
    }
    let score = chainScore(pts);
    // Tras los 400 intentos solo se aceptan formas sin líneas casi verticales.
    const mustImprove = tries < TRIES ? score < bestScore : true;
    if (!mustImprove) continue;

    let leaves = new Map<number, Point>();
    if (hubs.length) {
      const sp = placeSpurs(pts, hubs, rnd);
      leaves = sp.leaves;
      score += sp.pen;
    }
    if (extra && (score < bestScore || tries >= TRIES)) score += extra(pts, leaves);
    const ok = respectsHard(pts, hubs, leaves);

    const better = tries < TRIES ? score < bestScore : ok && (!bestOk || score < bestScore);
    if (better) {
      best = pts;
      bestLeaves = leaves;
      bestScore = score;
      bestOk = ok;
    }
    if (bestScore === 0 && bestOk) break;
  }

  return { chain: best as Point[], leaves: bestLeaves, score: bestScore };
}
