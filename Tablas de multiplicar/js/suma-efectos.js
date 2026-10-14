/* Suma — efectos de sonido (Web Audio, sin archivos) y confeti (librería canvas-confetti).
 * Archivo propio de la actividad de suma: no se comparte con la de multiplicación.
 * Si lib/confetti.browser.js no está cargada, el confeti simplemente no se muestra. */
(function (global) {
  'use strict';

  const CLAVE_MUDO = 'suma.mudo';

  /* ---------- Sonido ---------- */
  let ctx = null;
  let mudo = false;
  try { mudo = global.localStorage.getItem(CLAVE_MUDO) === '1'; } catch (e) { /* sin almacenamiento */ }

  function audio() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tono(frecuencia, duracion, opc) {
    if (mudo) return;
    const c = audio();
    if (!c) return;
    const o = Object.assign({ tipo: 'sine', vol: 0.15, inicio: 0, hasta: 0 }, opc);
    const t0 = c.currentTime + o.inicio;
    const osc = c.createOscillator();
    const gan = c.createGain();
    osc.type = o.tipo;
    osc.frequency.setValueAtTime(frecuencia, t0);
    if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t0 + duracion);
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.exponentialRampToValueAtTime(o.vol, t0 + 0.012);
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
    osc.connect(gan);
    gan.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duracion + 0.03);
  }

  const SonidoSuma = {
    /* n: cuántas cuentas hay pintadas; el tono sube al ir sumando */
    cuenta(n) { tono(430 + (n || 0) * 28, 0.09, { tipo: 'triangle', vol: 0.12 }); },
    /* el cuadro de respuesta recibe el número */
    aterriza() { tono(300, 0.08, { tipo: 'sine', vol: 0.14, hasta: 180 }); },
    acierto() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tono(f, 0.24, { tipo: 'triangle', vol: 0.16, inicio: k * 0.09 }));
    },
    error() { tono(230, 0.3, { tipo: 'sawtooth', vol: 0.07, hasta: 140 }); },
    fin() {
      [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5].forEach((f, k) => tono(f, 0.26, { tipo: 'triangle', vol: 0.16, inicio: k * 0.12 }));
    },
    alternar() {
      mudo = !mudo;
      try { global.localStorage.setItem(CLAVE_MUDO, mudo ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
      return mudo;
    },
    get mudo() { return mudo; }
  };

  /* ---------- Confeti (canvas-confetti) ---------- */
  const COLORES = ['#e8456b', '#f08a24', '#f4c20d', '#8fcc2a', '#19b3b8', '#2f7fe0', '#9b3fd1'];

  function disparar(opciones) {
    if (typeof global.confetti !== 'function') return;
    global.confetti(Object.assign({
      colors: COLORES,
      disableForReducedMotion: true,
      zIndex: 60,
      ticks: 170
    }, opciones));
  }

  const ConfetiSuma = {
    /* Estallido en un punto de la ventana (x, y en píxeles). */
    lanzar(x, y, cantidad) {
      disparar({
        particleCount: cantidad || 90,
        spread: 80,
        startVelocity: 38,
        shapes: ['circle', 'square', 'star'],
        scalar: 1.05,
        origin: { x: x / global.innerWidth, y: y / global.innerHeight }
      });
    },
    /* Dos cañones laterales: para la pantalla final. */
    canones(cantidad) {
      const n = cantidad || 60;
      disparar({ particleCount: n, angle: 60, spread: 60, startVelocity: 55, origin: { x: 0, y: 0.75 }, shapes: ['circle', 'star'] });
      disparar({ particleCount: n, angle: 120, spread: 60, startVelocity: 55, origin: { x: 1, y: 0.75 }, shapes: ['circle', 'star'] });
    }
  };

  global.SonidoSuma = SonidoSuma;
  global.ConfetiSuma = ConfetiSuma;
})(window);
