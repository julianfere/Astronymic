import type { Strings } from './i18n';

export interface ControlHandlers {
  onDraftInput(value: string): void;
  onTrace(): void;
  onReshape(): void;
  onToggleLabels(): void;
  onToggleBranches(): void;
}

export interface Controls {
  input: HTMLInputElement;
  setDraft(value: string): void;
  setLabels(on: boolean): void;
  setBranches(on: boolean): void;
  setStrings(t: Strings): void;
}

const byId = <T extends Element>(id: string): T => {
  const el: Element | null = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id} en index.html`);
  return el as T;
};

/** Formulario: campo Palabra, Trazar, Otra forma, Letras y Ramas. */
export function setupControls(h: ControlHandlers): Controls {
  const form = byId<HTMLFormElement>('word-form');
  const input = byId<HTMLInputElement>('word');
  const reshape = byId<HTMLButtonElement>('reshape');
  const labels = byId<HTMLButtonElement>('toggle-labels');
  const branches = byId<HTMLButtonElement>('toggle-branches');

  input.addEventListener('input', () => h.onDraftInput(input.value));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    h.onTrace();
  });
  reshape.addEventListener('click', () => h.onReshape());
  labels.addEventListener('click', () => h.onToggleLabels());
  branches.addEventListener('click', () => h.onToggleBranches());

  let t: Strings | null = null;
  let labelsOn = true;
  let branchesOn = true;

  const controls: Controls = {
    input,
    setDraft(value) {
      if (input.value !== value) input.value = value;
    },
    setLabels(on) {
      labelsOn = on;
      labels.setAttribute('aria-pressed', String(on));
      if (t) labels.textContent = on ? t.labelsHide : t.labelsShow;
    },
    setBranches(on) {
      branchesOn = on;
      branches.setAttribute('aria-pressed', String(on));
      if (t) branches.textContent = on ? t.branchesOn : t.branchesOff;
    },
    setStrings(next) {
      t = next;
      controls.setLabels(labelsOn);
      controls.setBranches(branchesOn);
    },
  };
  return controls;
}

export { byId };
