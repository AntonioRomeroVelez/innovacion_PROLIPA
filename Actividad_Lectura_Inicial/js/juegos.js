'use strict';
/* =====================================================================
   JUEGOS
   Generadores de rondas (GEN) + motores de juego (MOTORES).
   Cada motor recibe: raiz (zona de juego), act (actividad), ctx, vivo().
   ===================================================================== */

/* ------------------------------------------------------------------ */
/*  Utilidades                                                        */
/* ------------------------------------------------------------------ */
const U = {
  mezclar(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  },
  /* n elementos al azar (si n supera el tamaño, vuelve a barajar). */
  tomar(a, n) {
    let out = [];
    while (out.length < n) out = out.concat(U.mezclar(a));
    return out.slice(0, n);
  },
  azar: a => a[Math.floor(Math.random() * a.length)],
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  sinTilde: s => s.replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ'),
  esperar: ms => new Promise(r => setTimeout(r, ms)),
  cap: s => s.charAt(0).toUpperCase() + s.slice(1),

  elogio: () => U.azar(FRASES.ELOGIOS),

  RE_EMO: /^(\p{Extended_Pictographic}(?:️|‍|\p{Extended_Pictographic})*)\s*(.*)$/u,
  separarEmoji(s) {
    const m = U.RE_EMO.exec(s);
    return m ? { e: m[1], t: m[2] } : { e: '', t: s };
  },

  /* Reproduce un archivo de audio opcional. true si sonó. */
  archivo(ruta) {
    return new Promise(res => {
      if (!USAR_ARCHIVOS_DE_AUDIO) return res(false);
      const a = new Audio(ruta);
      a.onerror = () => res(false);
      a.onended = () => res(true);
      a.play().catch(() => res(false));
    });
  }
};

const ICONO_ALTAVOZ = '<svg class="ico-altavoz" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5v5h4l5.5 4.5V5L7 9.5H3z" fill="currentColor"/><path d="M15.8 8.6a5 5 0 0 1 0 6.8M18.4 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
U.arriba = () => window.scrollTo({ top: 0, behavior: 'auto' });

const opEmojiEtq = (e, t) => `<span class="emo">${e}</span><span class="etq">${U.esc(t)}</span>`;
const opGraf = t => `<span class="graf">${U.esc(t)}</span>`;

async function sonarNatural(id) {
  if (await U.archivo(`audio/naturaleza/${id}.mp3`)) return;
  await Sfx.naturaleza(id);
}
async function sonarAnimal(a) {
  if (await U.archivo(`audio/animales/${a.id}.mp3`)) return;
  await Voz.decir(a.voz, { rate: 0.95, pitch: a.p || 1.1 });
}
ANIMALES.forEach(a => {
  a.p = ({ perro: 0.9, gato: 1.35, vaca: 0.7, pollito: 1.5, gallo: 1.2, pato: 1.1, oveja: 1.05, cerdo: 0.75, rana: 0.85, abeja: 1.3 })[a.id];
});

/* ------------------------------------------------------------------ */
/*  Generadores de rondas                                             */
/*  ronda = { instruccion, visual, reproducir, opciones[{html,ok}],   */
/*            tipoOpc, confirma[], revelar(raiz), alMontar(raiz) }    */
/* ------------------------------------------------------------------ */
const GEN = {
  /* Escucha una vocal / sílaba y toca la grafía correcta. */
  sonidoGrafia({ pool, n = 6, nopt = 3, mayus = false, afin = null, repetir = false, instruccion = 'Escucha y toca' }) {
    return U.tomar(pool, n).map(x => {
      let cand = pool.filter(y => y !== x);
      let dist;
      if (afin === 'vocal') {
        const mismos = U.mezclar(cand.filter(y => y.slice(-1) === x.slice(-1))).slice(0, nopt - 1);
        const resto = U.mezclar(cand.filter(y => !mismos.includes(y))).slice(0, nopt - 1 - mismos.length);
        dist = mismos.concat(resto);
      } else dist = U.mezclar(cand).slice(0, nopt - 1);
      const mostrar = y => (mayus ? y.toUpperCase() + y : y);
      return {
        instruccion,
        reproducir: () => repetir ? Voz.secuencia([x, x], { pausaMs: 600 }) : Voz.decir(x, { rate: 0.85 }),
        tipoOpc: 'grafia',
        opciones: U.mezclar([x, ...dist]).map(y => ({ html: opGraf(mostrar(y)), ok: y === x })),
        confirma: [x]
      };
    });
  },

  /* Imagen → ¿con qué vocal empieza? */
  imagenInicial({ n = 6, nopt = 3 }) {
    const pool = VOCALES.flatMap(palabrasQueEmpiezanCon);
    return U.tomar(pool, n).map(k => {
      const w = PAL[k], v = U.sinTilde(w.t[0]);
      const dist = U.mezclar(VOCALES.filter(x => x !== v)).slice(0, nopt - 1);
      return {
        instruccion: '¿Con qué vocal empieza?',
        visual: `<div class="emoji-grande">${w.e}</div><div class="palabra-texto">${w.t}</div>`,
        reproducir: () => Voz.decir(w.t, { rate: 0.9 }),
        tipoOpc: 'grafia',
        opciones: U.mezclar([v, ...dist]).map(x => ({ html: opGraf(x.toUpperCase() + x), ok: x === v })),
        confirma: [w.t, v, `empieza con la ${v}`]
      };
    });
  },

  /* Imagen → ¿con qué sílaba empieza? */
  imagenSilaba({ pool, n = 6, nopt = 3 }) {
    const primeras = [...new Set(pool.map(k => PAL[k].s[0]))];
    return U.tomar(pool, n).map(k => {
      const w = PAL[k], s = w.s[0];
      const dist = U.mezclar(primeras.filter(x => U.sinTilde(x) !== U.sinTilde(s))).slice(0, nopt - 1);
      return {
        instruccion: '¿Con qué sílaba empieza?',
        visual: `<div class="emoji-grande">${w.e}</div><div class="palabra-texto">${w.t}</div>${w.h ? `<div class="pista">${w.h}</div>` : ''}`,
        reproducir: () => Voz.decir(w.t, { rate: 0.9 }),
        tipoOpc: 'grafia',
        opciones: U.mezclar([s, ...dist]).map(x => ({ html: opGraf(x), ok: x === s })),
        confirma: [s, w.t]
      };
    });
  },

  /* Escucha la palabra y toca la imagen. */
  palabraImagen({ pool, n = 6, nopt = 3 }) {
    return U.tomar(pool, n).map(k => {
      const w = PAL[k];
      const dist = U.mezclar(pool.filter(x => PAL[x].e !== w.e && x !== k)).slice(0, nopt - 1);
      return {
        instruccion: 'Escucha la palabra y toca la imagen',
        reproducir: () => Voz.decir(w.t, { rate: 0.9 }),
        tipoOpc: 'imagen',
        opciones: U.mezclar([k, ...dist]).map(x => ({ html: `<span class="emo">${PAL[x].e}</span>`, ok: x === k })),
        confirma: [w.t]
      };
    });
  },

  /* ¿Cuál rima? */
  rima({ n = 5 }) {
    return U.tomar(RIMAS, n).map(r => {
      const a = PAL[r.a], b = PAL[r.b];
      const dist = U.mezclar(r.otras).slice(0, 2);
      return {
        instruccion: `¿Cuál rima con «${a.t}»?`,
        visual: `<div class="emoji-grande">${a.e}</div><div class="palabra-texto">${a.t}</div>`,
        vozInstruccion: false,
        reproducir: () => Voz.decir(`¿Cuál rima con ${a.t}?`, { rate: 0.9 }),
        tipoOpc: 'imagen-palabra',
        opciones: U.mezclar([r.b, ...dist]).map(k => ({ html: opEmojiEtq(PAL[k].e, PAL[k].t), ok: k === r.b })),
        confirma: [`${a.t} rima con ${b.t}`]
      };
    });
  },

  /* Sonidos de la naturaleza. */
  naturaleza({ n = 6, nopt = 3 }) {
    return U.tomar(NATURALEZA, n).map(x => {
      const dist = U.mezclar(NATURALEZA.filter(y => y.id !== x.id)).slice(0, nopt - 1);
      return {
        instruccion: 'Escucha y busca qué suena',
        reproducir: () => sonarNatural(x.id),
        tipoOpc: 'imagen-palabra',
        opciones: U.mezclar([x, ...dist]).map(y => ({ html: opEmojiEtq(y.e, y.n), ok: y.id === x.id })),
        confirma: [`¡Es ${x.n}!`]
      };
    });
  },

  /* Sonidos de animales. */
  animales({ n = 6, nopt = 3 }) {
    return U.tomar(ANIMALES, n).map(x => {
      const dist = U.mezclar(ANIMALES.filter(y => y.id !== x.id)).slice(0, nopt - 1);
      return {
        instruccion: '¿Qué animal hace este sonido?',
        reproducir: () => sonarAnimal(x),
        tipoOpc: 'imagen-palabra',
        opciones: U.mezclar([x, ...dist]).map(y => ({ html: opEmojiEtq(y.e, y.n), ok: y.id === x.id })),
        confirma: [`${U.cap(x.n)} hace ${x.voz}`]
      };
    });
  },

  /* Completa la sílaba que falta. */
  completaSilaba({ items, n = 6 }) {
    return U.tomar(items, n).map(([k, hueco, ops]) => {
      const w = PAL[k], correcta = w.s[hueco];
      const partes = w.s.map((s, i) => i === hueco ? '<span class="hueco">?</span>' : `<span class="parte">${s}</span>`).join('');
      return {
        instruccion: '¿Qué sílaba falta?',
        visual: `<div class="emoji-grande">${w.e}</div><div class="palabra-hueco">${partes}</div>`,
        reproducir: () => Voz.decir(w.t, { rate: 0.85 }),
        tipoOpc: 'grafia',
        opciones: U.mezclar(ops).map(o => ({ html: opGraf(o), ok: o === correcta })),
        confirma: [w.t],
        revelar: raiz => { const h = raiz.querySelector('.hueco'); if (h) { h.textContent = correcta; h.classList.add('lleno'); } }
      };
    });
  },

  /* Completa la oración con la palabra correcta. */
  completaOracion({ n = 5 }) {
    return U.tomar(CLOZE, n).map(c => {
      const [antes, despues] = c.o.split('___');
      const ops = [c.c, ...U.mezclar(c.x).slice(0, 2)];
      return {
        instruccion: 'Lee y completa la oración',
        visual: `<div class="oracion-grande">${U.esc(antes)}<span class="hueco ancho">?</span>${U.esc(despues)}</div>`,
        reproducir: () => Voz.secuencia([antes, despues].map(x => x.trim()).filter(x => /\p{L}/u.test(x)), { pausaMs: 520, rate: 0.95 }),
        tipoOpc: 'imagen-palabra',
        opciones: U.mezclar(ops).map(k => ({ html: opEmojiEtq(PAL[k].e, PAL[k].t), ok: k === c.c })),
        confirma: [c.o.replace('___', c.c)],
        revelar: raiz => { const h = raiz.querySelector('.hueco'); if (h) { h.textContent = c.c; h.classList.add('lleno'); } }
      };
    });
  },

  /* Sinónimos / antónimos con ilustraciones. */
  sinonimo: p => parejasPalabras(SINONIMOS, 'sinonimo', p),
  antonimo: p => parejasPalabras(ANTONIMOS, 'antonimo', p)
};

function parejasPalabras(lista, modo, { n = 6 }) {
  const todas = lista.flat();
  return U.tomar(lista, n).map(par => {
    const dir = Math.random() < 0.5 ? 0 : 1;
    const [pal, e] = par[dir], [resp, eResp] = par[1 - dir];
    const pregunta = modo === 'sinonimo'
      ? `¿Cuál significa casi lo mismo que «${pal}»?`
      : `¿Cuál es lo contrario de «${pal}»?`;
    const dist = U.mezclar(todas.filter(([t]) => t !== pal && t !== resp)).slice(0, 2);
    return {
      instruccion: pregunta,
      vozInstruccion: false,
      visual: `<div class="emoji-grande">${e}</div><div class="palabra-texto">${pal}</div>`,
      reproducir: () => Voz.decir(pregunta.replace(/[«»]/g, ''), { rate: 0.92 }),
      tipoOpc: 'imagen-palabra',
      opciones: U.mezclar([[resp, eResp], ...dist]).map(([t, em]) => ({ html: opEmojiEtq(em, t), ok: t === resp })),
      confirma: [modo === 'sinonimo' ? `${pal} y ${resp} significan casi lo mismo` : `${pal} es lo contrario de ${resp}`]
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Sesión de juego: puntaje, racha y estrellas                       */
/* ------------------------------------------------------------------ */
class Sesion {
  constructor(total, ctx) { Object.assign(this, { total, ctx, ok: 0, fallos: 0, racha: 0, mejor: 0 }); }
  acierto(primero, desde) {
    if (primero) {
      this.ok++; this.racha++; this.mejor = Math.max(this.mejor, this.racha);
      Estado.sumarEstrellas(1);
      UI.estrellaDesde(desde);
    } else this.racha = 0;
    Sfx.acierto();
    UI.confeti('pequeno');
  }
  error() { this.fallos++; this.racha = 0; Sfx.error(); }
  terminar() { this.ctx.terminar({ ok: this.ok, total: this.total, fallos: this.fallos, mejor: this.mejor }); }
}

/* ------------------------------------------------------------------ */
/*  Ronda de elección (usada por muchos juegos)                       */
/* ------------------------------------------------------------------ */
function jugarEleccion(raiz, r, ses, vivo, opts = {}) {
  return new Promise(resolve => {
    let intentos = 0, resuelto = false;
    const n = r.opciones.length;
    raiz.innerHTML = `
      <div class="ronda ronda-eleccion">
        <p class="instruccion">${r.instruccion}</p>
        <div class="visual ${r.visual ? '' : 'solo-sonido'}">
          ${r.visual || ''}
          ${r.reproducir ? `<button class="btn-altavoz" type="button" aria-label="Escuchar">${ICONO_ALTAVOZ}</button>` : ''}
        </div>
        <div class="opciones tipo-${r.tipoOpc || 'texto'} n${n}">
          ${r.opciones.map((o, i) => `<button class="opcion" type="button" data-i="${i}">${o.html}</button>`).join('')}
        </div>
      </div>`;
    const cont = raiz.firstElementChild;
    U.arriba();
    UI.entrar(cont);
    r.alMontar && r.alMontar(raiz);

    const btns = [...raiz.querySelectorAll('.opcion')];
    const altavoz = raiz.querySelector('.btn-altavoz');
    const reproducir = async () => {
      if (!r.reproducir || !vivo()) return;
      if (altavoz) altavoz.classList.add('suena');
      try { await r.reproducir(); } finally { if (altavoz) altavoz.classList.remove('suena'); }
    };
    if (altavoz) altavoz.addEventListener('click', () => { Sfx.tocar(); reproducir(); });
    const arrancar = async () => {
      if (!vivo()) return;
      if (opts.instruccion && r.vozInstruccion !== false) {
        await Voz.decir(r.instruccion);
        if (!vivo()) return;
        await U.esperar(250);
      }
      reproducir();
    };
    setTimeout(arrancar, 380);

    btns.forEach((b, i) => b.addEventListener('click', async () => {
      if (resuelto || b.disabled) return;
      const op = r.opciones[i];
      if (op.ok) {
        resuelto = true;
        Voz.cancelar(); Sfx.detener();
        b.classList.add('correcta');
        btns.forEach(x => { x.disabled = true; if (x !== b) x.classList.add('apagada'); });
        ses.acierto(intentos === 0, b);
        r.revelar && r.revelar(raiz);
        Libi.animo('celebra', 1800);
        await U.esperar(500);
        if (!vivo()) return;
        const dicho = Voz.secuencia([...(r.confirma || []), U.elogio()], { pausaMs: 230 });
        await Promise.all([dicho, U.esperar(1400)]);
        if (!vivo()) return;
        await U.esperar(250);
        resolve();
      } else {
        intentos++;
        b.classList.add('incorrecta');
        b.disabled = true;
        ses.error();
        Libi.animo('ups', 1400);
        Voz.decir(U.azar(FRASES.ANIMOS));
        if (intentos >= 2) {
          const bien = btns[r.opciones.findIndex(o => o.ok)];
          if (bien) bien.classList.add('pista-brilla');
        }
      }
    }));
  });
}

/* ------------------------------------------------------------------ */
/*  MOTORES                                                           */
/* ------------------------------------------------------------------ */
const MOTORES = {};

/* ---------- Elección ---------- */
MOTORES.eleccion = async (raiz, act, ctx, vivo) => {
  const rondas = GEN[act.gen](act.params);
  const ses = new Sesion(rondas.length, ctx);
  for (let i = 0; i < rondas.length; i++) {
    if (!vivo()) return;
    ctx.progreso(i, rondas.length);
    await jugarEleccion(raiz, rondas[i], ses, vivo, { instruccion: i === 0 && ctx.grado.id === 'inicial' });
  }
  if (!vivo()) return;
  ctx.progreso(rondas.length, rondas.length);
  ses.terminar();
};

/* ---------- Fonoteca ---------- */
MOTORES.fonoteca = (raiz, act, ctx, vivo) => {
  const items = act.items;
  const vistos = new Set();
  let tokenF = 0;

  raiz.innerHTML = `
    <div class="fonoteca">
      <div class="fono-grid n${items.length}">
        ${items.map((it, i) => `<button class="tile" type="button" data-i="${i}" aria-label="${U.esc(it.nombre || it.g)}">
            <span class="tile-g ${it.kind === 'sonido' ? 'emoji' : ''}">${it.g}</span><span class="tile-ok">✔</span></button>`).join('')}
      </div>
      <div class="fono-panel" aria-live="polite"><p class="vacio">👆 Toca una tarjeta para escucharla</p></div>
      <div class="fono-pie">
        <span class="fono-cuenta"></span>
        <button class="btn-grande" type="button" disabled>¡Listo! ⭐</button>
      </div>
    </div>`;
  UI.entrar(raiz.firstElementChild);
  const panel = raiz.querySelector('.fono-panel');
  const cuenta = raiz.querySelector('.fono-cuenta');
  const listo = raiz.querySelector('.fono-pie .btn-grande');
  const tiles = [...raiz.querySelectorAll('.tile')];

  const actualizar = () => {
    cuenta.textContent = `Escuchaste ${vistos.size} de ${items.length}`;
    ctx.progreso(vistos.size, items.length);
    if (vistos.size === items.length && listo.disabled) {
      listo.disabled = false;
      listo.classList.add('pulsa');
      Libi.animo('celebra', 1800);
      Libi.decir('¡Escuchaste todo! Toca «Listo».');
    }
  };
  actualizar();

  const ejemplosDe = it => [...new Set(it.ej || Object.values(it.ejSil || {}))];

  async function secuenciaLetra(it) {
    const mi = ++tokenF;
    Voz.cancelar();
    const pasos = [];
    if (it.sonido) {
      pasos.push({ t: it.sonido, el: null });
      if (!it.silabas.length) pasos.push({ t: it.sonido, el: null });   // vocales: se repite con énfasis
    }
    it.silabas.forEach(s => pasos.push({ t: s, el: panel.querySelector(`.chip-sil[data-s="${s}"]`) }));
    if (!it.silabas.length && it.ej) pasos.push({ t: PAL[it.ej[0]].t, el: panel.querySelector('.ej') });
    for (const p of pasos) {
      if (mi !== tokenF || !vivo()) return;
      p.el && p.el.classList.add('activo');
      await Voz.decir(p.t, { interrumpir: false, rate: 0.9 });
      p.el && p.el.classList.remove('activo');
      await U.esperar(200);
    }
  }

  async function reproducirSonido(it) {
    const mi = ++tokenF;
    Voz.cancelar(); Sfx.detener();
    const gran = panel.querySelector('.emoji-gigante');
    gran && gran.classList.add('suena');
    if (it.natural) await sonarNatural(it.natural);
    else { const a = ANIMALES.find(x => x.id === it.animal); await sonarAnimal(a); if (mi === tokenF && vivo()) await Voz.decir(U.cap(a.n), { rate: 0.9 }); }
    gran && gran.classList.remove('suena');
  }

  function mostrar(i) {
    const it = items[i];
    tiles.forEach((t, k) => t.classList.toggle('sel', k === i));
    if (it.kind === 'sonido') {
      panel.innerHTML = `
        <div class="panel-sonido">
          <div class="emoji-gigante">${it.g}</div>
          <div class="nombre-sonido">${U.cap(it.nombre)}</div>
          <button class="btn-grande" type="button" data-oir>${ICONO_ALTAVOZ} Escuchar</button>
        </div>`;
      panel.querySelector('[data-oir]').addEventListener('click', () => reproducirSonido(it));
      reproducirSonido(it);
    } else {
      const sils = it.silabas.map(s => `<button class="chip-sil" type="button" data-s="${s}">${s}</button>`).join('');
      const ejs = ejemplosDe(it).map(k => `<button class="ej" type="button" data-p="${k}">
          <span class="emo">${PAL[k].e}</span><span class="etq">${PAL[k].s.join('·')}</span></button>`).join('');
      panel.innerHTML = `
        <div class="panel-letra">
          <div class="izq">
            <div class="gran-letra">${it.g}</div>
            ${it.nombre ? `<button class="nombre-letra" type="button" data-nombre>se llama <b>${it.nombre}</b> 🔈</button>` : ''}
            ${it.nota ? `<div class="nota">${it.nota}</div>` : ''}
            <button class="btn-altavoz mediano" type="button" data-todo aria-label="Escuchar todo">${ICONO_ALTAVOZ}</button>
          </div>
          <div class="der">
            ${sils ? `<div class="silabas">${sils}</div>` : ''}
            ${ejs ? `<div class="ejemplos">${ejs}</div>` : ''}
          </div>
        </div>`;
      panel.querySelector('[data-todo]').addEventListener('click', () => { Sfx.tocar(); secuenciaLetra(it); });
      const nom = panel.querySelector('[data-nombre]');
      nom && nom.addEventListener('click', () => { tokenF++; Voz.decir(it.nombre, { rate: 0.9 }); });
      panel.querySelectorAll('.chip-sil').forEach(b => b.addEventListener('click', async () => {
        const mi = ++tokenF; Sfx.tocar();
        const s = b.dataset.s, ej = it.ejSil && it.ejSil[s];
        b.classList.add('activo');
        await Voz.secuencia(ej ? [{ t: s, pausa: 300 }, PAL[ej].t] : [s], { rate: 0.9 });
        b.classList.remove('activo');
      }));
      panel.querySelectorAll('.ej').forEach(b => b.addEventListener('click', () => {
        tokenF++; Sfx.tocar(); Voz.decir(PAL[b.dataset.p].t, { rate: 0.9 });
      }));
      secuenciaLetra(it);
    }
    UI.entrar(panel.firstElementChild);
    vistos.add(i);
    tiles[i].classList.add('visto');
    actualizar();
  }

  tiles.forEach((t, i) => t.addEventListener('click', () => { Sfx.asegurar(); Sfx.tocar(); mostrar(i); }));
  listo.addEventListener('click', () => { Voz.cancelar(); Sfx.detener(); ctx.terminar({ est: 3, total: items.length, ok: items.length, fallos: 0, mejor: 0 }); });
};

/* ---------- Constructor de palabras ---------- */
function jugarConstructor(raiz, clave, extra, ses, vivo) {
  return new Promise(resolve => {
    const w = PAL[clave], sils = w.s;
    const prohibidas = new Set(sils.map(U.sinTilde));
    const nd = sils.length <= 2 ? 3 : 2;
    const dist = U.mezclar(extra.filter(x => !prohibidas.has(U.sinTilde(x)))).slice(0, nd);
    const fichas = U.mezclar([...sils, ...dist]);
    let errores = 0, terminado = false;
    const llenos = sils.map(() => false);

    raiz.innerHTML = `
      <div class="ronda ronda-constructor">
        <p class="instruccion">Forma la palabra con las sílabas</p>
        <div class="visual">
          <div class="emoji-grande">${w.e}</div>
          <button class="btn-altavoz" type="button" aria-label="Escuchar la palabra">${ICONO_ALTAVOZ}</button>
        </div>
        ${w.h ? `<div class="pista">Pista: ${w.h}</div>` : ''}
        <div class="ranuras">${sils.map((_, k) => `<div class="ranura" data-k="${k}"></div>`).join('')}</div>
        <div class="palabra-final" aria-live="polite"></div>
        <div class="bandeja">${fichas.map(s => `<button class="ficha" type="button" data-s="${s}">${s}</button>`).join('')}</div>
      </div>`;
    const cont = raiz.firstElementChild;
    U.arriba();
    UI.entrar(cont);
    const ranuras = [...raiz.querySelectorAll('.ranura')];
    const bandeja = raiz.querySelector('.bandeja');
    const final = raiz.querySelector('.palabra-final');
    const altavoz = raiz.querySelector('.btn-altavoz');
    altavoz.addEventListener('click', () => { Sfx.tocar(); Voz.decir(w.t, { rate: 0.85 }); });
    setTimeout(() => { if (vivo()) Voz.decir(w.t, { rate: 0.85 }); }, 380);

    function pistaSiguiente() {
      const k = llenos.findIndex(x => !x);
      if (k < 0) return;
      const f = [...bandeja.children].find(c => c.dataset.s === sils[k]);
      if (f) f.classList.add('pista-brilla');
    }

    async function completar() {
      if (terminado) return;
      terminado = true;
      Voz.cancelar();
      ses.acierto(errores === 0, raiz.querySelector('.ranuras'));
      cont.classList.add('completa');
      final.innerHTML = sils.map(s => `<span>${s}</span>`).join('<i>·</i>');
      if (window.gsap) gsap.fromTo(final, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
      Libi.animo('celebra', 2000);
      await U.esperar(350);
      if (!vivo()) return;
      const dicho = Voz.secuencia([...sils.map(s => ({ t: s, pausa: 190, rate: 0.85 })), { t: w.t, rate: 0.92, pausa: 220 }, U.elogio()]);
      await Promise.all([dicho, U.esperar(1900)]);
      if (!vivo()) return;
      resolve();
    }

    /* Intenta poner una ficha en la ranura k. Devuelve true si acierta. */
    function intentar(ficha, k) {
      if (terminado || llenos[k]) return false;
      if (ficha.dataset.s === sils[k]) {
        ranuras[k].appendChild(ficha);
        ficha.classList.add('puesta');
        ficha.disabled = true;
        llenos[k] = true;
        Sfx.tocar();
        Voz.decir(sils[k], { rate: 0.85 });
        ficha.parentElement.classList.add('llena');
        if (llenos.every(Boolean)) completar();
        return true;
      }
      errores++;
      ses.error();
      Libi.animo('ups', 1200);
      ficha.classList.add('mal');
      setTimeout(() => ficha.classList.remove('mal'), 600);
      if (errores >= 2) pistaSiguiente();
      return false;
    }

    bandeja.addEventListener('click', e => {
      const f = e.target.closest('.ficha');
      if (!f || f.disabled) return;
      intentar(f, llenos.findIndex(x => !x));
    });

    if (window.Sortable) {
      Sortable.create(bandeja, { group: { name: 'sil', pull: true, put: true }, sort: false, animation: 150, delay: 60, delayOnTouchOnly: true, touchStartThreshold: 4 });
      ranuras.forEach((rn, k) => Sortable.create(rn, {
        group: { name: 'sil', pull: false, put: () => rn.children.length === 0 && !llenos[k] },
        sort: false, animation: 120,
        onAdd(evt) {
          const f = evt.item;
          if (f.dataset.s === sils[k]) {
            f.classList.add('puesta'); f.disabled = true; llenos[k] = true; rn.classList.add('llena');
            Sfx.tocar(); Voz.decir(sils[k], { rate: 0.85 });
            if (llenos.every(Boolean)) completar();
          } else {
            bandeja.appendChild(f);
            errores++; ses.error(); Libi.animo('ups', 1200);
            f.classList.add('mal'); setTimeout(() => f.classList.remove('mal'), 600);
            if (errores >= 2) pistaSiguiente();
          }
        }
      }));
    }
  });
}

MOTORES.armar = async (raiz, act, ctx, vivo) => {
  const { palabras, extra, n } = act.params;
  const lista = U.tomar(palabras, n);
  const ses = new Sesion(lista.length, ctx);
  for (let i = 0; i < lista.length; i++) {
    if (!vivo()) return;
    ctx.progreso(i, lista.length);
    await jugarConstructor(raiz, lista[i], extra, ses, vivo);
  }
  if (!vivo()) return;
  ctx.progreso(lista.length, lista.length);
  ses.terminar();
};

/* ---------- Palmas de sílabas ---------- */
function jugarPalmas(raiz, w, ses, vivo, opts = {}) {
  return new Promise(resolve => {
    const n = w.s.length;
    let taps = 0, errores = 0, hecho = false;
    raiz.innerHTML = `
      <div class="ronda ronda-palmas">
        <p class="instruccion">Aplaude una vez por cada sílaba</p>
        <div class="visual">
          <div class="emoji-grande">${w.e}</div>
          <div class="palabra-texto">${w.t}</div>
          <button class="btn-altavoz" type="button" aria-label="Escuchar la palabra">${ICONO_ALTAVOZ}</button>
        </div>
        <div class="marcas" aria-live="polite"></div>
        <div class="palmas-fila">
          <button class="btn-palma" type="button" aria-label="Aplaudir">👏</button>
          <button class="btn-grande verde" type="button" data-listo disabled>¡Listo! ✔</button>
        </div>
        <div class="palabra-final"></div>
      </div>`;
    const cont = raiz.firstElementChild;
    U.arriba();
    UI.entrar(cont);
    const marcas = raiz.querySelector('.marcas');
    const btnPalma = raiz.querySelector('.btn-palma');
    const listo = raiz.querySelector('[data-listo]');
    const final = raiz.querySelector('.palabra-final');
    const lenta = () => Voz.secuencia(w.s.map(s => ({ t: s, pausa: 380 })), { rate: 0.8 });

    raiz.querySelector('.btn-altavoz').addEventListener('click', () => { Sfx.tocar(); Voz.decir(w.t, { rate: 0.78 }); });
    setTimeout(async () => {
      if (!vivo()) return;
      if (opts.instruccion) { await Voz.decir('Aplaude una vez por cada sílaba'); if (!vivo()) return; await U.esperar(250); }
      Voz.decir(w.t, { rate: 0.78 });
    }, 380);

    btnPalma.addEventListener('click', () => {
      if (hecho || taps >= 8) return;
      taps++;
      Sfx.palma();
      const m = document.createElement('span');
      m.className = 'marca'; m.textContent = '👏';
      marcas.appendChild(m);
      if (window.gsap) gsap.fromTo(m, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
      if (window.gsap) gsap.fromTo(btnPalma, { scale: 0.88 }, { scale: 1, duration: 0.25, ease: 'back.out(3)' });
      listo.disabled = false;
    });

    listo.addEventListener('click', async () => {
      if (hecho || !taps) return;
      if (taps === n) {
        hecho = true;
        listo.disabled = true; btnPalma.disabled = true;
        final.innerHTML = w.s.map(s => `<span>${s}</span>`).join('<i>·</i>');
        if (window.gsap) gsap.fromTo(final, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
        ses.acierto(errores === 0, btnPalma);
        Libi.animo('celebra', 2000);
        await U.esperar(300);
        if (!vivo()) return;
        const dicho = Voz.secuencia([...w.s.map(s => ({ t: s, pausa: 280 })), { t: w.t, pausa: 200 }, U.elogio()], { rate: 0.85 });
        await Promise.all([dicho, U.esperar(2000)]);
        if (!vivo()) return;
        resolve();
      } else {
        errores++;
        ses.error();
        Libi.animo('ups', 1400);
        marcas.innerHTML = ''; taps = 0; listo.disabled = true;
        await Voz.decir(FRASES.PALMAS_ERROR);
        if (vivo()) await lenta();
      }
    });
  });
}

MOTORES.palmas = async (raiz, act, ctx, vivo) => {
  const lista = U.tomar(act.params.pool, act.params.n);
  const ses = new Sesion(lista.length, ctx);
  for (let i = 0; i < lista.length; i++) {
    if (!vivo()) return;
    ctx.progreso(i, lista.length);
    await jugarPalmas(raiz, PAL[lista[i]], ses, vivo, { instruccion: i === 0 && ctx.grado.id === 'inicial' });
  }
  if (!vivo()) return;
  ctx.progreso(lista.length, lista.length);
  ses.terminar();
};

/* ---------- Lectura con resaltado + preguntas ---------- */
/* voz: 'nar' = narrador (lecturas de 2º y 3º EGB); undefined = voz de Libi. */
function leerTexto(raiz, texto, vivo, voz) {
  return new Promise(resolve => {
    const tokens = texto.texto.split(/\s+/);
    let narrando = false, lento = false;
    raiz.innerHTML = `
      <div class="ronda ronda-lectura">
        <div class="lectura-barra">
          <div class="lectura-cab"><span class="emo">${texto.e}</span><h2>${U.esc(texto.titulo)}</h2></div>
          <div class="acciones">
            <button class="btn-grande" type="button" data-play>▶ Escuchar</button>
            <button class="btn-chico" type="button" data-lento aria-pressed="false">🐢 Lento</button>
          </div>
        </div>
        <div class="texto-lectura ${tokens.length > 28 ? 'largo' : ''}" lang="es">${tokens.map((t, i) => `<span class="pal" data-i="${i}">${U.esc(t)}</span>`).join(' ')}</div>
        <p class="ayuda-lectura">💡 Toca una palabra para escucharla.</p>
        <div class="acciones">
          <button class="btn-grande verde" type="button" data-ya>¡Ya leí! ➜</button>
        </div>
      </div>`;
    U.arriba();
    UI.entrar(raiz.firstElementChild);
    const pals = [...raiz.querySelectorAll('.pal')];
    const play = raiz.querySelector('[data-play]');
    const lentoBtn = raiz.querySelector('[data-lento]');

    const marcar = i => {
      pals.forEach((p, k) => {
        p.classList.toggle('activa', k === i);
        p.classList.toggle('leida', i >= 0 && k < i);
      });
      if (i >= 0) pals[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    const parar = () => { narrando = false; Voz.cancelar(); marcar(-1); play.textContent = '▶ Escuchar'; };

    async function narrar() {
      if (narrando) { parar(); return; }
      narrando = true;
      play.textContent = '⏹ Parar';
      const ok = await Voz.narrar(tokens, { alPalabra: marcar, rate: lento ? 0.8 : 1, voz });
      if (!vivo()) return;
      if (ok) { narrando = false; play.textContent = '▶ Escuchar otra vez'; pals.forEach(p => p.classList.remove('activa')); pals.forEach(p => p.classList.add('leida')); }
    }

    play.addEventListener('click', () => { Sfx.asegurar(); narrar(); });
    lentoBtn.addEventListener('click', () => {
      lento = !lento; lentoBtn.setAttribute('aria-pressed', lento); lentoBtn.classList.toggle('on', lento);
      if (narrando) { parar(); narrar(); }
    });
    pals.forEach(p => p.addEventListener('click', () => {
      narrando = false; play.textContent = '▶ Escuchar';
      Voz.cancelar(); marcar(+p.dataset.i);
      Voz.decir(FRASES.palabra(p.textContent), { rate: 0.8, voz }).then(() => p.classList.remove('activa'));
    }));
    raiz.querySelector('[data-ya]').addEventListener('click', () => { parar(); resolve(); });

    setTimeout(() => { if (vivo() && !narrando) narrar(); }, 700);
  });
}

MOTORES.lectura = async (raiz, act, ctx, vivo) => {
  const textos = act.textos;
  const total = textos.reduce((s, t) => s + t.preguntas.length, 0);
  const ses = new Sesion(total, ctx);
  let hechas = 0;
  for (const t of textos) {
    if (!vivo()) return;
    ctx.progreso(hechas, total);
    await leerTexto(raiz, t, vivo, ['egb2', 'egb3'].includes(ctx.grado.id) ? 'nar' : undefined);
    if (!vivo()) return;
    for (const p of t.preguntas) {
      const ops = p.op.map((s, i) => {
        const { e, t: tx } = U.separarEmoji(s);
        return { html: e ? opEmojiEtq(e, tx) : `<span class="etq">${U.esc(tx)}</span>`, ok: i === p.r, txt: tx };
      });
      const r = {
        instruccion: p.q,
        visual: '<button class="btn-chico ver-texto" type="button">📖 Ver el texto</button>',
        reproducir: () => Voz.decir(p.q, { rate: 0.95 }),
        tipoOpc: 'imagen-palabra',
        opciones: ops,
        confirma: [ops.find(o => o.ok).txt],
        alMontar: rz => rz.querySelector('.ver-texto').addEventListener('click', () => {
          UI.modal({ clase: 'modal-texto', html: `<h2>${t.e} ${U.esc(t.titulo)}</h2><p class="texto-modal">${U.esc(t.texto)}</p><button class="btn-grande" data-cerrar>Cerrar</button>` });
        })
      };
      await jugarEleccion(raiz, r, ses, vivo);
      hechas++;
      ctx.progreso(hechas, total);
    }
  }
  if (!vivo()) return;
  ses.terminar();
};

/* ---------- Ordena la oración ---------- */
function jugarOrdena(raiz, o, ses, vivo) {
  return new Promise(resolve => {
    const correcta = o.t.split(/\s+/);
    let errores = 0, terminado = false;
    raiz.innerHTML = `
      <div class="ronda ronda-ordena">
        <p class="instruccion">Toca o arrastra las palabras para armar la oración</p>
        <div class="visual"><div class="emoji-grande">${o.e}</div></div>
        <div class="linea-resp" aria-label="Tu oración"></div>
        <div class="banco" aria-label="Palabras"></div>
        <p class="pista-corta">Pista: empieza con mayúscula y termina con punto.</p>
        <div class="acciones">
          <button class="btn-chico" type="button" data-oir hidden>🔊 Escuchar la oración</button>
          <button class="btn-grande" type="button" data-revisar disabled>Revisar ✔</button>
        </div>
      </div>`;
    const cont = raiz.firstElementChild;
    U.arriba();
    UI.entrar(cont);
    const resp = raiz.querySelector('.linea-resp');
    const banco = raiz.querySelector('.banco');
    const revisar = raiz.querySelector('[data-revisar]');
    const oir = raiz.querySelector('[data-oir]');

    U.mezclar(correcta.map((t, i) => ({ t, i }))).forEach(({ t }) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'palabra-ficha'; b.textContent = t;
      banco.appendChild(b);
    });
    // Evita que la mezcla quede ya resuelta
    if (correcta.length > 2 && [...banco.children].map(c => c.textContent).join(' ') === o.t) banco.appendChild(banco.firstElementChild);

    const actualizar = () => { revisar.disabled = banco.children.length > 0 || terminado; };

    const mover = el => {
      if (terminado) return;
      el.classList.remove('bien', 'mal');
      (el.parentElement === banco ? resp : banco).appendChild(el);
      Sfx.tocar();
      actualizar();
    };
    [banco, resp].forEach(l => l.addEventListener('click', e => {
      const f = e.target.closest('.palabra-ficha');
      if (!f) return;
      Voz.decir(FRASES.palabra(f.textContent), { rate: 0.85 });
      mover(f);
    }));

    if (window.Sortable) {
      const cfg = { group: 'ord', animation: 160, delay: 60, delayOnTouchOnly: true, touchStartThreshold: 4, onSort: actualizar, onAdd: actualizar };
      Sortable.create(banco, { ...cfg, sort: false });
      Sortable.create(resp, { ...cfg, sort: true });
    }

    oir.addEventListener('click', () => Voz.decir(o.t, { rate: 0.85 }));

    revisar.addEventListener('click', async () => {
      if (terminado) return;
      const actuales = [...resp.children];
      const bien = actuales.map((c, i) => c.textContent === correcta[i]);
      if (bien.every(Boolean)) {
        terminado = true;
        revisar.disabled = true;
        actuales.forEach(c => c.classList.add('bien'));
        ses.acierto(errores === 0, resp);
        Libi.animo('celebra', 2000);
        await U.esperar(300);
        if (!vivo()) return;
        const dicho = Voz.secuencia([o.t, U.elogio()], { rate: 0.9 });
        await Promise.all([dicho, U.esperar(2200)]);
        if (!vivo()) return;
        resolve();
      } else {
        errores++;
        ses.error();
        Libi.animo('ups', 1400);
        actuales.forEach((c, i) => { c.classList.toggle('bien', bien[i]); c.classList.toggle('mal', !bien[i]); });
        oir.hidden = false;
        Voz.decir(FRASES.ORDENA_ERROR);
      }
    });
  });
}

MOTORES.ordena = async (raiz, act, ctx, vivo) => {
  const lista = U.tomar(act.params.oraciones, act.params.n);
  const ses = new Sesion(lista.length, ctx);
  for (let i = 0; i < lista.length; i++) {
    if (!vivo()) return;
    ctx.progreso(i, lista.length);
    await jugarOrdena(raiz, lista[i], ses, vivo);
  }
  if (!vivo()) return;
  ctx.progreso(lista.length, lista.length);
  ses.terminar();
};

/* ------------------------------------------------------------------ */
/*  Punto de entrada                                                  */
/* ------------------------------------------------------------------ */
const Juegos = {
  iniciar(act, ctx) {
    const estado = { vivo: true };
    const vivo = () => estado.vivo;
    try {
      const r = MOTORES[act.tipo](ctx.raiz, act, ctx, vivo);
      if (r && r.catch) r.catch(err => console.error('[juego]', err));
    } catch (err) { console.error('[juego]', err); }
    return {
      parar() { estado.vivo = false; Voz.cancelar(); Sfx.detener(); }
    };
  }
};
