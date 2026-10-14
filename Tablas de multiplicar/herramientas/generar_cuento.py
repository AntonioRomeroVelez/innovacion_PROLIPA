#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de audios para el cuentacuentos.

Lee el archivo `cuento.txt` de un cuento (los textos identificados por personaje), crea con una voz distinta
para cada personaje el audio de cada línea y guarda el momento exacto en que se dice cada palabra, para que
el lector web pueda ir resaltándolas mientras suena.

Cada cuento es una carpeta independiente dentro de `cuentos/`:

    cuentos/
        mi-cuento/
            cuento.txt        <- lo escribe la editorial (textos por personaje y voces)
            imagenes/         <- una ilustración por página (svg, png, jpg o webp)
            audio/            <- lo crea este programa (un mp3 por línea)
            datos.js          <- lo crea este programa (textos, audios y tiempos de cada palabra)
            datos.json        <- lo crea este programa (lo mismo, para otros usos)
        catalogo.js           <- lo crea este programa (la lista de cuentos de la biblioteca)

Uso (desde la carpeta `herramientas`):

    python generar_cuento.py ../cuentos/leon-y-raton     genera un cuento
    python generar_cuento.py --todos                     genera todos los cuentos de la carpeta cuentos
    python generar_cuento.py --todos --forzar            vuelve a crear todos los audios desde cero
    python generar_cuento.py --revisar ../cuentos/x      solo revisa el cuento.txt (no genera nada)
    python generar_cuento.py --catalogo                  solo reconstruye cuentos/catalogo.js
    python generar_cuento.py --voces es-EC               lista las voces disponibles (filtro opcional)

Solo se vuelven a crear los audios de las líneas que cambiaron (si el texto o la voz son los mismos,
se reutiliza el audio anterior).
"""
import argparse
import asyncio
import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA_CUENTOS = RAIZ / 'cuentos'
VOZ_POR_DEFECTO = 'es-EC-LuisNeural'
CONCURRENCIA = 3        # cuántos audios se piden a la vez
REINTENTOS = 3          # veces que se reintenta un audio si falla la conexión
BITRATE_MP3 = 48000     # el servicio entrega mp3 de 48 kbit/s: sirve para estimar la duración

# En Windows la consola puede no usar UTF-8: así se ven bien las tildes y la ñ.
for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding='utf-8')
    except Exception:  # noqa: BLE001
        pass


class ErrorCuento(Exception):
    """Un problema en el cuento.txt, con el número de línea para encontrarlo fácil."""


# ----------------------------------------------------------------------------------------------
#  Lectura del archivo cuento.txt
# ----------------------------------------------------------------------------------------------

RE_SECCION = re.compile(r'^\[\s*([^\]]+?)\s*\](.*)$')
RE_PARES = re.compile(r'(\w+)\s*=\s*("[^"]*"|[^|\s]+)')
RE_DIALOGO = re.compile(r'^([^\s:|\[\]=]+)\s*:\s*(.+)$', re.UNICODE)


def sin_tildes(texto):
    """'León' -> 'leon' (para comparar nombres de personajes sin fijarse en mayúsculas ni tildes)."""
    base = unicodedata.normalize('NFKD', texto)
    return ''.join(c for c in base if not unicodedata.combining(c)).lower().strip()


def leer_pares(texto):
    """'imagen=p1.svg color="#fff"' -> {'imagen': 'p1.svg', 'color': '#fff'}"""
    return {k.lower(): v.strip('"') for k, v in RE_PARES.findall(texto)}


def normalizar_porcentaje(valor, defecto='+0%'):
    """'10%' -> '+10%', '-5' -> '-5%' (el servicio exige signo y %)."""
    if not valor:
        return defecto
    m = re.fullmatch(r'\s*([+-]?)\s*(\d+(?:\.\d+)?)\s*%?\s*', valor)
    if not m:
        raise ValueError(f'valor de velocidad/volumen no válido: "{valor}" (ejemplo: -10% o +15%)')
    return f"{m.group(1) or '+'}{m.group(2)}%"


def normalizar_hz(valor, defecto='+0Hz'):
    """'30' -> '+30Hz', '-20hz' -> '-20Hz' (el servicio exige signo y Hz)."""
    if not valor:
        return defecto
    m = re.fullmatch(r'\s*([+-]?)\s*(\d+(?:\.\d+)?)\s*(?:hz)?\s*', valor, re.IGNORECASE)
    if not m:
        raise ValueError(f'valor de tono no válido: "{valor}" (ejemplo: -20Hz o +40Hz)')
    return f"{m.group(1) or '+'}{m.group(2)}Hz"


def leer_cuento(ruta):
    """Convierte cuento.txt en un diccionario con los datos, los personajes y las páginas."""
    meta = {'titulo': '', 'autor': '', 'descripcion': '', 'portada': '', 'idioma': 'es', 'orden': ''}
    personajes = {}   # id (sin tildes) -> datos del personaje
    paginas = []
    seccion = 'meta'

    with open(ruta, encoding='utf-8-sig') as f:
        lineas = f.read().splitlines()

    for n, bruta in enumerate(lineas, 1):
        linea = bruta.strip()
        if not linea or linea.startswith('#'):
            continue

        m = RE_SECCION.match(linea)
        if m:
            nombre = sin_tildes(m.group(1))
            if nombre.startswith('personaje'):
                seccion = 'personajes'
            elif nombre.startswith('pagina'):
                seccion = 'pagina'
                opciones = leer_pares(m.group(2))
                paginas.append({'imagen': opciones.get('imagen', ''), 'fondo': opciones.get('fondo', ''), 'lineas': [], 'n': n})
            else:
                raise ErrorCuento(f'línea {n}: sección desconocida "[{m.group(1)}]". Use [personajes] o [pagina].')
            continue

        if seccion == 'meta':
            if ':' not in linea:
                raise ErrorCuento(f'línea {n}: se esperaba "clave: valor" (por ejemplo "titulo: El patito feo").')
            clave, valor = linea.split(':', 1)
            clave = sin_tildes(clave)
            if clave not in meta:
                raise ErrorCuento(f'línea {n}: dato desconocido "{clave}". Los datos válidos son: {", ".join(meta)}.')
            meta[clave] = valor.strip()

        elif seccion == 'personajes':
            partes = [p.strip() for p in linea.split('|')]
            pid = sin_tildes(partes[0])
            if not re.fullmatch(r'[a-z0-9_-]+', pid):
                raise ErrorCuento(f'línea {n}: nombre de personaje no válido "{partes[0]}" (use letras, números, guion o guion bajo).')
            ajustes = leer_pares(' '.join(partes[1:]))
            try:
                personajes[pid] = {
                    'id': pid,
                    'nombre': ajustes.get('nombre') or partes[0].strip().capitalize(),
                    'voz': ajustes.get('voz') or VOZ_POR_DEFECTO,
                    'velocidad': normalizar_porcentaje(ajustes.get('velocidad')),
                    'tono': normalizar_hz(ajustes.get('tono')),
                    'volumen': normalizar_porcentaje(ajustes.get('volumen')),
                    'color': ajustes.get('color') or '#2b8cf0',
                    'emoji': ajustes.get('emoji') or '🗣️',
                }
            except ValueError as e:
                raise ErrorCuento(f'línea {n}: {e}') from e

        else:  # seccion == 'pagina'
            m = RE_DIALOGO.match(linea)
            if not m:
                raise ErrorCuento(f'línea {n}: se esperaba "personaje: texto" y se encontró: "{linea[:50]}"')
            pid = sin_tildes(m.group(1))
            if pid not in personajes:
                conocidos = ', '.join(personajes) or '(ninguno)'
                raise ErrorCuento(f'línea {n}: el personaje "{m.group(1)}" no está en [personajes]. Personajes definidos: {conocidos}.')
            paginas[-1]['lineas'].append({'personaje': pid, 'texto': ' '.join(m.group(2).split()), 'n': n})

    if not meta['titulo']:
        raise ErrorCuento('falta el dato "titulo:" al principio del archivo.')
    if not personajes:
        raise ErrorCuento('falta la sección [personajes] con al menos un personaje.')
    if not paginas:
        raise ErrorCuento('el cuento no tiene páginas. Agregue al menos una sección [pagina].')
    for p in paginas:
        if not p['lineas']:
            raise ErrorCuento(f'la página que empieza en la línea {p["n"]} no tiene ninguna línea de texto.')

    return {'meta': meta, 'personajes': personajes, 'paginas': paginas}


# ----------------------------------------------------------------------------------------------
#  Palabras y tiempos
# ----------------------------------------------------------------------------------------------

def separar_palabras(texto):
    """Divide el texto en las palabras que se muestran. Los signos sueltos (— , ... ) se pegan a la palabra vecina."""
    palabras = []
    for trozo in texto.split():
        if re.search(r'\w', trozo, re.UNICODE):
            palabras.append(trozo)
        elif palabras:
            palabras[-1] += ' ' + trozo
        else:
            palabras.append(trozo)  # signo suelto al principio: se pega a la primera palabra más abajo
    if palabras and not re.search(r'\w', palabras[0], re.UNICODE) and len(palabras) > 1:
        palabras[1] = palabras[0] + ' ' + palabras[1]
        palabras = palabras[1:]
    return palabras


def clave(texto):
    """Para comparar palabras: minúsculas y solo letras o números."""
    return re.sub(r'[\W_]+', '', texto.lower(), flags=re.UNICODE)


def alinear(palabras, eventos, duracion):
    """
    Empareja cada palabra del texto con el instante en que la dice la voz.
    `eventos` son los límites de palabra que entrega el servicio de voz. Si alguna palabra no se logra emparejar
    (por ejemplo, un número que la voz lee como palabras), se reparte el tiempo entre sus vecinas.
    Devuelve [[palabra, inicio_ms, fin_ms], ...].
    """
    n = len(palabras)
    inicio = [None] * n
    fin = [None] * n
    j = 0
    for i, palabra in enumerate(palabras):
        k_palabra = clave(palabra)
        for k in range(j, min(j + 4, len(eventos))):   # busca en las siguientes 4 palabras de la voz
            k_evento = clave(eventos[k]['texto'])
            if k_evento and (k_evento == k_palabra or k_palabra.startswith(k_evento) or k_evento.startswith(k_palabra)):
                inicio[i] = eventos[k]['inicio']
                fin[i] = eventos[k]['inicio'] + eventos[k]['dur']
                j = k + 1
                break

    sin_dato = [i for i in range(n) if inicio[i] is None]
    if sin_dato:
        # Hueco entre la palabra anterior emparejada y la siguiente: se reparte según el largo de cada palabra.
        i = 0
        while i < n:
            if inicio[i] is not None:
                i += 1
                continue
            a = i
            while i < n and inicio[i] is None:
                i += 1
            b = i  # palabras a..b-1 sin dato
            t0 = fin[a - 1] if a > 0 else 0.0
            t1 = inicio[b] if b < n else duracion
            if t1 < t0:
                t1 = t0
            pesos = [max(1, len(clave(palabras[x]))) for x in range(a, b)]
            total = float(sum(pesos))
            t = t0
            for x, peso in zip(range(a, b), pesos):
                dur = (t1 - t0) * peso / total
                inicio[x], fin[x] = t, t + dur
                t += dur

    return [[palabras[i], int(round(inicio[i])), int(round(fin[i]))] for i in range(n)]


def estimar(palabras, duracion):
    """Plan B si el servicio no entrega límites de palabra: reparte la duración según el largo de cada palabra."""
    pesos = [max(1, len(clave(p))) + 1 for p in palabras]
    total = float(sum(pesos))
    t, salida = duracion * 0.04, []
    util = duracion * 0.92
    for p, peso in zip(palabras, pesos):
        d = util * peso / total
        salida.append([p, int(round(t)), int(round(t + d))])
        t += d
    return salida


# ----------------------------------------------------------------------------------------------
#  Voces (servicio edge-tts)
# ----------------------------------------------------------------------------------------------

def importar_edge_tts():
    try:
        import edge_tts  # noqa: PLC0415
    except ImportError:
        sys.exit('Falta instalar la librería de voces. Ejecute:  pip install edge-tts')
    return edge_tts


async def sintetizar(edge_tts, texto, personaje):
    """Pide el audio de un texto con la voz del personaje. Devuelve (bytes del mp3, eventos de palabra)."""
    comunicacion = edge_tts.Communicate(
        texto, personaje['voz'],
        rate=personaje['velocidad'], pitch=personaje['tono'], volume=personaje['volumen'],
        boundary='WordBoundary',
    )
    audio = bytearray()
    eventos = []
    async for trozo in comunicacion.stream():
        if trozo['type'] == 'audio':
            audio += trozo['data']
        elif trozo['type'] == 'WordBoundary':
            eventos.append({'texto': trozo['text'], 'inicio': trozo['offset'] / 10000.0, 'dur': trozo['duration'] / 10000.0})
    if not audio:
        raise RuntimeError('el servicio no devolvió audio (¿voz mal escrita o sin conexión?)')
    return bytes(audio), eventos


async def listar_voces(filtro):
    edge_tts = importar_edge_tts()
    voces = await edge_tts.list_voices()
    filtro = (filtro or 'es-').lower()
    elegidas = sorted((v for v in voces if v['ShortName'].lower().startswith(filtro) or v['Locale'].lower().startswith(filtro)),
                      key=lambda v: v['ShortName'])
    print(f'{len(elegidas)} voces que empiezan con "{filtro}":\n')
    for v in elegidas:
        genero = 'mujer' if v['Gender'] == 'Female' else 'hombre'
        print(f"  {v['ShortName']:<26} {genero}")
    print('\nCopie el nombre de la voz en la línea del personaje:  leon | voz=es-MX-JorgeNeural | ...')


# ----------------------------------------------------------------------------------------------
#  Generación de un cuento
# ----------------------------------------------------------------------------------------------

def huella(texto, personaje):
    """Identifica el audio: si cambia el texto o la voz, cambia la huella y el audio se crea de nuevo."""
    base = '|'.join([texto, personaje['voz'], personaje['velocidad'], personaje['tono'], personaje['volumen']])
    return hashlib.sha1(base.encode('utf-8')).hexdigest()[:10]


async def generar_audio(edge_tts, sem, trabajo, carpeta_audio, manifiesto, forzar, avance):
    """Crea (o reutiliza) el audio de una línea y rellena sus palabras con tiempos."""
    linea, personaje = trabajo['linea'], trabajo['personaje']
    archivo = f"{personaje['id']}-{trabajo['huella']}.mp3"
    destino = carpeta_audio / archivo
    palabras = separar_palabras(linea['texto'])

    if not forzar and destino.exists() and archivo in manifiesto:
        datos = manifiesto[archivo]
        estado = 'reutilizado'
    else:
        async with sem:
            ultimo_error = None
            for intento in range(1, REINTENTOS + 1):
                try:
                    audio, eventos = await sintetizar(edge_tts, linea['texto'], personaje)
                    break
                except Exception as e:  # noqa: BLE001
                    ultimo_error = e
                    await asyncio.sleep(1.5 * intento)
            else:
                raise RuntimeError(f'línea {linea["n"]}: no se pudo crear el audio ({ultimo_error})')
        destino.write_bytes(audio)
        duracion = len(audio) * 8.0 / BITRATE_MP3 * 1000.0
        tiempos = alinear(palabras, eventos, duracion) if eventos else estimar(palabras, duracion)
        datos = {'duracion': int(round(duracion)), 'palabras': tiempos, 'estimado': not eventos}
        manifiesto[archivo] = datos
        estado = 'creado' if eventos else 'creado (tiempos estimados)'

    avance['hecho'] += 1
    texto = linea['texto'] if len(linea['texto']) <= 56 else linea['texto'][:55] + '…'
    print(f"  [{avance['hecho']:>2}/{avance['total']}] {personaje['nombre']:<10} {estado:<27} {texto}")
    return archivo, datos


async def generar_cuento(carpeta, forzar=False):
    carpeta = Path(carpeta).resolve()
    ruta_txt = carpeta / 'cuento.txt'
    if not ruta_txt.exists():
        raise ErrorCuento(f'no existe {ruta_txt}')
    cuento = leer_cuento(ruta_txt)
    meta, personajes = cuento['meta'], cuento['personajes']
    cuento_id = carpeta.name

    print(f"\n=== {meta['titulo']}  ({cuento_id}) ===")
    carpeta_audio = carpeta / 'audio'
    carpeta_audio.mkdir(exist_ok=True)
    ruta_manifiesto = carpeta / 'manifiesto-audio.json'
    manifiesto = {}
    if ruta_manifiesto.exists() and not forzar:
        try:
            manifiesto = json.loads(ruta_manifiesto.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            manifiesto = {}

    trabajos = []
    for p in cuento['paginas']:
        for linea in p['lineas']:
            personaje = personajes[linea['personaje']]
            trabajos.append({'linea': linea, 'personaje': personaje, 'huella': huella(linea['texto'], personaje)})

    edge_tts = importar_edge_tts()
    sem = asyncio.Semaphore(CONCURRENCIA)
    avance = {'hecho': 0, 'total': len(trabajos)}
    resultados = await asyncio.gather(*[
        generar_audio(edge_tts, sem, t, carpeta_audio, manifiesto, forzar, avance) for t in trabajos
    ])

    # Armar los datos que lee el lector web
    datos_paginas = []
    k = 0
    for p in cuento['paginas']:
        lineas = []
        for linea in p['lineas']:
            archivo, datos = resultados[k]
            k += 1
            lineas.append({
                'personaje': linea['personaje'],
                'texto': linea['texto'],
                'audio': f'audio/{archivo}',
                'duracion': datos['duracion'],
                'palabras': datos['palabras'],
            })
        datos_paginas.append({'imagen': p['imagen'], 'fondo': p['fondo'], 'lineas': lineas})

    datos = {
        'id': cuento_id,
        'titulo': meta['titulo'],
        'autor': meta['autor'],
        'descripcion': meta['descripcion'],
        'idioma': meta['idioma'] or 'es',
        'portada': meta['portada'],
        'orden': int(meta['orden']) if str(meta['orden']).isdigit() else 999,
        'generado': datetime.now().isoformat(timespec='seconds'),
        'personajes': {
            pid: {'nombre': p['nombre'], 'emoji': p['emoji'], 'color': p['color'], 'voz': p['voz']}
            for pid, p in personajes.items()
        },
        'paginas': datos_paginas,
    }
    texto_json = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
    (carpeta / 'datos.json').write_text(texto_json, encoding='utf-8')
    (carpeta / 'datos.js').write_text(
        '/* Generado por herramientas/generar_cuento.py a partir de cuento.txt. No se edita a mano: se vuelve a crear. */\n'
        'window.CUENTOS = window.CUENTOS || {};\n'
        f'window.CUENTOS[{json.dumps(cuento_id)}] = {texto_json};\n',
        encoding='utf-8')

    # Guardar los tiempos y borrar los audios que ya no se usan (líneas que se cambiaron o quitaron)
    usados = {a for a, _ in resultados}
    manifiesto = {a: d for a, d in manifiesto.items() if a in usados}
    ruta_manifiesto.write_text(json.dumps(manifiesto, ensure_ascii=False, indent=1), encoding='utf-8')
    sobrantes = [f for f in carpeta_audio.glob('*.mp3') if f.name not in usados]
    for f in sobrantes:
        f.unlink()

    segundos = sum(d['duracion'] for _, d in resultados) / 1000.0
    print(f"  Listo: {len(trabajos)} líneas, {len(cuento['paginas'])} páginas, {len(personajes)} personajes, "
          f"{segundos:.0f} s de audio." + (f"  ({len(sobrantes)} audios viejos borrados)" if sobrantes else ''))
    return datos


# ----------------------------------------------------------------------------------------------
#  Catálogo de la biblioteca
# ----------------------------------------------------------------------------------------------

def reconstruir_catalogo():
    """Crea cuentos/catalogo.js con la lista de todos los cuentos que ya tienen su datos.json."""
    entradas = []
    for carpeta in sorted(CARPETA_CUENTOS.iterdir()) if CARPETA_CUENTOS.exists() else []:
        if not carpeta.is_dir() or carpeta.name.startswith(('_', '.')):
            continue
        ruta = carpeta / 'datos.json'
        if not ruta.exists():
            if (carpeta / 'cuento.txt').exists():
                print(f'  Aviso: "{carpeta.name}" todavía no tiene audios; no aparece en la biblioteca '
                      f'(ejecute: python generar_cuento.py ../cuentos/{carpeta.name}).')
            continue
        d = json.loads(ruta.read_text(encoding='utf-8'))
        lineas = [l for p in d['paginas'] for l in p['lineas']]
        entradas.append({
            'id': d['id'],
            'titulo': d['titulo'],
            'autor': d['autor'],
            'descripcion': d['descripcion'],
            'portada': d['portada'],
            'orden': d.get('orden', 999),
            'paginas': len(d['paginas']),
            'duracion': sum(l['duracion'] for l in lineas),
            'personajes': [{'id': k, **{c: v[c] for c in ('nombre', 'emoji', 'color')}} for k, v in d['personajes'].items()],
        })
    entradas.sort(key=lambda e: (e['orden'], e['titulo'].lower()))
    CARPETA_CUENTOS.mkdir(exist_ok=True)
    (CARPETA_CUENTOS / 'catalogo.js').write_text(
        '/* Generado por herramientas/generar_cuento.py. Lista de los cuentos de la biblioteca. */\n'
        f'window.CATALOGO = {json.dumps(entradas, ensure_ascii=False, indent=1)};\n',
        encoding='utf-8')
    print(f'\nCatálogo actualizado: {len(entradas)} cuento(s) en la biblioteca.')


# ----------------------------------------------------------------------------------------------
#  Programa principal
# ----------------------------------------------------------------------------------------------

def carpeta_de(argumento):
    """Acepta una ruta (../cuentos/mi-cuento) o solo el nombre del cuento (mi-cuento)."""
    p = Path(argumento)
    if (p / 'cuento.txt').exists():
        return p
    if (CARPETA_CUENTOS / argumento / 'cuento.txt').exists():
        return CARPETA_CUENTOS / argumento
    raise ErrorCuento(f'no encuentro "{argumento}" (busqué {p / "cuento.txt"} y {CARPETA_CUENTOS / argumento / "cuento.txt"}).')


def todas_las_carpetas():
    if not CARPETA_CUENTOS.exists():
        return []
    return sorted(c for c in CARPETA_CUENTOS.iterdir()
                  if c.is_dir() and not c.name.startswith(('_', '.')) and (c / 'cuento.txt').exists())


def main():
    ap = argparse.ArgumentParser(description='Genera los audios del cuentacuentos a partir de cuento.txt.')
    ap.add_argument('cuentos', nargs='*', help='carpeta o nombre de cada cuento (por ejemplo: leon-y-raton)')
    ap.add_argument('--todos', action='store_true', help='procesa todos los cuentos de la carpeta cuentos')
    ap.add_argument('--forzar', action='store_true', help='crea de nuevo todos los audios, aunque no hayan cambiado')
    ap.add_argument('--revisar', action='store_true', help='solo revisa el cuento.txt, sin generar audios')
    ap.add_argument('--catalogo', action='store_true', help='solo reconstruye cuentos/catalogo.js')
    ap.add_argument('--voces', nargs='?', const='es-', metavar='FILTRO', help='lista las voces disponibles (por ejemplo: es-EC)')
    args = ap.parse_args()

    if args.voces is not None:
        asyncio.run(listar_voces(args.voces))
        return 0
    if args.catalogo:
        reconstruir_catalogo()
        return 0

    try:
        carpetas = todas_las_carpetas() if args.todos else [carpeta_de(c) for c in args.cuentos]
    except ErrorCuento as e:
        print(f'Error: {e}')
        return 1
    if not carpetas:
        ap.print_help()
        return 1

    fallos = 0
    for carpeta in carpetas:
        try:
            if args.revisar:
                c = leer_cuento(carpeta / 'cuento.txt')
                lineas = sum(len(p['lineas']) for p in c['paginas'])
                print(f"OK  {carpeta.name}: «{c['meta']['titulo']}» — {len(c['paginas'])} páginas, {lineas} líneas, "
                      f"{len(c['personajes'])} personajes ({', '.join(c['personajes'])}).")
            else:
                asyncio.run(generar_cuento(carpeta, forzar=args.forzar))
        except (ErrorCuento, RuntimeError) as e:
            fallos += 1
            print(f'\nError en {carpeta.name}: {e}')

    if not args.revisar:
        reconstruir_catalogo()
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
