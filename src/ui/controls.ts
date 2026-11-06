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

  return {
    input,
    setDraft(value) {
      if (input.value !== value) input.value = value;
    },
    setLabels(on) {
      labels.setAttribute('aria-pressed', String(on));
      labels.textContent = on ? 'Ocultar letras' : 'Mostrar letras';
    },
    setBranches(on) {
      branches.setAttribute('aria-pressed', String(on));
      branches.textContent = on ? 'Ramas: sí' : 'Ramas: no';
    },
  };
}

export { byId };
