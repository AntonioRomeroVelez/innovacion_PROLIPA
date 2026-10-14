'use strict';
/* =====================================================================
   AUDIO
   · Sfx: efectos sintetizados con Web Audio API (chimes, aciertos,
          aplausos, sonidos de la naturaleza). No requiere archivos.
   · Voz: reproduce las GRABACIONES de voz neuronal de Ecuador (audio/voz,
          generadas con tools/generar-audio.py) y, solo si falta alguna,
          usa la síntesis del navegador eligiendo la voz más natural.
   ===================================================================== */

/* ------------------------------------------------------------------ */
/*  SFX                                                               */
/* ------------------------------------------------------------------ */
const Sfx = (() => {
  let ctx = null, master = null, bufRuido = null;
  let efectos = true;
  let grupoActual = null;

  function asegurar() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.85;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function ruido() {
    if (bufRuido) return bufRuido;
    const n = ctx.sampleRate * 2;
    bufRuido = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = bufRuido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return bufRuido;
  }

  /* Tono con envolvente suave. */
  function tono({ f = 440, f2 = null, ini = 0, dur = 0.3, tipo = 'sine', vol = 0.25, ataque = 0.012, dest }) {
    const t = ctx.currentTime + ini;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /* Campanita: fundamental + armónicos con decaimiento largo. */
  function campana(f, ini, vol = 0.22, dur = 0.9, dest) {
    tono({ f, ini, dur, vol, tipo: 'sine', dest });
    tono({ f: f * 2, ini, dur: dur * 0.6, vol: vol * 0.35, tipo: 'sine', dest });
    tono({ f: f * 3.01, ini, dur: dur * 0.3, vol: vol * 0.15, tipo: 'sine', dest });
  }

  /* Ráfaga de ruido filtrada. */
  function rafaga({ ini = 0, dur = 0.05, tipoFiltro = 'bandpass', f = 2000, q = 1, vol = 0.3, dest, offset }) {
    const t = ctx.currentTime + ini;
    const s = ctx.createBufferSource();
    s.buffer = ruido();
    const fl = ctx.createBiquadFilter();
    fl.type = tipoFiltro; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.004, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(dest || master);
    s.start(t, offset ?? Math.random() * 1.5, dur + 0.02);
  }

  /* Grupo de sonido detenible (para sonidos de la naturaleza). */
  function nuevoGrupo(dur) {
    detener();
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(master);
    grupoActual = g;
    return g;
  }
  function detener() {
    if (!grupoActual || !ctx) return;
    const g = grupoActual; grupoActual = null;
    try {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* nada */ } }, 400);
    } catch (e) { /* nada */ }
  }

  const esperar = ms => new Promise(r => setTimeout(r, ms));

  /* ----------------- Efectos de juego ----------------- */
  const api = {
    asegurar,
    detener,
    get efectos() { return efectos; },
    set efectos(v) { efectos = !!v; },

    tocar() {
      if (!efectos || !asegurar()) return;
      tono({ f: 520, f2: 700, dur: 0.07, vol: 0.12, tipo: 'triangle' });
    },

    acierto() {
      if (!efectos || !asegurar()) return;
      [784, 1046.5, 1318.5, 1568].forEach((f, i) => campana(f, i * 0.075, 0.2, 0.9));
    },

    error() {
      if (!efectos || !asegurar()) return;
      tono({ f: 392, f2: 349, dur: 0.18, vol: 0.14, tipo: 'sine' });
      tono({ f: 330, f2: 294, ini: 0.16, dur: 0.24, vol: 0.12, tipo: 'sine' });
    },

    estrella() {
      if (!efectos || !asegurar()) return;
      [1318.5, 1760, 2093].forEach((f, i) => tono({ f, ini: i * 0.06, dur: 0.22, vol: 0.1, tipo: 'triangle' }));
    },

    fanfarria() {
      if (!efectos || !asegurar()) return;
      const notas = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      notas.forEach((f, i) => {
        tono({ f, ini: i * 0.11, dur: i === 6 ? 0.9 : 0.22, vol: 0.18, tipo: 'triangle' });
        tono({ f: f / 2, ini: i * 0.11, dur: i === 6 ? 0.9 : 0.22, vol: 0.08, tipo: 'sine' });
      });
      campana(1568, 0.77, 0.15, 1.2);
    },

    /* Aplauso sintetizado: muchas palmadas cortas con ruido filtrado. */
    aplauso(dur = 2.4) {
      if (!efectos || !asegurar()) return;
      const n = Math.floor(dur * 46);
      for (let i = 0; i < n; i++) {
        const fr = i / n;
        const dens = Math.sin(Math.PI * Math.min(1, fr * 1.1));
        if (Math.random() > 0.2 + 0.8 * dens) continue;
        rafaga({
          ini: fr * dur + Math.random() * 0.03,
          dur: 0.05 + Math.random() * 0.06,
          f: 1100 + Math.random() * 2800,
          q: 0.7 + Math.random() * 1.3,
          vol: (0.35 + Math.random() * 0.55) * (0.4 + dens * 0.6) * 1.6
        });
      }
    },

    /* Palmada individual (juego de sílabas). */
    palma() {
      if (!asegurar()) return;
      rafaga({ dur: 0.1, f: 1500, q: 0.7, vol: 2.4 });
      rafaga({ ini: 0.012, dur: 0.07, f: 2800, q: 0.9, vol: 1.6 });
      rafaga({ ini: 0.03, dur: 0.05, f: 900, q: 0.8, vol: 1.2 });
      tono({ f: 190, f2: 90, dur: 0.12, vol: 0.3, tipo: 'sine' });
    },

    /* ----------------- Sonidos de la naturaleza ----------------- */
    async naturaleza(id, dur = 3.6) {
      if (!asegurar()) return;
      const g = nuevoGrupo(dur);
      const t0 = ctx.currentTime;
      const fade = (nodo, v, d = dur) => {
        nodo.gain.setValueAtTime(0.0001, t0);
        nodo.gain.linearRampToValueAtTime(v, t0 + 0.35);
        nodo.gain.setValueAtTime(v, t0 + d - 0.5);
        nodo.gain.linearRampToValueAtTime(0.0001, t0 + d);
      };
      const bucle = (filtros, vol) => {
        const s = ctx.createBufferSource();
        s.buffer = ruido(); s.loop = true;
        let nodo = s;
        filtros.forEach(([tipo, f, q]) => {
          const fl = ctx.createBiquadFilter();
          fl.type = tipo; fl.frequency.value = f; if (q) fl.Q.value = q;
          nodo.connect(fl); nodo = fl;
        });
        const gg = ctx.createGain();
        nodo.connect(gg).connect(g);
        s.start(t0); s.stop(t0 + dur + 0.1);
        fade(gg, vol);
        return { s, gg, filtros: nodo };
      };

      switch (id) {
        case 'lluvia': {
          bucle([['highpass', 900], ['lowpass', 9000]], 0.2);
          for (let i = 0; i < dur * 70; i++)
            rafaga({ ini: Math.random() * dur, dur: 0.012 + Math.random() * 0.02,
              tipoFiltro: 'highpass', f: 3000 + Math.random() * 4000, vol: 0.08 + Math.random() * 0.14, dest: g });
          break;
        }
        case 'viento': {
          const b = ctx.createBufferSource();
          b.buffer = ruido(); b.loop = true;
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
          const gg = ctx.createGain();
          b.connect(bp).connect(gg).connect(g);
          const pts = [350, 950, 520, 1200, 420];
          const vols = [0.05, 0.4, 0.15, 0.45, 0.04];
          pts.forEach((f, i) => {
            const t = t0 + (dur * i) / (pts.length - 1);
            bp.frequency.linearRampToValueAtTime(f, t);
            gg.gain.linearRampToValueAtTime(vols[i], t);
          });
          bp.frequency.setValueAtTime(350, t0); gg.gain.setValueAtTime(0.0001, t0);
          b.start(t0); b.stop(t0 + dur + 0.1);
          break;
        }
        case 'trueno': {
          rafaga({ dur: 0.18, tipoFiltro: 'highpass', f: 900, vol: 0.5, dest: g });
          const r = bucle([['lowpass', 420]], 0.0001);
          r.gg.gain.cancelScheduledValues(t0);
          r.gg.gain.setValueAtTime(0.0001, t0);
          [[0.1, 0.75], [0.7, 0.35], [1.2, 0.6], [2.0, 0.28], [2.8, 0.12], [dur, 0.0001]].forEach(([t, v]) =>
            r.gg.gain.linearRampToValueAtTime(v, t0 + t));
          tono({ f: 55, f2: 32, ini: 0.1, dur: 2.2, vol: 0.4, tipo: 'sine', dest: g });
          break;
        }
        case 'mar': {
          const o = bucle([['lowpass', 750]], 0.0001);
          o.gg.gain.cancelScheduledValues(t0);
          o.gg.gain.setValueAtTime(0.0001, t0);
          for (let t = 0, k = 0; t < dur; t += 2.6, k++) {
            o.gg.gain.linearRampToValueAtTime(0.42, t0 + t + 1.2);
            o.gg.gain.linearRampToValueAtTime(0.05, t0 + t + 2.6);
            for (let j = 0; j < 22; j++)
              rafaga({ ini: t + 0.9 + Math.random() * 0.9, dur: 0.05 + Math.random() * 0.08,
                tipoFiltro: 'highpass', f: 4000 + Math.random() * 3000, vol: 0.03 + Math.random() * 0.05, dest: g });
          }
          o.gg.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.2);
          break;
        }
        case 'pajaro': {
          const pip = (ini, f1, f2, d) => {
            tono({ f: f1, f2, ini, dur: d, vol: 0.24, tipo: 'sine', dest: g });
            tono({ f: f1 * 2, f2: f2 * 2, ini, dur: d, vol: 0.05, tipo: 'sine', dest: g });
          };
          [0.1, 0.32, 0.54].forEach((t, i) => pip(t, 2600 + i * 250, 3600 + i * 300, 0.11));
          pip(0.86, 3600, 2400, 0.28);
          for (let k = 0; k < 7; k++) pip(1.45 + k * 0.1, 3000 + (k % 2) * 700, 3800 - (k % 2) * 600, 0.08);
          [2.55, 2.75, 2.95].forEach((t, i) => pip(t, 2400 + i * 400, 3900, 0.12));
          break;
        }
        case 'grillo': {
          for (let grupo = 0; grupo < 8; grupo++) {
            for (let p = 0; p < 4; p++) {
              tono({ f: 4300 + (p % 2) * 60, ini: 0.1 + grupo * 0.42 + p * 0.045, dur: 0.04, vol: 0.22, tipo: 'sine', dest: g, ataque: 0.004 });
            }
          }
          bucle([['lowpass', 300]], 0.015);
          break;
        }
        case 'fuego': {
          bucle([['lowpass', 380]], 0.12);
          for (let i = 0; i < dur * 28; i++)
            rafaga({ ini: Math.random() * dur, dur: 0.004 + Math.random() * 0.02,
              tipoFiltro: 'highpass', f: 1500 + Math.random() * 3500, vol: 0.06 + Math.random() * 0.35, dest: g });
          for (let i = 0; i < 4; i++)
            rafaga({ ini: Math.random() * dur, dur: 0.05, tipoFiltro: 'bandpass', f: 900, q: 1, vol: 0.35, dest: g });
          break;
        }
        case 'rio': {
          const r = bucle([['bandpass', 1100, 0.6]], 0.2);
          for (let i = 0; i < dur * 16; i++) {
            const f = 450 + Math.random() * 700;
            tono({ f, f2: f * 1.6, ini: Math.random() * dur, dur: 0.05 + Math.random() * 0.05,
              vol: 0.05 + Math.random() * 0.06, tipo: 'sine', dest: g, ataque: 0.005 });
          }
          break;
        }
        default: break;
      }
      await esperar(dur * 1000);
    }
  };
  return api;
})();

/* ------------------------------------------------------------------ */
/*  VOZ                                                               */
/*  1) Grabaciones (audio/voz/*.mp3) indexadas en window.AUDIO_VOZ    */
/*     [js/audio-voces.js]. Dos "presets": std (1º-3º EGB) y enf      */
/*     (Inicial: más lento, más fuerte y más expresivo).              */
/*  2) Respaldo: síntesis de voz del navegador.                       */
/* ------------------------------------------------------------------ */
const Voz = (() => {
  const synth = window.speechSynthesis || null;
  const soportada = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
  const VELOCIDADES = { lenta: 0.72, normal: 0.88, rapida: 1.02 };   // síntesis del navegador
  const VEL_AUDIO = { lenta: 0.85, normal: 1, rapida: 1.12 };        // grabaciones
  const DIR = 'audio/voz/';

  let voces = [];
  let elegida = null;
  let preferidaURI = null;
  let velocidad = 'normal';
  let preset = 'std';
  let token = 0;
  let hablandoN = 0;
  let escuchas = [];
  const vivas = new Set(); // evita que el navegador recoja utterances en uso
  let resolvedores = [];
  let audioActual = null;
  const faltantes = new Set();

  /* ---------- Elección de la voz de respaldo más natural ---------- */
  function puntuar(v) {
    const n = (v.name || '').toLowerCase();
    const l = (v.lang || '').toLowerCase().replace('_', '-');
    let p = 0;
    if (/natural/.test(n)) p += 120;                       // Edge: voces neuronales
    if (/online/.test(n)) p += 25;
    if (/premium|enhanced|mejorada|siri/.test(n)) p += 90; // macOS / iOS
    if (/neural|wavenet|studio/.test(n)) p += 80;
    if (/google/.test(n)) p += 45;                         // Chrome / Android
    if (l === 'es-ec') p += 45;
    else if (/^es-(mx|co|us|419|pe|ar|cl|ve|bo|uy|py|cr|gt|hn|ni|pa|sv|do|pr|cu)/.test(l)) p += 28;
    else if (l === 'es-es') p += 6;
    if (/andrea|dalia|elvira|paloma|salome|camila|valentina|marina|catalina|ximena|fernanda|paulina|monica|mónica|sabina|helena|lola|carlota/.test(n)) p += 8;
    if (/desktop|espeak|festival|robot/.test(n)) p -= 70;
    if (!v.localService) p += 6;
    return p;
  }
  const esNatural = v => !!v && /natural|neural|premium|enhanced|mejorada|google|siri/i.test(v.name);

  function cargar() {
    if (!soportada) return;
    const todas = synth.getVoices() || [];
    voces = todas
      .filter(v => /^es([-_]|$)/i.test(v.lang) || /spanish|español/i.test(v.name))
      .sort((a, b) => puntuar(b) - puntuar(a));
    if (!voces.length) { elegida = null; return; }
    elegida = (preferidaURI && voces.find(v => v.voiceURI === preferidaURI)) || voces[0];
    escuchas.forEach(f => f('voces'));
  }

  function iniciar() {
    if (!soportada) return;
    cargar();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', cargar);
    else synth.onvoiceschanged = cargar;
    [400, 1200, 3000].forEach(ms => setTimeout(() => { if (!voces.length) cargar(); }, ms));
  }

  function notificar() { escuchas.forEach(f => f(hablandoN > 0 ? 'habla' : 'calla')); }

  function liberarTodo() {
    const rs = resolvedores; resolvedores = [];
    rs.forEach(r => r(false));
  }

  function cancelar() {
    token++;
    if (audioActual) { try { audioActual.pause(); } catch (e) { /* nada */ } audioActual = null; }
    if (soportada) { try { synth.cancel(); } catch (e) { /* nada */ } }
    liberarTodo();
    hablandoN = 0; notificar();
  }

  const pausa = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Grabaciones ---------- */
  /* voz: 'nar' = narrador de las lecturas; si no, la voz de Libi (según el preset). */
  const claveClip = (texto, voz) => (voz === 'nar' ? 'nar' : preset) + '|' + FRASES.norm(texto);
  function buscarClip(texto, voz) {
    const M = window.AUDIO_VOZ;
    if (!M) return null;
    const e = M[claveClip(texto, voz)];
    return e ? { id: e[0], dur: e[1], w: e[2] || null } : null;
  }

  /* Reproduce una grabación. alTiempo(ms) se llama en cada cuadro. */
  function tocarClip(c, rate = 1, alTiempo = null) {
    return new Promise(resolve => {
      const a = new Audio(DIR + c.id + '.mp3');
      const pr = Math.max(0.5, Math.min(2, VEL_AUDIO[velocidad] * rate));
      a.playbackRate = pr;
      a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true;
      let fin = false, reloj = 0;
      const seguro = setTimeout(() => terminar(false), c.dur / pr + 4000);
      const terminar = ok => {
        if (fin) return; fin = true;
        clearInterval(reloj); clearTimeout(seguro);
        if (audioActual === a) audioActual = null;
        resolvedores = resolvedores.filter(r => r !== terminar);
        hablandoN = Math.max(0, hablandoN - 1); notificar();
        resolve(ok);
      };
      a.onended = () => terminar(true);
      a.onerror = () => terminar(false);
      audioActual = a;
      resolvedores.push(terminar);
      hablandoN++; notificar();
      const p = a.play();
      if (p && p.catch) p.catch(() => terminar(false));
      if (alTiempo) reloj = setInterval(() => { if (!fin) alTiempo(a.currentTime * 1000); }, 30);
    });
  }

  /* ---------- Respaldo: síntesis del navegador ---------- */
  function decirTTS(texto, { rate = 1, pitch = 1.03, interrumpir = true, volumen = 1 } = {}) {
    return new Promise(resolve => {
      if (!soportada || !texto) { resolve(false); return; }
      const habiaCola = synth.speaking || synth.pending;
      if (interrumpir) cancelar();
      let fin = false;
      const terminar = ok => {
        if (fin) return; fin = true;
        clearTimeout(seguro);
        vivas.delete(u);
        resolvedores = resolvedores.filter(r => r !== terminar);
        hablandoN = Math.max(0, hablandoN - 1); notificar();
        resolve(ok);
      };
      const u = new SpeechSynthesisUtterance(FRASES.norm(texto));
      if (elegida) { u.voice = elegida; u.lang = elegida.lang; } else u.lang = 'es-EC';
      const enf = preset === 'enf';
      u.rate = Math.max(0.5, Math.min(1.4, VELOCIDADES[velocidad] * rate * (enf ? 0.8 : 1)));
      u.pitch = enf ? pitch + 0.1 : pitch;
      u.volume = volumen;
      u.onend = () => terminar(true);
      u.onerror = () => terminar(false);
      const seguro = setTimeout(() => terminar(false), 2500 + texto.length * 180 / u.rate);
      vivas.add(u);
      resolvedores.push(terminar);
      hablandoN++; notificar();
      const lanzar = () => { try { synth.speak(u); } catch (e) { terminar(false); } };
      if (interrumpir && habiaCola) setTimeout(lanzar, 60); else lanzar();
    });
  }

  /* ---------- Hablar: grabación si existe; si no, respaldo ---------- */
  function decir(texto, opts = {}) {
    const c = buscarClip(texto, opts.voz);
    if (c) {
      if (opts.interrumpir !== false) cancelar();
      const mi = token;
      return tocarClip(c).then(ok =>
        (ok || token !== mi) ? ok : decirTTS(texto, { ...opts, interrumpir: false }));
    }
    faltantes.add(claveClip(texto, opts.voz));
    return decirTTS(texto, opts);
  }

  /* Dice una lista de textos uno tras otro (con pausas entre ellos). */
  async function secuencia(lista, { pausaMs = 260, rate = 1, pitch } = {}) {
    cancelar();
    const mi = token;
    for (let i = 0; i < lista.length; i++) {
      if (token !== mi) return false;
      const item = lista[i];
      const txt = typeof item === 'string' ? item : item.t;
      const r = typeof item === 'string' ? rate : (item.rate || rate);
      const p = typeof item === 'string' ? 0 : (item.pausa ?? 0);
      await decir(txt, { rate: r, pitch, interrumpir: false });
      if (token !== mi) return false;
      await pausa(p || pausaMs);
    }
    return token === mi;
  }

  /* ---------- Narración con resaltado de palabras ---------- */
  const CAL_KEY = 'prolipa.calibracion';
  let cal = {};
  try { cal = JSON.parse(localStorage.getItem(CAL_KEY) || '{}'); } catch (e) { cal = {}; }
  const claveCal = () => (elegida ? elegida.voiceURI : 'x') + '|' + velocidad;
  const msPorCar = () => cal[claveCal()] || (78 / VELOCIDADES[velocidad]) * 0.88;

  /* tokens: ['palabra,', ...] → llama alPalabra(i) mientras se habla. */
  async function narrar(tokens, { alPalabra = () => {}, rate = 1, voz } = {}) {
    cancelar();
    const mi = token;
    for (const f of FRASES.trocear(tokens)) {
      if (token !== mi) return false;
      const c = buscarClip(f.texto, voz);
      if (c && c.w && c.w.length === f.idx.length) await narrarClip(c, f, alPalabra, rate, mi);
      else if (soportada) { faltantes.add(claveClip(f.texto, voz)); await narrarFrase(tokens, f.idx, alPalabra, rate, mi); }
      else return false;
      if (token !== mi) return false;
      await pausa(160);
    }
    alPalabra(-1);
    return token === mi;
  }

  /* Con grabación: el resaltado sigue los tiempos reales de cada palabra. */
  function narrarClip(c, f, alPalabra, rate, mi) {
    let actual = -1;
    const marcar = k => { if (k !== actual && token === mi) { actual = k; alPalabra(f.idx[k]); } };
    marcar(0);
    return tocarClip(c, rate, ms => {
      let k = 0;
      for (let j = 0; j < c.w.length; j++) { if (ms >= c.w[j][0] - 40) k = j; else break; }
      marcar(k);
    });
  }

  /* Respaldo con síntesis del navegador (eventos boundary o estimación). */
  function narrarFrase(tokens, idxs, alPalabra, rate, mi) {
    return new Promise(resolve => {
      const palabras = idxs.map(i => tokens[i]);
      const texto = palabras.join(' ');
      const inicios = [];
      let pos = 0;
      palabras.forEach(w => { inicios.push(pos); pos += w.length + 1; });
      let viaBoundary = false;
      let timers = [];
      let t0 = 0;
      let actual = -1;
      const marcar = k => { if (k !== actual && token === mi) { actual = k; alPalabra(idxs[k]); } };
      const limpiar = () => { timers.forEach(clearTimeout); timers = []; };

      const programarEstimado = desdeMs => {
        const mpc = msPorCar() / rate;
        let acum = 0;
        palabras.forEach((w, k) => {
          const letras = w.replace(/[.,;:!?¡¿"“”()]/g, '').length;
          const dur = letras * mpc + 55 + (/[,;:]$/.test(w) ? 160 : 0) + (/[.!?…]$/.test(w) ? 220 : 0);
          const cuando = acum - desdeMs;
          if (cuando <= 0) { if (k === 0) marcar(0); else timers.push(setTimeout(() => marcar(k), 0)); }
          else timers.push(setTimeout(() => marcar(k), cuando));
          acum += dur;
        });
      };

      decirTTS(texto, { rate, interrumpir: false }).then(ok => {
        limpiar();
        if (ok && t0) {
          const letras = texto.replace(/[\s.,;:!?¡¿]/g, '').length || 1;
          const medido = (performance.now() - t0) / letras * rate;
          const previo = cal[claveCal()] || msPorCar();
          cal[claveCal()] = Math.max(25, Math.min(220, previo * 0.5 + medido * 0.5));
          try { localStorage.setItem(CAL_KEY, JSON.stringify(cal)); } catch (e) { /* nada */ }
        }
        resolve(ok);
      });

      const u = [...vivas].pop();
      if (!u) { resolve(false); return; }
      u.onstart = () => {
        t0 = performance.now();
        marcar(0);
        timers.push(setTimeout(() => { if (!viaBoundary) programarEstimado(520); }, 520));
      };
      u.onboundary = e => {
        if (e.name && e.name !== 'word') return;
        viaBoundary = true;
        let k = 0;
        for (let j = 0; j < inicios.length; j++) if (e.charIndex >= inicios[j]) k = j;
        marcar(k);
      };
    });
  }

  return {
    soportada,
    iniciar,
    decir,
    secuencia,
    narrar,
    cancelar,
    pausa,
    esNatural,
    puntuar,
    faltantes,
    get voces() { return voces; },
    get elegida() { return elegida; },
    get hayVozNatural() { return voces.some(esNatural); },
    get hayGrabaciones() { return !!window.AUDIO_VOZ && Object.keys(window.AUDIO_VOZ).length > 0; },
    elegir(uri) {
      preferidaURI = uri || null;
      elegida = (uri && voces.find(v => v.voiceURI === uri)) || voces[0] || null;
    },
    fijarVelocidad(v) { if (VELOCIDADES[v]) velocidad = v; },
    get velocidad() { return velocidad; },
    /* 'enf' = Inicial (más lento, más fuerte y expresivo); 'std' = resto */
    fijarPreset(p) { preset = p === 'enf' ? 'enf' : 'std'; },
    get preset() { return preset; },
    alCambiar(fn) { escuchas.push(fn); }
  };
})();
