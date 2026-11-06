import type { Point } from './types';

export const DEG = 180 / Math.PI;

export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Ángulo en grados con atan2 en el sistema de pantalla (crece en sentido horario). */
export const angleOf = (from: Point, to: Point): number =>
  Math.atan2(to.y - from.y, to.x - from.x) * DEG;

export const mod = (a: number, m: number): number => ((a % m) + m) % m;

/** Inclinación respecto de la horizontal, en grados (ENGINE § 6). */
export function steep(deg: number): number {
  const a = mod(deg, 180);
  return Math.min(a, 180 - a);
}

export const steepOf = (a: Point, b: Point): number => steep(angleOf(a, b));

/** Intersección propia entre ab y cd (no cuenta extremos compartidos ni toques). */
export function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const o = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** Penalización por salir del rectángulo: 3 · distancia. */
export function outside(p: Point, x0: number, x1: number, y0: number, y1: number): number {
  let d = 0;
  if (p.x < x0) d += x0 - p.x;
  if (p.x > x1) d += p.x - x1;
  if (p.y < y0) d += y0 - p.y;
  if (p.y > y1) d += p.y - y1;
  return d * 3;
}
