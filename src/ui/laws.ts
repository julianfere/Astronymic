export const LAWS: readonly [string, string][] = [
  ['I', 'La estrella donde empieza la constelación se marca con un círculo.'],
  ['II', 'Cada tramo puede trazarse hacia cualquier lado: el símbolo de la letra no cambia.'],
  ['III', 'Siempre se escribe en el sentido de las agujas del reloj.'],
  ['IV', 'Lo que importa es arriba y abajo: de qué lado del tramo caen las estrellas pequeñas.'],
  ['V', 'No hay líneas verticales: solo horizontales y diagonales.'],
  [
    'VI',
    'De una misma estrella pueden salir dos letras: se leen en sentido horario, empezando a girar desde el tramo por el que llegaste.',
  ],
];

export function renderLaws(list: HTMLOListElement): void {
  list.replaceChildren(
    ...LAWS.map(([n, text]) => {
      const li = document.createElement('li');
      const num = document.createElement('span');
      num.className = 'law-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = n;
      const label = document.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = `Ley ${n}: `;
      const body = document.createElement('span');
      body.className = 'law-text';
      body.textContent = text;
      li.append(num, label, body);
      return li;
    }),
  );
}
