#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MUESTRAS.PY — una página para ESCUCHAR las voces y elegir las de tus cuentos.

  python herramientas/muestras.py
  (luego abrir herramientas/muestras/index.html)

La página tiene tres partes:

  1. Los personajes del catálogo (lecturas/_comun/voces.js), cada uno leyendo
     una frase de su estilo, con su propio ritmo y tono.
  2. Todas las voces en español que ofrece el servicio, leyendo el mismo
     pasaje, para comparar y probar cuál le va a un personaje.
  3. Las voces multilingües (más expresivas; revisa el acento).

Cada tarjeta tiene un botón «Copiar» con lo que hay que pegar en el texto.js y un
botón 🤖 para marcar las voces que suenan robóticas. La lista de descartadas se
copia desde la página y se pega en  herramientas/voces-descartadas.json ; desde
ahí, esta página las señala y generar.py avisa si alguna lectura las usa.

Los audios de la carpeta  muestras/  se llaman por lo que son:
  personaje_<nombre>_<código>.mp3     un personaje del catálogo   (personaje_bruja_….mp3)
  voz_<voz>_<código>.mp3              una voz suelta               (voz_es-MX-DaliaNeural_….mp3)

Es incremental: el audio que ya se generó no se vuelve a pedir, así que al
cambiar el catálogo solo se graba lo nuevo. Hace falta internet.
"""
import asyncio
import hashlib
import html
import json
import sys
import unicodedata
from pathlib import Path

try:
    import edge_tts
except ImportError:
    sys.exit("Falta la librería edge-tts. Instálala con:  pip install edge-tts")

from generar import PITCH_OK, RATE_OK, leer_catalogo, leer_descartadas

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / "muestras"
SIMULTANEAS = 4          # peticiones a la vez
SEMAFORO = None

# El mismo pasaje para todas las voces, para poder compararlas
PASAJE = ("A Mía le encantaban los cuentos. Pero esa tarde, en la biblioteca, ocurrió algo extraordinario: "
          "el libro más grande del estante se abrió solo.")
RATE_BASE = "-4%"        # el de la narradora


def sin_tildes(s):
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


def esc(s):
    return html.escape(str(s), quote=True)


# ------------------------------------------------------------ lo que se muestra
PAISES = {
    "AR": "Argentina", "BO": "Bolivia", "CL": "Chile", "CO": "Colombia", "CR": "Costa Rica", "CU": "Cuba",
    "DO": "Rep. Dominicana", "EC": "Ecuador", "ES": "España", "GQ": "Guinea Ecuatorial", "GT": "Guatemala",
    "HN": "Honduras", "MX": "México", "NI": "Nicaragua", "PA": "Panamá", "PE": "Perú", "PR": "Puerto Rico",
    "PY": "Paraguay", "SV": "El Salvador", "US": "EE. UU.", "UY": "Uruguay", "VE": "Venezuela",
    "FR": "Francia", "DE": "Alemania", "IT": "Italia", "BR": "Brasil", "KR": "Corea", "AU": "Australia", "GB": "Reino Unido",
}


def datos_de_voz(info):
    """Nombre corto, país y género en español, a partir de lo que informa el servicio."""
    corto = info["ShortName"].split("-", 2)[2].removesuffix("Neural")
    region = info["Locale"].split("-")[-1]
    pais = PAISES.get(region, region)
    genero = "mujer" if info["Gender"] == "Female" else "hombre"
    return corto, pais, genero


def clave_narradora(nombre):
    """Cómo se llama en la lectura: la narración siempre es 'narradora'."""
    return "narradora" if nombre.startswith("narrad") else nombre


def tarjeta(*, titulo, codigo, voz, nota, meta, frase, archivo, copiar, boton, buscar):
    audio = (f'<audio controls preload="none" src="{esc(archivo)}"></audio>'
             if archivo else '<p class="falla">No se pudo generar esta muestra.</p>')
    cita = f'<p class="frase">«{esc(frase)}»</p>' if frase else ""
    return (
        f'<div class="v" data-voz="{esc(voz)}" data-nota="{esc(nota)}" data-buscar="{esc(buscar)}">'
        f'<div class="cab"><b>{esc(titulo)}</b><code>{esc(codigo)}</code></div>'
        f'<div class="meta">{meta}</div>{cita}{audio}'
        f'<p class="aviso-robot">🤖 Marcada como robótica: no la uses (si es del catálogo, cámbiala en voces.js).</p>'
        f'<div class="botones">'
        f'<button type="button" data-copiar="{esc(copiar)}">{esc(boton)}</button>'
        f'<button type="button" class="marca">🤖 Suena robótica</button>'
        f'</div></div>'
    )


def tarjeta_catalogo(nombre, v, info, archivo):
    if info:
        corto, pais, genero = datos_de_voz(info)
        meta = esc(f"{corto} · {pais} · {genero}")
        nota = f"{pais}, {genero}"
    else:
        meta, nota = "⚠ esta voz no existe en el servicio", ""
    ajuste = f"velocidad {v['rate']} · tono {v['pitch']}"
    rotulo = v.get("etiqueta") or "📖 Narración"
    buscar = sin_tildes(f"{nombre} {rotulo} {v['voz']} {meta} {v.get('grupo', '')}")
    return tarjeta(
        titulo=rotulo, codigo=nombre, voz=v["voz"], nota=nota,
        meta=f"{meta}<br><span class='aj'>{ajuste}</span>", frase=v["ejemplo"], archivo=archivo,
        copiar=f"{clave_narradora(nombre)}: '{nombre}',", boton="Copiar línea", buscar=buscar)


def tarjeta_base(info, archivo):
    corto, pais, genero = datos_de_voz(info)
    voz = info["ShortName"]
    return tarjeta(
        titulo=corto, codigo=voz, voz=voz, nota=f"{pais}, {genero}", meta=esc(f"{pais} · {genero}"),
        frase=None, archivo=archivo, copiar=voz, boton="Copiar nombre",
        buscar=sin_tildes(f"{voz} {corto} {pais} {genero}"))


def seccion(titulo, tarjetas, nota=""):
    if not tarjetas:
        return ""
    return f'<section><h2>{esc(titulo)}</h2>{nota}<div class="rejilla">{"".join(tarjetas)}</div></section>'


# ------------------------------------------------------------------ las muestras
async def generar_muestra(tipo, nombre, texto, voz, rate, pitch, en_uso):
    """Devuelve el nombre del mp3 (lo crea si hace falta) o None si falló.
    El nombre dice qué es (personaje_bruja_…, voz_es-MX-DaliaNeural_…); el código final
    cambia si cambia la voz, el ajuste o la frase, y así se vuelve a grabar."""
    codigo = hashlib.sha1(f"{voz}|{rate}|{pitch}|{texto}".encode("utf-8")).hexdigest()[:6]
    archivo = f"{tipo}_{nombre}_{codigo}.mp3"
    destino = SALIDA / archivo
    en_uso.add(archivo)
    if destino.exists() and destino.stat().st_size > 0:
        return archivo
    async with SEMAFORO:
        for intento in range(1, 4):
            try:
                await edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch).save(str(destino))
                if destino.stat().st_size > 0:
                    print(f"  generada  {archivo}")
                    return archivo
            except Exception as e:
                if intento == 3:
                    print(f"  FALLO {voz}: {str(e)[:70]}")
                else:
                    await asyncio.sleep(1.2 * intento)
    destino.unlink(missing_ok=True)
    return None


async def principal():
    global SEMAFORO
    try:
        sys.stdout.reconfigure(errors="replace")      # consolas de Windows que no admiten todos los símbolos
    except Exception:
        pass
    SEMAFORO = asyncio.Semaphore(SIMULTANEAS)
    SALIDA.mkdir(exist_ok=True)

    print("Pidiendo la lista de voces al servicio…")
    todas = {v["ShortName"]: v for v in await edge_tts.list_voices()}
    catalogo = leer_catalogo()
    descartadas = leer_descartadas()
    if not catalogo:
        print("AVISO: no encuentro lecturas/_comun/voces.js; solo se mostrarán las voces sueltas.")

    en_uso = set()

    # ---- 1. el catálogo
    trabajos, nombres = [], []
    for nombre, v in catalogo.items():
        problemas = []
        if not v.get("voz"):
            problemas.append("le falta 'voz'")
        if not RATE_OK.match(str(v.get("rate", ""))):
            problemas.append(f"rate '{v.get('rate')}' no es válido")
        if not PITCH_OK.match(str(v.get("pitch", ""))):
            problemas.append(f"pitch '{v.get('pitch')}' no es válido")
        if problemas:
            print(f"  FALLO catálogo «{nombre}»: {', '.join(problemas)}")
            continue
        v.setdefault("ejemplo", PASAJE)
        nombres.append(nombre)
        trabajos.append(generar_muestra("personaje", nombre, v["ejemplo"], v["voz"], v["rate"], v["pitch"], en_uso))
    archivos = await asyncio.gather(*trabajos)

    grupos = {}
    for nombre, archivo in zip(nombres, archivos):
        v = catalogo[nombre]
        grupos.setdefault(v.get("grupo", "Otros"), []).append(tarjeta_catalogo(nombre, v, todas.get(v["voz"]), archivo))
    partes = [seccion(g, ts) for g, ts in grupos.items() if g != "Pruebas"]
    if "Pruebas" in grupos:
        partes.append(seccion(
            "Pruebas · voces multilingües", grupos["Pruebas"],
            '<p class="aviso">Son más expresivas, pero no son nativas del español: '
            'escucha bien la <b>pronunciación</b> antes de usarlas. La palabra modelo («escucha cómo se dice») '
            'sale con la misma voz.</p>'))
    seccion_catalogo = "".join(partes)

    # ---- 2. todas las voces en español, 3. multilingües
    espanolas = sorted((v for v in todas.values() if v["Locale"].startswith("es-")),
                       key=lambda v: (datos_de_voz(v)[1], v["Gender"], v["ShortName"]))
    multi = sorted((v for v in todas.values() if "Multilingual" in v["ShortName"]), key=lambda v: v["ShortName"])

    async def lote(voces):
        arch = await asyncio.gather(*(
            generar_muestra("voz", v["ShortName"], PASAJE, v["ShortName"], RATE_BASE, "+0Hz", en_uso) for v in voces))
        return [tarjeta_base(v, a) for v, a in zip(voces, arch)]

    tarjetas_es = await lote(espanolas)
    tarjetas_multi = await lote(multi)

    seccion_es = seccion(
        "Todas las voces en español", tarjetas_es,
        f'<p class="aviso">Todas leen el mismo pasaje: <i>«{esc(PASAJE)}»</i><br>'
        'Para usar una en un personaje, pega su nombre en <code>voz:</code>, por ejemplo '
        '<code>{ catalogo: \'rey\', voz: \'es-MX-DaliaNeural\' }</code>.</p>')
    seccion_multi = seccion(
        "Voces multilingües (leen español con acento propio)", tarjetas_multi,
        '<p class="aviso">Mismas indicaciones: pueden sonar más naturales, pero no todas pronuncian el español como un nativo.</p>')

    # ---- la página
    descartadas_js = json.dumps(descartadas, ensure_ascii=False).replace("</", "<\\/")
    (SALIDA / "index.html").write_text(
        PLANTILLA.replace("{{CATALOGO}}", seccion_catalogo)
                 .replace("{{ESPANOL}}", seccion_es)
                 .replace("{{MULTI}}", seccion_multi)
                 .replace("{{DESCARTADAS}}", descartadas_js),
        encoding="utf-8")

    # fuera lo que ya no se usa
    en_uso.add("index.html")
    for p in SALIDA.iterdir():
        if p.is_file() and p.name not in en_uso:
            p.unlink()

    # ¿hay personajes del catálogo con una voz descartada?
    malos = [n for n, v in catalogo.items() if v.get("voz") in descartadas]
    if malos:
        print("\nAVISO: estos personajes del catálogo usan una voz descartada: " + ", ".join(malos))
    print(f"\nListo: abre {SALIDA / 'index.html'}")


PLANTILLA = """<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voces para tus cuentos</title>
<style>
 :root{--tinta:#2b2d42;--lila:#7b5cff;--fondo:#f6f3ff;--borde:#ddd6ff}
 *{box-sizing:border-box}
 body{font-family:system-ui,"Segoe UI",sans-serif;margin:0;color:var(--tinta);background:var(--fondo)}
 main{max-width:1100px;margin:0 auto;padding:20px 16px 60px}
 h1{margin:.2em 0}
 h2{margin:1.6em 0 .3em;padding-top:.4em;border-top:2px solid var(--borde)}
 .pasos{background:#fff;border:1px solid var(--borde);border-radius:14px;padding:12px 18px;margin:12px 0}
 .pasos ol{margin:.3em 0;padding-left:1.3em;line-height:1.6}
 code{font-size:12.5px;color:#5a48b8;background:#efeaff;border-radius:6px;padding:1px 6px;word-break:break-all}
 .aviso{background:#fff8e1;border-left:5px solid #ffcf4d;border-radius:8px;padding:8px 12px;font-size:14px;margin:8px 0}
 .barra{position:sticky;top:0;z-index:5;background:var(--fondo);padding:8px 0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-bottom:1px solid var(--borde)}
 #filtro{flex:1 1 260px;max-width:460px;padding:9px 14px;font-size:16px;border:2px solid var(--borde);border-radius:999px}
 .barra label{font-size:14px;display:flex;gap:6px;align-items:center}
 .contador{font-size:14px;color:#585b7c}
 .rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;margin-top:10px}
 .v{background:#fff;border:1px solid var(--borde);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
 .v[hidden],section[hidden]{display:none}
 .v.robot{background:#fff4f4;border-color:#e6a8a8}
 .v.robot .cab b::after{content:" 🤖"}
 .aviso-robot{display:none;margin:0;font-size:13px;color:#a02020}
 .v.robot .aviso-robot{display:block}
 .cab{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
 .cab b{font-size:16px}
 .meta{font-size:13.5px;color:#585b7c}.aj{color:#8a8db0}
 .frase{margin:0;font-size:14px;font-style:italic}
 audio{width:100%}
 .botones{display:flex;gap:8px;flex-wrap:wrap}
 button{border:0;background:var(--lila);color:#fff;font-weight:600;border-radius:999px;padding:6px 14px;cursor:pointer}
 button:hover{filter:brightness(1.1)}
 button.marca{background:#eceaf7;color:#4a4670}
 .v.robot button.marca{background:#c0392b;color:#fff}
 .falla{color:#b00020;font-size:13px;margin:0}
</style></head><body><main>
<h1>🎧 Voces para tus cuentos</h1>
<div class="pasos"><b>Cómo se usa</b>
 <ol>
  <li>Escucha. Fíjate en el <b>ritmo</b>, las <b>pausas</b>, la <b>pronunciación</b> (ll, rr, ñ, j) y si suena a <b>persona contando</b> o a máquina.</li>
  <li>Si una voz <b>suena robótica</b>, toca <b>🤖</b>. Con <b>Copiar la lista de descartadas</b> y pegándola en <code>herramientas/voces-descartadas.json</code> queda anotada para siempre.</li>
  <li>Si te gusta, toca <b>Copiar</b> y pégala dentro de <code>voces: { … }</code> en el <code>texto.js</code> de tu cuento.</li>
  <li>Ejecuta <code>python herramientas/generar.py mi-cuento</code> para grabar la narración.</li>
 </ol>
 Para cambiar cómo suena un personaje del catálogo, edita su línea en <code>lecturas/_comun/voces.js</code> y vuelve a ejecutar <code>generar.py</code>.
</div>
<div class="barra">
 <input id="filtro" type="search" placeholder="Buscar: lobo, mujer, México, abuela…" autocomplete="off">
 <label><input id="ocultar" type="checkbox"> Ocultar las robóticas</label>
 <span class="contador">🤖 <b id="nrobot">0</b> marcadas</span>
 <button type="button" id="copiarLista">Copiar la lista de descartadas</button>
</div>
<h2 style="border:0;margin-bottom:0">Personajes del catálogo</h2>
{{CATALOGO}}
{{ESPANOL}}
{{MULTI}}
</main>
<script>
 // las que ya están en herramientas/voces-descartadas.json
 var BASE = {{DESCARTADAS}};
 var CLAVE = 'leemos-juntos:voces-descartadas';
 var local = { robot: {}, ok: {} };     // lo que se marcó o desmarcó en esta página
 try {
   var guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
   if (guardado && guardado.robot && guardado.ok) local = guardado;
 } catch (e) {}
 function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(local)); } catch (e) {} }
 function esRobot(voz) { return !!local.robot[voz] || (voz in BASE && !local.ok[voz]); }

 var filtro = document.getElementById('filtro');
 var ocultar = document.getElementById('ocultar');
 function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); }

 function pintar() {
   var vistas = {}, n = 0, q = norm(filtro.value.trim());
   document.querySelectorAll('.v').forEach(function (c) {
     var voz = c.getAttribute('data-voz'), r = esRobot(voz);
     c.classList.toggle('robot', r);
     c.querySelector('.marca').textContent = r ? '🤖 Descartada · quitar' : '🤖 Suena robótica';
     if (r && !vistas[voz]) { vistas[voz] = true; n++; }
     c.hidden = (q !== '' && c.getAttribute('data-buscar').indexOf(q) < 0) || (ocultar.checked && r);
   });
   document.querySelectorAll('section').forEach(function (s) { s.hidden = !s.querySelector('.v:not([hidden])'); });
   document.getElementById('nrobot').textContent = n;
 }

 function copiar(texto, boton, aviso) {
   var antes = boton.textContent;
   function listo() { boton.textContent = aviso || '¡Copiado!'; setTimeout(function () { boton.textContent = antes; }, 1600); }
   function respaldo() {
     var t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select();
     try { document.execCommand('copy'); } catch (e) {}
     t.remove(); listo();
   }
   if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(listo, respaldo);
   else respaldo();
 }

 document.addEventListener('click', function (e) {
   var b = e.target.closest('button');
   if (!b) return;
   if (b.hasAttribute('data-copiar')) return copiar(b.getAttribute('data-copiar'), b);
   if (b.classList.contains('marca')) {
     var voz = b.closest('.v').getAttribute('data-voz');
     if (esRobot(voz)) { delete local.robot[voz]; local.ok[voz] = true; }
     else { delete local.ok[voz]; local.robot[voz] = true; }
     guardar(); pintar();
   }
 });

 document.getElementById('copiarLista').addEventListener('click', function () {
   var notas = {};
   document.querySelectorAll('.v').forEach(function (c) { notas[c.getAttribute('data-voz')] = c.getAttribute('data-nota'); });
   var lista = {};
   Object.keys(BASE).forEach(function (v) { if (!local.ok[v]) lista[v] = BASE[v]; });
   Object.keys(local.robot).forEach(function (v) {
     lista[v] = BASE[v] || ('Suena robótica' + (notas[v] ? ' (' + notas[v] + ')' : ''));
   });
   copiar(JSON.stringify(lista, null, 2) + '\\n', this, '¡Copiada! Pégala en voces-descartadas.json');
 });

 filtro.addEventListener('input', pintar);
 ocultar.addEventListener('change', pintar);

 // una sola muestra suena a la vez
 document.addEventListener('play', function (e) {
   document.querySelectorAll('audio').forEach(function (a) { if (a !== e.target) a.pause(); });
 }, true);

 pintar();
</script></body></html>"""

if __name__ == "__main__":
    asyncio.run(principal())
