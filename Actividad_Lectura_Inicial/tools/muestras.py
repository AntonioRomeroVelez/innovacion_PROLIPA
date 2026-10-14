#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera MUESTRAS de voz para comparar de oído (voces y estilos distintos) y una
página tools/muestras/index.html para escucharlas lado a lado.

  python tools/muestras.py

Requisitos: pip install edge-tts · ffmpeg en el PATH · internet.
Cuando elijas una opción, regenera todo el audio con ella, por ejemplo:

  python tools/generar-audio.py --forzar --voz es-CO-SalomeNeural --estilo natural
"""
import asyncio
import html
import importlib.util
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'tools' / 'muestras'

# Reutiliza el procesamiento del generador (recorte, volumen, mp3)
_spec = importlib.util.spec_from_file_location('generar_audio', RAIZ / 'tools' / 'generar-audio.py')
G = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(G)

VARIANTES = [
    ('A', 'Andrea (Ecuador) · estilo actual', 'es-EC-AndreaNeural', 'actual'),
    ('B', 'Andrea (Ecuador) · natural', 'es-EC-AndreaNeural', 'natural'),
    ('C', 'Luis (Ecuador) · natural', 'es-EC-LuisNeural', 'natural'),
    ('D', 'Salomé (Colombia) · natural', 'es-CO-SalomeNeural', 'natural'),
    ('E', 'Paloma (latina, EE. UU.) · natural', 'es-US-PalomaNeural', 'natural'),
    ('F', 'Dalia (México) · natural', 'es-MX-DaliaNeural', 'natural'),
    ('G', 'Camila (Perú) · natural', 'es-PE-CamilaNeural', 'natural'),
    ('H', 'Ximena (España) · natural', 'es-ES-XimenaNeural', 'natural'),
    ('I', 'Ava (multilingüe) · natural', 'en-US-AvaMultilingualNeural', 'natural'),
    ('J', 'Emma (multilingüe) · natural', 'en-US-EmmaMultilingualNeural', 'natural'),
]

TEXTOS = [
    ('enf', 'a', 'Inicial · vocal'),
    ('enf', 'avión', 'Inicial · palabra'),
    ('enf', '¡Muy bien!', 'Inicial · elogio'),
    ('std', 'ma', 'Sílaba'),
    ('std', 'mariposa', 'Palabra'),
    ('std', '¡Muy bien!', 'Elogio'),
    ('std', 'Libi es un libro que viaja por las escuelas de Ecuador. '
            'Cada mañana sale de su biblioteca en Quito y mira el volcán Cotopaxi.', 'Lectura'),
]


async def una(letra, voz, estilo, n, preset, texto, sem):
    destino = SALIDA / f'{letra}{n + 1}.mp3'
    async with sem:
        for intento in range(4):
            try:
                pr = G.prosodia(texto, preset, estilo)
                mp3, _ = await G.sintetizar(G.para_voz(texto, preset, estilo), voz, pr)
                final, dur, _ = await asyncio.to_thread(G.procesar, mp3, preset, '128k')
                destino.write_bytes(final)
                return dur
            except Exception as e:  # reintenta
                err = e
                await asyncio.sleep(1.5 * (intento + 1))
        print(f'  ✗ {letra}{n + 1} ({voz}): {err}')
        return None


async def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(5)
    tareas = [una(l, v, e, n, p, t, sem)
              for (l, _, v, e) in VARIANTES for n, (p, t, _) in enumerate(TEXTOS)]
    print(f'Generando {len(tareas)} muestras…')
    durs = await asyncio.gather(*tareas)
    k = 0
    tabla = {}
    for (l, _, _, _) in VARIANTES:
        for n in range(len(TEXTOS)):
            tabla[(l, n)] = durs[k]
            k += 1

    filas = []
    for n, (preset, texto, etiqueta) in enumerate(TEXTOS):
        celdas = []
        for (l, _, _, _) in VARIANTES:
            ok = (SALIDA / f'{l}{n + 1}.mp3').exists() and tabla[(l, n)]
            celdas.append(f'<td><audio controls preload="none" src="{l}{n + 1}.mp3"></audio></td>' if ok
                          else '<td class="no">—</td>')
        corto = texto if len(texto) < 40 else texto[:37] + '…'
        filas.append(f'<tr><th>{html.escape(etiqueta)}<small>{html.escape(corto)}</small></th>{"".join(celdas)}</tr>')
    cab = ''.join(f'<th class="v"><b>{l}</b><small>{html.escape(nombre)}</small></th>'
                  for (l, nombre, _, _) in VARIANTES)
    pagina = f'''<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Muestras de voz · Libi</title>
<style>
body{{font:16px/1.4 system-ui,sans-serif;margin:24px;color:#27235a;background:#f4f7ff}}
h1{{margin:0 0 4px}} p{{max-width:70ch}}
table{{border-collapse:collapse;background:#fff;box-shadow:0 2px 12px #0002;border-radius:12px;overflow:hidden}}
th,td{{padding:8px 10px;border-bottom:1px solid #e6ebff;text-align:center;vertical-align:middle}}
th{{background:#eef2ff;font-weight:600}} th small{{display:block;font-weight:400;color:#667}}
th.v b{{font-size:1.4rem;color:#1f4e9c}} audio{{width:150px;height:34px}} td.no{{color:#bbb}}
tr th:first-child{{text-align:left;min-width:130px}}
</style></head><body>
<h1>Muestras de voz · Libi (PROLIPA)</h1>
<p>Escucha cada fila con cada voz (A–J) y dime la <b>letra</b> que mejor suena: la más natural,
cálida y clara para niños. Si ninguna te convence, dime qué falla (por ejemplo «suena metálica»,
«muy lenta», «sin emoción»).</p>
<table><thead><tr><th></th>{cab}</tr></thead><tbody>{"".join(filas)}</tbody></table>
</body></html>'''
    (SALIDA / 'index.html').write_text(pagina, encoding='utf-8')
    total = sum(1 for d in durs if d)
    print(f'Listo: {total}/{len(durs)} muestras → {SALIDA / "index.html"}')


if __name__ == '__main__':
    asyncio.run(main())
