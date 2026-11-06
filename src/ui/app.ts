import { generate, MAX_LETTERS, normalize, type Constellation, type Letter } from '../engine';
import { playDrawing } from '../render/animate';
import { downloadBlob, downloadSvg } from '../render/download';
import { renderPng } from '../render/png';
import { exportFileName, renderConstellation, type Paint } from '../render/svg';
import { renderAlphabet } from './alphabet';
import { byId, setupControls } from './controls';
import { renderLaws } from './laws';
import { renderFlecks } from './paper';
import { applyTheme, initialTheme, onSystemThemeChange, saveTheme, syncThemeButton, type Theme } from './theme';

interface State {
  draft: string;
  word: string;
  seed: number;
  branches: boolean;
  labels: boolean;
  theme: Theme;
  dropped: boolean;
  /** Clave de lo último guardado en cada formato (SPEC § 7, estado Guardada). */
  saved: Partial<Record<Format, string>>;
}

type Format = 'svg' | 'png';

const DOWNLOAD_TEXT: Record<Format, [string, string]> = {
  svg: ['Descargar SVG', 'Vectorial, lista para imprimir'],
  png: ['Descargar PNG', 'Imagen de 2000 × 1640 px'],
};

/** Colores actuales, leídos de los tokens CSS (única fuente de verdad). */
function currentPaint(): Paint {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    bg: v('--bg'),
    ink: v('--ink'),
    accent: v('--accent'),
    starFill: v('--star-fill'),
    head: v('--head'),
    label: v('--label'),
  };
}

/** Parámetros de la URL (?w=ORION&s=0&b=1): mandan sobre los valores iniciales. */
function fromUrl(state: State): void {
  const q = new URLSearchParams(window.location.search);
  const w = q.get('w');
  if (w !== null) {
    const n = normalize(w).word;
    state.word = n;
    state.draft = n;
  }
  const s = Number.parseInt(q.get('s') ?? '', 10);
  if (Number.isFinite(s) && s >= 0) state.seed = s;
  const b = q.get('b');
  if (b === '0' || b === '1') state.branches = b === '1';
}

function syncUrl(state: State): void {
  const q = new URLSearchParams(window.location.search);
  q.set('w', state.word);
  q.set('s', String(state.seed));
  q.set('b', state.branches ? '1' : '0');
  try {
    history.replaceState(null, '', `${window.location.pathname}?${q.toString()}${window.location.hash}`);
  } catch {
    // Algunos entornos (file://, iframes) no dejan cambiar la URL.
  }
}

export function startApp(): void {
  const state: State = {
    draft: 'ORION',
    word: 'ORION',
    seed: 0,
    branches: true,
    labels: true,
    theme: initialTheme(),
    dropped: false,
    saved: {},
  };
  fromUrl(state);

  const sky = byId<HTMLDivElement>('sky');
  const empty = byId<HTMLParagraphElement>('empty');
  const wordDisplay = byId<HTMLParagraphElement>('word-display');
  const downloads = byId<HTMLDivElement>('downloads');
  const downloadButtons = [...downloads.querySelectorAll<HTMLButtonElement>('button[data-format]')];
  const downloadStatus = byId<HTMLParagraphElement>('download-status');
  const reading = byId<HTMLDivElement>('reading');
  const sequence = byId<HTMLSpanElement>('sequence');
  const branchNote = byId<HTMLParagraphElement>('branch-note');
  const dropped = byId<HTMLParagraphElement>('dropped');
  const themeButton = byId<HTMLButtonElement>('theme-toggle');

  let constellation: Constellation = generate(state.word, { seed: state.seed, branches: state.branches });

  const saveKey = () => `${state.word}|${state.seed}|${state.branches ? 1 : 0}|${state.theme}`;

  /** Reconstruye el SVG del cielo. Con `animate`, la pluma lo vuelve a trazar. */
  function drawSky(animate: boolean): void {
    constellation = generate(state.word, { seed: state.seed, branches: state.branches });
    const hasWord = constellation.letters.length > 0;
    sky.innerHTML = renderConstellation(constellation, { mode: 'screen', paint: currentPaint(), labels: state.labels });
    empty.hidden = hasWord;
    const svg = sky.querySelector('svg');
    if (svg && animate) playDrawing(svg);
  }

  function renderCaption(): void {
    const hasWord = constellation.letters.length > 0;
    wordDisplay.textContent = constellation.word;
    downloads.hidden = !hasWord;
    reading.hidden = !hasWord;
    branchNote.hidden = !hasWord;
    dropped.hidden = !state.dropped;

    sequence.replaceChildren(
      ...constellation.letters.map((l, i) => {
        const item = document.createElement('span');
        item.className = 'seq-item';
        const ch = document.createElement('span');
        ch.className = 'seq-letter';
        ch.textContent = l.letter;
        item.append(ch);
        if (i < constellation.letters.length - 1) {
          const sep = document.createElement('span');
          sep.className = 'seq-sep';
          sep.setAttribute('aria-hidden', 'true');
          sep.textContent = l.isBranch ? ' ↺' : ' →';
          item.append(sep);
        }
        return item;
      }),
    );
    renderDownloadState();
  }

  function renderDownloadState(): void {
    const key = saveKey();
    let any = false;
    for (const btn of downloadButtons) {
      const format = btn.dataset.format as Format;
      const saved = state.saved[format] === key;
      if (!saved) delete state.saved[format];
      any ||= saved;
      btn.classList.toggle('is-saved', saved);
      const [title, sub] = saved ? ['Guardada', 'Revisá tu carpeta de descargas'] : DOWNLOAD_TEXT[format];
      btn.querySelector('.download-title')!.textContent = title;
      btn.querySelector('.download-sub')!.textContent = sub;
    }
    if (!any) downloadStatus.textContent = '';
  }

  /** Redibuja todo lo que depende de la palabra, la semilla o las ramas. */
  function redraw(animate = true): void {
    drawSky(animate);
    renderCaption();
    controls.setDraft(state.draft);
    syncUrl(state);
  }

  const controls = setupControls({
    onDraftInput(value) {
      state.draft = value;
    },
    onTrace() {
      const n = normalize(state.draft);
      state.word = n.word;
      state.draft = n.word;
      state.seed = 0;
      state.dropped = n.dropped;
      redraw();
    },
    onReshape() {
      state.seed += 1;
      redraw();
    },
    onToggleLabels() {
      state.labels = !state.labels;
      controls.setLabels(state.labels);
      sky.querySelector('svg')?.classList.toggle('labels-off', !state.labels);
    },
    onToggleBranches() {
      state.branches = !state.branches;
      controls.setBranches(state.branches);
      redraw();
    },
  });

  function addLetter(letter: Letter): void {
    const current = normalize(state.draft).word;
    if (current.length >= MAX_LETTERS) return;
    const next = normalize(current + letter).word;
    state.draft = next;
    state.word = next;
    state.seed = 0;
    state.dropped = false;
    redraw();
  }

  async function download(format: Format, btn: HTMLButtonElement): Promise<void> {
    if (!constellation.letters.length) return;
    const c = constellation;
    const key = saveKey();
    const name = exportFileName(c.word, state.seed, format);
    const paint = currentPaint();
    if (format === 'svg') {
      downloadSvg(renderConstellation(c, { mode: 'export', paint, labels: state.labels }), name);
    } else {
      btn.setAttribute('aria-busy', 'true');
      try {
        downloadBlob(await renderPng(c, paint, state.labels), name);
      } catch (err) {
        console.error(err);
        downloadStatus.textContent = 'No se pudo crear el PNG.';
        return;
      } finally {
        btn.removeAttribute('aria-busy');
      }
    }
    state.saved[format] = key;
    renderDownloadState();
    downloadStatus.textContent = `${format.toUpperCase()} guardada. Revisá tu carpeta de descargas.`;
  }

  for (const btn of downloadButtons) {
    btn.addEventListener('click', () => void download(btn.dataset.format as Format, btn));
  }

  function setTheme(theme: Theme, animate: boolean): void {
    state.theme = theme;
    applyTheme(theme, animate);
    syncThemeButton(themeButton, theme);
    renderDownloadState();
  }

  themeButton.addEventListener('click', () => {
    const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    setTheme(next, true);
  });
  onSystemThemeChange((t) => setTheme(t, true));

  // Primer render.
  setTheme(state.theme, false);
  controls.setLabels(state.labels);
  controls.setBranches(state.branches);
  renderFlecks(byId<SVGSVGElement>('flecks'));
  renderLaws(byId<HTMLOListElement>('laws'));
  renderAlphabet(byId('vowels'), byId('consonants'), currentPaint(), addLetter);
  redraw(true);
}
