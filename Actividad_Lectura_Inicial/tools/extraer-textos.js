#!/usr/bin/env node
'use strict';
/* =====================================================================
   Extrae TODOS los textos que la app dice con voz y los guarda en
   tools/textos.json (separados por "preset": std = 1º-3º EGB, enf = Inicial).

   Carga el código real de la app (datos.js, frases.js, estado.js, juegos.js)
   dentro de un contexto aislado con una "voz" falsa que solo anota lo que
   se le pide decir. Así, cualquier contenido nuevo queda incluido solo.

   Uso:   node tools/extraer-textos.js
   Luego: python tools/generar-audio.py
   ===================================================================== */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const norm = t => String(t).replace(/[«»]/g, '').replace(/\s+/g, ' ').trim();

const rec = { std: new Set(), enf: new Set(), nar: new Set() };
const GRADOS_NARRADOR = ['egb2', 'egb3'];   // sus lecturas las narra otra voz
let preset = 'std';
const add = t => { if (typeof t === 'string' && norm(t)) rec[preset].add(norm(t)); };
const addAmbos = t => { const p = preset; ['std', 'enf'].forEach(x => { preset = x; add(t); }); preset = p; };

/* Voz falsa: solo registra lo que se le pide decir. */
const VozFalsa = {
  decir: async t => { add(t); return true; },
  secuencia: async lista => { for (const x of lista) add(typeof x === 'string' ? x : x.t); return true; },
  cancelar() {}, fijarPreset() {}
};

const ctx = vm.createContext({
  console, setTimeout, clearTimeout, performance,
  window: { scrollTo() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  Voz: VozFalsa,
  Sfx: { naturaleza: async () => {}, detener() {}, acierto() {}, error() {}, tocar() {} },
  UI: { confeti() {}, estrellaDesde() {}, entrar() {} },
  Libi: { animo() {}, decir() {}, hablar: async () => {} }
});

for (const f of ['datos.js', 'frases.js', 'estado.js', 'juegos.js']) {
  const archivo = path.join(raiz, 'js', f);
  vm.runInContext(fs.readFileSync(archivo, 'utf8'), ctx, { filename: archivo });
}
const G = nombre => vm.runInContext(nombre, ctx);
const [CURRICULO, GEN, PAL, FRASES, U, ANIMALES, Estado] =
  ['CURRICULO', 'GEN', 'PAL', 'FRASES', 'U', 'ANIMALES', 'Estado'].map(G);

async function main() {
  /* ---------- Contenido de cada actividad ---------- */
  for (const g of CURRICULO) {
    preset = g.id === 'inicial' ? 'enf' : 'std';
    for (const sn of g.subniveles) for (const a of sn.actividades) {
      const p = a.params || {};
      switch (a.tipo) {
        case 'eleccion': {
          const rondas = GEN[a.gen]({ ...p, n: 400 });
          for (const r of rondas) {
            if (r.reproducir) await r.reproducir();
            (r.confirma || []).forEach(add);
            if (g.id === 'inicial' && r.vozInstruccion !== false) add(r.instruccion);
          }
          break;
        }
        case 'fonoteca':
          for (const it of a.items) {
            if (it.kind === 'sonido') {
              if (it.animal) { const an = ANIMALES.find(x => x.id === it.animal); add(an.voz); add(U.cap(an.n)); }
            } else {
              if (it.sonido) add(it.sonido);
              if (it.nombre) add(it.nombre);
              it.silabas.forEach(s => add(s));
              Object.values(it.ejSil || {}).forEach(k => add(PAL[k].t));
              (it.ej || []).forEach(k => add(PAL[k].t));
            }
          }
          break;
        case 'armar':
          for (const k of p.palabras) { add(PAL[k].t); PAL[k].s.forEach(s => add(s)); }
          break;
        case 'palmas':
          add('Aplaude una vez por cada sílaba');
          for (const k of p.pool) { add(PAL[k].t); PAL[k].s.forEach(s => add(s)); }
          break;
        case 'lectura':
          for (const t of a.textos) {
            const tokens = t.texto.split(/\s+/);
            const previo = preset;
            if (GRADOS_NARRADOR.includes(g.id)) preset = 'nar';        // narración y palabras tocadas
            FRASES.trocear(tokens).forEach(f => add(f.texto));
            tokens.forEach(tk => add(FRASES.palabra(tk)));
            preset = previo;
            for (const q of t.preguntas) { add(q.q); add(U.separarEmoji(q.op[q.r]).t); }   // las pregunta Libi
          }
          break;
        case 'ordena':
          for (const o of p.oraciones) { add(o.t); o.t.split(/\s+/).forEach(w => add(FRASES.palabra(w))); }
          break;
        default: throw new Error('Tipo de actividad sin extractor: ' + a.tipo);
      }
    }
  }

  /* ---------- Frases comunes (ambos presets) ---------- */
  [...FRASES.ELOGIOS, ...FRASES.ANIMOS, ...FRASES.CONSEJOS, FRASES.HOLA,
   ...Object.values(FRASES.GUIAS), ...FRASES.FIN.titulos, ...FRASES.FIN.estrellas, FRASES.FIN.medalla,
   FRASES.PALMAS_ERROR, FRASES.ORDENA_ERROR, FRASES.MEDALLA_NO, FRASES.AJUSTES.prueba, FRASES.AJUSTES.velocidad
  ].forEach(addAmbos);
  for (let n = 2; n <= FRASES.FIN.NUEVAS_MAX; n++) addAmbos(FRASES.FIN.medallas(n));
  for (const m of Estado.todasLasMedallas()) {
    addAmbos(m.nombre); addAmbos(m.desc); addAmbos(FRASES.MEDALLA_SI(m.nombre));
  }

  const salida = { std: [...rec.std].sort(), enf: [...rec.enf].sort(), nar: [...rec.nar].sort() };
  const destino = path.join(__dirname, 'textos.json');
  fs.writeFileSync(destino, JSON.stringify(salida, null, 1), 'utf8');
  console.log(`textos.json → std: ${salida.std.length} · enf: ${salida.enf.length} · nar: ${salida.nar.length} (total ${salida.std.length + salida.enf.length + salida.nar.length})`);
}

main().catch(e => { console.error(e); process.exit(1); });
