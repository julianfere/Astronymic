import { GLYPHS, type Letter, type Mark } from './glyphs';
import { frameOf, MAIN } from './geometry';
import { angleOf, mod } from './math';
import type { Constellation, LetterStroke, Point } from './types';

/**
 * Lee una constelación y devuelve la palabra. No mira `letter` ni el orden
 * del arreglo: recorre el grafo desde la estrella inicial con la regla
 * horaria (ENGINE § 8.3) y decodifica cada letra desde su geometría.
 */
export function read(c: Constellation): string {
  if (c.letters.length === 0) return '';
  const adj = new Map<number, LetterStroke[]>();
  for (const l of c.letters) {
    for (const id of [l.from, l.to]) {
      if (!adj.has(id)) adj.set(id, []);
      adj.get(id)!.push(l);
    }
  }
  const used = new Set<LetterStroke>();
  let out = '';
  const other = (l: LetterStroke, id: number) => (l.from === id ? l.to : l.from);

  const visit = (node: number, arrival: number | null) => {
    const here = c.nodes[node];
    const ref = arrival === null ? null : angleOf(here, c.nodes[arrival]);
    const exits = (adj.get(node) ?? [])
      .filter((l) => !used.has(l))
      .map((l) => {
        const to = other(l, node);
        const a = angleOf(here, c.nodes[to]);
        return { l, to, turn: ref === null ? 0 : mod(a - ref, 360) };
      })
      .sort((p, q) => p.turn - q.turn);
    for (const e of exits) {
      if (used.has(e.l)) continue;
      used.add(e.l);
      out += decode(c.nodes[node], c.nodes[e.to], e.l);
      visit(e.to, node);
    }
  };
  visit(c.startNode, null);
  return out;
}

interface LocalMark {
  t: number;
  side: 'up' | 'down';
  dist: 'near' | 'far';
}

const markKey = (m: LocalMark) => `${m.t.toFixed(2)}${m.side}${m.dist}`;
// t en [0, 1) con dos decimales: el orden de las claves coincide con el de t.
const sortMarks = (ms: LocalMark[]) => ms.slice().sort((a, b) => (markKey(a) < markKey(b) ? -1 : 1));

/** Reconoce la letra dibujada sobre el tramo P–Q a partir de sus trazos y estrellas. */
export function decode(P: Point, Q: Point, l: Pick<LetterStroke, 'segments' | 'stars'>): Letter {
  const f = frameOf(P, Q);
  const local = (p: Point) => {
    const dx = p.x - f.L.x;
    const dy = p.y - f.L.y;
    return { t: (dx * f.u.x + dy * f.u.y) / f.len, h: dx * f.n.x + dy * f.n.y };
  };
  const big = l.stars.filter((s) => s.r > (MAIN.rMinor + MAIN.rApex) / 2);
  const small = l.stars.filter((s) => s.r <= (MAIN.rMinor + MAIN.rApex) / 2);

  if (big.length === 2) return 'H';
  if (big.length === 1) {
    const up = local(big[0].p).h > 0;
    const inner = small.length > 0;
    if (up) return inner ? 'P' : 'B';
    return inner ? 'Q' : 'C';
  }
  if (l.segments.length === 2) return 'V';
  if (l.segments.length === 3) return 'W';

  const threshold = (MAIN.near + MAIN.far) / 2;
  const marks = sortMarks(
    small.map((s) => {
      const p = local(s.p);
      return { t: p.t, side: p.h > 0 ? 'up' : 'down', dist: Math.abs(p.h) > threshold ? 'far' : 'near' } as LocalMark;
    }),
  );

  for (const [letter, g] of Object.entries(GLYPHS) as [Letter, (typeof GLYPHS)[Letter]][]) {
    if (g.kind !== 'line' || g.marks.length !== marks.length) continue;
    const ref = sortMarks(g.marks.map((m: Mark) => ({ t: m.t, side: m.side, dist: m.dist ?? 'near' })));
    if (ref.every((m, i) => Math.abs(m.t - marks[i].t) < 0.02 && m.side === marks[i].side && m.dist === marks[i].dist)) {
      return letter;
    }
  }
  throw new Error(`Glifo irreconocible entre (${P.x}, ${P.y}) y (${Q.x}, ${Q.y})`);
}
