'use strict';
/* =====================================================================
   UI: pequeñas utilidades visuales (confeti, estrellas, modales).
   Usa GSAP y canvas-confetti si están disponibles (carpeta lib/).
   ===================================================================== */
const UI = (() => {
  const $ = (s, r = document) => r.querySelector(s);

  function actualizarEstrellas(anim) {
    const n = $('#n-estrellas');
    if (!n) return;
    n.textContent = Estado.estrellas;
    if (anim && window.gsap) {
      gsap.fromTo('#contador-estrellas', { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  }

  /* Una estrella vuela desde un elemento hasta el contador. */
  function estrellaDesde(el) {
    const meta = $('#contador-estrellas');
    if (!el || !meta || !window.gsap) return;
    const a = el.getBoundingClientRect(), b = meta.getBoundingClientRect();
    const s = document.createElement('div');
    s.className = 'estrella-vuela';
    s.textContent = '⭐';
    s.style.left = (a.left + a.width / 2 - 18) + 'px';
    s.style.top = (a.top + a.height / 2 - 18) + 'px';
    document.body.appendChild(s);
    gsap.to(s, {
      x: b.left + b.width / 2 - (a.left + a.width / 2),
      y: b.top + b.height / 2 - (a.top + a.height / 2),
      scale: 0.6, rotation: 360, duration: 0.85, ease: 'power2.inOut',
      onComplete: () => { s.remove(); actualizarEstrellas(true); }
    });
  }

  function entrar(el) {
    if (!el) return;
    if (window.gsap) gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' });
  }

  function confeti(tipo = 'normal') {
    if (!window.confetti) return;
    const colores = ['#ff7eb6', '#ffa63d', '#3ec28f', '#6b7cff', '#ffd23f', '#ff5c5c'];
    if (tipo === 'pequeno') {
      confetti({ particleCount: 40, spread: 60, startVelocity: 28, origin: { y: 0.65 }, colors: colores, scalar: 0.9 });
      return;
    }
    const fin = Date.now() + (tipo === 'grande' ? 1800 : 900);
    (function lluvia() {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.75 }, colors: colores });
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.75 }, colors: colores });
      if (Date.now() < fin) requestAnimationFrame(lluvia);
    })();
    confetti({ particleCount: tipo === 'grande' ? 160 : 90, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors: colores });
  }

  /* Modal genérico. Devuelve { cerrar, el }. */
  function modal({ html, clase = '', cerrable = true, alCerrar = () => {} }) {
    const capa = document.createElement('div');
    capa.className = 'modal-capa';
    capa.innerHTML = `<div class="modal ${clase}" role="dialog" aria-modal="true">${html}</div>`;
    $('#modales').appendChild(capa);
    const caja = capa.firstElementChild;
    if (window.gsap) {
      gsap.fromTo(capa, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(caja, { scale: 0.85, y: 20 }, { scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' });
    }
    const h = {
      el: caja,
      cerrar() {
        if (!capa.isConnected) return;
        capa.remove();
        document.removeEventListener('keydown', onKey);
        alCerrar();
      }
    };
    const onKey = e => { if (e.key === 'Escape' && cerrable) h.cerrar(); };
    document.addEventListener('keydown', onKey);
    if (cerrable) capa.addEventListener('click', e => { if (e.target === capa) h.cerrar(); });
    capa.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => h.cerrar()));
    return h;
  }

  return { actualizarEstrellas, estrellaDesde, entrar, confeti, modal };
})();
