import type { Strings } from './i18n';

export type Theme = 'light' | 'dark';

const KEY = 'astronymic-theme';
const TRANSITION_MS = 650;

function stored(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

function system(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Tema inicial: lo último elegido o, si no hay, el del sistema. */
export function initialTheme(): Theme {
  return stored() ?? system();
}

let transitionTimer: number | undefined;

/** Aplica el tema al documento. Con `animate`, los colores cambian en 0.6 s. */
export function applyTheme(theme: Theme, animate = false): void {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theming');
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => root.classList.remove('theming'), TRANSITION_MS);
  }
  root.setAttribute('data-theme', theme);
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el tema no persiste.
  }
}

/** Avisa cuando cambia el tema del sistema, solo si nadie eligió uno a mano. */
export function onSystemThemeChange(cb: (t: Theme) => void): void {
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!stored()) cb(e.matches ? 'dark' : 'light');
    });
  } catch {
    // matchMedia no disponible.
  }
}

/** Botón de tema: ícono, aria-pressed y aria-label (SPEC § 3). */
export function syncThemeButton(button: HTMLButtonElement, theme: Theme, t: Strings): void {
  const dark = theme === 'dark';
  button.setAttribute('aria-pressed', String(dark));
  button.setAttribute('aria-label', dark ? t.themeToLight : t.themeToDark);
}
