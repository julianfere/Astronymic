import { CANVAS_W, type Constellation } from '../engine';
import { EXPORT_H, FONT_SC, LABEL_SIZE, labelBaseline, NAME, renderConstellation, type Paint } from './svg';

/** Escala del PNG: 2 → 2000 × 1640 px. */
export const PNG_SCALE = 2;

/**
 * PNG a partir del mismo SVG de exportación. Los trazos y estrellas salen del
 * SVG rasterizado; las letras se dibujan en el canvas con las fuentes de la
 * página, porque una imagen SVG no puede cargar fuentes web.
 */
export async function renderPng(
  c: Constellation,
  paint: Paint,
  labels: boolean,
  scale = PNG_SCALE,
): Promise<Blob> {
  const svg = renderConstellation(c, { mode: 'export', paint, labels, text: false });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  try {
    img.src = url;
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W * scale;
  canvas.height = EXPORT_H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite dibujar en canvas.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);

  // Que las fuentes estén listas antes de escribir (si fallan, queda Georgia).
  try {
    await Promise.all([
      document.fonts.load(`${LABEL_SIZE}px ${FONT_SC}`, c.word),
      document.fonts.load(`${NAME.size}px ${FONT_SC}`, c.word),
    ]);
  } catch {
    // Sin la API de fuentes: se usa lo que haya.
  }

  if (labels) {
    ctx.save();
    ctx.font = `${LABEL_SIZE}px ${FONT_SC}`;
    ctx.fillStyle = paint.label;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const l of c.letters) ctx.fillText(l.letter, l.label.x, labelBaseline(l.label));
    ctx.restore();
  }

  // Nombre con el mismo espaciado que el SVG: cada letra suma NAME.spacing.
  ctx.font = `${NAME.size}px ${FONT_SC}`;
  ctx.fillStyle = paint.head;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const chars = [...c.word];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, w) => a + w + NAME.spacing, 0);
  let x = NAME.x - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, NAME.y);
    x += widths[i] + NAME.spacing;
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear el PNG.'))), 'image/png'),
  );
}
