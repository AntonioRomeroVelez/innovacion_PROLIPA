#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENERAR.PY — produce la narración de las lecturas.

  python herramientas/generar.py                       todas las lecturas
  python herramientas/generar.py mia-y-el-libro        solo esa
  python herramientas/generar.py _comun otra-lectura   varias

Para cada carpeta  lecturas/<id>/  lee su  texto.js  (el texto que escribe una
persona) y genera:

  lecturas/<id>/audio/*.mp3   un fragmento de narración por frase, con voz neuronal
  lecturas/<id>/audio.js      qué audio corresponde a cada fragmento y el tiempo
                              exacto de cada palabra (para resaltar al ritmo de la voz)

Hace falta internet SOLO al generar: el audio resultante va dentro de la
actividad y funciona sin conexión en cualquier dispositivo.

Es incremental: cada fragmento se guarda con un nombre que depende de su texto y
de su voz. Si cambias una frase, solo se vuelve a generar esa frase.

Las voces de los personajes pueden venir del catálogo  lecturas/_comun/voces.js
(ver su cabecera); aquí se resuelven igual que lo hace motor/lecturas.js.

Requiere:  pip install edge-tts      y      Node.js (para leer los texto.js)
"""
import asyncio
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    sys.exit("Falta la librería edge-tts. Instálala con:  pip install edge-tts")

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
LECTURAS = RAIZ / "lecturas"
COMUN = "_comun"

PUNTO_FINAL = re.compile(r"[.,;:!?…]$")
TIENE_LETRAS = re.compile(r"[^\W_]", re.UNICODE)


# ----------------------------------------------------------- leer texto.js
LEER_JS = r"""
global.window = global;
let datos = null;
global.Lecturas = {
  texto: (id, d) => { datos = { id, d }; },
  voces: (d) => { datos = { d }; },
  audio: () => {}
};
require(process.argv[1]);
if (!datos) { console.error('el archivo no llamó a Lecturas.texto(...) ni a Lecturas.voces(...)'); process.exit(2); }
process.stdout.write(JSON.stringify(datos));
"""


def _leer_js(js):
    if not shutil.which("node"):
        sys.exit("Hace falta Node.js para leer los texto.js (https://nodejs.org).")
    r = subprocess.run(["node", "-e", LEER_JS, str(js)], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit(f"No pude leer {js}:\n{r.stderr.strip()}")
    return json.loads(r.stdout)["d"]


def leer_texto(id_):
    js = LECTURAS / id_ / "texto.js"
    if not js.exists():
        sys.exit(f"No existe {js}")
    return _leer_js(js)


def leer_catalogo():
    """El catálogo de voces (lecturas/_comun/voces.js). Vacío si no existe."""
    js = LECTURAS / COMUN / "voces.js"
    return _leer_js(js) if js.exists() else {}


RATE_OK = re.compile(r"^[+-]\d+%$")
PITCH_OK = re.compile(r"^[+-]\d+Hz$")


def leer_descartadas():
    """Las voces que se marcaron como robóticas: herramientas/voces-descartadas.json
    ({"es-XX-NombreNeural": "motivo"}). Vacío si no existe o está mal escrito."""
    try:
        datos = json.loads((AQUI / "voces-descartadas.json").read_text(encoding="utf-8"))
        return datos if isinstance(datos, dict) else {}
    except (OSError, ValueError):
        return {}


def resolver_voces(voces, catalogo, donde):
    """Convierte lo escrito en `voces` en voces completas (voz, rate, pitch).

      'lobo'                              -> la del catálogo
      {catalogo: 'nino', etiqueta: '…'}   -> la del catálogo, con cambios
      {voz: 'es-…Neural', rate: '+0%'}    -> escrita a mano

    Lo que escribe la lectura manda sobre el catálogo (igual que en lecturas.js).
    """
    resueltas = {}
    descartadas = leer_descartadas()
    for nombre, v in voces.items():
        if isinstance(v, str):
            v = {"catalogo": v}
        if "catalogo" in v:
            ref = v["catalogo"]
            if ref not in catalogo:
                sys.exit(
                    f"«{donde}»: la voz '{nombre}' pide '{ref}', que no está en lecturas/_comun/voces.js.\n"
                    f"   Las que hay: {', '.join(sorted(catalogo))}"
                )
            v = {**catalogo[ref], **{k: x for k, x in v.items() if k != "catalogo"}}
        v = {"rate": "+0%", "pitch": "+0Hz", **v}
        if not v.get("voz"):
            sys.exit(f"«{donde}»: la voz '{nombre}' no dice cuál usar (le falta 'voz' o 'catalogo').")
        if not RATE_OK.match(str(v["rate"])):
            sys.exit(f"«{donde}», voz '{nombre}': rate '{v['rate']}' no es válido. Ejemplos: '-4%', '+0%', '+6%'.")
        if not PITCH_OK.match(str(v["pitch"])):
            sys.exit(f"«{donde}», voz '{nombre}': pitch '{v['pitch']}' no es válido. Ejemplos: '-3Hz', '+0Hz', '+5Hz'.")
        if v["voz"] in descartadas:
            print(f"   AVISO: «{donde}», voz '{nombre}' usa {v['voz']}, que está en voces-descartadas.json "
                  f"({descartadas[v['voz']]}). Conviene cambiarla.")
        resueltas[nombre] = v
    return resueltas


# ----------------------------------------------------------------- utilidades
def tokens_visibles(texto):
    """Las 'palabras' que se ven en pantalla (las que se resaltan al leer)."""
    return [t for t in re.findall(r"\S+", texto) if TIENE_LETRAS.search(t)]


def limpiar_para_voz(texto, continuar=False):
    """Prepara el texto para la voz.

    - Los versos en varias líneas se leen corridos, con una pausa al final de
      cada verso.
    - `continuar=True` es para el trozo que queda ABIERTO justo antes de la
      palabra que lee el estudiante: se le pone una coma final para que la voz
      termine con la entonación de "la frase sigue", no como si hubiera acabado.
      (Las palabras modelo y las frases completas NO la llevan.)
    """
    lineas = [l.strip() for l in texto.split("\n") if l.strip()]
    lineas = [
        l if (i == len(lineas) - 1 or PUNTO_FINAL.search(l)) else l + ","
        for i, l in enumerate(lineas)
    ]
    t = " ".join(lineas)
    t = re.sub(r"^[\s.,;:\-—]+", "", t).strip()      # puntuación suelta tras un hueco
    if continuar and TIENE_LETRAS.search(t) and not PUNTO_FINAL.search(t):
        t += ","
    return t


def ajustar_rate(rate, delta):
    n = int(rate.replace("%", "")) + delta
    return f"{n:+d}%"


def nombre_clip(v, texto):
    clave = f"{v['voz']}|{v['rate']}|{v['pitch']}|{texto}"
    return hashlib.sha1(clave.encode("utf-8")).hexdigest()[:12]


# Las MISMAS claves que usa motor/lecturas.js para unir texto y audio
def clave_texto(voz, continuar, pedazo):  return f"t|{voz}|{1 if continuar else 0}|{pedazo}"
def clave_modelo(voz, objetivo):          return f"m|{voz}|{objetivo}"
def clave_mensaje(categoria, frase):      return f"s|{categoria}|{frase}"


# ------------------------------------------------------------- síntesis de voz
async def sintetizar(texto, v, mp3, datos):
    for intento in range(1, 5):
        try:
            com = edge_tts.Communicate(
                texto, v["voz"], rate=v["rate"], pitch=v["pitch"], boundary="WordBoundary"
            )
            audio = bytearray()
            palabras = []
            async for ch in com.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    ini = ch["offset"] / 1e7
                    palabras.append([ini, ini + ch["duration"] / 1e7, ch["text"]])
            if not audio:
                raise RuntimeError("el servicio no devolvió audio")
            mp3.write_bytes(bytes(audio))
            datos.write_text(json.dumps({"palabras": palabras}, ensure_ascii=False), encoding="utf-8")
            return
        except Exception as e:  # reintenta ante cortes de red
            if intento == 4:
                raise
            print(f"   (reintento {intento}: {e})")
            await asyncio.sleep(1.5 * intento)


class Generador:
    def __init__(self, id_):
        self.id = id_
        self.audio = LECTURAS / id_ / "audio"
        self.audio.mkdir(exist_ok=True)
        self.generados = 0
        self.reutilizados = 0
        self.en_uso = set()
        self.clips = {}

    async def clip(self, texto_original, v, continuar=False):
        """Devuelve {audio, ini, fin, tiempos}, o None si no hay nada que leer
        (solo puntuación)."""
        texto = limpiar_para_voz(texto_original, continuar)
        if not TIENE_LETRAS.search(texto):
            return None

        nombre = nombre_clip(v, texto)
        mp3 = self.audio / f"{nombre}.mp3"
        datos = self.audio / f"{nombre}.json"
        self.en_uso.update({mp3.name, datos.name})

        if mp3.exists() and datos.exists():
            self.reutilizados += 1
        else:
            print(f"  generando {nombre}  [{v['voz'].split('-')[2][:-6]}]  {texto[:62]}")
            await sintetizar(texto, v, mp3, datos)
            self.generados += 1

        eventos = json.loads(datos.read_text(encoding="utf-8"))["palabras"]
        ini = max(0.0, eventos[0][0] - 0.06)
        fin = eventos[-1][1] + 0.14

        # Tiempo de cada palabra VISIBLE. Si la voz y la pantalla cuentan igual
        # las palabras, se usan los tiempos exactos; si no, se reparte por longitud.
        visibles = tokens_visibles(texto_original)
        if len(visibles) == len(eventos):
            tiempos = [[round(e[0], 3), round(e[1], 3)] for e in eventos]
        else:
            pesos = [max(len(t), 2) for t in visibles]
            total = sum(pesos)
            tiempos, t0 = [], ini
            for p in pesos:
                t1 = t0 + (fin - ini) * p / total
                tiempos.append([round(t0, 3), round(t1, 3)])
                t0 = t1

        return {"audio": f"audio/{nombre}.mp3", "ini": round(ini, 3), "fin": round(fin, 3), "tiempos": tiempos}

    async def agregar(self, clave, texto, v, continuar=False):
        c = await self.clip(texto, v, continuar)
        if c:
            self.clips[clave] = c


async def generar(id_, voces_comunes, catalogo):
    T = leer_texto(id_)
    voces = resolver_voces({**voces_comunes, **T.get("voces", {})}, catalogo, id_)
    if "narradora" not in voces:
        sys.exit(f"«{id_}»: falta la voz 'narradora' (ni en su texto.js ni en _comun).")
    g = Generador(id_)
    print(f"\n== {id_} ==")

    # mensajes propios de esta lectura
    for categoria, frases in (T.get("mensajes") or {}).items():
        for frase in frases:
            await g.agregar(clave_mensaje(categoria, frase), frase, voces["narradora"])

    huecos = T.get("huecos", {})
    for pag in T.get("paginas", []):
        for parte in pag["partes"]:
            nombre_voz = parte["voz"]
            if nombre_voz not in voces:
                sys.exit(f"«{id_}»: la voz '{nombre_voz}' no está definida en 'voces'.")
            v = voces[nombre_voz]
            pedazos = [x for x in re.split(r"(\{\{.+?\}\})", parte["texto"]) if x]
            for k, pedazo in enumerate(pedazos):
                if pedazo.startswith("{{"):
                    objetivo = pedazo[2:-2]
                    if objetivo not in huecos:
                        print(f"   AVISO: «{objetivo}» no tiene ficha en 'huecos' (se leerá igual, sin pistas)")
                    lento = {**v, "rate": ajustar_rate(v["rate"], -10)}      # el modelo, un poco más despacio
                    await g.agregar(clave_modelo(nombre_voz, objetivo), objetivo, lento)
                else:
                    queda_abierto = k + 1 < len(pedazos) and pedazos[k + 1].startswith("{{")
                    await g.agregar(clave_texto(nombre_voz, queda_abierto, pedazo), pedazo, v, queda_abierto)

    # audio que ya no usa ninguna frase
    huerfanos = [p for p in g.audio.iterdir() if p.suffix in (".mp3", ".json") and p.name not in g.en_uso]
    for p in huerfanos:
        p.unlink()

    salida = LECTURAS / id_ / "audio.js"
    salida.write_text(
        "/* Generado por herramientas/generar.py a partir de texto.js. No editar a mano. */\n"
        f"Lecturas.audio({json.dumps(id_)}, {{ clips: " + json.dumps(g.clips, ensure_ascii=False, indent=0) + " });\n",
        encoding="utf-8",
    )

    kb = sum(p.stat().st_size for p in g.audio.glob("*.mp3")) / 1024
    print(f"   {g.generados} nuevos, {g.reutilizados} reutilizados, {len(huerfanos)} sobrantes borrados · {kb:.0f} KB  ->  {salida.relative_to(RAIZ)}")


async def principal(ids):
    existentes = sorted(p.name for p in LECTURAS.iterdir() if (p / "texto.js").exists())
    if ids:
        for i in ids:
            if i not in existentes:
                sys.exit(f"No hay una lectura «{i}». Las que hay: {', '.join(existentes)}")
    else:
        ids = existentes
    # _comun primero: de ahí vienen la voz de la narradora y los mensajes
    ids = sorted(ids, key=lambda x: (x != COMUN, x))
    voces_comunes = leer_texto(COMUN).get("voces", {}) if COMUN in existentes else {}
    catalogo = leer_catalogo()
    for id_ in ids:
        await generar(id_, {} if id_ == COMUN else voces_comunes, catalogo)
    print("\nListo.")


if __name__ == "__main__":
    asyncio.run(principal(sys.argv[1:]))
