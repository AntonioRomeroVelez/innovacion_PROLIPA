# Leemos juntos

Una narradora lee con voz natural y, cuando una palabra o frase se ilumina, **le pasa
el turno al estudiante**: el micrófono del dispositivo lo escucha leer en voz alta y la
lectura sigue. Pensada como entrada de la Unidad 1 · Cuentos de todas partes
(Lengua, 6.º grado).

HTML, CSS y JavaScript puros. **Sin librerías y sin conexión**: se sube la carpeta tal
cual a un servidor.

## La idea: el motor y las lecturas van separados

```
leemos-juntos/
├── motor/                         lo que hace funcionar todo (no se toca para añadir lecturas)
│   ├── lector.js                  el componente: reproduce, resalta, pasa el turno
│   ├── lecturas.js                el registro: une cada texto con su audio
│   ├── escucha.js                 el micrófono y la comprobación de la lectura
│   ├── escena.js                  un dibujo opcional (el escenario «mia»)
│   └── estilos.css
│
├── lecturas/                      UNA CARPETA POR LECTURA
│   ├── _comun/                    lo que comparten todas las lecturas
│   │   ├── voces.js               ← EL CATÁLOGO DE VOCES (lobo, abuela, rey, hada…)
│   │   └── texto.js               la narradora y los mensajes que se repiten
│   ├── mia-y-el-libro/
│   │   ├── texto.js               ← EL TEXTO. Es lo que se escribe y se edita.
│   │   ├── audio.js               la narración (lo genera la herramienta; no se toca)
│   │   └── audio/                 los .mp3
│   ├── los-tres-cerditos/         un cuento con seis voces distintas
│   └── el-viaje-de-una-palabra/   una lectura corta de ejemplo: sirve de plantilla
│
├── index.html                     una página que muestra «Mía y el libro que volaba»
├── ejemplo-otra-pagina.html       otra página, con otra lectura: mismo motor
└── herramientas/
    ├── generar.py                 produce el audio.js y los .mp3 de una lectura
    ├── muestras.py                página para ESCUCHAR el catálogo y todas las voces
    └── voces-descartadas.json     las voces que sonaron robóticas (no usarlas)
```

**El texto vive solo en `lecturas/<id>/texto.js`.** Ni el motor ni las páginas HTML lo
contienen, así que la misma lectura se puede mostrar desde cuantas páginas se quiera y
una página puede mostrar la lectura que se quiera.

## Mostrar una lectura en una página HTML

Cualquier página, en cualquier carpeta, con un `<div>` y cuatro scripts:

```html
<link rel="stylesheet" href="motor/estilos.css">

<div id="lector" data-lectura="mia-y-el-libro" data-base="lecturas/"></div>

<script src="motor/lecturas.js"></script>
<script src="motor/escucha.js"></script>
<script src="motor/escena.js"></script>
<script src="motor/lector.js"></script>
<script>Lector.montar('#lector');</script>
```

- `data-lectura` dice cuál mostrar; `data-base`, dónde están las carpetas de lecturas
  (relativo a la página: `lecturas/`, `../lecturas/`…). También se pueden pasar por
  código: `Lector.montar('#lector', { lectura: '…', base: '…' })`.
- **`pagina.html?lectura=otra-lectura`** en la dirección manda sobre lo que diga la
  página: sirve para probar otra lectura sin editar nada.
- El motor busca solo `texto.js` y `audio.js` de la lectura (y de `_comun`). Si prefieres
  incluirlos tú con `<script>`, mira `ejemplo-otra-pagina.html`: no se cargan dos veces.
- Cabe **una** lectura por página.

## Añadir una lectura nueva

1. **Copia** `lecturas/el-viaje-de-una-palabra/` con otro nombre (borra su `audio.js` y su
   carpeta `audio/`). Su `texto.js` está comentado: explica cada campo.
2. **Escribe el texto** en el `texto.js` nuevo, y cambia el nombre que aparece en
   `Lecturas.texto('…', {` para que sea igual al de la carpeta.
3. **Genera la narración:**
   ```bash
   pip install edge-tts                            # solo la primera vez
   python herramientas/generar.py mi-lectura-nueva
   ```
4. **Mostrarla:** en cualquier página, `data-lectura="mi-lectura-nueva"`.

### Cómo se escribe el texto

```js
Lecturas.texto('mi-lectura', {
  titulo: 'El viaje de una palabra',
  unidad: 'Unidad 1 · Cuentos de todas partes',

  voces:  { nino: 'nino',                                  // personajes, del catálogo de voces
            lobo: { catalogo: 'lobo', etiqueta: '🐺 El lobo feroz' } },

  huecos: { 'viaje': { silabas: 'via-je',                  // pista tras un error
                       alternativas: ['via je'],            // otras lecturas que se aceptan (exactas)
                       nota: 'Lleva j: viaje, equipaje.' } },// «¿Sabías que…?» al leerla bien

  paginas: [ { partes: [
    { voz: 'narradora', texto: 'Preparó su equipaje y emprendió un largo {{viaje}}.' },
    { voz: 'nino',      texto: '¡Bienvenida!' }
  ] } ]
});
```

- Lo que va entre **`{{ llaves dobles }}`** lo lee el estudiante.
- **`voz`**: `narradora` (viene de `_comun`) o un personaje de `voces` (ver más abajo
  «Las voces: el catálogo»).
- **`reflexion`** (opcional): una pregunta para conversar al terminar.
- **`escenario`** (opcional): un dibujo que acompaña. Sin él, la página muestra solo el texto.
  Hoy existe `'mia'`. Para hacer otro, ver la cabecera de `motor/escena.js`.
- **`mensajes`** (opcional): reemplazan a los de `_comun`, por categoría. La lectura de
  ejemplo cambia solo `fin`.

### Si cambias un texto y no regeneras el audio

No se rompe nada. Los fragmentos cuyo texto cambió **se leen con la voz del navegador**
(más robótica, y en silencio si el equipo no tiene voz en español) y la consola avisa con
el comando exacto para generarlos. Sirve para revisar un texto antes de grabarlo.

`generar.py` necesita internet **solo al generar**, y es incremental: cada frase se guarda
según su texto y su voz, así que si cambias una frase solo se vuelve a generar esa.

## Las voces: el catálogo

`lecturas/_comun/voces.js` es una **lista de personajes con la voz que mejor le va a cada
uno**. Para crear un cuento nuevo no hay que pensar en voces: se eligen de ahí.

**1. Escucharlas** (una vez, y cada vez que se cambie el catálogo):

```bash
python herramientas/muestras.py
```

y abrir `herramientas/muestras/index.html`. Cada personaje lee una frase propia; hay un
buscador y un botón **Copiar** con la línea lista para pegar. Más abajo están *todas* las voces
en español del servicio, por si se quiere probar otra para un personaje.

**2. Usarlas**, en el `texto.js` de la lectura:

```js
voces: {
  lobo:      'lobo',                                                   // tal cual
  cerdo1:    { catalogo: 'nino', etiqueta: '🐖 Cerdito', color: '#e9c46a' },   // con cambios
  rey:       { catalogo: 'rey', voz: 'es-MX-JorgeNeural' },            // ese personaje, con otra voz
  narradora: 'narrador'                                                // que narre un hombre
}
```

A la izquierda va el nombre que se usa en cada frase (`{ voz: 'lobo', texto: '…' }`); a la
derecha, el del catálogo. Lo que se escribe en la lectura manda sobre el catálogo. Una voz
escrita a mano (`{ voz: 'es-…Neural', rate: '+0%', pitch: '+0Hz' }`) también sigue funcionando.

| Grupo | Personajes del catálogo |
|---|---|
| Narración | `narradora`, `narrador` |
| Niños y amigos | `nino`, `nina`, `amigo`, `amiga` |
| Familia | `mama`, `papa`, `abuela`, `abuelo` |
| Escuela | `maestra`, `maestro` |
| Fantasía | `rey`, `reina`, `hada`, `bruja`, `gigante`, `sabio` |
| Animales | `animal-pequeno`, `animal-grande`, `zorro`, `lobo` |
| Aventura | `pirata`, `locutor` |
| Pruebas | `narradora-expresiva`, `narrador-expresivo`, `amiga-expresiva`, `amigo-expresivo` |

**3. Cambiarlas.** Se edita la línea del personaje en `voces.js` y se ejecuta
`python herramientas/generar.py`: se vuelve a grabar solo lo que cambió, en todas las lecturas
que usan esa voz. Para añadir un personaje, se copia una línea y se cambian el nombre y la voz.
Si algo está mal escrito (un nombre que no existe, un `rate` inválido), `generar.py` lo dice.

### Para que suene natural y no robótica

- **Voces distintas, ajustes suaves.** Cada personaje usa una voz *diferente* (otro país, otro
  timbre) en vez de estirar una sola hasta el extremo, y por eso `rate` y `pitch` del catálogo
  son discretos. Conviene quedarse entre `-10%` y `+6%`, y entre `-6Hz` y `+6Hz`: más allá, la voz
  empieza a sonar artificial.
- **El texto manda en la entonación.** Se lee mejor lo que está escrito como se habla: frases
  cortas, comas donde una persona respiraría, `¡ !` y `¿ ?` para dar emoción, sin MAYÚSCULAS
  sostenidas ni abreviaturas.
- **Escucha también la pronunciación** de «ll», «y», «j» y «rr» antes de usar una voz para una
  palabra que lee el estudiante: es el modelo que va a imitar, y algunas voces regionales
  (p. ej. las rioplatenses de Argentina y Uruguay) pueden pronunciarlas distinto al español andino.
- **No hay voces infantiles en español.** `nino` y `nina` son voces jóvenes un poco más agudas;
  si suenan demasiado adultas, se prueba otra en la página de muestras.
- **Marcar las que suenan robóticas.** En la página de muestras, el botón **🤖** señala una voz
  (en todas las tarjetas donde aparece). **Copiar la lista de descartadas** y pegarla en
  `herramientas/voces-descartadas.json` la deja anotada: la página la marca la próxima vez y
  `generar.py` avisa si una lectura la usa. Los audios de esa carpeta se llaman por lo que son
  (`personaje_bruja_….mp3`, `voz_es-MX-DaliaNeural_….mp3`), para reconocerlos al abrirlos.
- **Las voces «multilingües»** (grupo *Pruebas*) son las más expresivas, pero no son nativas: su
  acento puede notarse. Escúchalas antes de usarlas, porque «escucha cómo se dice» sale con la
  misma voz del personaje y el estudiante la toma de modelo.
- **Límite honesto.** Son voces neuronales gratuitas: se oyen mucho mejor que las del navegador,
  pero siguen siendo sintéticas. Para algo indistinguible de una persona hacen falta una grabación
  real o un servicio de voz de pago (p. ej. Azure Speech HD, ElevenLabs, Google Chirp); `generar.py`
  habría que adaptarlo (solo la función `sintetizar`).

## Cómo se comprueba la lectura

Hay tres modos; la actividad elige el mejor que el dispositivo permita y **le dice al
estudiante cuál está usando** (arriba a la derecha):

| Modo | Cuándo | Qué hace |
|---|---|---|
| 🎙️ **Comprobaré lo que lees** | Chrome, Edge, Android (con internet) | Transcribe lo que dice y lo compara con la palabra o frase: tiene que ser **exactamente la misma**. |
| 🎙️ **Notaré cuando hables** | Sin reconocimiento de voz, o con `?basico=1` | Solo detecta que habló (volumen). **No sabe qué dijo.** |
| ✋ **Sin micrófono** | No hay micrófono o no dio permiso | El estudiante confirma con un botón. |

### El turno del estudiante: solo se ve, no se oye

Mientras el estudiante lee **no hay voz que lo guíe**: ni «ahora te toca», ni felicitaciones, ni
ayudas habladas, ni sonidos. Todo es visual:

1. La palabra o frase **se ilumina y late** para llamar la atención.
2. Si la lee **exactamente igual**: se pone **verde con ✔** y la lectura sigue.
3. Si no: se pone **roja con ✘** (y aparece la pista de las sílabas) y **se vuelve a escuchar**, las
   veces que haga falta, hasta que la lea bien o toque **«Ya lo leí»** (siempre visible) para seguir.
   **«Saltar»** también sigue, y deja la palabra para practicar al final. «Escuchar cómo se dice»
   solo suena si el estudiante lo toca.
4. Si no se oye nada, un aviso escrito le dice que se acerque al micrófono.

**«Exactamente la misma»** quiere decir las mismas palabras con las mismas letras. No cuentan las
mayúsculas, los signos, las tildes (el reconocedor no puede «oírlas»), ni cómo parta o una las
palabras («para caídas» = «paracaídas»); y «7» vale por «siete». Pero «ladrillo» no vale por
«ladrillos», ni «ano» por «año». Se compara con lo que el reconocedor entendió **al terminar de
oír** (no con un resultado a medias). Para palabras de otra lengua, que el reconocedor escribe
como español, se añaden las formas aceptadas en `alternativas` de `huecos` (ver «Cómo se escribe
el texto»): como la comprobación es exacta, ahí hay que ser generoso.

Solo hay voz de la narradora al **principio** (el saludo) y al **final**; esos dos mensajes viven
en `lecturas/_comun/texto.js`.

Al final: un resumen con las palabras para practicar (se pueden volver a escuchar). Si el
modo no comprobó las palabras, el resumen lo dice: *«contamos tu lectura por confianza»*.

### ⚠️ Privacidad (importante con menores)

En el modo de reconocimiento, **Chrome envía el audio al servicio de reconocimiento de voz de
Google** para transcribirlo. Es lo que hace el navegador, no la actividad: ella **no graba ni
guarda nada**. La portada lo informa y ofrece un botón *«Prefiero que no se compruebe lo que
digo»*.

Para desactivarlo en toda la institución: `reconocimiento: false` en `ajustes` de
`lecturas/_comun/texto.js` (o en el de una lectura concreta). Quedará solo el modo básico.

## Cosas que conviene saber

- **El micrófono necesita `https://` (o `localhost`).** En el servidor real debe haber
  certificado. Si el navegador no deja usarlo, la actividad lo explica y deja continuar con
  un botón.
- **La narración es audio pregrabado con voz neuronal**, no la voz del navegador: suena igual
  en cualquier dispositivo y no depende de que tenga voces en español.
- **Elegir las voces con el oído:** `python herramientas/muestras.py` y abrir
  `herramientas/muestras/index.html` (ver «Las voces: el catálogo»). Esa carpeta es solo una
  herramienta de trabajo: no hace falta subirla al servidor.
- **Licencia de las voces.** `edge-tts` usa el servicio de lectura en voz alta de Microsoft
  Edge, que no es una API oficial. Para un producto que se distribuye conviene revisar sus
  condiciones, o regrabar la narración con una persona.
- **El kichwa suena aproximado** (una voz sintética en español leyendo *«Alli puncha, wawa»*).
  Para esa frase conviene una grabación de una persona kichwahablante.
- **Al actualizar archivos del motor**, subir el número de `?v=` en las páginas: si no, los
  navegadores pueden seguir usando la versión anterior.
- Navegadores: Chrome, Edge y Android son los mejores. Safari en iPhone y iPad reconoce voz de
  forma limitada; Firefox no tiene reconocimiento (modo básico).
- Con `?x=8` en la dirección todo va 8 veces más rápido (solo para probar).

## Probarla en el computador

```bash
python -m http.server 5192        # dentro de la carpeta leemos-juntos
```

y entrar a `http://localhost:5192`.
