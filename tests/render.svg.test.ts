import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine';
import { exportFileName, renderConstellation, renderGlyphMini, type Paint } from '../src/render/svg';

const PAINT: Paint = {
  bg: '#e3d2aa',
  ink: '#2b1d12',
  accent: '#8a2c1a',
  starFill: '#efe3c4',
  head: '#241609',
  label: '#4a3523',
};

/** Chequeo mínimo de XML bien formado: etiquetas balanceadas y atributos entre comillas. */
function assertWellFormed(xml: string): void {
  const body = xml.replace(/^<\?xml[^?]*\?>\s*/, '');
  const stack: string[] = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    expect(body.slice(last, m.index)).not.toMatch(/[<>]/);
    last = re.lastIndex;
    const [, close, name, , self] = m;
    if (close) expect(stack.pop()).toBe(name);
    else if (!self) stack.push(name);
  }
  expect(body.slice(last).trim()).toBe('');
  expect(stack).toEqual([]);
}

describe('SVG exportado', () => {
  const c = generate('SHARK', { seed: 0 });
  const svg = renderConstellation(c, { mode: 'export', paint: PAINT, labels: true });

  it('SHARK seed 0 es un SVG bien formado con la cabecera pedida', () => {
    assertWellFormed(svg);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 1000 820"');
    expect(svg).toContain('width="1000" height="820"');
    expect(svg).toContain('<title>Astronymic: SHARK</title>');
    expect(svg).toContain('<rect width="1000" height="820" fill="#e3d2aa"/>');
  });

  it('lleva el nombre centrado abajo', () => {
    expect(svg).toMatch(/<text x="500" y="785" text-anchor="middle" font-family="'IM Fell English SC', Georgia, serif" font-size="44" letter-spacing="12" fill="#241609">SHARK<\/text>/);
  });

  it('sin ornamentos, animaciones, clases ni estilos', () => {
    expect(svg).not.toMatch(/class=|style|data-|stroke-dasharray|ornament|<filter|@keyframes/);
  });

  it('todos los números van con 2 decimales como máximo', () => {
    const nums = svg.replace(/<\?xml[^?]*\?>/, '').match(/-?\d+\.\d+/g) ?? [];
    for (const n of nums) expect(n.split('.')[1].length).toBeLessThanOrEqual(2);
  });

  it('dibuja cada segmento, estrella y el círculo inicial', () => {
    const segs = c.letters.reduce((s, l) => s + l.segments.length, 0);
    const stars = c.letters.reduce((s, l) => s + l.stars.length, 0);
    expect(svg.match(/<line /g)).toHaveLength(segs);
    expect(svg.match(/<path /g)).toHaveLength(stars + c.nodes.length);
    expect(svg.match(/<circle /g)).toHaveLength(1);
    expect(svg).toContain('r="28"');
  });

  it('las etiquetas solo van si están visibles', () => {
    const off = renderConstellation(c, { mode: 'export', paint: PAINT, labels: false });
    expect(svg.match(/<text /g)).toHaveLength(c.letters.length + 1);
    expect(off.match(/<text /g)).toHaveLength(1);
  });

  it('la pantalla usa la misma geometría que el archivo', () => {
    const screen = renderConstellation(c, { mode: 'screen', paint: PAINT, labels: true });
    assertWellFormed(screen);
    const lines = (s: string) => (s.match(/<line x1="[^"]+" y1="[^"]+" x2="[^"]+" y2="[^"]+"/g) ?? []).slice(-c.letters.reduce((n, l) => n + l.segments.length, 0));
    expect(lines(screen)).toEqual(lines(svg));
    expect(screen).toContain('aria-label="Constelación de la palabra SHARK"');
    expect(screen).toContain('viewBox="0 0 1000 720"');
  });

  it('nombre de archivo según palabra y semilla', () => {
    expect(exportFileName('SHARK', 0)).toBe('astronymic-shark.svg');
    expect(exportFileName('SHARK', 3)).toBe('astronymic-shark-forma3.svg');
    expect(exportFileName('ORION', 0, 'png')).toBe('astronymic-orion.png');
    expect(exportFileName('ORION', 2, 'png')).toBe('astronymic-orion-forma2.png');
  });

  it('para el PNG, el SVG sin texto conserva todo lo demás', () => {
    const noText = renderConstellation(c, { mode: 'export', paint: PAINT, labels: true, text: false });
    assertWellFormed(noText);
    expect(noText).not.toContain('<text');
    expect(noText.replace(/<g font-family[\s\S]*?<\/g>|<text[\s\S]*?<\/text>/g, '')).toBe(
      svg.replace(/<g font-family[\s\S]*?<\/g>|<text[\s\S]*?<\/text>/g, ''),
    );
  });

  it('las miniaturas del abecedario son SVG bien formados', () => {
    for (const l of ['A', 'B', 'H', 'V', 'W', 'X'] as const) assertWellFormed(renderGlyphMini(l, PAINT));
  });
});
