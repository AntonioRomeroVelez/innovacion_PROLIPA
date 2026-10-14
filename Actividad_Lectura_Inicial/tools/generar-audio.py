#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera las grabaciones de voz del juego con una voz neuronal de Ecuador.

  node tools/extraer-textos.js        (lista de textos → tools/textos.json)
  python tools/generar-audio.py       (crea audio/voz/*.mp3 + js/audio-voces.js)

Requisitos (solo para quien genera el audio, no para jugar):
  · Python 3.9+      · pip install edge-tts      · ffmpeg en el PATH · internet

Solo genera lo que falte (puedes volver a ejecutarlo cuando agregues contenido).
Opciones útiles:  --forzar (regenerar todo)  --voz es-EC-AndreaNeural  --voz-narrador es-EC-LuisNeural
                  --estilo natural|actual  --solo std|enf|nar

Tres "presets" de voz:
  std  1º–3º EGB: ritmo claro y natural (voz de Libi).
  enf  Inicial (4 años): más lento, más fuerte y más expresivo (voz de Libi).
  nar  Narrador de las lecturas de 2º y 3º EGB (otra voz: --voz-narrador).

NOTA DE LICENCIA: edge-tts usa el servicio de lectura en voz alta de Microsoft Edge,
que no es una API comercial oficial. Para PUBLICAR el producto, genera el audio con
Azure AI Speech (mismas voces es-EC-AndreaNeural / es-EC-LuisNeural, con licencia).
"""
import argparse
import array
import asyncio
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')   # consolas de Windows (cp1252)
except Exception:
    pass

RAIZ = Path(__file__).resolve().parent.parent
SR = 24000                       # frecuencia de muestreo del audio
UMBRAL = 450                     # amplitud (de 32768) por debajo de la cual es "silencio"
RMS_OBJETIVO = {'std': 0.095, 'enf': 0.125, 'nar': 0.095}   # volumen medio por preset (enf: más fuerte)
BASE = {'std': 'std', 'enf': 'enf', 'nar': 'std'}            # estilo de ritmo que usa cada preset

# ---------------------------------------------------------------------------
#  Pronunciación: cómo se lee en voz alta lo que se escribe distinto
# ---------------------------------------------------------------------------
PRONUNCIA = [
    (r'\b1º\b', 'primero'), (r'\b2º\b', 'segundo'), (r'\b3º\b', 'tercero'),
    (r'\bEGB\b', 'e ge be'),
]


def para_voz(texto: str, preset: str, estilo: str) -> str:
    t = texto
    for patron, cambio in PRONUNCIA:
        t = re.sub(patron, cambio, t)
    palabras = t.split()
    # estilo "actual": en Inicial, sonidos/sílabas/palabras sueltas se dicen con exclamación
    if estilo == 'actual' and preset == 'enf' and len(palabras) == 1 and not re.search(r'[¡!¿?]', t):
        t = f'¡{t}!'
    return t


# Ritmo (rate), tono (pitch) y volumen por tipo de texto y preset.
#   sonido = vocal/sílaba · suelta = una palabra · frase = varias palabras · larga = 7+ palabras
ESTILOS = {
    # Lo que se generó primero: muy lento en Inicial (puede sonar estirado/artificial).
    'actual': {
        'std': {'sonido': ('-22%', '+0Hz', '+0%'), 'suelta': ('-12%', '+0Hz', '+0%'),
                'frase': ('-8%', '+0Hz', '+0%'), 'larga': ('-14%', '+0Hz', '+0%')},
        'enf': {'sonido': ('-50%', '+8Hz', '+25%'), 'suelta': ('-40%', '+6Hz', '+22%'),
                'frase': ('-28%', '+5Hz', '+20%'), 'larga': ('-28%', '+5Hz', '+20%')},
    },
    # Ritmo más cercano al habla real: la voz suena menos "estirada".
    'natural': {
        'std': {'sonido': ('-12%', '+0Hz', '+0%'), 'suelta': ('-6%', '+0Hz', '+0%'),
                'frase': ('-4%', '+0Hz', '+0%'), 'larga': ('-8%', '+0Hz', '+0%')},
        'enf': {'sonido': ('-32%', '+4Hz', '+15%'), 'suelta': ('-26%', '+4Hz', '+15%'),
                'frase': ('-18%', '+3Hz', '+12%'), 'larga': ('-18%', '+3Hz', '+12%')},
    },
}


def prosodia(texto: str, preset: str, estilo: str = 'actual') -> dict:
    """Ritmo, tono y volumen según el tipo de texto, el preset y el estilo."""
    palabras = texto.split()
    if len(palabras) == 1 and len(texto) <= 4:
        tipo = 'sonido'
    elif len(palabras) == 1:
        tipo = 'suelta'
    elif len(palabras) >= 7:
        tipo = 'larga'
    else:
        tipo = 'frase'
    rate, pitch, volume = ESTILOS[estilo][BASE[preset]][tipo]
    return dict(rate=rate, pitch=pitch, volume=volume)


# ---------------------------------------------------------------------------
#  Audio: recorte de silencios + volumen parejo + mp3 pequeño
# ---------------------------------------------------------------------------
def ffmpeg(args, datos: bytes) -> bytes:
    r = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin'] + args, input=datos,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode('utf-8', 'ignore')[:300])
    return r.stdout


def procesar(mp3: bytes, preset: str, bitrate: str = '128k'):
    """Devuelve (mp3_final, duración_ms, recorte_inicial_ms)."""
    pcm = ffmpeg(['-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), 'pipe:1'], mp3)
    m = array.array('h')
    m.frombytes(pcm[: len(pcm) - len(pcm) % 2])
    n = len(m)
    primero = next((i for i in range(n) if abs(m[i]) > UMBRAL), 0)
    ultimo = next((i for i in range(n - 1, -1, -1) if abs(m[i]) > UMBRAL), n - 1)
    ini = max(0, primero - int(0.06 * SR))
    fin = min(n, ultimo + int(0.20 * SR))
    seg = m[ini:fin]
    # volumen parejo (RMS) sin pasar de -1 dBFS
    act = m[primero:ultimo + 1] or seg
    rms = math.sqrt(sum(x * x for x in act) / max(1, len(act))) / 32768
    pico = max((abs(x) for x in act), default=1) / 32768
    ganancia = RMS_OBJETIVO[preset] / max(rms, 1e-4)
    ganancia = min(ganancia, 0.89 / max(pico, 1e-4), 3.5)
    ganancia = max(ganancia, 0.4)
    fa, fo = int(0.006 * SR), int(0.030 * SR)
    for i in range(len(seg)):
        v = seg[i] * ganancia
        if i < fa:
            v *= i / fa
        elif i > len(seg) - fo:
            v *= max(0, (len(seg) - i) / fo)
        seg[i] = int(max(-32767, min(32767, v)))
    final = ffmpeg(['-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                    '-c:a', 'libmp3lame', '-b:a', bitrate, '-ar', str(SR), '-ac', '1', '-f', 'mp3', 'pipe:1'],
                   seg.tobytes())
    return final, round(len(seg) * 1000 / SR), round(ini * 1000 / SR)


# ---------------------------------------------------------------------------
#  Tiempos por palabra (para el resaltado de la lectura)
# ---------------------------------------------------------------------------
def limpio(s: str) -> str:
    return re.sub(r'[^0-9a-záéíóúüñ]', '', s.lower())


def alinear(tokens, eventos, dur_ms, recorte_ms):
    """Une los eventos de palabra del servicio con las palabras separadas por espacios."""
    if not eventos:
        return None
    pares, k = [], 0
    for tk in tokens:
        objetivo, acumulado, ini, fin = limpio(tk), '', None, None
        while k < len(eventos) and (len(acumulado) < len(objetivo) or not objetivo):
            off, dur, txt = eventos[k]
            ini = off if ini is None else ini
            fin = off + dur
            acumulado += limpio(txt)
            k += 1
            if not objetivo:
                break
        if ini is None or acumulado != objetivo:
            return None
        pares.append([max(0, ini - recorte_ms), max(0, fin - recorte_ms)])
    return pares


def proporcional(tokens, dur_ms):
    """Plan B: reparte la duración según la cantidad de letras de cada palabra."""
    pesos = [max(1, len(limpio(t))) + (3 if re.search(r'[.,;:!?]$', t) else 0) for t in tokens]
    total, acum, pares = sum(pesos), 0, []
    util = max(0, dur_ms - 200)
    for p in pesos:
        pares.append([round(60 + acum / total * util), round(60 + (acum + p) / total * util)])
        acum += p
    return pares


# ---------------------------------------------------------------------------
async def sintetizar(texto_voz, voz, pr):
    import edge_tts
    com = edge_tts.Communicate(texto_voz, voz, rate=pr['rate'], pitch=pr['pitch'],
                               volume=pr['volume'], boundary='WordBoundary')
    audio, eventos = bytearray(), []
    async for ch in com.stream():
        if ch['type'] == 'audio':
            audio += ch['data']
        elif ch['type'] == 'WordBoundary':
            eventos.append((ch['offset'] // 10000, ch['duration'] // 10000, ch['text']))
    if not audio:
        raise RuntimeError('el servicio no devolvió audio')
    return bytes(audio), eventos


def identificador(preset, texto):
    return hashlib.sha1(f'{preset}|{texto}'.encode('utf-8')).hexdigest()[:10]


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--textos', default=str(RAIZ / 'tools' / 'textos.json'))
    ap.add_argument('--salida', default=str(RAIZ / 'audio' / 'voz'))
    ap.add_argument('--manifiesto', default=str(RAIZ / 'js' / 'audio-voces.js'))
    ap.add_argument('--indice', default=str(RAIZ / 'tools' / 'indice-audio.json'))
    ap.add_argument('--voz', default='es-EC-AndreaNeural', help='voz de Libi (presets std y enf)')
    ap.add_argument('--voz-narrador', default='es-EC-LuisNeural', help='voz que narra las lecturas (preset nar)')
    ap.add_argument('--solo', choices=['std', 'enf', 'nar'])
    ap.add_argument('--estilo', choices=sorted(ESTILOS), default='natural',
                    help='ritmo/tono (ver ESTILOS). Por defecto: natural')
    ap.add_argument('--bitrate', default='128k', help='calidad del mp3 final (por defecto 128k)')
    ap.add_argument('--forzar', action='store_true', help='regenerar aunque ya exista')
    ap.add_argument('--concurrencia', type=int, default=5)
    a = ap.parse_args()

    if not shutil.which('ffmpeg'):
        sys.exit('Falta ffmpeg en el PATH (https://ffmpeg.org).')
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        sys.exit('Falta edge-tts:  pip install edge-tts')

    textos = json.loads(Path(a.textos).read_text(encoding='utf-8'))
    salida = Path(a.salida)
    salida.mkdir(parents=True, exist_ok=True)
    ruta_indice = Path(a.indice)
    indice = json.loads(ruta_indice.read_text(encoding='utf-8')) if ruta_indice.exists() else {}

    trabajos = []
    voces = {'std': a.voz, 'enf': a.voz, 'nar': a.voz_narrador}
    for preset in ('std', 'enf', 'nar'):
        if a.solo and a.solo != preset:
            continue
        for t in textos.get(preset, []):
            clave = f'{preset}|{t}'
            id_ = identificador(preset, t)
            if not a.forzar and clave in indice and (salida / f'{id_}.mp3').exists():
                continue
            trabajos.append((preset, t, clave, id_))

    total = len(trabajos)
    print(f'Voces: Libi={a.voz} · narrador={a.voz_narrador} · estilo: {a.estilo} · {a.bitrate} · por generar: {total} · ya existentes: {sum(len(v) for v in textos.values()) - total}')
    sem = asyncio.Semaphore(a.concurrencia)
    hechos, fallidos = 0, []

    async def uno(preset, texto, clave, id_):
        nonlocal hechos
        async with sem:
            ultimo_error = None
            for intento in range(4):
                try:
                    pr = prosodia(texto, preset, a.estilo)
                    mp3, eventos = await sintetizar(para_voz(texto, preset, a.estilo), voces[preset], pr)
                    final, dur, recorte = await asyncio.to_thread(procesar, mp3, preset, a.bitrate)
                    (salida / f'{id_}.mp3').write_bytes(final)
                    tokens = texto.split()
                    entrada = [id_, dur]
                    if len(tokens) > 1:
                        pares = alinear(tokens, eventos, dur, recorte) or proporcional(tokens, dur)
                        entrada.append(pares)
                    indice[clave] = entrada
                    hechos += 1
                    if hechos % 40 == 0 or hechos == total:
                        print(f'  {hechos}/{total}', flush=True)
                    return
                except Exception as e:  # reintenta con espera creciente
                    ultimo_error = e
                    await asyncio.sleep(1.5 * (intento + 1))
            fallidos.append((clave, str(ultimo_error)))

    await asyncio.gather(*(uno(*t) for t in trabajos))

    # Índice persistente + manifiesto JS (solo con los textos vigentes)
    ruta_indice.write_text(json.dumps(indice, ensure_ascii=False, indent=0), encoding='utf-8')
    vigentes = {f'{p}|{t}' for p in ('std', 'enf', 'nar') for t in textos.get(p, [])}
    manifiesto = {k: v for k, v in sorted(indice.items()) if k in vigentes}
    js = ("'use strict';\n/* Generado por tools/generar-audio.py — no editar a mano.\n"
          f"   Voces: Libi={a.voz} · narrador={a.voz_narrador} · estilo {a.estilo} · {len(manifiesto)} grabaciones. */\n"
          "window.AUDIO_VOZ = " + json.dumps(manifiesto, ensure_ascii=False, separators=(',', ':')) + ";\n")
    Path(a.manifiesto).write_text(js, encoding='utf-8')

    # Limpieza de mp3 huérfanos
    usados = {v[0] for v in manifiesto.values()}
    for f in salida.glob('*.mp3'):
        if f.stem not in usados:
            f.unlink()

    kb = sum(f.stat().st_size for f in salida.glob('*.mp3')) / 1024
    print(f'Listo: {len(manifiesto)} grabaciones ({kb / 1024:.1f} MB) -> {a.manifiesto}')
    if fallidos:
        print(f'\n⚠ {len(fallidos)} textos fallaron (la app usará la voz del navegador para ellos):')
        for c, e in fallidos[:20]:
            print('  ', c, '->', e)


if __name__ == '__main__':
    asyncio.run(main())
