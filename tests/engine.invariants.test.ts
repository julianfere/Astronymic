import { describe, expect, it } from 'vitest';
import { generate, normalize, type Constellation } from '../src/engine';
import { HARD_STEEP, MAX_CHAIN_STEEP, MAX_SPUR_STEEP } from '../src/engine/layout';
import { angleOf, mod, steepOf } from '../src/engine/math';
import { read } from '../src/engine/reader';
import { CENTER } from '../src/engine/types';
import { corpus } from './corpus';

const WORDS = corpus(500);
const SEEDS = [0, 1, 2, 3, 4];

/** Todas las constelaciones del corpus, generadas una sola vez. */
const CASES: { word: string; seed: number; branches: boolean; c: Constellation }[] = [];
for (const word of WORDS) {
  for (const seed of SEEDS) {
    for (const branches of [true, false]) {
      CASES.push({ word, seed, branches, c: generate(word, { seed, branches }) });
    }
  }
}

const chainNodes = (c: Constellation): number[] => [0, ...c.letters.filter((l) => !l.isBranch).map((l) => l.to)];

describe('invariantes del motor (ENGINE § 9)', () => {
  it('1. determinismo: misma entrada, mismo resultado', () => {
    for (const { word, seed, branches, c } of CASES.slice(0, 400)) {
      expect(generate(word, { seed, branches })).toEqual(c);
    }
  });

  it('2. ida y vuelta: read(generate(w)) === normalize(w)', () => {
    for (const { word, c } of CASES) {
      expect(read(c)).toBe(normalize(word).word);
      // El lector no depende del orden del arreglo de letras.
      const shuffled = { ...c, letters: c.letters.slice().reverse() };
      expect(read(shuffled)).toBe(normalize(word).word);
    }
  });

  it('3. cantidad: n letras-arista y n + 1 nodos', () => {
    for (const { word, c } of CASES) {
      expect(c.letters).toHaveLength(word.length);
      expect(c.nodes).toHaveLength(word.length + 1);
      c.letters.forEach((l, i) => {
        expect(l.index).toBe(i);
        expect(l.letter).toBe(word[i]);
      });
    }
  });

  it('4. grado: como máximo 2 salidas por nodo, la inicial exactamente 1', () => {
    for (const { c } of CASES) {
      const out = new Map<number, number>();
      for (const l of c.letters) out.set(l.from, (out.get(l.from) ?? 0) + 1);
      for (const v of out.values()) expect(v).toBeLessThanOrEqual(2);
      expect(out.get(0)).toBe(1);
      expect(c.letters.filter((l) => l.from === 0 || l.to === 0)).toHaveLength(1);
    }
  });

  it('5. ramas: nunca en la primera ni en la última, nunca dos seguidas', () => {
    for (const { branches, c } of CASES) {
      const b = c.letters.map((l) => l.isBranch);
      if (!branches) expect(b.some(Boolean)).toBe(false);
      if (b.length) {
        expect(b[0]).toBe(false);
        expect(b[b.length - 1]).toBe(false);
      }
      for (let i = 1; i < b.length; i++) expect(b[i] && b[i - 1]).toBe(false);
    }
  });

  it('5b. las ramas aparecen en palabras de 6 o más letras', () => {
    const withSpur = CASES.filter((k) => k.branches && k.word.length >= 6 && k.c.letters.some((l) => l.isBranch));
    expect(withSpur.length).toBeGreaterThan(100);
  });

  it('6. verticalidad: ≥ 99 % sin pasar 56° (cadena) / 52° (rama), nunca > 75°', () => {
    let good = 0;
    for (const { c } of CASES) {
      let ok = true;
      for (const l of c.letters) {
        const st = steepOf(c.nodes[l.from], c.nodes[l.to]);
        expect(st).toBeLessThanOrEqual(HARD_STEEP);
        if (st > (l.isBranch ? MAX_SPUR_STEEP : MAX_CHAIN_STEEP) + 1e-9) ok = false;
      }
      if (ok) good++;
    }
    expect(good / CASES.length).toBeGreaterThanOrEqual(0.99);
  });

  it('9. límites: nodos, vértices y marcas dentro de [0, 1000] × [0, 720]', () => {
    const inside = (p: { x: number; y: number }) => p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 720;
    for (const { c } of CASES) {
      for (const p of c.nodes) expect(inside(p)).toBe(true);
      for (const l of c.letters) {
        for (const s of l.segments) expect(inside(s.a) && inside(s.b)).toBe(true);
        for (const s of l.stars) expect(inside(s.p)).toBe(true);
        expect(inside(l.label)).toBe(true);
      }
    }
  });

  it('10. sentido horario: los ángulos de la cadena crecen estrictamente alrededor de C', () => {
    for (const { c } of CASES) {
      const ids = chainNodes(c);
      for (let i = 1; i < ids.length; i++) {
        const a0 = angleOf(CENTER, c.nodes[ids[i - 1]]);
        const a1 = angleOf(CENTER, c.nodes[ids[i]]);
        const step = mod(a1 - a0, 360);
        expect(step).toBeGreaterThan(0);
        expect(step).toBeLessThanOrEqual(180 + 1e-9);
      }
    }
  });

  it('Ley VI: en cada hub la rama queda antes que la continuación en el giro horario', () => {
    for (const { c } of CASES) {
      for (const spur of c.letters.filter((l) => l.isBranch)) {
        const H = c.nodes[spur.from];
        const arrival = c.letters.find((l) => l.to === spur.from)!;
        const next = c.letters[spur.index + 1];
        expect(next.from).toBe(spur.from);
        const ref = angleOf(H, c.nodes[arrival.from]);
        const turnSpur = mod(angleOf(H, c.nodes[spur.to]) - ref, 360);
        const turnNext = mod(angleOf(H, c.nodes[next.to]) - ref, 360);
        expect(turnSpur).toBeLessThan(turnNext);
      }
    }
  });
});

describe('casos de referencia', () => {
  it('SHARK con seed 0 se genera y se lee como SHARK', () => {
    const c = generate('SHARK', { seed: 0 });
    expect(c.word).toBe('SHARK');
    expect(read(c)).toBe('SHARK');
  });

  it('1 letra: un solo tramo; 14 letras: espiral de 14 tramos sin ramas', () => {
    const one = generate('A');
    expect(one.letters).toHaveLength(1);
    expect(one.nodes).toHaveLength(2);
    const long = generate('ABCDEFGHIJKLMN', { branches: false });
    expect(chainNodes(long)).toHaveLength(15);
  });

  it('otra forma cambia la disposición, no las letras; seed 0 reproduce la original', () => {
    const a = generate('CONSTELACION', { seed: 0 });
    const b = generate('CONSTELACION', { seed: 1 });
    expect(b.nodes).not.toEqual(a.nodes);
    expect(read(b)).toBe(read(a));
    expect(generate('CONSTELACION', { seed: 0 })).toEqual(a);
  });

  it('palabra vacía: constelación vacía', () => {
    const c = generate('123');
    expect(c.word).toBe('');
    expect(c.dropped).toBe(true);
    expect(c.letters).toHaveLength(0);
    expect(read(c)).toBe('');
  });
});
