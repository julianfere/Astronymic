import { describe, expect, it } from 'vitest';
import { planBranches } from '../src/engine/branches';
import { fnv1a, mulberry32, rngFor } from '../src/engine/rng';

describe('rng', () => {
  it('FNV-1a de 32 bits da los valores de referencia', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  it('mulberry32 es determinista y queda en [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('la semilla cambia la secuencia', () => {
    expect(rngFor('SHARK', 0)()).not.toBe(rngFor('SHARK', 1)());
  });
});

describe('planBranches', () => {
  it('sin ramas no consume el PRNG', () => {
    let calls = 0;
    const rnd = () => {
      calls++;
      return 0;
    };
    expect(planBranches(10, false, rnd).some(Boolean)).toBe(false);
    expect(calls).toBe(0);
  });

  it('con r siempre bajo, alterna ramas desde i = 1 hasta n − 2', () => {
    expect(planBranches(7, true, () => 0)).toEqual([false, true, false, true, false, true, false]);
    expect(planBranches(2, true, () => 0)).toEqual([false, false]);
  });
});
