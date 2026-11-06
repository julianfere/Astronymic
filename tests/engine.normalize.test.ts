import { describe, expect, it } from 'vitest';
import { MAX_LETTERS, normalize } from '../src/engine/normalize';

describe('normalize', () => {
  it('pasa a mayúsculas y quita tildes', () => {
    expect(normalize('canción').word).toBe('CANCION');
    expect(normalize('pingüino').word).toBe('PINGUINO');
    expect(normalize('Ñandú').word).toBe('NANDU');
  });

  it('descarta espacios sin marcar dropped', () => {
    const r = normalize('buenos aires');
    expect(r.word).toBe('BUENOSAIRES');
    expect(r.dropped).toBe(false);
  });

  it('descarta dígitos y signos y marca dropped', () => {
    const r = normalize('r2-d2!');
    expect(r.word).toBe('RD');
    expect(r.dropped).toBe(true);
  });

  it('trunca a 14 letras', () => {
    const r = normalize('abcdefghijklmnopqrstuvwxyz');
    expect(r.word).toHaveLength(MAX_LETTERS);
    expect(r.word).toBe('ABCDEFGHIJKLMN');
  });

  it('devuelve las letras por separado', () => {
    expect(normalize('sol').letters).toEqual(['S', 'O', 'L']);
    expect(normalize('').word).toBe('');
  });
});
