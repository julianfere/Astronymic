/** Dispara la descarga de un archivo con un `<a download>` temporal. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Algunos navegadores leen la URL después del clic: se libera en el siguiente ciclo.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Descarga un SVG ya armado. El texto se genera al hacer clic (no se guarda un
 * data: URI en cada render).
 */
export function downloadSvg(svg: string, fileName: string): void {
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), fileName);
}
