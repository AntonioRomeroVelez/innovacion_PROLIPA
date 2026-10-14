/* =============================================================
   ESCENA.JS — el escenario "mia"
   -------------------------------------------------------------
   Una lectura puede traer un dibujo que la acompañe: lo elige con
   `escenario: 'mia'` en su texto.js. Si no pone nada, la página muestra solo
   el texto.

   Este escenario dibuja con código SVG (sin imágenes) la biblioteca, el cielo,
   la sierra, la selva, la costa, y a Mía bajando en su paracaídas de siete
   colores sobre el libro volador.

   PARA HACER OTRO ESCENARIO se registra con el mismo contorno:

     Escenarios.miOtro = {
       montar(svg)        dibuja todo dentro del <svg>
       ir(nombre, op)     cambia de lugar (los nombres son los `escena:` de cada página);
                          op.instantaneo = sin animación
       efecto(nombre)     lo que pasa cuando una parte trae `efecto: '...'`
       celebrar()         pequeña fiesta cuando el estudiante lee bien
     };
   ============================================================= */
(function (raiz) {
  'use strict';

  var ANCHO = 960, ALTO = 540;

  /* ---------- números "al azar" repetibles, para que el paisaje no cambie ---------- */
  function azar(semilla) {
    var a = semilla >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- una curva suave que pasa por varios puntos ---------- */
  function curva(pts) {
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) +
           ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }

  /* una cordillera: línea irregular y suave, cerrada hacia abajo */
  function cordillera(semilla, base, alto, paso, picos) {
    var r = azar(semilla), pts = [], x;
    for (x = -paso; x <= ANCHO + paso; x += paso) {
      var cima = picos ? (r() > 0.55 ? r() * alto : r() * alto * 0.35) : r() * alto;
      pts.push([x, base - cima]);
    }
    return curva(pts) + ' L' + (ANCHO + paso) + ',' + ALTO + ' L' + (-paso) + ',' + ALTO + ' Z';
  }

  function nube(x, y, e, color) {
    return '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')" fill="' + color + '">' +
      '<ellipse cx="0" cy="0" rx="62" ry="22"/><ellipse cx="-34" cy="-14" rx="34" ry="24"/>' +
      '<ellipse cx="6" cy="-24" rx="40" ry="28"/><ellipse cx="42" cy="-8" rx="30" ry="20"/></g>';
  }

  /* nubes que pasan de un lado a otro, a distintas velocidades */
  function nubes(colores, semilla) {
    var r = azar(semilla), out = '';
    for (var i = 0; i < 7; i++) {
      var y = 40 + r() * 230, e = 0.6 + r() * 0.9;
      var dur = 70 + r() * 80, retraso = -r() * dur;
      out += '<g class="deriva" style="animation-duration:' + dur.toFixed(0) + 's;animation-delay:' + retraso.toFixed(0) + 's">' +
             nube(0, y, e, colores[i % colores.length]) + '</g>';
    }
    return out;
  }

  /* ============================================================
     LOS LUGARES
     ============================================================ */

  function castilloLejano(color, techo) {
    return '<g transform="translate(730,150) scale(.8)">' +
      '<ellipse cx="0" cy="92" rx="120" ry="26" fill="#6a4a36"/>' +
      '<path d="M-120,92 Q0,60 120,92 Q60,70 0,70 Q-60,70 -120,92Z" fill="#5fae6a"/>' +
      '<rect x="-46" y="10" width="92" height="64" fill="' + color + '"/>' +
      '<rect x="-72" y="30" width="30" height="46" fill="' + color + '"/><rect x="42" y="30" width="30" height="46" fill="' + color + '"/>' +
      '<polygon points="-76,30 -57,-4 -38,30" fill="' + techo + '"/><polygon points="38,30 57,-4 76,30" fill="' + techo + '"/>' +
      '<polygon points="-30,10 0,-44 30,10" fill="' + techo + '"/>' +
      '<rect x="-6" y="44" width="12" height="30" rx="6" fill="#4a3b5c"/></g>';
  }

  function cielo(id, g, tinteNubes, atardecer) {
    return '<g id="e-' + id + '" class="esc">' +
      '<rect width="' + ANCHO + '" height="' + ALTO + '" fill="url(#' + g + ')"/>' +
      '<circle cx="800" cy="' + (atardecer ? 330 : 110) + '" r="' + (atardecer ? 150 : 90) + '" fill="url(#gSol' + (atardecer ? 'B' : 'A') + ')"/>' +
      (atardecer ? '<circle cx="800" cy="330" r="46" fill="#ffe9a8"/>' : '') +
      castilloLejano(atardecer ? '#d9b8c9' : '#e8e4ee', atardecer ? '#5b4a8a' : '#4a5a9a') +
      nubes(tinteNubes, atardecer ? 7 : 3) +
      '</g>';
  }

  function libros(x0, x1, y0, filas, alto, sem, oscuro) {
    var r = azar(sem), out = '';
    var paleta = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#16a085', '#d35400', '#34495e', '#e84393'];
    for (var f = 0; f < filas; f++) {
      var x = x0 + 4, yBase = y0 + f * (alto + 10) + alto + 6;
      out += '<rect x="' + x0 + '" y="' + (yBase) + '" width="' + (x1 - x0) + '" height="8" fill="#6b4226"/>';
      while (x < x1 - 8) {
        var w = 9 + r() * 12, h = alto - r() * 16;
        out += '<rect x="' + x.toFixed(0) + '" y="' + (yBase - h).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) +
               '" rx="1.5" fill="' + paleta[Math.floor(r() * paleta.length)] + '"/>';
        x += w + 1.5;
      }
    }
    return out + '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (filas * (alto + 10) + 8) +
      '" fill="none" stroke="#6b4226" stroke-width="7"/>' +
      (oscuro ? '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (filas * (alto + 10) + 8) + '" fill="#0a0820" opacity=".5"/>' : '');
  }

  function biblioteca(id, noche) {
    var polvo = '', r = azar(11);
    for (var i = 0; i < 26; i++) {
      polvo += '<circle class="polvo" cx="' + (170 + r() * 620).toFixed(0) + '" cy="' + (90 + r() * 330).toFixed(0) + '" r="' + (1.2 + r() * 2).toFixed(1) +
               '" fill="#fff6c9" style="animation-duration:' + (6 + r() * 8).toFixed(1) + 's;animation-delay:-' + (r() * 8).toFixed(1) + 's"/>';
    }
    var estrellas = '';
    if (noche) {
      for (var k = 0; k < 28; k++) estrellas += '<circle cx="' + (360 + r() * 240).toFixed(0) + '" cy="' + (88 + r() * 150).toFixed(0) +
        '" r="' + (0.8 + r() * 1.4).toFixed(1) + '" fill="#fff" class="titila" style="animation-delay:-' + (r() * 3).toFixed(1) + 's"/>';
    }
    return '<g id="e-' + id + '" class="esc">' +
      '<rect width="' + ANCHO + '" height="' + ALTO + '" fill="url(#' + (noche ? 'gNoche' : 'gBiblio') + ')"/>' +
      /* la ventana grande del fondo */
      '<path d="M350,330 L350,150 Q350,70 480,70 Q610,70 610,150 L610,330Z" fill="' + (noche ? '#10204a' : '#ffe9a6') + '" stroke="#6b4226" stroke-width="10"/>' +
      (noche
        ? '<circle cx="540" cy="140" r="26" fill="#fff8d6"/><circle cx="552" cy="132" r="22" fill="#10204a"/>' + estrellas
        : '<path d="M350,330 L610,330 L690,540 L270,540Z" fill="url(#gRayo)" opacity=".7"/>') +
      '<line x1="480" y1="70" x2="480" y2="330" stroke="#6b4226" stroke-width="6"/><line x1="350" y1="200" x2="610" y2="200" stroke="#6b4226" stroke-width="6"/>' +
      libros(30, 300, 70, 4, 56, 21, noche) + libros(660, 930, 70, 4, 56, 34, noche) +
      /* piso y mesa */
      '<rect x="0" y="448" width="' + ANCHO + '" height="92" fill="' + (noche ? '#3b2418' : '#a56a3c') + '"/>' +
      '<rect x="0" y="448" width="' + ANCHO + '" height="6" fill="' + (noche ? '#2a190f' : '#8a5530') + '"/>' +
      '<rect x="350" y="462" width="260" height="22" rx="6" fill="' + (noche ? '#6a4326' : '#c98c52') + '"/>' +
      '<rect x="372" y="484" width="16" height="50" fill="' + (noche ? '#4a2f1b' : '#a56a3c') + '"/><rect x="572" y="484" width="16" height="50" fill="' + (noche ? '#4a2f1b' : '#a56a3c') + '"/>' +
      (noche ? '<circle cx="480" cy="420" r="210" fill="url(#gLampara)"/>' : '') +
      (noche ? '' : polvo) +
      '</g>';
  }

  function sierra(id) {
    var casas = '', r = azar(5);
    for (var i = 0; i < 6; i++) {
      var x = 90 + i * 70 + r() * 30, y = 462 - r() * 14;
      casas += '<rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="24" height="16" fill="#f1e2c6"/>' +
               '<polygon points="' + (x - 3).toFixed(0) + ',' + y.toFixed(0) + ' ' + (x + 12).toFixed(0) + ',' + (y - 11).toFixed(0) + ' ' + (x + 27).toFixed(0) + ',' + y.toFixed(0) + '" fill="#c0603a"/>';
    }
    var terrazas = '';
    for (var t = 0; t < 5; t++) terrazas += '<path d="M0,' + (400 + t * 26) + ' Q480,' + (380 + t * 26) + ' 960,' + (410 + t * 26) + '" fill="none" stroke="#8fc472" stroke-width="3" opacity=".55"/>';
    return '<g id="e-' + id + '" class="esc">' +
      '<rect width="' + ANCHO + '" height="' + ALTO + '" fill="url(#gSierra)"/>' +
      '<circle cx="170" cy="105" r="80" fill="url(#gSolA)"/><circle cx="170" cy="105" r="30" fill="#fff6bf"/>' +
      nubes(['#ffffff', '#f4f9ff'], 9) +
      '<path d="' + cordillera(41, 330, 150, 130, true) + '" fill="#9fb6dc"/>' +
      '<path d="M250,200 l30,-48 l30,48 l-14,-9 l-16,13 l-16,-13z M610,214 l34,-56 l34,56 l-16,-10 l-18,14 l-18,-14z" fill="#fff" opacity=".9"/>' +
      '<path d="' + cordillera(77, 390, 120, 110, true) + '" fill="#6f9a86"/>' +
      '<g class="ave"><path d="M0,0 q16,-14 32,0 q16,-14 32,0 q-16,4 -32,10 q-16,-6 -32,-10z" fill="#2d3142"/></g>' +
      '<path d="' + cordillera(103, 470, 80, 100, false) + '" fill="#4a8a52"/>' + terrazas + casas +
      '<path d="M0,540 L0,500 Q300,470 960,505 L960,540Z" fill="#366b44"/>' +
      '</g>';
  }

  function arboles(semilla, y, n, tam, color, tronco) {
    var r = azar(semilla), out = '';
    for (var i = 0; i < n; i++) {
      var x = (i + r() * 0.8) * (ANCHO / n), e = tam * (0.7 + r() * 0.6);
      out += '<g transform="translate(' + x.toFixed(0) + ',' + y + ') scale(' + e.toFixed(2) + ')">' +
        '<rect x="-5" y="-10" width="10" height="70" fill="' + tronco + '"/>' +
        '<ellipse cx="0" cy="-28" rx="46" ry="38" fill="' + color + '"/><ellipse cx="-30" cy="-6" rx="34" ry="26" fill="' + color + '"/>' +
        '<ellipse cx="32" cy="-8" rx="36" ry="28" fill="' + color + '"/></g>';
    }
    return out;
  }

  function hoja(x, y, giro, e, color) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + giro + ') scale(' + e + ')">' +
      '<path d="M0,0 C60,-70 190,-60 250,0 C190,60 60,70 0,0Z" fill="' + color + '"/>' +
      '<path d="M0,0 L240,0" stroke="rgba(255,255,255,.28)" stroke-width="4" fill="none"/></g>';
  }

  function selva(id) {
    var lluvia = '', r = azar(8);
    for (var i = 0; i < 70; i++) {
      var x = (r() * ANCHO).toFixed(0), dur = (0.7 + r() * 0.8).toFixed(2), ret = (-r() * 2).toFixed(2);
      lluvia += '<line class="gota" x1="' + x + '" y1="-30" x2="' + (+x - 6) + '" y2="-10" style="animation-duration:' + dur + 's;animation-delay:' + ret + 's"/>';
    }
    return '<g id="e-' + id + '" class="esc">' +
      '<rect width="' + ANCHO + '" height="' + ALTO + '" fill="url(#gSelva)"/>' +
      arboles(2, 330, 9, 1.0, '#5cb97e', '#4a7d52') +
      '<rect y="250" width="' + ANCHO + '" height="130" fill="url(#gBruma)"/>' +
      arboles(6, 410, 6, 1.35, '#2e8b57', '#3f6a3a') +
      '<path d="M-20,540 Q200,450 430,486 T960,470 L960,540Z" fill="url(#gRio)"/>' +
      '<g stroke="rgba(255,255,255,.5)" stroke-width="3" fill="none" class="ondas">' +
        '<path d="M120,510 q20,-8 40,0 q20,8 40,0"/><path d="M420,500 q20,-8 40,0 q20,8 40,0"/><path d="M700,505 q20,-8 40,0 q20,8 40,0"/></g>' +
      hoja(-30, 540, -48, 1.15, '#1f6b45') + hoja(990, 540, -132, 1.15, '#1f6b45') + hoja(-20, 330, 22, 0.8, '#2a8a56') + hoja(985, 300, 158, 0.8, '#2a8a56') +
      '<g class="lluvia">' + lluvia + '</g>' +
      '</g>';
  }

  function palmera(x, y, e) {
    return '<g transform="translate(' + x + ',' + y + ') scale(' + e + ')">' +
      '<path d="M0,0 C14,-60 -6,-120 8,-170" stroke="#5a3a22" stroke-width="12" fill="none" stroke-linecap="round"/>' +
      '<g transform="translate(8,-170)" fill="#2f8f4e">' +
        '<path d="M0,0 C30,-40 80,-34 112,0 C74,-14 36,-12 0,0Z"/><path d="M0,0 C-30,-40 -80,-34 -112,0 C-74,-14 -36,-12 0,0Z"/>' +
        '<path d="M0,0 C20,-60 60,-80 96,-70 C64,-52 30,-34 0,0Z"/><path d="M0,0 C-20,-60 -60,-80 -96,-70 C-64,-52 -30,-34 0,0Z"/>' +
        '<path d="M0,0 C12,-30 14,-60 6,-92 C-8,-60 -10,-30 0,0Z"/></g></g>';
  }

  function costa(id) {
    var brillo = '';
    for (var i = 0; i < 9; i++) brillo += '<rect x="' + (790 - i * 6) + '" y="' + (336 + i * 15) + '" width="' + (36 + i * 12) + '" height="4" rx="2" fill="#ffe9a8" opacity="' + (0.8 - i * 0.07).toFixed(2) + '"/>';
    return '<g id="e-' + id + '" class="esc">' +
      '<rect width="' + ANCHO + '" height="' + ALTO + '" fill="url(#gCosta)"/>' +
      '<circle cx="800" cy="330" r="130" fill="url(#gSolB)"/><circle cx="800" cy="330" r="42" fill="#fff2b8"/>' +
      nubes(['#ffb59a', '#ffd0a8', '#f58aa0'], 12) +
      '<rect y="330" width="' + ANCHO + '" height="210" fill="url(#gMar)"/>' + brillo +
      '<path d="M150,334 l40,0 l-8,14 l-24,0z M168,334 l0,-34 l22,32z" fill="#3a2a4a"/>' +
      '<g class="olas"><path d="M-40,400 q60,-22 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 L1200,540 L-40,540Z" fill="#2b79ad" opacity=".55"/></g>' +
      '<g class="olas lenta"><path d="M-40,448 q70,-26 140,0 t140,0 t140,0 t140,0 t140,0 t140,0 t140,0 t140,0 L1200,540 L-40,540Z" fill="#1d5c8f" opacity=".75"/></g>' +
      '<path d="M520,540 Q700,470 960,490 L960,540Z" fill="#f2d49b"/><path d="M520,540 Q700,478 960,500" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/>' +
      palmera(840, 500, 1.0) + palmera(930, 520, 0.8) +
      '</g>';
  }

  /* ============================================================
     MÍA, EL LIBRO Y EL PARACAÍDAS
     (el punto (0,0) es el asiento de Mía, sobre el libro)
     ============================================================ */
  function viajera() {
    var colores = ['#ef476f', '#f78c40', '#ffd166', '#06d6a0', '#4cc9f0', '#4361ee', '#9d4edd'];
    var franjas = '';
    for (var i = 0; i < 7; i++) franjas += '<rect x="' + (-130 + i * 37.15).toFixed(1) + '" y="-240" width="38" height="100" fill="' + colores[i] + '"/>';
    var lineasDomo = '', puntos = [-130, -97, -65, -32, 0, 32, 65, 97, 130];
    for (var j = 1; j < 7; j++) lineasDomo += '<path d="M0,-234 Q' + (-130 + j * 37.15) * 0.55 + ',-215 ' + (-130 + j * 37.15) + ',-150" stroke="rgba(0,0,0,.14)" stroke-width="2" fill="none"/>';
    var cuerdas = '';
    puntos.forEach(function (px) {
      var mano = px < 0 ? -26 : px > 0 ? 26 : 0;
      cuerdas += '<line x1="' + px + '" y1="-152" x2="' + mano + '" y2="-98"/>';
    });

    return '<g id="viajera" class="cerrado">' +
      '<ellipse cx="0" cy="44" rx="86" ry="10" fill="#000" opacity=".16" class="sombra"/>' +
      '<g class="vaiven">' +
        /* paracaídas */
        '<g class="domo">' +
          '<clipPath id="clipDomo"><path d="M-130,-150 A130,88 0 0 1 130,-150 Q99,-136 65,-150 Q33,-137 0,-150 Q-33,-137 -65,-150 Q-99,-136 -130,-150Z"/></clipPath>' +
          '<g clip-path="url(#clipDomo)">' + franjas + '<ellipse cx="-40" cy="-205" rx="70" ry="22" fill="#fff" opacity=".2"/></g>' + lineasDomo +
        '</g>' +
        '<g class="cuerdas" stroke="#3b3b52" stroke-width="1.3" opacity=".8">' + cuerdas + '</g>' +
        /* el libro volador */
        '<polygon points="-92,10 0,0 92,10 92,44 0,36 -92,44" fill="#8b4a2b"/>' +
        '<polygon points="-84,10 -3,2 -3,34 -84,40" fill="#fffaf0" stroke="#d9c39a" stroke-width="2"/>' +
        '<polygon points="84,10 3,2 3,34 84,40" fill="#fffaf0" stroke="#d9c39a" stroke-width="2"/>' +
        '<g stroke="#e3d2ad" stroke-width="2"><line x1="-72" y1="16" x2="-12" y2="12"/><line x1="-72" y1="24" x2="-12" y2="20"/><line x1="72" y1="16" x2="12" y2="12"/><line x1="72" y1="24" x2="12" y2="20"/></g>' +
        '<g class="paginas"><polygon points="-84,10 -3,2 -40,-14 -100,-6" fill="#fff" opacity=".85"/><polygon points="84,10 3,2 40,-14 100,-6" fill="#fff" opacity=".85"/></g>' +
        /* Mía */
        '<g class="mia">' +
          '<rect x="-13" y="-14" width="11" height="44" rx="5" fill="#2b2d6e"/><rect x="2" y="-14" width="11" height="44" rx="5" fill="#2b2d6e"/>' +
          '<ellipse cx="-8" cy="33" rx="9" ry="5" fill="#2f80ed"/><ellipse cx="9" cy="33" rx="9" ry="5" fill="#2f80ed"/>' +
          '<rect x="-17" y="-68" width="34" height="58" rx="13" fill="#2ec4b6"/>' +
          '<path d="M-14,-62 L-25,-92" stroke="#2ec4b6" stroke-width="10" stroke-linecap="round"/><path d="M14,-62 L25,-92" stroke="#2ec4b6" stroke-width="10" stroke-linecap="round"/>' +
          '<circle cx="-26" cy="-98" r="5.5" fill="#f4c7a1"/><circle cx="26" cy="-98" r="5.5" fill="#f4c7a1"/>' +
          '<path d="M14,-100 C36,-104 44,-84 34,-66 C32,-78 26,-86 14,-88Z" fill="#2b2d42" class="coleta"/>' +
          '<circle cx="0" cy="-86" r="19" fill="#f4c7a1"/>' +
          '<path d="M-21,-88 C-24,-118 24,-118 21,-88 C14,-100 -14,-100 -21,-88Z" fill="#2b2d42"/>' +
          '<ellipse cx="-7" cy="-85" rx="2.6" ry="3.4" fill="#2b2d42"/><ellipse cx="7" cy="-85" rx="2.6" ry="3.4" fill="#2b2d42"/>' +
          '<circle cx="-6.2" cy="-86.2" r="1" fill="#fff"/><circle cx="7.8" cy="-86.2" r="1" fill="#fff"/>' +
          '<circle cx="-12" cy="-78" r="3.6" fill="#ff9aa2" opacity=".6"/><circle cx="12" cy="-78" r="3.6" fill="#ff9aa2" opacity=".6"/>' +
          '<path d="M-5,-77 Q0,-72 5,-77" stroke="#b5483a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '</g>' +
      '</g>' +
      '<g class="chispas"></g>' +
    '</g>';
  }

  /* ============================================================
     MONTAR TODO
     ============================================================ */
  var POSES = {
    biblioteca: { x: 480, y: 452, e: 0.78 },
    cielo:      { x: 480, y: 372, e: 1.0 },
    sierra:     { x: 330, y: 392, e: 0.92 },
    selva:      { x: 640, y: 360, e: 0.9 },
    costa:      { x: 560, y: 340, e: 0.95 },
    atardecer:  { x: 470, y: 372, e: 1.0 },
    noche:      { x: 480, y: 452, e: 0.78 }
  };

  var svg = null, nodo = null, actual = null;

  function defs() {
    function grad(id, paradas, h) {
      return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        paradas.map(function (p) { return '<stop offset="' + p[0] + '" stop-color="' + p[1] + '"/>'; }).join('') + '</linearGradient>';
    }
    function radial(id, c, op) {
      return '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + c + '" stop-opacity="' + op + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>';
    }
    return '<defs>' +
      grad('gCielo',     [[0, '#58b6ff'], [0.55, '#a9dcff'], [1, '#ffe3ec']]) +
      grad('gAtardecer', [[0, '#6f63cf'], [0.5, '#f08fa6'], [1, '#ffc78a']]) +
      grad('gBiblio',    [[0, '#f8e2bd'], [1, '#e2b985']]) +
      grad('gNoche',     [[0, '#3a2b55'], [1, '#1f1633']]) +
      grad('gSierra',    [[0, '#78c2ff'], [1, '#e0f1ff']]) +
      grad('gSelva',     [[0, '#cdeec9'], [1, '#86cf9d']]) +
      grad('gCosta',     [[0, '#5d54c8'], [0.55, '#ff7e7e'], [1, '#ffcf7a']]) +
      grad('gMar',       [[0, '#f6a35e'], [0.35, '#7a6bb0'], [1, '#1b4f86']]) +
      grad('gRio',       [[0, '#68d1de'], [1, '#2a9bb6']]) +
      grad('gBruma',     [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(235,250,235,.55)'], [1, 'rgba(255,255,255,0)']]) +
      '<linearGradient id="gRayo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0" stop-opacity=".85"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient>' +
      radial('gSolA', '#fff6bf', 0.95) + radial('gSolB', '#ffd9a0', 0.9) + radial('gLampara', '#ffd27a', 0.55) +
      '</defs>';
  }

  function montar(elementoSvg) {
    svg = elementoSvg;
    svg.setAttribute('viewBox', '0 0 ' + ANCHO + ' ' + ALTO);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.innerHTML = defs() +
      cielo('cielo', 'gCielo', ['#ffffff', '#f5faff'], false) +
      biblioteca('biblioteca', false) +
      sierra('sierra') +
      selva('selva') +
      costa('costa') +
      cielo('atardecer', 'gAtardecer', ['#ffb89a', '#ffd7b0', '#f59cb4'], true) +
      biblioteca('noche', true) +
      '<g id="viajera-pos">' + viajera() + '</g>';
    nodo = svg.querySelector('#viajera-pos');
    ir('biblioteca', { instantaneo: true });
  }

  function poner(pose, instantaneo) {
    nodo.style.transition = instantaneo ? 'none' : '';
    nodo.style.transform = 'translate(' + pose.x + 'px,' + pose.y + 'px) scale(' + pose.e + ')';
    if (instantaneo) { void nodo.getBoundingClientRect(); nodo.style.transition = ''; }
  }

  function ir(nombre, op) {
    op = op || {};
    if (!svg || !POSES[nombre]) return;
    svg.querySelectorAll('.esc').forEach(function (g) { g.classList.toggle('activa', g.id === 'e-' + nombre); });
    // al cambiar de lugar, Mía vuela hasta su nueva posición
    poner(POSES[nombre], !!op.instantaneo);
    actual = nombre;
    // En la noche (y al empezar) el paracaídas está cerrado, en el suelo.
    // En la biblioteca de la tarde lo abre el cuento (efecto "abrir"); en el
    // resto de lugares Mía va volando, con el paracaídas abierto.
    if (nombre === 'noche' || (nombre === 'biblioteca' && op.instantaneo)) paracaidas('cerrar', !!op.instantaneo);
    else if (nombre !== 'biblioteca') paracaidas('abrir', !!op.instantaneo);
  }

  /** abrir | cerrar | aterrizar */
  function paracaidas(accion, instantaneo) {
    var v = svg && svg.querySelector('#viajera');
    if (!v) return;
    if (instantaneo) v.style.transition = 'none';
    v.classList.remove('cerrado', 'media');
    if (accion === 'cerrar') v.classList.add('cerrado');
    if (accion === 'aterrizar') {
      // baja despacito, con el paracaídas cerrándose a medias
      v.classList.add('media');
      var p = POSES[actual];
      if (p) poner({ x: p.x, y: Math.min(p.y + 70, 470), e: p.e * 0.92 }, false);
    }
    if (instantaneo) { void v.getBoundingClientRect(); v.style.transition = ''; }
  }

  function celebrar() {
    var v = svg && svg.querySelector('#viajera');
    if (!v) return;
    v.classList.remove('salto'); void v.getBoundingClientRect(); v.classList.add('salto');
    var cont = v.querySelector('.chispas'), colores = ['#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#f78c40'];
    cont.innerHTML = '';
    for (var i = 0; i < 12; i++) {
      var ang = (i / 12) * Math.PI * 2, d = 90 + (i % 3) * 22;
      cont.innerHTML += '<circle cx="0" cy="-60" r="5" fill="' + colores[i % colores.length] + '" class="chispa" style="--dx:' +
        (Math.cos(ang) * d).toFixed(0) + 'px;--dy:' + (Math.sin(ang) * d).toFixed(0) + 'px"/>';
    }
    setTimeout(function () { cont.innerHTML = ''; v.classList.remove('salto'); }, 1100);
  }

  raiz.Escenarios = raiz.Escenarios || {};
  raiz.Escenarios.mia = {
    montar: montar,
    ir: ir,
    efecto: function (nombre) { paracaidas(nombre); },     // abrir | cerrar | aterrizar
    celebrar: celebrar
  };
})(window);
