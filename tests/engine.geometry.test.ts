import { describe, expect, it } from 'vitest';
import { GLYPHS, type Letter } from '../src/engine/glyphs';
import { frameOf, letterGeometry, MAIN } from '../src/engine/geometry';
import { decode } from '../src/engine/reader';
import type { Point, Segment } from '../src/engine/types';

const LETTERS = Object.keys(GLYPHS) as Letter[];
const EDGES: [Point, Point][] = [
  [{ x: 100, y: 300 }, { x: 400, y: 300 }],
  [{ x: 120, y: 500 }, { x: 420, y: 200 }],
  [{ x: 600, y: 150 }, { x: 900, y: 420 }],
  [{ x: 300, y: 300 }, { x: 520, y: 620 }],
];

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const pk = (p: Point) => `${r6(p.x)},${r6(p.y)}`;
const segKey = (s: Segment) => [pk(s.a), pk(s.b)].sort().join('|');

describe('geometría de cada letra', () => {
  it('Ley IV: las marcas "up" quedan del lado de la normal arriba (invariante 7)', () => {
    for (const [P, Q] of EDGES) {
      for (const [A, B] of [[P, Q], [Q, P]] as const) {
        const f = frameOf(A, B);
        expect(f.n.y).toBeLessThan(0);
        const dot = (p: Point) => (p.x - f.L.x) * f.n.x + (p.y - f.L.y) * f.n.y;
        for (const letter of LETTERS) {
          const g = GLYPHS[letter];
          const geo = letterGeometry(A, B, g, MAIN);
          if (g.kind === 'line') {
            g.marks.forEach((m, i) => {
              const d = dot(geo.stars[i].p);
              if (m.side === 'up') expect(d).toBeGreaterThan(0);
              else expect(d).toBeLessThan(0);
            });
          }
          if (g.kind === 'triangle') {
            for (const s of geo.stars) expect(dot(s.p) > 0).toBe(g.apex === 'up');
          }
          if (g.kind === 'trapezoid') {
            for (const s of geo.stars) expect(dot(s.p)).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('Ley II: la geometría sobre P→Q es la misma que sobre Q→P (invariante 8)', () => {
    for (const [P, Q] of EDGES) {
      for (const letter of LETTERS) {
        const a = letterGeometry(P, Q, GLYPHS[letter], MAIN);
        const b = letterGeometry(Q, P, GLYPHS[letter], MAIN);
        expect(a.segments.map(segKey).sort()).toEqual(b.segments.map(segKey).sort());
        const starKey = (s: (typeof a.stars)[number]) => `${pk(s.p)}:${s.r}:${s.role}`;
        expect(a.stars.map(starKey).sort()).toEqual(b.stars.map(starKey).sort());
        expect(pk(a.label)).toBe(pk(b.label));
      }
    }
  });

  it('los segmentos van en sentido de escritura (a cerca de P) y order ∈ [0, 1]', () => {
    const [P, Q] = EDGES[1];
    for (const [A, B] of [[P, Q], [Q, P]] as const) {
      for (const letter of LETTERS) {
        const geo = letterGeometry(A, B, GLYPHS[letter], MAIN);
        for (const s of geo.segments) {
          const da = Math.hypot(s.a.x - A.x, s.a.y - A.y);
          const db = Math.hypot(s.b.x - A.x, s.b.y - A.y);
          expect(da).toBeLessThanOrEqual(db + 1e-9);
          expect(s.order).toBeGreaterThanOrEqual(0);
          expect(s.order).toBeLessThanOrEqual(1);
        }
        for (const s of geo.stars) {
          expect(s.order).toBeGreaterThanOrEqual(0);
          expect(s.order).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('cada letra se decodifica desde su propia geometría, en ambos sentidos', () => {
    for (const [P, Q] of EDGES) {
      for (const letter of LETTERS) {
        expect(decode(P, Q, letterGeometry(P, Q, GLYPHS[letter], MAIN))).toBe(letter);
        expect(decode(Q, P, letterGeometry(Q, P, GLYPHS[letter], MAIN))).toBe(letter);
      }
    }
  });

  it('formas: cantidad de trazos y estrellas por tipo', () => {
    const [P, Q] = EDGES[0];
    const g = (l: Letter) => letterGeometry(P, Q, GLYPHS[l], MAIN);
    expect(g('A').segments).toHaveLength(1);
    expect(g('A').stars).toHaveLength(0);
    expect(g('B').segments).toHaveLength(3);
    expect(g('P').stars.map((s) => s.role)).toEqual(['apex', 'inner']);
    expect(g('H').segments).toHaveLength(4);
    expect(g('V').segments).toHaveLength(2);
    expect(g('V').stars).toHaveLength(0);
    expect(g('W').segments).toHaveLength(3);
  });

  it('la altura del triángulo es min(0.30·len, H_MAX)', () => {
    const long = letterGeometry({ x: 0, y: 300 }, { x: 1000, y: 300 }, GLYPHS.B, MAIN);
    expect(long.stars[0].p.y).toBeCloseTo(300 - MAIN.hMax);
    const short = letterGeometry({ x: 0, y: 300 }, { x: 200, y: 300 }, GLYPHS.C, MAIN);
    expect(short.stars[0].p.y).toBeCloseTo(360);
    expect(short.stars[0].p.x).toBeCloseTo(0.58 * 200);
  });

  it('las rayas de W miden TICK_LEN y se inclinan como "/"', () => {
    const geo = letterGeometry({ x: 0, y: 300 }, { x: 400, y: 300 }, GLYPHS.W, MAIN);
    for (const s of geo.segments.slice(1)) {
      expect(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)).toBeCloseTo(MAIN.tickLen);
      const top = s.a.y < s.b.y ? s.a : s.b;
      const bottom = top === s.a ? s.b : s.a;
      expect(top.x).toBeGreaterThan(bottom.x);
    }
  });

  it('la etiqueta va del lado con menos elementos', () => {
    const P = { x: 0, y: 300 };
    const Q = { x: 400, y: 300 };
    expect(letterGeometry(P, Q, GLYPHS.E, MAIN).label.y).toBeGreaterThan(300);
    expect(letterGeometry(P, Q, GLYPHS.I, MAIN).label.y).toBeLessThan(300);
    expect(letterGeometry(P, Q, GLYPHS.B, MAIN).label.y).toBeGreaterThan(300);
    expect(letterGeometry(P, Q, GLYPHS.C, MAIN).label.y).toBeLessThan(300);
    expect(letterGeometry(P, Q, GLYPHS.H, MAIN).label.y).toBeGreaterThan(300);
  });
});
