import { mulberry32 } from '../engine/rng';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Unas 70 motas fijas sobre el papel (con semilla, siempre las mismas). */
export function renderFlecks(svg: SVGSVGElement, count = 70): void {
  const rnd = mulberry32(20261106);
  const nodes: SVGCircleElement[] = [];
  for (let i = 0; i < count; i++) {
    const x = rnd() * 100;
    const y = rnd() * 100;
    const size = rnd() < 0.85 ? 0.6 + rnd() * 1.2 : 1.8 + rnd() * 1.6;
    const o = 0.12 + rnd() * 0.35;
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', `${x.toFixed(2)}%`);
    c.setAttribute('cy', `${y.toFixed(2)}%`);
    c.setAttribute('r', (size / 2).toFixed(2));
    c.style.setProperty('--o', o.toFixed(3));
    nodes.push(c);
  }
  svg.replaceChildren(...nodes);
}
