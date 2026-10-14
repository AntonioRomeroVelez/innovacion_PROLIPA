'use strict';
/* =====================================================================
   LIBI, EL LIBRO VIAJERO — mascota de PROLIPA (SVG propio) + burbuja
   Estados (data-mood): normal · feliz · celebra · piensa · ups
   ===================================================================== */
const Libi = (() => {
  const SVG = `
<svg class="libi-svg" viewBox="0 0 220 244" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <ellipse cx="110" cy="238" rx="56" ry="7" fill="rgba(30,40,90,.17)"/>

  <!-- cinta marcapáginas -->
  <path d="M100 196 L100 229 L108 221 L116 229 L116 196 Z" fill="#e5383b"/>

  <!-- piernas y zapatos -->
  <rect x="76" y="192" width="15" height="32" rx="7" fill="#173d82"/>
  <rect x="129" y="192" width="15" height="32" rx="7" fill="#173d82"/>
  <ellipse cx="74" cy="229" rx="20" ry="9" fill="#ff7a3d"/>
  <ellipse cx="146" cy="229" rx="20" ry="9" fill="#ff7a3d"/>
  <path d="M56 232 Q74 238 92 232" stroke="#d9561a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M128 232 Q146 238 164 232" stroke="#d9561a" stroke-width="3" fill="none" stroke-linecap="round"/>

  <!-- hojas (lado derecho) -->
  <path d="M166 46 L182 55 L182 199 L166 199 Z" fill="#f6f2e4" stroke="#ddd5bd" stroke-width="2" stroke-linejoin="round"/>
  <path d="M170 66 H180 M170 82 H180 M170 98 H180 M170 114 H180 M170 130 H180 M170 146 H180 M170 162 H180 M170 178 H180" stroke="#d6cdb0" stroke-width="2" stroke-linecap="round"/>

  <!-- lomo (lado izquierdo) -->
  <path d="M36 56 L52 42 L52 200 L36 190 Z" fill="#173d82"/>
  <path d="M37 88 L52 82 M37 166 L52 164" stroke="#ffd23f" stroke-width="3.5" stroke-linecap="round"/>

  <!-- mechón de hojas -->
  <g class="mechon">
    <path d="M86 44 Q82 22 93 17 Q101 28 99 44 Z" fill="#fff7e6" stroke="#e2d9bd" stroke-width="2" stroke-linejoin="round"/>
    <path d="M103 44 Q101 19 112 12 Q121 24 117 44 Z" fill="#fffaf0" stroke="#e2d9bd" stroke-width="2" stroke-linejoin="round"/>
    <path d="M121 44 Q125 25 137 22 Q140 34 133 44 Z" fill="#fff7e6" stroke="#e2d9bd" stroke-width="2" stroke-linejoin="round"/>
  </g>

  <!-- tapa -->
  <rect x="52" y="42" width="116" height="158" rx="14" fill="#2f6fd0" stroke="#1f55b3" stroke-width="4"/>
  <rect x="60" y="52" width="13" height="140" rx="6.5" fill="#fff" opacity=".14"/>
  <rect x="66" y="54" width="88" height="28" rx="9" fill="#ffd23f"/>
  <text x="110" y="75" text-anchor="middle" font-family="Andika, Fredoka, sans-serif" font-weight="700" font-size="21" letter-spacing="4" fill="#173d82">ABC</text>

  <!-- cejas -->
  <path class="ceja ceja-i" d="M76 94 Q90 86 104 94" stroke="#e6f0ff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path class="ceja ceja-d" d="M118 94 Q132 86 146 94" stroke="#e6f0ff" stroke-width="4" fill="none" stroke-linecap="round"/>

  <!-- ojos -->
  <g class="ojos">
    <circle cx="90" cy="113" r="14" fill="#fff"/><circle cx="132" cy="113" r="14" fill="#fff"/>
    <g class="pupilas">
      <circle cx="92" cy="115" r="7.5" fill="#14213d"/><circle cx="134" cy="115" r="7.5" fill="#14213d"/>
      <circle cx="94.6" cy="112" r="2.8" fill="#fff"/><circle cx="136.6" cy="112" r="2.8" fill="#fff"/>
    </g>
    <ellipse class="parpado" cx="90" cy="113" rx="15" ry="15" fill="#2f6fd0"/>
    <ellipse class="parpado" cx="132" cy="113" rx="15" ry="15" fill="#2f6fd0"/>
  </g>
  <g class="ojos-f" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round">
    <path d="M77 119 Q90 100 103 119"/><path d="M119 119 Q132 100 145 119"/>
  </g>

  <!-- mejillas -->
  <circle cx="71" cy="139" r="9" fill="#ff7f9a" opacity=".55"/>
  <circle cx="151" cy="139" r="9" fill="#ff7f9a" opacity=".55"/>

  <!-- boca -->
  <g class="boca">
    <path d="M93 139 Q111 174 129 139 Z" fill="#6b1d3a"/>
    <path d="M100 154 Q111 166 122 154 Q111 147 100 154 Z" fill="#ff8fa3"/>
  </g>
  <path class="boca-triste" d="M95 156 Q111 141 127 156" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>

  <!-- brazos -->
  <g class="brazo brazo-i">
    <path d="M55 130 Q35 136 31 156" stroke="#1d4fa5" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="31" cy="160" r="11" fill="#fff" stroke="#c4d1ea" stroke-width="3"/>
  </g>
  <g class="brazo brazo-d">
    <path d="M165 130 Q185 136 189 156" stroke="#1d4fa5" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="189" cy="160" r="11" fill="#fff" stroke="#c4d1ea" stroke-width="3"/>
  </g>
</svg>`;

  let raiz = null, burbuja = null, cuerpo = null, tBurbuja = null, tAnimo = null;

  function montar(cont) {
    raiz = cont;
    raiz.innerHTML = `
      <div class="libi" data-mood="normal">
        <div class="libi-burbuja" role="status" aria-live="polite" hidden></div>
        <button class="libi-cuerpo" type="button" aria-label="Libi, el libro viajero. Tócalo para escuchar un consejo">${SVG}</button>
      </div>`;
    burbuja = raiz.querySelector('.libi-burbuja');
    cuerpo = raiz.querySelector('.libi-cuerpo');
    cuerpo.addEventListener('click', () => { Sfx.asegurar(); Sfx.tocar(); api.consejo(); });
    Voz.alCambiar(e => document.body.classList.toggle('hablando', e === 'habla'));
  }

  function salto() {
    if (cuerpo && window.gsap) {
      gsap.fromTo(cuerpo, { y: 0 }, { y: -26, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 });
    }
  }

  const api = {
    svg: () => SVG,
    montar,

    /* Muestra la burbuja de texto (sin voz). */
    decir(texto, ms = 4200) {
      if (!burbuja) return;
      clearTimeout(tBurbuja);
      burbuja.textContent = texto;
      burbuja.hidden = false;
      burbuja.classList.remove('entra');
      void burbuja.offsetWidth;
      burbuja.classList.add('entra');
      if (ms) tBurbuja = setTimeout(() => api.callar(), ms);
    },
    callar() { if (burbuja) burbuja.hidden = true; },

    /* Burbuja + voz (la voz usa la grabación si existe). */
    async hablar(texto, opts) {
      api.decir(texto, 0);
      const ok = await Voz.decir(texto, opts);
      tBurbuja = setTimeout(() => api.callar(), ok ? 900 : 3500);
      return ok;
    },

    animo(mood, ms = 0) {
      if (!raiz) return;
      const el = raiz.querySelector('.libi');
      el.dataset.mood = mood;
      clearTimeout(tAnimo);
      if (mood === 'celebra') salto();
      if (ms) tAnimo = setTimeout(() => { el.dataset.mood = 'normal'; }, ms);
    },

    consejo() {
      const t = FRASES.CONSEJOS[Math.floor(Math.random() * FRASES.CONSEJOS.length)];
      api.animo('feliz', 1500);
      api.hablar(t);
    }
  };
  return api;
})();
