# Aprendo a leer con Libi 📘 — PROLIPA

Juego educativo de **PROLIPA · Vanguardia en educación** en HTML + JavaScript para aprender los
sonidos de las letras en español, organizado por grados y subniveles según el currículo de Ecuador
(Inicial a 3º EGB). El personaje es **Libi, el libro viajero**, inspirado en los libros del logo de la editorial.

## Cómo abrirlo

- **Opción simple:** doble clic en `index.html` (funciona sin internet y sin instalar nada).
- **Opción servidor local** (si el navegador bloquea algo): en esta carpeta ejecutar
  `python -m http.server 8765` y abrir <http://localhost:8765>.

Funciona en Edge, Chrome y Firefox. Las voces van **grabadas dentro de la app** (carpeta `audio/voz`),
así que suenan igual en cualquier computador o tableta.

## Qué incluye

| Grado | Subniveles | Actividades |
|---|---|---|
| **Inicial** (4 años) | Las vocales · Sonidos del mundo · Escucho y juego | Fonoteca, «¿Dónde suena…?», vocal inicial, sonidos de naturaleza y animales, palmas de sílabas, rimas |
| **1º EGB** (5 años) | La M y la P · La S y la L · Mis primeras palabras | Fonoteca de sílabas, constructor de palabras (mamá, masa, mapa, lima, sola…), lectura con Libi |
| **2º EGB** (6-7 años) | Trabadas con R · Trabadas con L · Letras especiales (c/qu, g/gu/j, ll/y, ñ, ch, rr, h, z) · Leo oraciones | Fonoteca, constructor, completa la sílaba, lectura con resaltado, completa y ordena oraciones |
| **3º EGB** (7-8 años) | Comprensión lectora · Ordena la oración · Sinónimos y antónimos | Cuentos con preguntas, oraciones desordenadas, sinónimos/antónimos con ilustraciones |

**Gamificación:** estrellas por acierto, 1-3 estrellas por actividad, 28 medallas, confeti, aplausos
y chimes sintetizados con Web Audio API, y animaciones con GSAP.

## Las voces (Ecuador, naturales)

Todo lo que la app dice está **pregrabado con voces neuronales de Ecuador**, no con la voz del navegador:

- **Libi → Andrea** (`es-EC-AndreaNeural`): juegos, elogios, preguntas y guías.
- **Narrador → Luis** (`es-EC-LuisNeural`): lecturas de 2º y 3º EGB (la narración con resaltado y las
  palabras que se tocan).

Hay dos ritmos para la voz de Libi:

- **`std` (1º–3º EGB):** ritmo claro y natural.
- **`enf` (Inicial, 4 años):** más lento, más fuerte y más expresivo — vocales, sílabas y palabras se dicen
  con énfasis (y la vocal se repite). Además, en Inicial Libi **dice la instrucción** antes de cada juego,
  y la letra o dibujo «late» mientras suena.

La lectura con resaltado sigue los **tiempos reales de cada palabra** de la grabación. En **⚙️ Ajustes**
se puede cambiar la velocidad (🐢 lenta / normal / 🐇 rápida). Si faltara alguna grabación, la app usa
la voz del navegador como respaldo (el nombre del estudiante solo se escribe en pantalla, no se pronuncia).

### Regenerar o ampliar las voces

Solo hace falta cuando se agrega contenido nuevo. Requiere Node, Python 3.9+, `ffmpeg`, `pip install edge-tts` e internet:

```bash
node tools/extraer-textos.js     # lista todo lo que la app dice → tools/textos.json
python tools/generar-audio.py    # genera solo lo que falte → audio/voz/*.mp3 + js/audio-voces.js
```

Opciones: `--forzar` (regenerar todo), `--voz` (voz de Libi), `--voz-narrador` (voz de las lecturas),
`--estilo natural|actual`, `--solo std|enf|nar`, `--bitrate 128k`.
El ritmo, tono y volumen de cada estilo se ajustan en `ESTILOS` de `tools/generar-audio.py`.

Para **comparar voces de oído** antes de decidir: `python tools/muestras.py` crea `tools/muestras/index.html`
con 10 voces y estilos lado a lado.

> ⚠️ **Licencia:** `edge-tts` usa el servicio de lectura en voz alta de Microsoft Edge, que no es una API
> comercial oficial. Para **publicar** el producto conviene generar el audio con **Azure AI Speech**
> (mismas voces `es-EC-AndreaNeural` / `es-EC-LuisNeural`, con licencia comercial).

## Estructura

```
index.html            Página única
img/prolipa-logo.png  Logo de PROLIPA
css/styles.css        Estilos infantiles (colores por grado, responsivo)
js/datos.js           ⭐ Contenido pedagógico: léxico, currículo, lecturas, rimas…
js/frases.js          Frases que la app dice (elogios, guías, resultados…)
js/audio.js           Sfx (Web Audio) + Voz (grabaciones y respaldo del navegador)
js/audio-voces.js     Índice de grabaciones (lo genera tools/generar-audio.py)
js/estado.js          Progreso, estrellas y medallas (localStorage)
js/libi.js            Mascota Libi (SVG animado) y burbuja de diálogo
js/ui.js              Confeti, estrella voladora, modales
js/juegos.js          Generadores de rondas y motores de juego
js/app.js             Pantallas, navegación, resultados, ajustes
audio/voz/            Grabaciones .mp3
tools/                Extractor de textos, generador de audio y comparador de voces
lib/                  GSAP, canvas-confetti, SortableJS y fuentes — sin CDN
```

## Cómo agregar contenido (editar `js/datos.js`)

- **Palabra nueva:** una línea en el bloque `PAL`: `texto|emoji|sí-la-bas|pista opcional`.
  Ej.: `mariposa|🦋|ma-ri-po-sa`.
- **Actividad nueva:** agregarla a la lista `actividades` de un subnivel en `CURRICULO`.
  Tipos: `fonoteca`, `eleccion` (con `gen:` `sonidoGrafia`, `imagenInicial`, `imagenSilaba`,
  `palabraImagen`, `rima`, `naturaleza`, `animales`, `completaSilaba`, `completaOracion`,
  `sinonimo`, `antonimo`), `armar` (constructor), `palmas`, `lectura`, `ordena`.
- **Lectura nueva:** objeto `{ titulo, e, texto, preguntas:[{q, op:[...], r:índiceCorrecto}] }`.
- Después, ejecutar los dos comandos de «Regenerar o ampliar las voces».
- La consola avisa si algún dato apunta a una palabra que no existe en `PAL`.

### Sonidos de animales y de la naturaleza

La naturaleza (lluvia, trueno, mar…) es sintética. Los animales se dicen con la voz («guau», «miau»…).
Se pueden usar grabaciones reales: `USAR_ARCHIVOS_DE_AUDIO = true` en `js/datos.js` y guardar los `.mp3`
como `audio/animales/perro.mp3`, `audio/naturaleza/lluvia.mp3`, etc.

## Notas

- El progreso se guarda **solo en el navegador de ese dispositivo** (localStorage).
  En **⚙️ Ajustes → Borrar mi progreso** se reinicia.
- Las ilustraciones son emojis; su aspecto depende del sistema operativo.
- Licencias de las librerías incluidas: ver `lib/LICENSE-*.txt` (GSAP: licencia estándar «sin costo» de
  GreenSock; canvas-confetti: ISC; SortableJS: MIT). Fuentes Fredoka y Andika: SIL OFL.
- El logo y la marca PROLIPA pertenecen a la editorial.
