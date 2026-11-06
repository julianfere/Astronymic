import type { Rng } from './rng';

export const BRANCH_P = 0.34;

/**
 * Qué letras son ramas (ENGINE § 8.1). El PRNG se consume solo cuando las
 * condiciones previas se cumplen, en el orden del prototipo.
 */
export function planBranches(n: number, branches: boolean, rnd: Rng): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) {
    out.push(branches && i >= 1 && i <= n - 2 && !out[i - 1] && rnd() < BRANCH_P);
  }
  return out;
}
