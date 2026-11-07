import type { Strings } from './i18n';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Las seis leyes, en el idioma de `t`. */
export function renderLaws(list: HTMLOListElement, t: Strings): void {
  list.replaceChildren(
    ...t.laws.map((text, i) => {
      const n = NUMERALS[i] ?? String(i + 1);
      const li = document.createElement('li');
      const num = document.createElement('span');
      num.className = 'law-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = n;
      const label = document.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = t.law(n);
      const body = document.createElement('span');
      body.className = 'law-text';
      body.textContent = text;
      li.append(num, label, body);
      return li;
    }),
  );
}
