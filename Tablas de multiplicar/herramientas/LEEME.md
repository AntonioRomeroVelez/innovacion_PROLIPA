# Cuentacuentos Prolipa · Cómo crear un cuento nuevo

La actividad se abre con `cuentacuentos.html` (doble clic, sin internet).
Los **audios** se crean una sola vez con un programa en Python y quedan guardados como archivos `.mp3`
dentro de cada cuento. Después, los estudiantes no necesitan Python ni conexión.

## 1. Requisitos (solo en el computador donde se crean los audios)

1. Python 3.9 o superior (https://www.python.org).
2. Instalar la librería de voces, una sola vez:

```bash
pip install -r herramientas/requirements.txt
```

3. Conexión a internet **solo al generar** los audios.

## 2. Crear un cuento nuevo

1. Copie la carpeta `cuentos/_plantilla` y péguela dentro de `cuentos` con el nombre del cuento,
   en minúsculas y con guiones: `cuentos/el-patito-feo`.
2. Abra `cuentos/el-patito-feo/cuento.txt` y cambie los textos (formato abajo).
3. Ponga las ilustraciones en `cuentos/el-patito-feo/imagenes/` (PNG, JPG, WebP o SVG).
4. Cree los audios: doble clic en `herramientas/generar_todos.bat`
   (o `python herramientas/generar_cuento.py el-patito-feo`).
5. Abra `cuentacuentos.html`: el cuento aparece solo en la biblioteca.

Cada carpeta de `cuentos/` es **independiente**: se puede copiar, mover o enviar sola (junto con
`cuentacuentos.html`, `css/`, `js/`, `lib/` e `img/`). Para quitar un cuento, borre su carpeta y
ejecute `python herramientas/generar_cuento.py --catalogo`.

## 3. Formato de `cuento.txt`

```text
titulo: El patito feo
autor: Nombre del autor
descripcion: Una frase que cuente de qué trata.
portada: imagenes/portada.svg
idioma: es
orden: 10

[personajes]
narrador | nombre=Narrador | voz=es-EC-LuisNeural   | velocidad=-8% | tono=+0Hz  | color=#2b8cf0 | emoji=📖
pato     | nombre=El patito | voz=es-EC-AndreaNeural | velocidad=+5% | tono=+40Hz | color=#d6336c | emoji=🐥

[pagina] imagen=imagenes/p1.svg
narrador: Había una vez un patito diferente.
pato: ¿Por qué soy distinto?
```

- Las líneas que empiezan con `#` son comentarios.
- **Cada línea de texto empieza con la clave del personaje** (`pato:`); así se sabe qué voz la lee y de
  qué color se muestra su globo.
- El personaje con clave `narrador` se muestra como narrador (en una tarjeta suave, distinta de los globos de los personajes).
- `velocidad` (`-20%` más lento, `+20%` más rápido) y `tono` (`-30Hz` más grave, `+40Hz` más agudo)
  sirven para que dos personajes con la misma voz suenen distinto. También existe `volumen=`.
- Divida las intervenciones largas en dos o tres líneas del mismo personaje: se leen mejor y el
  resaltado queda más cómodo.

Si algo está mal escrito (clave que no existe, imagen faltante, página vacía…), el programa lo avisa
con el número de línea. Para solo revisar, sin crear audios:

```bash
python herramientas/generar_cuento.py el-patito-feo --revisar
```

## 4. Comandos útiles

```bash
python herramientas/generar_cuento.py el-patito-feo            # crea o actualiza un cuento
python herramientas/generar_cuento.py --todos                  # todos los cuentos
python herramientas/generar_cuento.py el-patito-feo --forzar   # vuelve a crear todos los audios
python herramientas/generar_cuento.py --catalogo               # solo reconstruye la biblioteca
python herramientas/generar_cuento.py --voces es               # lista las voces en español
python herramientas/generar_cuento.py --voces es-EC            # solo las de Ecuador
```

Los audios se guardan con un nombre que depende del texto y la voz. Si solo cambia una frase, **solo
se vuelve a crear el audio de esa frase**; los demás se reutilizan. Los audios que ya no se usan se
borran solos.

## 5. Qué crea el programa dentro de cada cuento

| Archivo | Para qué sirve |
|---|---|
| `audio/*.mp3` | Un audio por intervención de cada personaje |
| `datos.js` | Textos, audios y tiempo de cada palabra (lo lee `cuentacuentos.html`) |
| `datos.json` | La misma información, por si se usa en otra plataforma |
| `manifiesto-audio.json` | Control de los audios ya creados |

No edite estos archivos a mano: se vuelven a crear al ejecutar el programa.

## 6. Notas importantes

- **Voces y licencia.** `edge-tts` usa las voces neuronales de Microsoft Edge a través de un acceso
  **no oficial**. Sirve muy bien para producir y probar. Al generar, **el texto del cuento se envía al
  servicio de Microsoft**. Para una edición comercial conviene revisar los términos de uso o usar
  *Azure AI Speech* (servicio oficial con las mismas voces; el programa se adapta con pocos cambios).
- **Ilustraciones.** Las ilustraciones de los dos cuentos de ejemplo son solo de demostración;
  reemplácelas por las del libro.
- **Navegadores.** Funciona en Chrome, Edge, Firefox y Safari, en computador, tableta y celular.
  Si el audio no carga, el cuento se lee en silencio resaltando las palabras con un reloj.
- **Teclado.** Barra espaciadora = reproducir/pausar. Tocar una palabra reproduce desde esa palabra.
