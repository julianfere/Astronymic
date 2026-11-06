# Astronymic: instrucciones para Claude Code

Astronymic es una SPA que convierte una palabra en una **constelación**. Cada letra es un tramo entre dos estrellas, con estrellas pequeñas arriba o abajo según el abecedario. La palabra se lee desde la estrella marcada con un círculo, en sentido horario.

Antes de escribir código, leé estos tres archivos completos:

1. `docs/ENGINE.md`: las reglas del motor que genera las constelaciones. Es la fuente de verdad.
2. `docs/SPEC.md`: las funcionalidades, la UI, los temas, las animaciones, la descarga SVG y la accesibilidad.
3. `src/engine/glyphs.ts`: el abecedario como datos. No lo reescribas a mano: usalo tal cual.

`reference/prototype-main.dc.html` es el prototipo de diseño aprobado. Sirve solo de **referencia visual y de comportamiento**: está escrito para otro runtime. No lo copies ni portes su estructura (ver "Nada heredado").

## Stack

- Vite + TypeScript en modo `strict`, **sin framework de UI**.
- Vitest para tests.
- CSS plano con custom properties. Sin Tailwind ni CSS-in-JS.
- Fuentes de Google Fonts: `IM Fell English` (cuerpo) e `IM Fell English SC` (títulos y letras).
- Sin dependencias de runtime, salvo que una tarea lo justifique con claridad.

## Comandos

```bash
npm create vite@latest . -- --template vanilla-ts   # solo la primera vez
npm install
npm run dev        # servidor de desarrollo
npm run build      # build de producción (sitio estático)
npm run test       # vitest run
npm run typecheck  # tsc --noEmit
```

Agregá `test` y `typecheck` a `package.json` si el template no los trae.

## Estructura

```
src/
  engine/            # PURO: sin DOM, sin window, sin Math.random
    glyphs.ts        # abecedario (provisto)
    normalize.ts     # texto → letras válidas
    rng.ts           # mulberry32 + hash FNV-1a
    branches.ts      # qué letras son ramas
    layout.ts        # posiciones de las estrellas mayores (cadena + ramas)
    geometry.ts      # geometría de cada letra sobre su tramo
    reader.ts        # lee una constelación y devuelve la palabra (para tests)
    index.ts         # generate(word, options) → Constellation
  render/
    svg.ts           # Constellation → SVG (pantalla y exportación, misma función)
    animate.ts       # tiempos de trazado; respeta prefers-reduced-motion
    download.ts      # descarga del SVG
  ui/
    app.ts           # estado y wiring
    controls.ts      # input, Trazar, Otra forma, Letras, Ramas
    alphabet.ts      # grilla del abecedario
    laws.ts          # las seis leyes
    theme.ts         # claro/oscuro
  styles/
    tokens.css       # colores por tema (custom properties)
    base.css
    components.css
tests/
  engine.*.test.ts
```

## Reglas de trabajo

- **El motor es puro y determinista.** `generate(word, { seed, branches })` devuelve siempre el mismo resultado para la misma entrada. Toda aleatoriedad pasa por el PRNG con semilla de `rng.ts`.
- **Una sola geometría.** La pantalla y el archivo descargado salen de la misma `Constellation` y del mismo `render/svg.ts`, así que lo descargado es idéntico a lo que se ve.
- **Todo en SVG.** Las líneas son `<line>` o `<path>` y las estrellas son `<path>`. No uses `div` rotados para dibujar.
- **Orden de implementación:** el motor con sus tests, después el render SVG, después la UI y al final la animación y la descarga. No arranques la UI con el motor en rojo.
- **Tests obligatorios del motor:** todas las invariantes de `docs/ENGINE.md` § 9, incluida la propiedad de ida y vuelta `read(generate(w)) === w` para muchas palabras y semillas.
- **Copy en español rioplatense** (voseo), con los textos tal como están en `docs/SPEC.md`.
- **Accesibilidad:** controles nativos (`button`, `a`, `input` con `label`), foco visible, contraste AA y `prefers-reduced-motion`.

## Nada heredado

El prototipo usa trucos de su runtime de diseño. **No los traigas:**

- Nada de `<x-dc>`, `<sc-for>`, `<sc-if>`, `data-props`, `DCLogic` ni `support.js`.
- No alternes nombres de keyframes (`drawA`/`drawB`) para reiniciar animaciones. Rehacé el SVG o usá la Web Animations API.
- No uses `div` rotados con `clip-path` para las líneas: usá `stroke-dasharray`/`stroke-dashoffset` sobre SVG.
- No uses unidades `cqw` para el tamaño de las estrellas: el `viewBox` del SVG ya escala todo.
- No dejes el `data:` URI armado en cada render. El SVG se genera al hacer clic en descargar (ver SPEC § 7).
- Dejá afuera el filtro de "tinta ondulada" (`feDisplacementMap`): se descartó porque los trazos tienen que ser prolijos.

## Definición de terminado

- `npm run typecheck`, `npm run test` y `npm run build` pasan sin errores ni warnings.
- Se cumplen todos los criterios de aceptación de `docs/SPEC.md` § 11.
- La palabra `SHARK` con `seed = 0` se genera, se lee de vuelta como `SHARK` y se descarga como un SVG válido.
