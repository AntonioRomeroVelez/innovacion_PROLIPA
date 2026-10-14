/* Personaje del estudiante: un animal animado a elegir. Cabeza, cuerpo, brazos, cola y orejas se mueven por separado
   (respira, mira a los lados, saluda, brinca) y cambia de expresión; gana accesorios al subir de nivel. */
const Avatar = (function () {
  'use strict';

  const EMBLEM = 'assets/prolipa-icon-white.png';
  const INK = '#0b1b33';
  const FEET = '70 166', NECK = '70 100';
  const rand = (a, b) => a + Math.random() * (b - a);
  let uid = 0;

  /* Animales disponibles (id, nombre y colores) */
  const ANIMALS = [
    { id: 'gato', name: 'Gato', fur: '#f4a340', muzzle: '#fff1da', inner: '#ffb3c4', nose: '#ff7f9d' },
    { id: 'perro', name: 'Perro', fur: '#e0a96d', muzzle: '#fbeccd', inner: '#8a5530', nose: INK },
    { id: 'conejo', name: 'Conejo', fur: '#f3eef8', muzzle: '#ffffff', inner: '#ffb3c8', nose: '#ff8fae' },
    { id: 'oso', name: 'Oso', fur: '#b07a4e', muzzle: '#ebd2ad', inner: '#7b4d2d', nose: INK },
    { id: 'zorro', name: 'Zorro', fur: '#f07c2a', muzzle: '#ffffff', inner: '#3b2417', nose: INK },
    { id: 'panda', name: 'Panda', fur: '#fbfbfb', muzzle: '#fbfbfb', inner: '#1f2937', nose: '#1f2937' },
    { id: 'leon', name: 'León', fur: '#f2b84b', muzzle: '#ffe9b8', inner: '#b5651d', nose: '#7a3f1a' },
    { id: 'cerdito', name: 'Cerdito', fur: '#ffb6cb', muzzle: '#ff8fb0', inner: '#ff8fb0', nose: INK }
  ];

  const byId = id => ANIMALS.find(a => a.id === id) || ANIMALS[0];

  /* Lo que gana el estudiante al llegar a cada nivel */
  function unlock(level) {
    return { 2: 'unas gafas', 3: 'un birrete', 4: 'un corbatín', 5: 'una capa', 6: 'una medalla', 7: 'una corona', 8: 'un aura dorada' }[level] || null;
  }

  /* Expresiones: qué ojos y boca se muestran según el ánimo */
  const MOOD_CSS =
    '.mascot .e,.mascot .m,.mascot .sweat{display:none}' +
    '.mascot[data-mood="happy"] .e-normal,.mascot[data-mood="happy"] .m-happy,' +
    '.mascot[data-mood="joy"] .e-joy,.mascot[data-mood="joy"] .m-joy,' +
    '.mascot[data-mood="oops"] .e-oops,.mascot[data-mood="oops"] .m-oops,.mascot[data-mood="oops"] .sweat,' +
    '.mascot[data-mood="worry"] .e-worry,.mascot[data-mood="worry"] .m-worry,.mascot[data-mood="worry"] .sweat{display:inline}';

  (function injectCss() {
    const st = document.createElement('style');
    st.textContent = MOOD_CSS;
    document.head.appendChild(st);
  })();

  /* Partes propias de cada animal: cola, orejas, melena y marcas de la cara */
  function parts(a) {
    const fur = a.fur;
    const ol = Color.shade(fur, -0.3);
    const st = ' stroke="' + ol + '" stroke-width="2.5" stroke-linejoin="round"';
    const tailPath = (d, w, color, origin) =>
      '<g class="tail" style="transform-origin:' + origin + '"><path d="' + d + '" fill="none" stroke="' + Color.shade(color, -0.3) + '" stroke-width="' + (w + 4.5) + '" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round"/></g>';
    const nose = (cx, cy, rx, ry, c) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + c + '"/>' +
      '<ellipse cx="' + (cx - rx * 0.35) + '" cy="' + (cy - ry * 0.35) + '" rx="' + rx * 0.3 + '" ry="' + ry * 0.28 + '" fill="#fff" opacity=".55"/>';
    const muzzle = (rx, ry, c) => '<ellipse cx="70" cy="81" rx="' + rx + '" ry="' + ry + '" fill="' + c + '"/>';
    const P = { tail: '', mane: '', back: '', face: '', limb: fur, ol };

    switch (a.id) {
      case 'gato':
        P.tail = tailPath('M104 142Q135 142 129 108', 8.5, fur, '104px 142px');
        P.back =
          '<g class="ear" style="transform-origin:48px 40px"><path d="M34 46L36 7L64 31Z" fill="' + fur + '"' + st + '/><path d="M41 37L42 17L56 30Z" fill="' + a.inner + '"/></g>' +
          '<g class="ear ear2" style="transform-origin:92px 40px"><path d="M106 46L104 7L76 31Z" fill="' + fur + '"' + st + '/><path d="M99 37L98 17L84 30Z" fill="' + a.inner + '"/></g>';
        P.face =
          '<path d="M70 25V37M60 27.5L62 37.5M80 27.5L78 37.5" stroke="' + Color.shade(fur, -0.25) + '" stroke-width="3.2" stroke-linecap="round" fill="none"/>' +
          muzzle(17, 12, a.muzzle) + '<path d="M65 74.5H75L70 80Z" fill="' + a.nose + '" stroke="' + a.nose + '" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<path d="M52 80L33 75M52 84.5L32 87M88 80L107 75M88 84.5L108 87" stroke="#7a5a3a" stroke-width="1.8" stroke-linecap="round" opacity=".75"/>';
        break;

      case 'perro':
        P.tail = tailPath('M106 140Q126 132 121 112', 9, fur, '106px 142px');
        P.back =
          '<g class="ear" style="transform-origin:38px 46px"><ellipse cx="28" cy="68" rx="12.5" ry="25" transform="rotate(14 28 68)" fill="' + a.inner + '" stroke="' + Color.shade(a.inner, -0.3) + '" stroke-width="2.5"/></g>' +
          '<g class="ear ear2" style="transform-origin:102px 46px"><ellipse cx="112" cy="68" rx="12.5" ry="25" transform="rotate(-14 112 68)" fill="' + a.inner + '" stroke="' + Color.shade(a.inner, -0.3) + '" stroke-width="2.5"/></g>';
        P.face =
          '<ellipse cx="88" cy="64" rx="14.5" ry="13.5" fill="' + a.inner + '" opacity=".92"/>' +
          muzzle(18, 13, a.muzzle) + nose(70, 75.5, 6.5, 4.6, a.nose);
        break;

      case 'conejo':
        P.tail = '<g class="tail" style="transform-origin:110px 148px"><circle cx="111" cy="148" r="9.5" fill="#fff" stroke="' + ol + '" stroke-width="2.5"/></g>';
        P.back =
          '<g class="ear" style="transform-origin:54px 32px"><ellipse cx="50" cy="16" rx="10.5" ry="18" transform="rotate(-9 50 16)" fill="' + fur + '"' + st + '/><ellipse cx="50" cy="17" rx="5" ry="12.5" transform="rotate(-9 50 17)" fill="' + a.inner + '"/></g>' +
          '<g class="ear ear2" style="transform-origin:86px 32px"><ellipse cx="90" cy="16" rx="10.5" ry="18" transform="rotate(9 90 16)" fill="' + fur + '"' + st + '/><ellipse cx="90" cy="17" rx="5" ry="12.5" transform="rotate(9 90 17)" fill="' + a.inner + '"/></g>';
        P.face = muzzle(15, 10.5, a.muzzle) + '<path d="M65.5 74.5H74.5L70 79.5Z" fill="' + a.nose + '" stroke="' + a.nose + '" stroke-width="1.5" stroke-linejoin="round"/>';
        break;

      case 'oso':
        P.tail = '<g class="tail" style="transform-origin:110px 148px"><circle cx="110" cy="147" r="8.5" fill="' + fur + '" stroke="' + ol + '" stroke-width="2.5"/></g>';
        P.back =
          '<g class="ear" style="transform-origin:42px 36px"><circle cx="41" cy="31" r="13.5" fill="' + fur + '"' + st + '/><circle cx="41" cy="32" r="7" fill="' + a.inner + '"/></g>' +
          '<g class="ear ear2" style="transform-origin:98px 36px"><circle cx="99" cy="31" r="13.5" fill="' + fur + '"' + st + '/><circle cx="99" cy="32" r="7" fill="' + a.inner + '"/></g>';
        P.face = muzzle(18, 13, a.muzzle) + nose(70, 75.5, 6.8, 4.8, a.nose);
        break;

      case 'zorro':
        P.tail =
          '<g class="tail" style="transform-origin:104px 142px"><ellipse cx="124" cy="124" rx="13" ry="28" transform="rotate(28 124 124)" fill="' + fur + '" stroke="' + ol + '" stroke-width="2.5"/>' +
          '<ellipse cx="134" cy="102" rx="8.5" ry="11" transform="rotate(28 134 102)" fill="#fff" stroke="' + ol + '" stroke-width="2"/></g>';
        P.back =
          '<g class="ear" style="transform-origin:48px 40px"><path d="M33 47L35 5L65 32Z" fill="' + fur + '"' + st + '/><path d="M40 38L41 16L56 31Z" fill="' + a.inner + '"/></g>' +
          '<g class="ear ear2" style="transform-origin:92px 40px"><path d="M107 47L105 5L75 32Z" fill="' + fur + '"' + st + '/><path d="M100 38L99 16L84 31Z" fill="' + a.inner + '"/></g>';
        P.face =
          '<path d="M32 68Q50 86 70 76Q90 86 108 68Q109 98 70 101Q31 98 32 68Z" fill="#fff"/>' +
          nose(70, 75, 5.8, 4.2, a.nose);
        break;

      case 'panda':
        P.limb = '#1f2937';
        P.tail = '<g class="tail" style="transform-origin:110px 148px"><circle cx="110" cy="147" r="8.5" fill="#fff" stroke="#9aa5b1" stroke-width="2.5"/></g>';
        P.back =
          '<g class="ear" style="transform-origin:42px 36px"><circle cx="41" cy="31" r="13" fill="#1f2937"/></g>' +
          '<g class="ear ear2" style="transform-origin:98px 36px"><circle cx="99" cy="31" r="13" fill="#1f2937"/></g>';
        P.face =
          '<ellipse cx="53" cy="68" rx="11.5" ry="14" transform="rotate(24 53 68)" fill="#1f2937"/>' +
          '<ellipse cx="87" cy="68" rx="11.5" ry="14" transform="rotate(-24 87 68)" fill="#1f2937"/>' +
          nose(70, 76, 6, 4.2, a.nose);
        break;

      case 'leon':
        P.tail =
          '<g class="tail" style="transform-origin:104px 144px"><path d="M104 144Q130 146 127 120" fill="none" stroke="' + ol + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M104 144Q130 146 127 120" fill="none" stroke="' + fur + '" stroke-width="5" stroke-linecap="round"/>' +
          '<ellipse cx="127" cy="115" rx="7.5" ry="10" fill="' + a.inner + '" stroke="' + Color.shade(a.inner, -0.3) + '" stroke-width="2"/></g>';
        P.mane = (function () {
          let s = '<g class="mane">';
          for (let i = 0; i < 14; i++) {
            const t = (i / 14) * Math.PI * 2;
            s += '<circle cx="' + (70 + Math.cos(t) * 41).toFixed(1) + '" cy="' + (63 + Math.sin(t) * 41).toFixed(1) + '" r="15" fill="' + a.inner + '" stroke="' + Color.shade(a.inner, -0.3) + '" stroke-width="2.2"/>';
          }
          s += '<circle cx="70" cy="63" r="44" fill="' + a.inner + '"/></g>';
          return s;
        })();
        P.back =
          '<g class="ear" style="transform-origin:44px 34px"><circle cx="44" cy="30" r="10" fill="' + fur + '"' + st + '/><circle cx="44" cy="31" r="5" fill="#d98a3a"/></g>' +
          '<g class="ear ear2" style="transform-origin:96px 34px"><circle cx="96" cy="30" r="10" fill="' + fur + '"' + st + '/><circle cx="96" cy="31" r="5" fill="#d98a3a"/></g>';
        P.face = muzzle(17, 12.5, a.muzzle) + '<path d="M64.5 74H75.5L70 80Z" fill="' + a.nose + '" stroke="' + a.nose + '" stroke-width="1.8" stroke-linejoin="round"/>';
        break;

      case 'cerdito':
        P.tail = '<g class="tail" style="transform-origin:106px 146px"><path d="M106 146Q120 142 116 134Q111 129 108 136" fill="none" stroke="' + ol + '" stroke-width="8" stroke-linecap="round"/><path d="M106 146Q120 142 116 134Q111 129 108 136" fill="none" stroke="' + fur + '" stroke-width="4" stroke-linecap="round"/></g>';
        P.back =
          '<g class="ear" style="transform-origin:46px 38px"><ellipse cx="41" cy="28" rx="12" ry="16" transform="rotate(-28 41 28)" fill="' + fur + '"' + st + '/><ellipse cx="42" cy="29" rx="6" ry="9" transform="rotate(-28 42 29)" fill="' + a.inner + '"/></g>' +
          '<g class="ear ear2" style="transform-origin:94px 38px"><ellipse cx="99" cy="28" rx="12" ry="16" transform="rotate(28 99 28)" fill="' + fur + '"' + st + '/><ellipse cx="98" cy="29" rx="6" ry="9" transform="rotate(28 98 29)" fill="' + a.inner + '"/></g>';
        P.face =
          '<ellipse cx="70" cy="77" rx="14" ry="9.5" fill="' + a.muzzle + '" stroke="' + Color.shade(a.muzzle, -0.2) + '" stroke-width="2"/>' +
          '<ellipse cx="64.5" cy="77" rx="2.3" ry="3.4" fill="' + a.nose + '"/><ellipse cx="75.5" cy="77" rx="2.3" ry="3.4" fill="' + a.nose + '"/>';
        break;
    }
    return P;
  }

  function markup(profile, level, opts) {
    opts = opts || {};
    const a = byId(profile && profile.animal);
    const P = parts(a);
    const id = ++uid;
    const lv = Math.max(1, level | 0);
    const mood = opts.mood || 'happy';
    const emblem = opts.emblem || EMBLEM;
    const fur = a.fur;
    const lo = ' stroke="' + Color.shade(P.limb, -0.3) + '" stroke-width="2"';
    const phase = (-Math.random() * 4).toFixed(2) + 's';

    let s = '<svg class="mascot pet" data-mood="' + mood + '" data-animal="' + a.id + '" style="--d:' + phase + '" viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + a.name + '">';
    s += '<defs>' +
      '<linearGradient id="sh' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a9bf0"/><stop offset="1" stop-color="#0a63ad"/></linearGradient>' +
      '<radialGradient id="au' + id + '"><stop offset="0" stop-color="#ffe27a" stop-opacity=".95"/><stop offset=".6" stop-color="#ffc933" stop-opacity=".45"/><stop offset="1" stop-color="#ffc933" stop-opacity="0"/></radialGradient>' +
      '</defs>';
    if (opts.standalone) s += '<style>' + MOOD_CSS + '</style>';

    if (lv >= 8) {
      s += '<g class="acc acc-aura"><circle cx="70" cy="98" r="76" fill="url(#au' + id + ')"/>' +
        '<path class="spark" d="M14 44l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff6c8"/>' +
        '<path class="spark" d="M124 30l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z" fill="#fff6c8"/>' +
        '<path class="spark" d="M126 122l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff6c8"/></g>';
    }
    s += '<ellipse class="pet-shadow" cx="70" cy="165" rx="42" ry="5.5" fill="rgba(0,25,60,.25)"/>';

    /* Todo el animal (brinca y se estira desde los pies) */
    s += '<g class="pet-move">';
    s += P.tail;
    if (lv >= 5) {
      s += '<g class="acc acc-cape"><path d="M34 104Q70 92 106 104L128 156Q70 140 12 156Z" fill="#c92d2d"/>' +
        '<path d="M34 104Q70 92 106 104L118 134Q70 122 22 134Z" fill="#ef4444"/></g>';
    }

    /* Cuerpo: respira */
    s += '<g class="pet-body">';
    s += '<rect x="48" y="144" width="17" height="19" rx="7" fill="' + P.limb + '"' + lo + '/><rect x="75" y="144" width="17" height="19" rx="7" fill="' + P.limb + '"' + lo + '/>';
    s += '<rect x="42" y="156" width="27" height="11" rx="5.5" fill="' + INK + '"/><rect x="71" y="156" width="27" height="11" rx="5.5" fill="' + INK + '"/>';
    s += '<rect x="38" y="103" width="64" height="48" rx="15" fill="url(#sh' + id + ')"/>';
    s += '<path d="M58 103L70 118L82 103Z" fill="#fff"/>';
    s += '<image href="' + emblem + '" x="59" y="122" width="22" height="24" opacity=".92"/>';
    s += '<rect x="61" y="94" width="18" height="14" rx="5" fill="' + (a.id === 'panda' ? '#e5e7eb' : Color.shade(fur, -0.12)) + '"/>';
    if (lv >= 4) s += '<g class="acc acc-bow"><path d="M70 112L53 103V121Z" fill="#ef4444"/><path d="M70 112L87 103V121Z" fill="#ef4444"/><circle cx="70" cy="112" r="5" fill="#b91c1c"/></g>';
    if (lv >= 6) {
      s += '<g class="acc acc-medal"><path d="M84 106L92 130M100 106L92 130" stroke="#1a7fd1" stroke-width="4.5" stroke-linecap="round"/>' +
        '<circle cx="92" cy="135" r="8.5" fill="#ffc933" stroke="#e09b00" stroke-width="2.2"/>' +
        '<path d="M92 129.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.9-3.4 1.9.7-3.8-2.8-2.6 3.8-.5z" fill="#fff6c8"/></g>';
    }
    s += '</g>';

    /* Brazos: cada uno se mueve por su lado (el envoltorio es para los saludos) */
    s += '<g class="armw armw-l"><g class="arm arm-l"><rect x="14" y="108" width="30" height="13" rx="6.5" fill="' + P.limb + '"' + lo + '/><circle cx="15" cy="114.5" r="8.5" fill="' + P.limb + '"' + lo + '/><rect x="32" y="105" width="15" height="19" rx="7" fill="#0a63ad"/></g></g>';
    s += '<g class="armw armw-r"><g class="arm arm-r"><rect x="96" y="108" width="30" height="13" rx="6.5" fill="' + P.limb + '"' + lo + '/><circle cx="125" cy="114.5" r="8.5" fill="' + P.limb + '"' + lo + '/><rect x="93" y="105" width="15" height="19" rx="7" fill="#0a63ad"/></g></g>';

    /* Cabeza: se inclina y mira a los lados */
    s += '<g class="pet-headpose"><g class="pet-head">';
    s += P.mane + P.back;
    s += '<circle cx="70" cy="62" r="39" fill="' + fur + '" stroke="' + P.ol + '" stroke-width="2.5"/>';
    s += P.face;
    s += '<circle cx="44" cy="79" r="6" fill="#ff8fb1" opacity=".42"/><circle cx="96" cy="79" r="6" fill="#ff8fb1" opacity=".42"/>';
    s += '<g class="e e-normal"><circle cx="54" cy="66" r="9.5" fill="#fff"/><circle cx="86" cy="66" r="9.5" fill="#fff"/>' +
      '<g class="pupils"><circle cx="55.5" cy="68" r="5" fill="' + INK + '"/><circle cx="87.5" cy="68" r="5" fill="' + INK + '"/>' +
      '<circle cx="57.6" cy="65.6" r="1.9" fill="#fff"/><circle cx="89.6" cy="65.6" r="1.9" fill="#fff"/></g></g>';
    s += '<g class="e e-joy" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"><path d="M44 70Q54 57 64 70"/><path d="M76 70Q86 57 96 70"/></g>';
    s += '<g class="e e-oops"><circle cx="54" cy="67" r="9" fill="#fff"/><circle cx="86" cy="67" r="9" fill="#fff"/>' +
      '<circle cx="54.5" cy="71" r="4.2" fill="' + INK + '"/><circle cx="86.5" cy="71" r="4.2" fill="' + INK + '"/>' +
      '<path d="M42 56L64 51M98 56L76 51" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/></g>';
    s += '<g class="e e-worry"><circle cx="54" cy="66" r="11" fill="#fff"/><circle cx="86" cy="66" r="11" fill="#fff"/>' +
      '<circle cx="54" cy="66" r="3.2" fill="' + INK + '"/><circle cx="86" cy="66" r="3.2" fill="' + INK + '"/>' +
      '<path d="M41 54L65 48M99 54L75 48" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/></g>';
    s += '<g class="m m-happy"><path d="M60 85Q70 94 80 85" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/></g>';
    s += '<g class="m m-joy"><path d="M57 83Q70 104 83 83Z" fill="' + INK + '"/><ellipse cx="70" cy="93.5" rx="6.5" ry="3.6" fill="#ff7a8a"/></g>';
    s += '<g class="m m-oops"><path d="M61 93Q70 83 79 93" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/></g>';
    s += '<g class="m m-worry"><ellipse cx="70" cy="91" rx="4.6" ry="6.2" fill="' + INK + '"/></g>';
    s += '<path class="sweat" d="M115 40c-4 6-6 9-6 11a6 6 0 0 0 12 0c0-2-2-5-6-11z" fill="#7fd4ff" stroke="#3aa8e8" stroke-width="1.5"/>';
    if (lv >= 2) {
      s += '<g class="acc acc-glasses" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round">' +
        '<circle cx="54" cy="66" r="12.5" fill="#fff" fill-opacity=".15"/><circle cx="86" cy="66" r="12.5" fill="#fff" fill-opacity=".15"/>' +
        '<path d="M66.5 65H73.5M41.5 64L34 62M98.5 64L106 62"/></g>';
    }
    if (lv >= 7) {
      s += '<g class="acc acc-crown"><path d="M40 33L45 7L58 21L70 3L82 21L95 7L100 33Z" fill="#ffc933" stroke="#e09b00" stroke-width="2.6" stroke-linejoin="round"/>' +
        '<circle cx="45" cy="7" r="3.4" fill="#ef4444"/><circle cx="70" cy="3" r="3.4" fill="#22b35e"/><circle cx="95" cy="7" r="3.4" fill="#2f7fe0"/></g>';
    } else if (lv >= 3) {
      s += '<g class="acc acc-cap"><path d="M45 34Q70 46 95 34V46Q70 58 45 46Z" fill="#14233d"/>' +
        '<path d="M20 30L70 9L120 30L70 47Z" fill="' + INK + '"/>' +
        '<path d="M114 33V56" stroke="#ffc933" stroke-width="3" stroke-linecap="round"/><circle cx="114" cy="58" r="4.5" fill="#ffc933"/></g>';
    }
    s += '</g></g>';           // pet-head, pet-headpose
    s += '</g>';               // pet-move
    s += '<g class="pet-fx"></g></svg>';
    return s;
  }

  /* ───────── Movimientos con GSAP ───────── */
  const pets = new Set();
  const q = (svg, sel) => svg.querySelector(sel);
  const busy = (svg, sec) => { svg._busyUntil = performance.now() + sec * 1000; };

  function hop(svg, height, times) {
    const move = q(svg, '.pet-move');
    const tl = gsap.timeline();
    for (let i = 0; i < (times || 1); i++) {
      tl.to(move, { scaleX: 1.09, scaleY: 0.88, y: 0, svgOrigin: FEET, duration: 0.11, ease: 'power1.out' })
        .to(move, { scaleX: 0.94, scaleY: 1.09, y: -height, svgOrigin: FEET, duration: 0.2, ease: 'power2.out' })
        .to(move, { scaleX: 1, scaleY: 1, y: 0, svgOrigin: FEET, duration: 0.2, ease: 'power2.in' })
        .to(move, { scaleX: 1.07, scaleY: 0.92, svgOrigin: FEET, duration: 0.07 })
        .to(move, { scaleX: 1, scaleY: 1, svgOrigin: FEET, duration: 0.22, ease: 'back.out(3)' });
    }
    return tl;
  }

  function wiggle(svg) {
    const move = q(svg, '.pet-move');
    return gsap.timeline()
      .to(move, { rotation: -6, svgOrigin: FEET, duration: 0.14, ease: 'sine.inOut' })
      .to(move, { rotation: 5, svgOrigin: FEET, duration: 0.18, ease: 'sine.inOut' })
      .to(move, { rotation: -3, svgOrigin: FEET, duration: 0.16, ease: 'sine.inOut' })
      .to(move, { rotation: 0, svgOrigin: FEET, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
  }

  function stretch(svg) {
    const move = q(svg, '.pet-move');
    return gsap.timeline()
      .to(move, { scaleY: 1.1, scaleX: 0.95, svgOrigin: FEET, duration: 0.5, ease: 'sine.inOut' })
      .to(move, { scaleY: 1, scaleX: 1, svgOrigin: FEET, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
  }

  /* Inclina la cabeza con curiosidad */
  function curious(svg) {
    const head = q(svg, '.pet-headpose');
    const dir = Math.random() < 0.5 ? -1 : 1;
    return gsap.timeline()
      .to(head, { rotation: 11 * dir, x: 2 * dir, svgOrigin: NECK, duration: 0.35, ease: 'back.out(2)' })
      .to(head, { rotation: 11 * dir, duration: rand(0.5, 1) })
      .to(head, { rotation: 0, x: 0, svgOrigin: NECK, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }

  /* Mira a un lado y a otro moviendo solo las pupilas */
  function look(svg) {
    const p = q(svg, '.pupils');
    if (!p) return;
    const x = rand(2.2, 3.4) * (Math.random() < 0.5 ? -1 : 1);
    gsap.timeline()
      .to(p, { x, y: rand(-1.5, 1), duration: 0.18, ease: 'power2.out' })
      .to(p, { x: -x, duration: 0.2, delay: 0.55, ease: 'power2.inOut' })
      .to(p, { x: 0, y: 0, duration: 0.2, delay: 0.5, ease: 'power2.out' });
  }

  /* Saluda con un brazo */
  function wave(svg) {
    const right = Math.random() < 0.5;
    const arm = q(svg, right ? '.armw-r' : '.armw-l');
    const o = right ? '100 114' : '40 114', k = right ? -1 : 1;
    gsap.timeline()
      .to(arm, { rotation: 150 * k, svgOrigin: o, duration: 0.32, ease: 'back.out(1.6)' })
      .to(arm, { rotation: 125 * k, svgOrigin: o, duration: 0.14, repeat: 5, yoyo: true, ease: 'sine.inOut' })
      .to(arm, { rotation: 0, svgOrigin: o, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    const head = q(svg, '.pet-headpose');
    gsap.to(head, { rotation: 6 * -k, svgOrigin: NECK, duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' });
  }

  /* Pequeños efectos que salen de la cabeza: corazones, estrellas, gotita de sudor */
  const STAR = 'M0-10l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L0 4.9l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';
  function emote(svg, kind, count) {
    const fx = q(svg, '.pet-fx');
    if (!fx) return;
    for (let i = 0; i < (count || 1); i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      let d, fill;
      if (kind === 'heart') { d = 'M0 3C-6-3-11 1-8 6S0 13 0 13 5 10 8 6 6-3 0 3z'; fill = '#ff4f8b'; }
      else if (kind === 'star') { d = STAR; fill = '#ffc933'; }
      else { d = 'M0-8C-4-2-6 1-6 3a6 6 0 0 0 12 0c0-2-2-5-6-11z'; fill = '#7fd4ff'; }
      g.innerHTML = '<path d="' + d + '" fill="' + fill + '" stroke="#fff" stroke-width="1.5"/>';
      fx.appendChild(g);
      const sweat = kind === 'sweat';
      const x0 = sweat ? 112 : 70 + rand(-34, 34), y0 = sweat ? 44 : 26;
      gsap.fromTo(g, { x: x0, y: y0, scale: 0.2, opacity: 0 }, {
        x: x0 + (sweat ? 3 : rand(-14, 14)), y: y0 + (sweat ? 18 : -rand(18, 30)),
        scale: sweat ? 0.9 : rand(0.8, 1.2), opacity: 1, duration: sweat ? 0.5 : 0.7, delay: i * 0.12, ease: 'power2.out',
        onComplete: () => gsap.to(g, { opacity: 0, duration: 0.35, onComplete: () => g.remove() })
      });
    }
  }

  /* Celebración: se agacha, brinca con estirón, echa la cabeza atrás y suelta corazones y estrellas */
  function celebrate(svg) {
    const move = q(svg, '.pet-move'), head = q(svg, '.pet-headpose');
    gsap.killTweensOf([move, head]);
    busy(svg, 1.4);
    gsap.timeline()
      .to(move, { scaleX: 1.14, scaleY: 0.84, y: 0, rotation: 0, svgOrigin: FEET, duration: 0.11, ease: 'power1.out' })
      .to(move, { scaleX: 0.92, scaleY: 1.13, y: -30, rotation: 6, svgOrigin: FEET, duration: 0.24, ease: 'power2.out' })
      .to(move, { scaleX: 1, scaleY: 1, y: 0, rotation: -3, svgOrigin: FEET, duration: 0.24, ease: 'power2.in' })
      .to(move, { scaleX: 1.1, scaleY: 0.88, rotation: 0, svgOrigin: FEET, duration: 0.08 })
      .to(move, { scaleX: 1, scaleY: 1, svgOrigin: FEET, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    gsap.timeline()
      .to(head, { rotation: -9, y: -1, svgOrigin: NECK, duration: 0.25, delay: 0.12, ease: 'power2.out' })
      .to(head, { rotation: 7, svgOrigin: NECK, duration: 0.3, ease: 'sine.inOut' })
      .to(head, { rotation: 0, y: 0, svgOrigin: NECK, duration: 0.45, ease: 'elastic.out(1, 0.5)' });
    emote(svg, Math.random() < 0.5 ? 'heart' : 'star', 3);
  }

  /* Se equivocó: la cabeza cae un poco, se encoge y niega moviéndola */
  function oops(svg) {
    const move = q(svg, '.pet-move'), head = q(svg, '.pet-headpose');
    gsap.killTweensOf([move, head]);
    busy(svg, 1.2);
    gsap.timeline()
      .to(move, { scaleY: 0.92, scaleX: 1.05, svgOrigin: FEET, duration: 0.14, ease: 'power2.out' })
      .to(move, { scaleY: 1, scaleX: 1, svgOrigin: FEET, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
    gsap.timeline()
      .to(head, { y: 4, rotation: -8, svgOrigin: NECK, duration: 0.18, ease: 'power2.out' })
      .to(head, { rotation: 8, svgOrigin: NECK, duration: 0.12 })
      .to(head, { rotation: -6, svgOrigin: NECK, duration: 0.12 })
      .to(head, { rotation: 5, svgOrigin: NECK, duration: 0.12 })
      .to(head, { rotation: 0, y: 0, svgOrigin: NECK, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    emote(svg, 'sweat', 1);
  }

  /* Acciones al azar cuando está tranquilo (cada animal a su ritmo) */
  function idleAction(svg) {
    const r = Math.random();
    if (r < 0.2) { hop(svg, rand(7, 13), Math.random() < 0.3 ? 2 : 1); busy(svg, 1.3); }
    else if (r < 0.42) { curious(svg); busy(svg, 1.6); }
    else if (r < 0.6) { look(svg); busy(svg, 1.6); }
    else if (r < 0.74) { wave(svg); busy(svg, 2); }
    else if (r < 0.84) { wiggle(svg); busy(svg, 0.9); }
    else if (r < 0.94) { stretch(svg); busy(svg, 1.3); }
    else { emote(svg, 'heart', 1); hop(svg, 6, 1); busy(svg, 1); }
  }

  setInterval(() => {
    if (document.hidden || typeof gsap === 'undefined') return;
    const now = performance.now();
    pets.forEach(svg => {
      if (!svg.isConnected) { pets.delete(svg); return; }
      if (!svg.getBoundingClientRect().width) return;
      if ((svg._busyUntil || 0) > now) return;
      const mood = svg.getAttribute('data-mood');
      if (mood === 'worry') return;
      if (!svg._next) svg._next = now + rand(600, 3000);
      if (now < svg._next) return;
      const calm = !!svg.closest('.animal:not(.sel), .rp');
      if (mood === 'joy') celebrate(svg); else idleAction(svg);
      svg._next = now + (mood === 'joy' ? rand(1600, 2600) : (calm ? rand(6000, 14000) : rand(2200, 5000)));
    });
  }, 300);

  function render(el, profile, level, mood) {
    el.innerHTML = markup(profile, level, { mood });
    const svg = el.querySelector('.pet');
    pets.add(svg);
    if (mood === 'joy') setTimeout(() => svg.isConnected && celebrate(svg), 250);
  }

  function setMood(el, mood) {
    const svg = el.querySelector('.pet');
    if (!svg) return;
    const prev = svg.getAttribute('data-mood');
    svg.setAttribute('data-mood', mood);
    if (typeof gsap === 'undefined' || prev === mood) return;
    if (mood === 'joy') celebrate(svg);
    else if (mood === 'oops') oops(svg);
    else if (mood === 'worry') emote(svg, 'sweat', 1);
  }

  /* Imagen PNG del personaje (para el reporte PDF). Devuelve null si el navegador no la puede generar. */
  function toPng(profile, level, mood, px) {
    return new Promise(resolve => {
      try {
        const svg = markup(profile, level, { mood, standalone: true, emblem: (typeof REPORT_ASSETS !== 'undefined' && REPORT_ASSETS.iconWhite) || EMBLEM });
        const img = new Image();
        img.onload = () => {
          try {
            const w = px, h = Math.round(px * 170 / 140);
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/png'));
          } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } catch (e) { resolve(null); }
    });
  }

  return { markup, render, setMood, toPng, unlock, ANIMALS, byId };
})();
