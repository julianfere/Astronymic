import { CONSONANTS, VOWELS, type Letter } from '../engine';
import { renderGlyphMini, type Paint } from '../render/svg';

function card(letter: Letter, paint: Paint, onPick: (l: Letter) => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card';
  btn.setAttribute('aria-label', `Agregar letra ${letter}`);
  const ch = document.createElement('span');
  ch.className = 'card-letter';
  ch.setAttribute('aria-hidden', 'true');
  ch.textContent = letter;
  btn.append(ch);
  btn.insertAdjacentHTML('beforeend', renderGlyphMini(letter, paint));
  btn.addEventListener('click', () => onPick(letter));
  return btn;
}

/** Grilla del abecedario: vocales en su recuadro y después consonantes. */
export function renderAlphabet(
  vowels: HTMLElement,
  consonants: HTMLElement,
  paint: Paint,
  onPick: (l: Letter) => void,
): void {
  vowels.replaceChildren(...VOWELS.map((l) => card(l, paint, onPick)));
  consonants.replaceChildren(...CONSONANTS.map((l) => card(l, paint, onPick)));
}
