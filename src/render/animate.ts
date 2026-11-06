/**
 * Tiempos del trazado (ENGINE § 11, SPEC § 6). Las funciones de tiempo son
 * puras; `playDrawing` es la única que toca el DOM.
 */

export const LETTER_START = 0.35;
export const LETTER_STEP = 0.7;
export const SEGMENT_DURATION = 0.7;
export const STAR_DURATION = 0.7;
export const LABEL_DURATION = 0.9;
export const START_STAR_DELAY = 0.15;

const DRAW_EASING = 'cubic-bezier(.65,.05,.3,1)';
const POP_EASING = 'cubic-bezier(.2,1.3,.4,1)';

export const letterStart = (i: number): number => LETTER_START + i * LETTER_STEP;
export const segmentDelay = (i: number, order: number): number => letterStart(i) + order * 0.49;
export const starDelay = (i: number, order: number): number => letterStart(i) + 0.15 + order * 0.525;
export const nodeDelay = (i: number): number => LETTER_START + (i + 1) * LETTER_STEP - 0.1;
export const labelDelay = (i: number): number => letterStart(i) + 0.45;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Anima un SVG de pantalla recién creado. Cada elemento animable trae
 * `data-anim` y `data-delay` (en segundos), escritos por `render/svg.ts`.
 * Con movimiento reducido no hace nada: todo queda visible enseguida.
 */
export function playDrawing(svg: SVGSVGElement): Animation[] {
  if (prefersReducedMotion() || typeof svg.animate !== 'function') return [];
  const out: Animation[] = [];
  const ms = (s: number) => Math.round(s * 1000);
  for (const el of svg.querySelectorAll<SVGElement>('[data-anim]')) {
    const delay = ms(Number(el.dataset.delay ?? 0));
    switch (el.dataset.anim) {
      case 'draw': {
        const len = Number(el.dataset.len ?? 0);
        out.push(
          el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
            duration: ms(SEGMENT_DURATION),
            delay,
            easing: DRAW_EASING,
            fill: 'backwards',
          }),
        );
        break;
      }
      case 'pop':
        out.push(
          el.animate(
            [
              { opacity: 0, transform: 'scale(0.2)' },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: ms(STAR_DURATION), delay, easing: POP_EASING, fill: 'backwards' },
          ),
        );
        break;
      case 'fade':
        out.push(el.animate([{ opacity: 0 }, { opacity: 0.7 }], { duration: ms(LABEL_DURATION), delay, fill: 'backwards' }));
        break;
      case 'ring':
        out.push(
          el.animate(
            [
              { opacity: 0, transform: 'scale(1.8)' },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: 1000, delay, fill: 'backwards' },
          ),
        );
        break;
      case 'pulse':
        out.push(
          el.animate(
            [
              { opacity: 0.5, transform: 'scale(1)' },
              { opacity: 0, transform: 'scale(1.7)' },
            ],
            { duration: 3200, delay, easing: 'ease-out', iterations: Infinity },
          ),
        );
        break;
    }
  }
  return out;
}
