export type Lang = 'es' | 'en';

const KEY = 'astronymic-lang';

const ES = {
  docTitle: 'Astronymic: lenguaje de las constelaciones',
  docDescription: 'Escribí una palabra y mirala trazarse como una constelación de estrellas.',
  langToggle: 'EN',
  langToggleLabel: 'Switch to English',
  themeToDark: 'Cambiar a modo oscuro',
  themeToLight: 'Cambiar a modo claro',
  kicker: 'Lenguaje de las constelaciones',
  lede: 'Escribí una palabra y dejá que la pluma la trace: cada letra es un tramo de estrellas, cada palabra una constelación.',
  generator: 'Generador',
  wordLabel: 'Palabra',
  wordPlaceholder: 'ej. ORION',
  trace: 'Trazar',
  reshape: 'Otra forma',
  labelsHide: 'Ocultar letras',
  labelsShow: 'Mostrar letras',
  branchesOn: 'Ramas: sí',
  branchesOff: 'Ramas: no',
  empty: 'El pergamino espera una palabra.',
  svgTitle: 'Descargar SVG',
  svgSub: 'Vectorial, lista para imprimir',
  pngTitle: 'Descargar PNG',
  pngSub: 'Imagen de 2000 × 1640 px',
  savedTitle: 'Guardada',
  savedSub: 'Revisá tu carpeta de descargas',
  savedStatus: (format: string) => `${format} guardada. Revisá tu carpeta de descargas.`,
  pngError: 'No se pudo crear el PNG.',
  readingIntro: 'Lectura desde la estrella con círculo, en sentido horario:',
  branchNote: '↺ marca una rama: la letra termina en una estrella suelta y la siguiente sale de la misma estrella que ella.',
  dropped: 'Se omitieron caracteres sin estrella en el abecedario (números, signos o espacios).',
  alphabetTitle: 'El abecedario',
  alphabetHint: 'Tocá una letra para sumarla a la palabra.',
  vowels: 'Vocales',
  consonants: 'Consonantes',
  addLetter: (letter: string) => `Agregar letra ${letter}`,
  lawsTitle: 'Las seis leyes',
  law: (n: string) => `Ley ${n}: `,
  laws: [
    'La estrella donde empieza la constelación se marca con un círculo.',
    'Cada tramo puede trazarse hacia cualquier lado: el símbolo de la letra no cambia.',
    'Siempre se escribe en el sentido de las agujas del reloj.',
    'Lo que importa es arriba y abajo: de qué lado del tramo caen las estrellas pequeñas.',
    'No hay líneas verticales: solo horizontales y diagonales.',
    'De una misma estrella pueden salir dos letras: se leen en sentido horario, empezando a girar desde el tramo por el que llegaste.',
  ],
  footer: 'Va mejor con palabras sueltas que con frases.',
  creditPrefix: 'Lenguaje creado por',
  skyLabel: (word: string) => `Constelación de la palabra ${word}`,
  skyEmpty: 'Pergamino vacío',
};

export type Strings = typeof ES;

const EN: Strings = {
  docTitle: 'Astronymic: the language of constellations',
  docDescription: 'Type a word and watch it being drawn as a constellation of stars.',
  langToggle: 'ES',
  langToggleLabel: 'Cambiar a español',
  themeToDark: 'Switch to dark mode',
  themeToLight: 'Switch to light mode',
  kicker: 'The language of constellations',
  lede: 'Type a word and let the quill trace it: each letter is a stretch of stars, each word a constellation.',
  generator: 'Generator',
  wordLabel: 'Word',
  wordPlaceholder: 'e.g. ORION',
  trace: 'Trace',
  reshape: 'Another shape',
  labelsHide: 'Hide letters',
  labelsShow: 'Show letters',
  branchesOn: 'Branches: on',
  branchesOff: 'Branches: off',
  empty: 'The parchment awaits a word.',
  svgTitle: 'Download SVG',
  svgSub: 'Vector, ready to print',
  pngTitle: 'Download PNG',
  pngSub: '2000 × 1640 px image',
  savedTitle: 'Saved',
  savedSub: 'Check your downloads folder',
  savedStatus: (format: string) => `${format} saved. Check your downloads folder.`,
  pngError: 'Could not create the PNG.',
  readingIntro: 'Read from the circled star, clockwise:',
  branchNote: '↺ marks a branch: the letter ends on a loose star and the next one starts from the same star it did.',
  dropped: 'Characters without a star in the alphabet were skipped (numbers, symbols or spaces).',
  alphabetTitle: 'The alphabet',
  alphabetHint: 'Tap a letter to add it to the word.',
  vowels: 'Vowels',
  consonants: 'Consonants',
  addLetter: (letter: string) => `Add letter ${letter}`,
  lawsTitle: 'The six laws',
  law: (n: string) => `Law ${n}: `,
  laws: [
    'The star where the constellation begins is marked with a circle.',
    'Each stretch can be drawn in any direction: the letter’s symbol does not change.',
    'It is always written clockwise.',
    'What matters is above and below: which side of the stretch the small stars fall on.',
    'There are no vertical lines: only horizontal and diagonal ones.',
    'Two letters can leave the same star: they are read clockwise, turning from the stretch you arrived by.',
  ],
  footer: 'Works better with single words than with phrases.',
  creditPrefix: 'Language created by',
  skyLabel: (word: string) => `Constellation of the word ${word}`,
  skyEmpty: 'Empty parchment',
};

const STRINGS: Record<Lang, Strings> = { es: ES, en: EN };

export function strings(lang: Lang): Strings {
  return STRINGS[lang];
}

/** Idioma inicial: lo último elegido o, si no hay, el del navegador (español por defecto). */
export function initialLang(): Lang {
  try {
    const l = localStorage.getItem(KEY);
    if (l === 'es' || l === 'en') return l;
  } catch {
    // Sin almacenamiento.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : '';
  return nav && nav.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Sin almacenamiento: el idioma no persiste.
  }
}

/** Textos fijos de index.html, marcados con data-i18n="clave". */
export function applyStaticText(lang: Lang): void {
  const t = strings(lang);
  document.documentElement.lang = lang;
  document.title = t.docTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.docDescription);
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const value = t[el.dataset.i18n as keyof Strings];
    if (typeof value === 'string') el.textContent = value;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
    const value = t[el.dataset.i18nLabel as keyof Strings];
    if (typeof value === 'string') el.setAttribute('aria-label', value);
  }
  const input = document.getElementById('word') as HTMLInputElement | null;
  if (input) input.placeholder = t.wordPlaceholder;
}
