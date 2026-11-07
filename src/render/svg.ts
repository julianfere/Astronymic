import {
  CANVAS_H,
  CANVAS_W,
  GLYPHS,
  letterGeometry,
  MINI,
  MINI_P,
  MINI_Q,
  type Constellation,
  type Letter,
  type MinorStar,
  type Point,
} from '../engine';
import { labelDelay, nodeDelay, segmentDelay, START_STAR_DELAY, starDelay } from './animate';

/**
 * Constellation → SVG. La pantalla y el archivo descargado salen de esta misma
 * función: lo descargado es idéntico a lo que se ve (sin ornamentos).
 *
 * Es una función de texto, sin DOM, así que también corre en los tests.
 */

export interface Paint {
  bg: string;
  ink: string;
  accent: string;
  starFill: string;
  head: string;
  label: string;
}

export interface RenderOptions {
  /** `screen`: con ornamentos, clases y datos de animación. `export`: limpio para imprimir. */
  mode: 'screen' | 'export';
  paint: Paint;
  labels: boolean;
  /**
   * Solo `export`: con `false` se omiten las etiquetas y el nombre. Lo usa el
   * PNG, que los dibuja en el canvas con las fuentes ya cargadas en la página
   * (una imagen SVG no puede usar las fuentes web del documento).
   */
  text?: boolean;
  /** Solo `screen`: aria-label del SVG. Por defecto, en español. */
  ariaLabel?: string;
}

export const STAR_MINOR =
  'M12 0C12.8 7.5 16.5 11.2 24 12C16.5 12.8 12.8 16.5 12 24C11.2 16.5 7.5 12.8 0 12C7.5 11.2 11.2 7.5 12 0Z';
export const STAR_MAJOR =
  'M12 1.5C12.7 7.8 16.2 11.3 22.5 12C16.2 12.7 12.7 16.2 12 22.5C11.3 16.2 7.8 12.7 1.5 12C7.8 11.3 11.3 7.8 12 1.5Z';

export const LINE_WIDTH = 1.8;
export const START_RING_R = 28;
export const LABEL_SIZE = 23;
export const EXPORT_H = 820;
export const FONT_SC = "'IM Fell English SC', Georgia, serif";
export const NAME = Object.freeze({ x: 500, y: 785, size: 44, spacing: 12 });

/** Línea de base de una etiqueta centrada en `p`. */
export const labelBaseline = (p: Point): number => p.y + LABEL_SIZE * 0.33;

/** Redondea a 2 decimales, sin "-0". */
export function num(v: number): string {
  const r = Math.round(v * 100) / 100;
  return String(r === 0 ? 0 : r);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Attrs = Record<string, string | number | undefined | false>;

function tag(name: string, attrs: Attrs, children?: string): string {
  let out = `<${name}`;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    out += ` ${k}="${typeof v === 'number' ? num(v) : esc(v)}"`;
  }
  return children === undefined ? `${out}/>` : `${out}>${children}</${name}>`;
}

interface Ctx {
  screen: boolean;
  paint: Paint;
}

/** Atributos que solo van en pantalla (clases y animación). */
const onScreen = (ctx: Ctx, attrs: Attrs): Attrs => (ctx.screen ? attrs : {});

/**
 * Una estrella centrada en `p` con radio `r`. El grupo interno es el que se
 * anima (escala desde el centro).
 */
function star(ctx: Ctx, p: Point, r: number, path: string, paintAttrs: Attrs, anim?: Attrs): string {
  const inner = tag('path', { d: path, transform: `scale(${num((2 * r) / 24)}) translate(-12 -12)`, ...paintAttrs });
  const pop = anim && ctx.screen ? tag('g', { class: 'pop', ...anim }, inner) : inner;
  return tag('g', { transform: `translate(${num(p.x)} ${num(p.y)})` }, pop);
}

function minorStar(ctx: Ctx, s: MinorStar, delay: number): string {
  return star(ctx, s.p, s.r, STAR_MINOR, {}, { 'data-anim': 'pop', 'data-delay': num(delay) });
}

function majorStar(ctx: Ctx, p: Point, r: number, delay: number | null, cls = 'major'): string {
  const paintAttrs: Attrs = {
    fill: ctx.paint.starFill,
    stroke: ctx.paint.ink,
    'stroke-width': 1.8,
    'stroke-linejoin': 'round',
    ...onScreen(ctx, { class: cls }),
  };
  const anim = delay === null ? undefined : { 'data-anim': 'pop', 'data-delay': num(delay) };
  return star(ctx, p, r, STAR_MAJOR, paintAttrs, anim);
}

/** Anillos de astrolabio (solo pantalla). */
function ornaments(): string {
  const c = { cx: CANVAS_W / 2, cy: CANVAS_H / 2 };
  return tag(
    'g',
    { class: 'ornament', 'aria-hidden': 'true', fill: 'none' },
    [
      tag('circle', { ...c, r: CANVAS_W * 0.48, class: 'orbit-soft' }),
      tag('circle', { ...c, r: CANVAS_W * 0.39, class: 'orbit spin', 'stroke-dasharray': '6 7' }),
      tag('circle', { ...c, r: CANVAS_W * 0.29, class: 'orbit spin-rev', 'stroke-dasharray': '1.5 6', 'stroke-linecap': 'round' }),
      tag('line', { x1: CANVAS_W * 0.02, y1: c.cy, x2: CANVAS_W * 0.98, y2: c.cy, class: 'orbit-soft' }),
    ].join(''),
  );
}

/** El SVG de una constelación, para pantalla o para descargar. */
export function renderConstellation(c: Constellation, opts: RenderOptions): string {
  const ctx: Ctx = { screen: opts.mode === 'screen', paint: opts.paint };
  const withText = ctx.screen || opts.text !== false;
  const { paint } = opts;
  const parts: string[] = [];

  if (ctx.screen) parts.push(ornaments());
  else {
    parts.push(tag('title', {}, esc(`Astronymic: ${c.word}`)));
    parts.push(tag('rect', { width: CANVAS_W, height: EXPORT_H, fill: paint.bg }));
  }

  if (c.letters.length) {
    // Segmentos de las letras.
    const segs = c.letters.flatMap((l) =>
      l.segments.map((s) => {
        const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
        return tag('line', {
          x1: s.a.x,
          y1: s.a.y,
          x2: s.b.x,
          y2: s.b.y,
          ...onScreen(ctx, {
            'stroke-dasharray': num(len + 1),
            'data-anim': 'draw',
            'data-len': num(len + 1),
            'data-delay': num(segmentDelay(l.index, s.order)),
          }),
        });
      }),
    );
    parts.push(
      tag(
        'g',
        { fill: 'none', stroke: paint.ink, 'stroke-width': LINE_WIDTH, 'stroke-linecap': 'round', ...onScreen(ctx, { class: 'ink-stroke' }) },
        segs.join(''),
      ),
    );

    // Estrellas menores.
    const minors = c.letters.flatMap((l) => l.stars.map((s) => minorStar(ctx, s, starDelay(l.index, s.order))));
    parts.push(tag('g', { fill: paint.ink, ...onScreen(ctx, { class: 'ink-fill' }) }, minors.join('')));

    // Círculo de la estrella inicial.
    const start = c.nodes[c.startNode];
    const ring = { cx: start.x, cy: start.y, r: START_RING_R, fill: 'none', stroke: paint.accent, 'stroke-width': 2 };
    if (ctx.screen) {
      parts.push(
        tag(
          'g',
          { class: 'start' },
          tag('circle', { ...ring, class: 'accent-stroke ring', 'data-anim': 'ring', 'data-delay': '0.1' }) +
            tag('circle', { ...ring, r: START_RING_R + 7, 'stroke-width': 1, opacity: 0, class: 'accent-stroke pulse', 'data-anim': 'pulse', 'data-delay': '1.2' }),
        ),
      );
    } else {
      parts.push(tag('circle', ring));
    }

    // Estrellas mayores: la inicial y la de llegada de cada letra.
    const majors = [majorStar(ctx, start, 13.5, START_STAR_DELAY)];
    for (const l of c.letters) majors.push(majorStar(ctx, c.nodes[l.to], 13.5, nodeDelay(l.index)));
    parts.push(tag('g', {}, majors.join('')));

    // Etiquetas.
    if (ctx.screen || (opts.labels && withText)) {
      const labels = c.letters.map((l) =>
        tag(
          'text',
          {
            x: l.label.x,
            y: labelBaseline(l.label),
            opacity: 0.7,
            ...onScreen(ctx, { 'data-anim': 'fade', 'data-delay': num(labelDelay(l.index)) }),
          },
          l.letter,
        ),
      );
      parts.push(
        tag(
          'g',
          {
            'font-family': FONT_SC,
            'font-size': LABEL_SIZE,
            'text-anchor': 'middle',
            fill: paint.label,
            ...onScreen(ctx, { class: 'labels label-fill', 'aria-hidden': 'true' }),
          },
          labels.join(''),
        ),
      );
    }
  }

  if (!ctx.screen) {
    if (withText) {
      parts.push(
        tag(
          'text',
          { x: NAME.x, y: NAME.y, 'text-anchor': 'middle', 'font-family': FONT_SC, 'font-size': NAME.size, 'letter-spacing': NAME.spacing, fill: paint.head },
          esc(c.word),
        ),
      );
    }
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      tag('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${CANVAS_W} ${EXPORT_H}`, width: CANVAS_W, height: EXPORT_H }, parts.join(''))
    );
  }

  return tag(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${CANVAS_W} ${CANVAS_H}`,
      class: opts.labels ? 'sky' : 'sky labels-off',
      role: 'img',
      'aria-label': opts.ariaLabel ?? (c.word ? `Constelación de la palabra ${c.word}` : 'Pergamino vacío'),
    },
    parts.join(''),
  );
}

/** Miniatura de una letra para el abecedario (viewBox 200 × 100, geometría MINI). */
export function renderGlyphMini(letter: Letter, paint: Paint): string {
  const ctx: Ctx = { screen: true, paint };
  const g = letterGeometry(MINI_P, MINI_Q, GLYPHS[letter], MINI);
  const lines = g.segments.map((s) => tag('line', { x1: s.a.x, y1: s.a.y, x2: s.b.x, y2: s.b.y })).join('');
  const minors = g.stars.map((s) => star(ctx, s.p, s.r, STAR_MINOR, {})).join('');
  const majors = [MINI_P, MINI_Q].map((p) => majorStar(ctx, p, MINI.rMajor, null)).join('');
  return tag(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 200 100', class: 'mini', 'aria-hidden': 'true', focusable: 'false' },
    tag('g', { fill: 'none', stroke: paint.ink, 'stroke-width': 1.6, 'stroke-linecap': 'round', class: 'ink-stroke' }, lines) +
      tag('g', { fill: paint.ink, class: 'ink-fill' }, minors) +
      majors,
  );
}

/** Nombre del archivo descargado (SPEC § 7). */
export function exportFileName(word: string, seed: number, ext: 'svg' | 'png' = 'svg'): string {
  return `astronymic-${word.toLowerCase()}${seed > 0 ? `-forma${seed}` : ''}.${ext}`;
}
