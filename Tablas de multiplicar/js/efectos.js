/* Efectos de sonido (Web Audio, sin archivos) y confeti (canvas, sin librerías). */
(function (global) {
  'use strict';

  const reducirMovimiento = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sonido ---------- */
  let ctx = null;
  let mudo = false;
  try { mudo = global.localStorage.getItem('abaco.mudo') === '1'; } catch (e) { /* sin almacenamiento */ }

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

  const Sonido = {
    cuenta(i) { tono(480 + (i || 0) * 38, 0.09, { tipo: 'triangle', vol: 0.12 }); },
    acierto() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tono(f, 0.24, { tipo: 'triangle', vol: 0.16, inicio: k * 0.09 }));
    },
    error() { tono(230, 0.3, { tipo: 'sawtooth', vol: 0.07, hasta: 140 }); },
    fin() {
      [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5].forEach((f, k) => tono(f, 0.26, { tipo: 'triangle', vol: 0.16, inicio: k * 0.12 }));
    },
    alternar() {
      mudo = !mudo;
      try { global.localStorage.setItem('abaco.mudo', mudo ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
      return mudo;
    },
    get mudo() { return mudo; }
  };

  /* ---------- Confeti ---------- */
  const COLORES = ['#e8456b', '#f08a24', '#f4c20d', '#8fcc2a', '#19b3b8', '#2f7fe0', '#9b3fd1'];
  let lienzo = null;
  let pincel = null;
  let particulas = [];
  let animando = false;
  let ancho = 0;
  let alto = 0;

  function ajustarLienzo() {
    if (!lienzo) {
      lienzo = global.document.getElementById('confeti');
      if (!lienzo) return false;
      pincel = lienzo.getContext('2d');
    }
    const dpr = global.devicePixelRatio || 1;
    ancho = global.innerWidth;
    alto = global.innerHeight;
    lienzo.width = ancho * dpr;
    lienzo.height = alto * dpr;
    pincel.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function cuadro() {
    pincel.clearRect(0, 0, ancho, alto);
    particulas = particulas.filter((p) => p.vida > 0 && p.y < alto + 20);
    particulas.forEach((p) => {
      p.vx *= 0.99;
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += p.vgiro;
      p.vida -= 1;
      pincel.save();
      pincel.globalAlpha = Math.min(1, p.vida / 30);
      pincel.translate(p.x, p.y);
      pincel.rotate(p.giro);
      pincel.fillStyle = p.color;
      pincel.fillRect(-p.tam / 2, -p.tam / 3, p.tam, p.tam * 0.6);
      pincel.restore();
    });
    if (particulas.length) global.requestAnimationFrame(cuadro);
    else { animando = false; pincel.clearRect(0, 0, ancho, alto); }
  }

  const Confeti = {
    /* x, y: punto de origen en píxeles de la ventana; cantidad: número de piezas */
    lanzar(x, y, cantidad) {
      if (reducirMovimiento || !ajustarLienzo()) return;
      const n = cantidad || 90;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
        const vel = 6 + Math.random() * 9;
        particulas.push({
          x: x, y: y,
          vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel,
          tam: 6 + Math.random() * 7,
          color: COLORES[(Math.random() * COLORES.length) | 0],
          giro: Math.random() * 6, vgiro: (Math.random() - 0.5) * 0.35,
          vida: 90 + Math.random() * 60
        });
      }
      if (!animando) { animando = true; global.requestAnimationFrame(cuadro); }
    }
  };

  global.addEventListener('resize', () => { if (lienzo) ajustarLienzo(); });

  global.Sonido = Sonido;
  global.Confeti = Confeti;
})(window);
