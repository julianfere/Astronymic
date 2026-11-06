import type { Glyph, Mark } from './glyphs';
import type { MinorStar, Point, Segment } from './types';

/** Constantes de dibujo de un glifo (ENGINE § 4.2). */
export interface GlyphParams {
  near: number;
  far: number;
  hMax: number;
  doubleGap: number;
  tickLen: number;
  labelOffset: number;
  rMinor: number;
  rApex: number;
  rMajor: number;
}

export const MAIN: GlyphParams = Object.freeze({
  near: 24,
  far: 46,
  hMax: 95,
  doubleGap: 5,
  tickLen: 34,
  labelOffset: 64,
  rMinor: 5.75,
  rApex: 7.5,
  rMajor: 13.5,
});

/** Miniatura del abecedario: lienzo 200 × 100, radios = diámetro % del ancho / 2. */
export const MINI: GlyphParams = Object.freeze({
  near: 12,
  far: 21,
  hMax: 34,
  doubleGap: 3,
  tickLen: 16,
  labelOffset: 0,
  rMinor: 5.5,
  rApex: 6.5,
  rMajor: 10,
});

export const MINI_P: Point = Object.freeze({ x: 30, y: 54 });
export const MINI_Q: Point = Object.freeze({ x: 170, y: 54 });

const TRI_T = 0.58;
const TICK_COS = Math.cos((65 * Math.PI) / 180);
const TICK_SIN = Math.sin((65 * Math.PI) / 180);

export interface LetterGeometry {
  segments: Segment[];
  stars: MinorStar[];
  label: Point;
}

/** Marco local del glifo (ENGINE § 4.1). Depende solo de L y R, no del sentido. */
export interface Frame {
  L: Point;
  R: Point;
  len: number;
  u: Point;
  n: Point;
  /** true si P es L (se escribe de izquierda a derecha). */
  fwd: boolean;
  at(t: number, h: number): Point;
}

export function frameOf(P: Point, Q: Point): Frame {
  const fwd = P.x <= Q.x;
  const L = fwd ? P : Q;
  const R = fwd ? Q : P;
  const dx = R.x - L.x;
  const dy = R.y - L.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len };
  const n = { x: u.y, y: -u.x };
  return {
    L,
    R,
    len,
    u,
    n,
    fwd,
    at: (t, h) => ({ x: L.x + u.x * len * t + n.x * h, y: L.y + u.y * len * t + n.y * h }),
  };
}

const sign = (s: 'up' | 'down'): number => (s === 'up' ? 1 : -1);

/** Geometría de una letra sobre el tramo P→Q. */
export function letterGeometry(P: Point, Q: Point, glyph: Glyph, prm: GlyphParams): LetterGeometry {
  const f = frameOf(P, Q);
  const { at, u, n, len } = f;
  /** t medido desde P (para el orden de animación). */
  const tw = (t: number) => (f.fwd ? t : 1 - t);
  const segments: Segment[] = [];
  const stars: MinorStar[] = [];
  /** Agrega un segmento con `a` en el extremo más cercano a P. */
  const seg = (a: Point, b: Point, order: number) => {
    const swap = Math.hypot(a.x - P.x, a.y - P.y) > Math.hypot(b.x - P.x, b.y - P.y);
    segments.push(swap ? { a: b, b: a, order } : { a, b, order });
  };
  let labelSide = -1;

  switch (glyph.kind) {
    case 'line':
    case 'ticks': {
      seg(P, Q, 0);
      const marks: readonly Mark[] = glyph.kind === 'line' ? glyph.marks : [];
      let up = 0;
      let down = 0;
      for (const m of marks) {
        const d = m.dist === 'far' ? prm.far : prm.near;
        if (m.side === 'up') up++;
        else down++;
        stars.push({ p: at(m.t, sign(m.side) * d), r: prm.rMinor, order: tw(m.t), role: 'mark' });
      }
      labelSide = up < down ? 1 : -1;
      if (glyph.kind === 'ticks') {
        // u rotada −65°: inclinada como "/".
        const v = { x: u.x * TICK_COS + u.y * TICK_SIN, y: -u.x * TICK_SIN + u.y * TICK_COS };
        const hh = prm.tickLen / 2;
        for (const t of [0.5, 0.58]) {
          const c = at(t, 0);
          seg({ x: c.x - v.x * hh, y: c.y - v.y * hh }, { x: c.x + v.x * hh, y: c.y + v.y * hh }, tw(t));
        }
      }
      break;
    }
    case 'triangle': {
      const s = sign(glyph.apex);
      const h = Math.min(0.3 * len, prm.hMax);
      const A = at(TRI_T, s * h);
      seg(P, Q, 0);
      seg(P, A, 0.15);
      seg(A, Q, 0.55);
      stars.push({ p: A, r: prm.rApex, order: 0.5, role: 'apex' });
      if (glyph.inner) {
        stars.push({ p: at(TRI_T, s * 0.42 * h), r: prm.rMinor, order: 0.7, role: 'inner' });
      }
      labelSide = -s;
      break;
    }
    case 'trapezoid': {
      const h = Math.min(0.24 * len, 0.85 * prm.hMax);
      const T1 = at(0.27, h);
      const T2 = at(0.73, h);
      const TP = f.fwd ? T1 : T2;
      const TQ = f.fwd ? T2 : T1;
      seg(P, Q, 0);
      seg(P, TP, 0.1);
      seg(TP, TQ, 0.35);
      seg(TQ, Q, 0.7);
      stars.push({ p: T1, r: prm.rApex, order: tw(0.27), role: 'apex' });
      stars.push({ p: T2, r: prm.rApex, order: tw(0.73), role: 'apex' });
      labelSide = -1;
      break;
    }
    case 'double': {
      const g = prm.doubleGap;
      const off = (p: Point, k: number) => ({ x: p.x + n.x * g * k, y: p.y + n.y * g * k });
      seg(off(P, 1), off(Q, 1), 0);
      seg(off(P, -1), off(Q, -1), 0.08);
      labelSide = -1;
      break;
    }
  }

  return { segments, stars, label: at(0.5, labelSide * prm.labelOffset) };
}
