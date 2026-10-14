# Burbujas Matemáticas · Prolipa

Juego educativo para practicar **sumas, restas, multiplicaciones y divisiones**.
Funciona en computadora, tablet y celular. No necesita internet ni instalación.

## Cómo abrirlo

Haz doble clic en `index.html` (se abre en Chrome, Edge o Firefox).

Para publicarlo en una web, sube la carpeta completa tal como está.

## Cómo se juega

1. **¿Quién va a jugar?** Al abrir el juego, el estudiante escribe su nombre y elige su **animal** (gato, perro, conejo, oso, zorro, panda, león o cerdito). Si varios estudiantes comparten la computadora, cada uno toca su nombre en la lista de jugadores (cada equipo guarda **máximo 3 jugadores**; si entra uno nuevo con la lista llena, se borra el que jugó hace más tiempo y la pantalla avisa a quién). Con "Cambiar jugador" (en el menú) se vuelve a esta pantalla.
2. Elige la operación, el **grado** (1.º a 10.º de Educación General Básica), los **dígitos** de los números (1, 2 o 3) y la **modalidad**: *Solo 2 burbujas* o *Varias burbujas*. Al elegir el grado, el juego propone los dígitos (1.º y 2.º: 1 dígito; 3.º a 5.º: 2; 6.º en adelante: 3), pero el estudiante puede cambiarlos.
3. Toca las burbujas para llegar al **número objetivo** (el del engranaje). También puedes deslizar el dedo sobre varias.
   - **Solo 2 burbujas:** cada jugada es una pareja. Se evalúa al tocar la segunda: suma, producto, mayor − menor o mayor ÷ menor.
   - **Varias burbujas:** se pueden usar 2 o más.
     - **Suma:** las burbujas elegidas deben sumar el objetivo. Ej.: 2 + 3 + 5 = 10.
     - **Multiplicación:** el producto de las burbujas debe ser el objetivo. Ej.: 2 × 2 × 3 = 12.
     - **Resta y división:** la primera burbuja es el punto de partida y las siguientes se restan o dividen en orden. Ej.: 20 − 5 − 3 = 12 y 48 ÷ 2 ÷ 4 = 6.
4. Solo explotan las burbujas que el estudiante resuelve. Cada pocos segundos caen burbujas nuevas (la barra de arriba avisa cuándo).
5. Si las burbujas se quedan por encima de la línea punteada durante 3 segundos, se llena el tablero y se acaba el juego.

### Dígitos y grados

Todo está pensado para resolverse **de cabeza**. Los dígitos definen qué tan grandes son los números:

| Operación | 1 dígito | 2 dígitos | 3 dígitos |
|---|---|---|---|
| Suma | 7 + 5 (resultado hasta 18) | 34 + 28 (hasta 150) | 240 + 130 (números redondos, hasta 1400) |
| Resta | 9 − 4 | 83 − 47 | 460 − 170 (números redondos) |
| Multiplicación | tablas del 2 al 9 | 12 × 4 | 120 × 4 |
| División | tablas de dividir (56 ÷ 7) | 84 ÷ 4 | 360 ÷ 6 |

Con 3 dígitos los números son **redondos** (terminan en 0) para que se puedan calcular mentalmente.

El **grado** hace tres cosas: propone cuántos dígitos usar, ajusta un poco los límites (por ejemplo, en 1.º las sumas llegan hasta 10 y las tablas hasta el 5) y fija la velocidad con que caen las burbujas (más lenta en los grados bajos y con más dígitos). Siempre son números naturales (no incluye decimales ni negativos).

### Niveles y premios

- Cada nivel tiene una **meta**: resolver 5 objetivos en el nivel 1, 6 en el 2, y así hasta un máximo de 12. En la franja de arriba, un libro con el icono de Prolipa se ilumina por cada acierto.
- El **animal del estudiante** (con su nombre) está animado y es flexible: respira, balancea la cabeza, mueve los brazos, la cola y las orejas, parpadea, mira a los lados, saluda y de vez en cuando brinca estirándose y agachándose. Reacciona a cada jugada: se alegra, se preocupa cuando el tablero se llena y recibe ánimos como "¡Muy bien, Sofía!". Crece un poco con cada acierto.
- Al completar el nivel aparece una pantalla de celebración con estrellas (según la precisión) y su animal gana un accesorio: gafas, birrete, corbatín, capa, medalla, corona y aura dorada. También sube de rango: Aprendiz, Estudiante, Valiente, Veloz, Brillante, Imparable, Genial, Fenomenal y Leyenda.
- Con cada nivel las burbujas caen más rápido; desde el nivel 8 caen 4 en cada oleada.
- Si el estudiante se queda 12 segundos sin jugar, una burbuja de la solución parpadea como pista.
- Los récords (por operación, grado, dígitos y modalidad), el mejor nivel y el animal elegido se guardan **por jugador** en el navegador de ese equipo.

### Reporte en PDF

- Al terminar la partida (o al **pausar → Terminar actividad y ver reporte**) aparece el resumen con el botón **Descargar reporte (PDF)**.
- El reporte lleva el nombre y el animal del estudiante, la fecha, la operación, el grado y la modalidad, **nivel alcanzado, tiempo jugado y puntaje**, precisión, aciertos, errores, mejor racha, detalle por nivel (meta, tiempo, estrellas) y observaciones para el docente.
- El tiempo cuenta solo cuando se está jugando (la pausa y la pantalla de celebración no suman).

## Estructura

| Carpeta / archivo | Contenido |
|---|---|
| `index.html` | Página y pantallas (jugador, menú, pausa, nivel completado, fin) |
| `css/style.css` | Estilos con los colores de Prolipa |
| `js/rules.js` | Reglas de cada operación, rangos por dificultad, metas y rangos del personaje |
| `js/game.js` | Física de las burbujas, selección, niveles y dibujo |
| `js/fx.js` | Explosiones y partículas con el icono de Prolipa |
| `js/avatar.js` | Los 8 animales (dibujo SVG por partes: cabeza, cuerpo, brazos, cola y orejas se mueven por separado) |
| `js/report.js` | Generación del reporte PDF |
| `js/report-assets.js` | Logo e icono incrustados para el PDF |
| `js/audio.js` | Sonidos (se generan por código, sin archivos) |
| `js/ui.js` | Jugador, menús, misión del nivel, animaciones y confeti |
| `assets/` | Logo e icono de Prolipa |
| `lib/` | Matter.js (física), GSAP (animaciones), canvas-confetti, jsPDF (reporte) |
| `fonts/` | Tipografía Fredoka |

## Ajustes rápidos

- **Números de cada operación y de cada cantidad de dígitos:** función `build` en `js/rules.js`.
- **Velocidad con que caen las burbujas en cada grado:** `TIMING` en `js/rules.js` (segundos entre oleadas).
- **Meta de cada nivel y nombres de rangos:** `goalFor` y `RANKS` en `js/rules.js`.
- **Animales disponibles y sus colores:** `ANIMALS` en `js/avatar.js`.
- **Tamaño de las burbujas y capacidad del tablero:** `R` y `PILE` en `js/game.js`.
- **Logo / icono:** reemplaza los archivos de `assets/`. Para el PDF, el logo está incrustado en `js/report-assets.js`; si cambias el logo, hay que volver a generar ese archivo.
- **Borrar los jugadores guardados:** limpiar los datos del sitio en el navegador (la clave es `prolipa-bolas-v2`).
