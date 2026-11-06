# Astronymic: especificación funcional y de diseño

La referencia visual es `reference/prototype-main.dc.html`. Solo sirve para mirar: no se porta (ver CLAUDE.md § Nada heredado).

## 1. Objetivo

Una página única (SPA) donde escribís una palabra y la ves trazarse como una constelación con estética de **pergamino antiguo en tinta**, en modo claro u oscuro. La podés reacomodar, leer y descargar como SVG.

## 2. Secciones (en orden, una sola columna centrada, `max-width: 1120px`)

1. **Botón de tema**, arriba a la derecha: luna en modo claro y sol en modo oscuro.
2. **Encabezado:**
   - Un filete con una estrella hueca al centro.
   - Antetítulo "Lenguaje de las constelaciones", en el color de acento.
   - Título "Astronymic".
   - Bajada: "Escribí una palabra y dejá que la pluma la trace: cada letra es un tramo de estrellas, cada palabra una constelación."
3. **Generador:**
   - Formulario: campo "Palabra" y los botones Trazar, Otra forma, Mostrar/Ocultar letras y Ramas: sí/no.
   - Lámina: el marco del cielo con la constelación.
   - Debajo de la lámina: la palabra en versalitas, el **botón Descargar SVG** (§ 7), la secuencia de lectura y la nota sobre ramas.
4. **El abecedario:** "Tocá una letra para sumarla a la palabra." Primero un bloque de Vocales (enmarcado, como en la fuente) y después Consonantes.
5. **Las seis leyes:** lista con numerales romanos.
6. **Pie:** "Va mejor con palabras sueltas que con frases."

## 3. Interacciones y estado

| Estado | Tipo | Inicial |
|---|---|---|
| `draft` | string (lo que hay en el input) | `"SHARK"` |
| `word` | string normalizada (lo que se dibuja) | `"SHARK"` |
| `seed` | entero | `0` |
| `branches` | boolean | `true` |
| `labels` | boolean | `true` |
| `theme` | `'light' \| 'dark'` | `prefers-color-scheme`, o lo último elegido (`localStorage`) |
| `savedKey` | string \| null | `null` |

- **Trazar** (submit del form, también con Enter): `word = normalize(draft)`, `draft = word`, `seed = 0` y se redibuja con animación. Si `dropped`, muestra "Se omitieron caracteres sin estrella en el abecedario (números, signos o espacios)."
- **Otra forma:** `seed += 1` y se redibuja con animación.
- **Mostrar/Ocultar letras:** muestra u oculta las etiquetas. No reanima el trazado.
- **Ramas: sí/no:** cambia `branches` y se redibuja con animación.
- **Tarjeta del abecedario:** agrega la letra a `draft` (hasta 14 letras), dibuja enseguida y vuelve `seed` a 0.
- **Tema:** alterna claro y oscuro con una transición de 0.6 s en colores. Se guarda en `localStorage` (con try/catch).
- **URL compartible:** sincronizá `?w=SHARK&s=0&b=1` con `history.replaceState`. Al cargar, si hay parámetros, mandan sobre los valores iniciales.
- **Palabra vacía:** la lámina muestra "El pergamino espera una palabra." y se ocultan el botón de descarga y la secuencia.
- `aria-pressed` en Letras, Ramas y Tema. `aria-label` en el botón de tema: "Cambiar a modo oscuro" o "Cambiar a modo claro".

## 4. Lámina (render en pantalla)

- Un `<svg viewBox="0 0 1000 720">` con ancho 100 % y `role="img"`. El `aria-label` es "Constelación de la palabra SHARK".
- **Capas**, de atrás hacia adelante:
  1. Ornamento de astrolabio: un círculo de 0.78 del ancho, discontinuo, que gira 360° en 180 s. Otro de 0.58, punteado, que gira al revés en 240 s. Uno fijo de 0.96 y una línea horizontal tenue que pasa por el centro.
  2. Segmentos de las letras.
  3. Estrellas menores.
  4. Círculo de la estrella inicial, en acento, con un pulso que se expande (scale 1→1.7 y opacidad 0.5→0 en 3.2 s, infinito, arrancando a 1.2 s).
  5. Estrellas mayores.
  6. Etiquetas.
- **Trazo:** `stroke-width` 1.4–2 u, `stroke-linecap: round`, en el color de tinta. **Sin filtros de ondulación.**
- **Estrellas** (dos `path`, ambos en un viewBox de 24):
  - Menor, rellena: `M12 0C12.8 7.5 16.5 11.2 24 12C16.5 12.8 12.8 16.5 12 24C11.2 16.5 7.5 12.8 0 12C7.5 11.2 11.2 7.5 12 0Z`
  - Mayor, hueca (relleno = `starFill`, borde = tinta de 1.8): `M12 1.5C12.7 7.8 16.2 11.3 22.5 12C16.2 12.7 12.7 16.2 12 22.5C11.3 16.2 7.8 12.7 1.5 12C7.8 11.3 11.3 7.8 12 1.5Z`
- **Marco:** borde de 1.5 px en `ruleStrong`, un filete interior a 6 px en `ruleMid`, estrellas mayores de 16 px en las cuatro esquinas, fondo `frameBg` y sombra interior `frameShadow`.
- **Etiquetas:** IM Fell English SC, alrededor de 23 u, en el color `label`, con opacidad final de 0.7.

## 5. Temas (`src/styles/tokens.css`, con `[data-theme]`)

| Token | Claro | Oscuro |
|---|---|---|
| `--bg` | `#e3d2aa` | `#17120c` |
| `--text` | `#3e2b1b` | `#ded1b3` |
| `--head` | `#241609` | `#f1e6cb` |
| `--sub` | `#4a3523` | `#cdbd9a` |
| `--muted` | `#65503a` | `#ad9d7d` |
| `--label` | `#4a3523` | `#d8caa8` |
| `--ink` (líneas y estrellas) | `#2b1d12` | `#e9dcbc` |
| `--accent` (rúbrica) | `#8a2c1a` | `#d9775c` |
| `--star-fill` | `#efe3c4` | `#1d1710` |
| `--rule-strong` | `rgba(43,29,18,.7)` | `rgba(233,220,188,.55)` |
| `--rule-mid` | `rgba(43,29,18,.4)` | `rgba(233,220,188,.3)` |
| `--rule-soft` | `rgba(43,29,18,.22)` | `rgba(233,220,188,.16)` |
| `--orbit` | `rgba(43,29,18,.22)` | `rgba(233,220,188,.18)` |
| `--frame-bg` | `rgba(250,241,216,.35)` | `rgba(10,7,4,.35)` |
| `--frame-shadow` | `inset 0 0 60px rgba(120,80,35,.22)` | `inset 0 0 70px rgba(0,0,0,.55)` |
| `--card-bg` | `rgba(250,241,216,.25)` | `rgba(10,7,4,.3)` |
| `--btn-bg` | `rgba(58,39,20,.06)` | `rgba(233,220,188,.06)` |

**Textura de papel**, en ambos temas (dos SVG fijos detrás del contenido, `pointer-events: none`):

- Fibra: `feTurbulence fractalNoise` con `baseFrequency` 0.85, 3 octavas y seed 7, más una matriz de color marrón.
  - Claro: `mix-blend-mode: multiply`, opacidad 0.5.
  - Oscuro: `mix-blend-mode: screen`, opacidad 0.13.
- Manchas: `baseFrequency` 0.006, 4 octavas, seed 21, con una matriz de alfa `1.1, −0.45`. Usa `multiply`, con opacidad 0.45 en claro y 0.7 en oscuro.
- Fondo: gradientes radiales para las manchas y el viñeteado (copialos del prototipo, `AST_THEMES.*.bgImage`).
- Motas: unas 70 manchitas fijas (con semilla). En oscuro se vuelven claras y más visibles (×1.6 de opacidad), como estrellas lejanas.

**Tipografía:** cuerpo en IM Fell English 19–22 px. Títulos, botones y letras en IM Fell English SC, con un tracking de 0.08–0.32 em. Título principal en `clamp(46px, 8vw, 88px)`.

## 6. Animaciones

- **Trazado de una palabra:** usa los tiempos de ENGINE § 11.
  - Los segmentos se dibujan con `stroke-dashoffset` (de largo a 0) en 0.7 s, con `cubic-bezier(.65,.05,.3,1)`, **en el sentido de escritura**.
  - Las estrellas aparecen con opacidad 0→1 y escala 0.2→1 en 0.7 s, con `cubic-bezier(.2,1.3,.4,1)`.
  - Las etiquetas aparecen con un fade de 0.9 s.
- **Reiniciar:** cada Trazar, Otra forma o Ramas reconstruye el SVG, o cancela y relanza las animaciones con WAAPI.
- **Entrada del encabezado:** fade-up de 8 px en 1.2 s.
- **Hover:** botones con fondo `rgba(140,105,60,.14)` y `translateY(-1px)`. Tarjetas del abecedario con `translateY(-2px) rotate(-.3deg)` y borde más marcado.
- **`prefers-reduced-motion: reduce`:** sin trazado progresivo (todo aparece enseguida), sin giro de los anillos y sin pulso.

## 7. Botón Descargar SVG

**Diseño** (ver el artboard "Botón de descarga — estados" en el canvas):

- Un `<button type="button">` con un alto mínimo de 56 px y `padding: 8px 22px 8px 10px`.
- Borde de 1.5 px en `--head`, con un contorno extra de 1 px en `--rule-mid` a 3 px de distancia (doble filete). Radio de 2 px.
- A la izquierda, un círculo de 38 px con borde de 1 px en `--accent` y el ícono de descarga (flecha hacia una bandeja) de 18 px en `--accent`.
- Texto en dos líneas: "Descargar SVG" (IM Fell English SC, 20 px, tracking 0.12 em) y debajo, en itálica de 15 px y `--muted`, "Vectorial, lista para imprimir".

**Estados:**

| Estado | Cambio |
|---|---|
| Reposo | Como se describe arriba |
| Hover | Fondo `rgba(140,105,60,.14)`, `translateY(-1px)` y el círculo se rellena de `--accent` con el ícono en `--bg` |
| Foco (teclado) | `outline: 2px solid var(--accent)`, `outline-offset: 3px` |
| Guardada | Ícono de tilde, "Guardada" y "Revisá tu carpeta de descargas". Dura hasta que cambien la palabra, la semilla o el tema. Anunciarlo con `aria-live="polite"` |
| Palabra vacía | No se muestra |

**Comportamiento:**

1. Al hacer clic se genera el SVG desde la misma `Constellation` que está en pantalla, con `render/svg.ts` en modo `export`.
2. Se crea un `Blob` de tipo `image/svg+xml;charset=utf-8` y una URL con `URL.createObjectURL`. Se dispara la descarga con un `<a download>` temporal y después se llama a `revokeObjectURL`.
3. El archivo se llama `astronymic-<palabra en minúsculas>.svg`. Si `seed > 0`, se suma `-forma<seed>` antes de `.svg`.

**Contenido del SVG exportado:**

- `xmlns`, `viewBox="0 0 1000 820"`, `width="1000"`, `height="820"` y `<title>Astronymic: SHARK</title>`.
- Un `<rect>` de fondo en `--bg` del tema actual. **Sin** texturas, ornamentos ni animaciones: el archivo queda limpio para imprimir o grabar.
- Las mismas líneas, estrellas, círculo inicial y colores que en pantalla. Las etiquetas solo van si están visibles en ese momento.
- El nombre centrado en `(500, 785)`, con 44 u y `letter-spacing` 12, en `--head`, y `font-family="'IM Fell English SC', Georgia, serif"`.
- Los números se redondean a 2 decimales. Sin `style` inline ni CSS embebido: todo con atributos de presentación.

### 7.1 Botón Descargar PNG

- Va al lado del de SVG, con el mismo diseño y los mismos estados. Debajo dice "Imagen de 2000 × 1640 px". Cada botón tiene su propio estado Guardada.
- Rasteriza el SVG de exportación (§ 7) a escala 2 en un `<canvas>`. Las etiquetas y el nombre se dibujan en el canvas con las fuentes de la página (una imagen SVG no puede cargar fuentes web), en las mismas posiciones y con el mismo espaciado.
- El archivo se llama como el SVG, con extensión `.png`.

## 8. Abecedario

- Grilla `repeat(auto-fill, minmax(150px, 1fr))` con `gap` de 12 px. Cada tarjeta es un `<button>` con `aria-label="Agregar letra X"`.
- Arriba la letra (IM Fell English SC, 24 px) y debajo la miniatura: un SVG de `viewBox 0 0 200 100` con la geometría `MINI` de ENGINE § 4.2, el tramo de `(30,54)` a `(170,54)` y estrellas mayores en los extremos.
- Las vocales van dentro de un recuadro con doble filete, que imita el recuadro de la fuente.

## 9. Secuencia de lectura

Debajo de la palabra dice "Lectura desde la estrella con círculo, en sentido horario:" y sigue con las letras separadas por `→`. Después de una rama el separador es `↺`. Abajo va la nota: "↺ marca una rama: la letra termina en una estrella suelta y la siguiente sale de la misma estrella que ella."

## 10. Responsive y accesibilidad

- A 360 px de ancho: el formulario se apila y los botones bajan de línea, la lámina mantiene la proporción 1000:720 y no hay scroll horizontal. Los márgenes laterales son de 16 px.
- Contraste AA: con los tokens de la tabla ya se cumple. No los aclares.
- El input tiene `<label for>`, `maxlength="14"`, `autocomplete="off"` y `spellcheck="false"`.
- Todos los controles se pueden usar con el teclado y tienen un área táctil de al menos 44 px.
- Los íconos son decorativos (`aria-hidden="true"`).

## 11. Criterios de aceptación

1. `SHARK` con `seed 0` se dibuja animado, lee `S → H → … → K` y coincide con las reglas del abecedario.
2. Con 1 letra se ve un solo tramo y con 14 letras una espiral. Ningún tramo es vertical.
3. Otra forma cambia la disposición, no las letras. Volver a `seed 0` reproduce la forma original.
4. Con Ramas: sí, alguna palabra de 6 o más letras muestra `↺`, y la lectura horaria en el hub da el orden correcto (test de ida y vuelta).
5. Claro y oscuro se ven como en el canvas, la elección persiste y se respeta `prefers-color-scheme`.
6. El SVG descargado abre en el navegador, en Inkscape y en Illustrator, se ve igual que la lámina (sin ornamentos) y lleva el nombre de archivo correcto.
7. Con `prefers-reduced-motion` no hay animación de trazado.
8. Lighthouse da Accesibilidad ≥ 95 y no hay errores en la consola.
9. Todas las invariantes de ENGINE § 9 pasan en Vitest.

## 12. Fuera de alcance (por ahora)

Imprimir en PDF, el modo decodificador (dibujar y leer), guardar una galería de palabras y otros idiomas.
