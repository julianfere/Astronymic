# Motor de constelaciones: reglas

Este documento es la fuente de verdad del motor (`src/engine/`). Si algo choca con el prototipo, gana este documento.

## 1. Pipeline

```
texto ─► normalize ─► planBranches ─► layoutChain ─► placeSpurs ─► letterGeometry ─► Constellation
                                                                                        │
                                                         render/svg.ts (pantalla y descarga)
```

`generate(text, { seed = 0, branches = true }) → Constellation`. Es una función pura: no toca el DOM y no usa `Math.random`.

## 2. Espacio de coordenadas

- **Unidades del motor (u):** lienzo de **1000 × 720 u**, con el origen arriba a la izquierda y la **y creciendo hacia abajo**, igual que en SVG.
- El centro de composición es `C = (500, 360)`.
- Los ángulos se miden con `atan2(dy, dx)` en ese sistema. **Un ángulo que crece es un giro horario en pantalla.**
- El SVG exportado usa `viewBox="0 0 1000 820"`: el lienzo del motor más una franja de 100 u abajo para el nombre (ver SPEC § 7).

## 3. Normalización

1. Pasar a mayúsculas.
2. Aplicar Unicode NFD y quitar las marcas combinantes `U+0300–U+036F`. Así `Á→A`, `Ü→U` y `Ñ→N`.
3. Quedarse solo con `A–Z`. Los espacios, dígitos y signos se descartan.
4. Truncar a **14 letras** (`MAX_LETTERS = 14`).
5. Devolver también `dropped: boolean`, que vale `true` si se descartó algún carácter que no era espacio.

Las frases funcionan, pero las palabras se pegan: el lenguaje está pensado para palabras sueltas.

## 4. Modelo de glifo

Cada letra ocupa un **tramo** entre dos estrellas mayores `P` (de donde sale) y `Q` (adonde llega).

### 4.1 Marco local del glifo (regla de orientación)

El glifo **no depende del sentido de escritura**: siempre se lee de izquierda a derecha y con "arriba" hacia arriba de la página.

```
L = el de menor x entre P y Q;  R = el otro   (si empatan, L = P)
u = (R − L) / |R − L|            dirección del tramo
n = (u.y, −u.x)                  normal "arriba" (para u = (1,0), n = (0,−1))
at(t, h) = L + u·|R−L|·t + n·h   punto a fracción t del tramo y altura h
```

`h > 0` queda arriba y `h < 0` abajo. Como no hay tramos verticales (§ 6, regla V), `n` siempre tiene componente hacia arriba y "arriba/abajo" está bien definido.

### 4.2 Tipos de glifo (datos en `glyphs.ts`)

Constantes en unidades del motor (`MAIN`). Entre paréntesis, las de la miniatura del abecedario (`MINI`, lienzo 200 × 100).

| Constante | MAIN | MINI |
|---|---|---|
| `NEAR` (distancia de marca) | 24 | 12 |
| `FAR` | 46 | 21 |
| `H_MAX` (altura máx. de triángulo) | 95 | 34 |
| `DOUBLE_GAP` (semi-separación de V) | 5 | 3 |
| `TICK_LEN` (largo de cada raya de W) | 34 | 16 |
| `LABEL_OFFSET` | 64 | — |
| radio de estrella menor | 5.75 | diámetro = 5.5 % del ancho |
| radio de estrella de vértice | 7.5 | diámetro = 6.5 % del ancho |
| radio de estrella mayor | 13.5 | diámetro = 10 % del ancho |

En MINI el tramo va de `(30, 54)` a `(170, 54)`.

- **`line`:** el tramo `P→Q` más una estrella menor por cada marca, en `at(t, ±dist)`.
- **`triangle` (B, C, P, Q):** el tramo `P→Q` (la base), el vértice `A = at(0.58, ±h)` con `h = min(0.30·len, H_MAX)` (arriba si `apex = 'up'`, abajo si `'down'`) y los lados `L→A` y `A→R`. Lleva una estrella de vértice en `A`. Si `inner` es verdadero (P y Q), suma una estrella menor en `at(0.58, ±0.42·h)`, dentro del triángulo.
- **`trapezoid` (H):** el tramo `P→Q`, los vértices `T1 = at(0.27, h)` y `T2 = at(0.73, h)` con `h = min(0.24·len, 0.85·H_MAX)`, y los segmentos `L→T1`, `T1→T2` y `T2→R`. Lleva estrellas de vértice en `T1` y `T2`.
- **`double` (V):** dos líneas paralelas `P±n·DOUBLE_GAP → Q±n·DOUBLE_GAP`. No lleva estrellas menores.
- **`ticks` (W):** el tramo `P→Q` más dos rayas cortas centradas en `t = 0.50` y `t = 0.58`. Cada raya tiene largo `TICK_LEN` y dirección `u` rotada **−65°**, inclinada como "/": `v = (u.x·cos65 + u.y·sin65, −u.x·sin65 + u.y·cos65)`.

### 4.3 Etiqueta (letra opcional sobre el tramo)

Va en `at(0.5, side·LABEL_OFFSET)`, donde `side` es el lado con menos elementos:

- `line` y `ticks`: `up` si hay menos marcas arriba que abajo; si no, `down`.
- `triangle`: el lado opuesto al vértice.
- `trapezoid`, `double`: `down`.

## 5. Grafo de la constelación

- Los **nodos** son las estrellas mayores. Las estrellas de vértice y las menores no son nodos.
- Las **aristas** son las letras. Cada letra une exactamente dos nodos.
- La **cadena principal** es un camino `N0 → N1 → … → Nk`, y `N0` es la estrella inicial.
- Una **rama** (spur) es una letra que sale de un nodo de la cadena (el *hub*) y termina en una **hoja**, un nodo de grado 1 que no sigue la cadena. La letra siguiente sale **del mismo hub**.
- Todo nodo tiene **como máximo 2 aristas salientes**.

## 6. Las seis leyes (reglas estructurales)

| # | Ley | Cómo la cumple el motor |
|---|---|---|
| I | La estrella inicial se marca con un círculo | `start = N0`. El render dibuja un círculo de radio 28 u, en el color de acento, alrededor de `N0` |
| II | Un tramo puede trazarse hacia cualquier lado y el símbolo no cambia | Marco local del § 4.1: la geometría depende de L y R, no de P y Q |
| III | Siempre se escribe en sentido horario | La cadena principal recorre ángulos crecientes alrededor de `C` (§ 7.2) |
| IV | Importa arriba y abajo | `side` siempre es relativo a la normal "arriba" de la página |
| V | No hay líneas verticales | Inclinación de un tramo de la cadena ≤ **56°** y de una rama ≤ **52°**, medidas contra la horizontal. Lo aplica el puntaje de § 7 |
| VI | De una estrella pueden salir 2 letras y se leen en sentido horario | Ver § 8 |

`steep(θ) = min(θ mod 180, 180 − θ mod 180)` es la inclinación respecto de la horizontal, en grados.

## 7. Layout

### 7.1 PRNG y semilla

- Hash: **FNV-1a de 32 bits** sobre la palabra normalizada.
- PRNG: **mulberry32** con semilla `hash(word) + seed·7919 + 1`, como entero de 32 bits.
- "Otra forma" incrementa `seed`. Con la misma `(word, seed, branches)` el resultado es idéntico.
- El PRNG se consume **en este orden**: primero el plan de ramas (§ 8.1) y después los intentos de layout (§ 7.2). Respetar el orden hace que las formas coincidan con el prototipo. Es deseable, no obligatorio.

### 7.2 Cadena principal (`k` tramos, `k+1` nodos)

- **Caso `k = 1`:** `tilt = (r − 0.5)·220`, `N0 = (250, 360 − tilt/2)`, `N1 = (750, 360 + tilt/2)`.
- **Caso `k ≥ 2`:** se hacen hasta **400 intentos** y se queda el de menor puntaje (corta antes si llega a 0).

```
sweep  = k ≤ 6 ? 58·k : min(44·k, 600)        // grados; > 320 forma una espiral
shrink = sweep > 320 ? 0.50 : 0.12
scale  = (hay ramas) ? 0.74 : 1                // deja lugar hacia afuera para las ramas
start  = r·360
para i en 0..k:
  t   = i / k
  ang = start + sweep·t + (r − 0.5)·18
  rr  = (1 − shrink·t) · (0.86 + 0.20·r) · scale
  N_i = C + (380·rr·cos ang, 250·rr·sin ang)
```

Como `ang` crece con `i` y la y va hacia abajo, la cadena gira en **sentido horario** (Ley III).

**Cadenas largas (`k ≥ 7`), ajuste de la implementación.** Con pasos parejos de ~44°, todo tramo que cruza un costado de la elipse (0° o 180°) sale casi vertical, y la invariante 6 no se cumple (≈ 67 % del corpus). Por eso, desde `k = 7`:

- Se fija un nodo en un costado (`0°` o `180°`, elegido con `start`) y los pasos siguen el patrón cíclico `[56, 34, 34, 56]` (cada media vuelta suma 180°), con una fase al azar en el patrón y un jitter de `±3°`.
- El radio solo se achica en los pasos de arriba y abajo (los de 34°). Así los tramos que tocan un costado no se inclinan por la espiral.
- `rr = (1 − shrink·t)·(0.86 + 0.20·r)·scale·(1 ± 0.02)`, con `t` = pasos de arriba y abajo recorridos / total.

Para `k ≤ 6` rige la fórmula de arriba sin cambios (SHARK coincide con el prototipo).

**Garantías.** Pasarse del límite de inclinación suma además un recargo fijo de 150, y superar 75° suma 5000. Si después de 400 intentos la mejor forma supera los 75°, se sigue buscando (hasta 4000 intentos más) y solo se aceptan formas sin esas líneas. El puntaje también penaliza (`3·distancia`) los puntos de glifos fuera de `[10, 990] × [10, 710]`. Si al final algo queda afuera, toda la constelación se escala hacia `C` (×0.97 por paso), lo que conserva ángulos, cruces y sentido horario.

### 7.3 Puntaje de un intento (menor es mejor; 0 es perfecto)

| Penalización | Fórmula |
|---|---|
| Tramo demasiado inclinado | `(steep − 56)·12` si `steep > 56` |
| Tramo corto | `(165 − len)·2` si `len < 165` |
| Cruce entre tramos no adyacentes | `+300` por cruce (intersección propia, sin contar extremos compartidos) |
| Nodo fuera de margen | `3·distancia` a `x ∈ [80, 920]`, `y ∈ [85, 640]` |
| Nodos no adyacentes cercanos | `(120 − d)·2` si `d < 120` |
| Ramas | la penalización que devuelve § 8.2 |

## 8. Ramas (Ley VI)

### 8.1 Qué letras son ramas

Para cada índice `i` de la palabra:

```
esRama(i) = branches
         && i ≥ 1                // nunca la primera (sale de la estrella inicial, sin tramo de llegada)
         && i ≤ n − 2            // nunca la última (tiene que haber continuación)
         && !esRama(i − 1)       // nunca dos seguidas (el hub tendría 3 salidas)
         && r < 0.34
```

El hub de la rama `i` es el nodo de la cadena en que está parado el lector: `N_c`, donde `c` es la cantidad de letras de cadena antes de `i`. La cadena tiene `k = n − (#ramas)` tramos.

### 8.2 Dónde va la hoja

En el hub `H`, con `B = N_{c−1}` (de donde se llegó) y `N = N_{c+1}` (la continuación):

```
aB    = atan2(B − H)
aN    = atan2(N − H)
sweep = (aN − aB) mod 360          // barrido HORARIO desde el tramo de llegada hasta la continuación
```

La hoja tiene que quedar **dentro de ese barrido**, para que al girar en sentido horario desde el tramo de llegada aparezca **antes** que la continuación. Se prueban las fracciones `f ∈ [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78]`, cada una con un jitter de `±0.03`:

```
ang  = aB + sweep·f
len  = 175 + 45·r                  // se sortea una vez por rama
hoja = H + len·(cos ang, sin ang)
```

Penalizaciones de cada candidata (se queda la primera con 0; si ninguna llega a 0, la de menor penalización, sumando `+50`):

- Margen angular menor a 30° respecto de cualquiera de los dos tramos: `(30 − margen)·10`.
- `steep(ang) > 52`: `(steep − 52)·12`.
- Fuera de `x ∈ [70, 930]`, `y ∈ [70, 650]`: `3·distancia`.
- Cruza otro tramo que no toque `H`: `+300`.
- Queda a menos de 110 u de otro nodo: `(110 − d)·2`.

### 8.3 Orden de lectura (normativo)

Parado en un nodo, las aristas salientes se ordenan por **ángulo horario medido desde la arista por la que se llegó**. Se lee primero la más cercana en ese giro. Si es una hoja, se lee y se vuelve al hub. En la estrella inicial hay una sola salida, así que no hay ambigüedad.

## 9. Invariantes (todas deben tener test)

Para cualquier palabra válida `w` (1–14 letras) y cualquier `seed`, con `branches` en `true` o `false`:

1. **Determinismo:** `generate(w, o)` deep-equals `generate(w, o)`.
2. **Ida y vuelta:** `read(generate(w, o)) === normalize(w)`, donde `reader.ts` recorre el grafo según § 8.3. **Es la prueba principal de la Ley VI.**
3. **Cantidad:** hay `n` letras-arista y `n + 1` nodos.
4. **Grado:** ningún nodo tiene más de 2 salidas. La estrella inicial tiene exactamente 1.
5. **Ramas:** ninguna en `i = 0`, ninguna en `i = n − 1` y nunca dos consecutivas. Con `branches = false` no hay ninguna.
6. **Verticalidad:** en ≥ 99 % de un corpus de prueba (por ejemplo, 500 palabras × 5 semillas), ningún tramo de la cadena supera los 56° y ninguna rama los 52°. **Nunca** se acepta una línea con `steep > 75°`.
7. **Orientación:** para cada marca `up`, el punto queda del lado de la normal "arriba", con `dot(p − L, n) > 0`.
8. **Invariancia de dirección:** la geometría de una letra sobre `P→Q` es la misma que sobre `Q→P`. Lo único que cambia es el orden de animación.
9. **Límites:** todo punto (nodos, vértices, marcas) queda dentro de `[0, 1000] × [0, 720]`.
10. **Sentido horario:** los nodos de la cadena tienen ángulos (sin envolver) estrictamente crecientes alrededor de `C`.

## 10. Modelo de salida

```ts
interface Point { x: number; y: number }

interface Segment { a: Point; b: Point; order: number }   // order ∈ [0,1]: cuándo se traza dentro de la letra
interface MinorStar { p: Point; r: number; order: number; role: 'mark' | 'apex' | 'inner' }

interface LetterStroke {
  index: number;            // posición en la palabra
  letter: Letter;
  from: number;             // id de nodo P
  to: number;               // id de nodo Q
  isBranch: boolean;
  segments: Segment[];      // en sentido de escritura: a es el extremo más cercano a P
  stars: MinorStar[];       // el order usa t medido desde P
  label: Point;
}

interface Constellation {
  word: string;             // normalizada
  dropped: boolean;
  seed: number;
  nodes: Point[];           // nodes[0] = estrella inicial
  startNode: 0;
  letters: LetterStroke[];  // en orden de lectura
  score: number;            // puntaje final del layout (0 = perfecto), útil para debug
}
```

## 11. Animación (lo que el motor tiene que exponer)

El motor no anima, pero cada `order` permite calcular los tiempos (ver SPEC § 6):

- Letra `i`: `t0 = 0.35 + i·0.70` s.
- Segmento: `delay = t0 + order·0.49` s, con duración de 0.7 s.
- Estrella menor: `delay = t0 + 0.15 + order·0.525` s.
- Nodo de llegada de la letra `i`: aparece en `0.35 + (i+1)·0.70 − 0.1` s. La estrella inicial, en 0.15 s.

## 12. Preguntas abiertas (sin resolver con la fuente)

1. **I y J** se ven iguales en la referencia (una estrella abajo, al centro). Por ahora J usa `dist: 'far'`. Si aparece la diferencia real, se cambia solo en `glyphs.ts`.
2. **Rama desde la estrella inicial:** hoy está prohibida porque no hay tramo de llegada desde donde girar. Si se habilita, hay que definir una dirección de referencia (por ejemplo, "las 12").
3. **Sentido global:** el ejemplo SHARK de la fuente parece recorrerse en sentido antihorario, aunque el orden en la estrella compartida sí es horario. El motor aplica la Ley III como está escrita. Si eso cambia, solo cambia el signo de `sweep` en § 7.2.
4. **Ñ:** hoy se trata como N. Si el lenguaje tiene un glifo propio, se agrega en `glyphs.ts`.
