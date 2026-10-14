# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

"Burbujas Matemáticas · Prolipa": juego educativo en HTML/CSS/JS puro para practicar suma, resta, multiplicación y división (grados 1.º–10.º de Ecuador). Burbujas con números caen en un tablero; el estudiante toca las que cumplen el número objetivo, suben de nivel y puede descargar un reporte PDF. Todo el texto de interfaz está en español (tuteo, tono para niños). `README.md` explica las reglas de juego y las tablas de dígitos/grados; no se repiten aquí.

## Comandos

No hay `package.json`, build, linter ni suite de pruebas en el repo.

- **Ejecutar:** abrir `index.html` directamente (debe seguir funcionando desde `file://`) o servir la carpeta con cualquier servidor estático.
- **Revisar sintaxis:** `for f in js/*.js; do node --check "$f"; done`
- **Probar reglas sin navegador:** `js/rules.js` es UMD sin DOM, se puede cargar con `require('./js/rules.js')` en Node. La verificación que se ha usado es una simulación aleatoria (todas las operaciones × grados × dígitos × modalidades) que comprueba que el tablero siempre conserva una solución (`findCombo`) tras cada oleada y cada acierto; no está guardada en el repo.
- **Probar en navegador:** el panel de navegador integrado suele estar oculto y entonces `requestAnimationFrame` no corre. Se ha probado con Chrome headless (`--headless=new --remote-debugging-port=…`) manejado por CDP desde Node 22 (`WebSocket` global). `Game._debug()` expone bolas, objetivo, estado, nivel y meta para clics automatizados.

## Restricciones de diseño

- **Solo scripts clásicos** (sin módulos ES, sin `fetch`, sin build) para que funcione al abrir el archivo. El orden de los `<script>` en `index.html` importa; los módulos son globales: `Rules`, `Sound`, `Color`, `Assets`, `FX`, `Avatar`, `Game`, `Report`, `REPORT_ASSETS`.
- Las librerías están copiadas en `lib/` (Matter.js, GSAP, canvas-confetti, jsPDF) y la fuente en `fonts/`; no hay dependencias por CDN.
- `js/report-assets.js` contiene el logo y el icono de Prolipa en base64. Con `file://` el canvas queda "contaminado" y `toDataURL` falla con imágenes externas, por eso el PDF no puede leer `assets/`. Si cambia el logo hay que regenerar ese archivo.
- jsPDF usa la fuente estándar: solo caracteres Latin‑1 en los textos del PDF (`−`, `≠`, `✓` no se renderizan; `×`, `÷`, tildes y `º` sí).

## Arquitectura

**Separación Game ↔ UI.** `js/game.js` (física con Matter.js, selección, reglas de nivel, dibujo en canvas) no toca el DOM salvo el canvas. `js/ui.js` crea el objeto `hooks` (`score`, `target`, `expr`, `goal`, `react`, `levelComplete`, `over`, …) y se lo pasa a `Game.init(canvas, hooks)`; maneja menús, HUD, pantallas, confeti y reporte, y controla la partida con `Game.start/pause/resume/quit/finish/nextLevel/resize`. Para añadir un evento nuevo del juego hacia la interfaz: declarar el hook (valor `noop` por defecto) en `game.js` y implementarlo en `ui.js`.

**Estados y tiempo.** `state` ∈ `menu | playing | paused | levelup | over`. Paso fijo de 60 Hz en `frame()`; la pausa detiene la simulación. El juego tiene su propio planificador `later(seg, fn)` en tiempo de simulación (no usar `setTimeout`/GSAP para lógica de juego, porque seguirían corriendo en pausa). En `levelup` y `over` se siguen procesando explosiones y tareas pero no oleadas, peligro ni tiempo de juego (`playTime`, que es lo que sale en el reporte).

**Reglas puras (`js/rules.js`).** La dificultad es una clave `"grado:dígitos"` (por ejemplo `"4:2"`); `config(op, key)` construye y cachea el rango de números (`plain` / `mixed` / `division` en `build`). El grado solo propone dígitos por defecto, ajusta límites y fija la velocidad (`timingFor`). La modalidad (`pair` = exactamente 2 burbujas, `multi` = 2 o más) viaja como `mode`/`maxN` (2 o 3) por `evaluate`, `findCombo`, `targetsFor`, `ensureSolvable` y `nextTarget`. Invariante clave: en cualquier momento debe existir una combinación válida para el objetivo actual **en la modalidad elegida** (en `pair` los tríos de suma/multiplicación no cuentan). En `multi`, resta y división van en orden de selección (la primera burbuja es el punto de partida); en `pair` es mayor − menor / mayor ÷ menor sin importar el orden.

**Escala y tamaño.** El escenario tiene un tamaño de diseño fijo (440 de ancho) y `ui.fit()` lo escala con una transformación CSS; el canvas usa coordenadas lógicas (`W = 440`) y `Game.resize(fieldH, pxPorUnidad)` ajusta la resolución real. El alto del campo se recalcula solo fuera de partida. `Game.resize` devuelve la posición de la línea de peligro (`LINE_Y`, fija una capacidad de pila parecida en cualquier pantalla, `PILE`) y la UI la usa en la variable CSS `--lineY`.

**Jugadores y datos.** `localStorage` clave `prolipa-bolas-v2` (no renombrar: se perderían los jugadores guardados, aunque el texto visible diga "burbujas"). Máximo 3 jugadores (`MAX_PLAYERS`): al agregar uno nuevo con la lista llena se borra el que jugó hace más tiempo, y la pantalla avisa a quién. La identidad es el nombre en minúsculas; la pantalla "¿Quién va a jugar?" siempre empieza vacía a propósito (equipos compartidos). Los récords se guardan como `op-clave-modalidad` dentro de cada jugador. Hay una migración al cargar para datos con formatos anteriores.

**Personaje (`js/avatar.js`).** 8 animales dibujados en SVG por partes (`pet-move` > cuerpo, brazos, `pet-headpose` > cabeza). Regla de movimiento: una animación CSS y una animación GSAP no pueden compartir elemento, por eso el movimiento continuo (respirar, balanceo, parpadeo, cola/orejas) va en CSS sobre elementos internos y las acciones puntuales (brincar, saludar, celebrar, equivocarse) van con GSAP sobre envoltorios externos. La expresión se controla con `data-mood` y CSS inyectado (`happy/joy/oops/worry`). Los accesorios dependen del nivel (`markup(profile, level)`). `Avatar.toPng` rasteriza el SVG para el PDF.

**Reporte (`js/report.js`).** Genera el PDF de una página con jsPDF a partir de `Game.stats()` (incluye `levelLog` por nivel) y los datos del jugador que arma `ui.downloadReport`.

## Reglas de producto a respetar

- Nada se elimina solo: solo explotan las burbujas que el estudiante resuelve; no hay poderes (Rayo/Bomba se quitaron a propósito) para que el tablero pueda llenarse y se pueda perder.
- Todo debe poder resolverse **mentalmente**: el usuario rechazó números de 3–4 cifras arbitrarias por difíciles. Los números de 3 dígitos en suma/resta son redondos (múltiplos de 10), y en multiplicación/división se combinan con factores o divisores de 1 dígito. Solo números naturales.
- En el texto visible se dice "burbujas" (no "bolas"); los identificadores del código siguen usando `ball`.
- Los niveles tienen meta de objetivos (`Rules.goalFor`), rangos neutros de género (`Rules.rankFor`) y premios por nivel (`Avatar.unlock`).
