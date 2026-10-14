/* Resta — lógica del juego: niveles, pantallas, preguntas, puntaje y modo explorar.
 *
 * Tres niveles de resta que se eligen en el inicio:
 *   1 cifra  (9 − 4)       cuadro general de 2 × 10: se muestran las cuentas del minuendo.
 *   2 cifras (47 − 23)     ábaco por columnas: Decenas y Unidades.
 *   3 cifras (568 − 235)   ábaco por columnas: Centenas, Decenas y Unidades.
 * En 2 y 3 cifras las restas son SIN CANJE: en cada columna el dígito del minuendo es mayor o igual
 * que el del sustraendo, así se pueden tachar las cuentas columna por columna.
 *
 * Flujo de cada pregunta (por ejemplo 47 − 23), igual en los tres niveles:
 *   1. El ábaco MUESTRA el minuendo: 4 cuentas de decenas y 7 de unidades.
 *   2. El niño TACHA con el dedo lo que indica el sustraendo: 2 decenas y 3 unidades.
 *      Cada cuenta tachada se ve opaca y con una X roja.
 *   3. Escribe la respuesta con el teclado en pantalla: un recuadro con el resultado (1 cifra) o un recuadro con
 *      el dígito de cada columna, debajo de ella (2 y 3 cifras).
 *   4. Toca "Comprobar": se revisa lo tachado y, si está bien, la respuesta.
 *
 * Usa GSAP (lib/gsap.min.js) para las animaciones; si no está cargada, el juego funciona igual sin ellas.
 * Archivo propio de la actividad de resta: no se comparte con las de suma ni multiplicación. */
(function (global) {
  'use strict';

  const POR_RONDA = 10;
  const MAX_UNA_CIFRA = 9;    // en 1 cifra el minuendo llega hasta 9 y el sustraendo hasta 8
  const $ = (id) => global.document.getElementById(id);

  const gs = global.gsap || null;
  const REDUCIR = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Ejecuta una animación solo si la librería está disponible y el usuario no pidió menos movimiento. */
  const anim = (fn) => { if (gs && !REDUCIR) fn(); };
  if (gs) global.document.documentElement.classList.add('gsap');

  const Sonido = global.SonidoResta;
  const Confeti = global.ConfetiResta;

  const LUGAR = [['centena', 'centenas'], ['decena', 'decenas'], ['unidad', 'unidades']];

  /* ---------- utilidades ---------- */
  const barajar = (lista) => {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const entre = (min, max) => min + Math.floor(Math.random() * (max - min + 1)); // entero entre min y max
  const pulso = (nodo) => {
    nodo.classList.remove('pulso');
    void nodo.offsetWidth;
    nodo.classList.add('pulso');
  };

  const ELOGIOS = ['¡Excelente!', '¡Muy bien!', '¡Genial!', '¡Lo lograste!', '¡Así se hace!'];

  /* Cada pregunta se juega con una fruta distinta: las cuentas del ábaco, las que viajan y las del recuadro de la
     suma son el dibujo de esa fruta (img/frutas/<archivo>.png); el color del disco sigue diciendo a qué número
     pertenece cada una. */
  const FRUTAS = [
    { f: 'manzana', s: 'manzana', p: 'manzanas' }, { f: 'pera', s: 'pera', p: 'peras' }, { f: 'pina', s: 'piña', p: 'piñas' },
    { f: 'banano', s: 'banano', p: 'bananos' }, { f: 'fresa', s: 'fresa', p: 'fresas' }, { f: 'naranja', s: 'naranja', p: 'naranjas' },
    { f: 'uvas', s: 'racimo de uvas', p: 'racimos de uvas' }, { f: 'sandia', s: 'sandía', p: 'sandías' },
    { f: 'cereza', s: 'cereza', p: 'cerezas' }, { f: 'mango', s: 'mango', p: 'mangos' }
  ];
  const urlFruta = (f) => 'url("' + new global.URL('img/frutas/' + f.f + '.png', global.document.baseURI).href + '")';
  FRUTAS.forEach((f) => { const im = new global.Image(); im.src = new global.URL('img/frutas/' + f.f + '.png', global.document.baseURI).href; }); // se precargan
  let fruta = FRUTAS[0];
  const fr = (n) => `${n} ${n === 1 ? fruta.s : fruta.p}`; // "1 pera", "3 peras"
  function elegirFruta() {
    let f;
    do { f = FRUTAS[Math.floor(Math.random() * FRUTAS.length)]; } while (f === fruta);
    fruta = f;
    global.document.documentElement.style.setProperty('--fruta', urlFruta(f));
  }

  /* "2 decenas y 3 unidades" a partir de los dígitos por columna (los ceros no se nombran). */
  function partesDe(digitos, lugares) {
    const partes = [];
    digitos.forEach((d, i) => { if (d > 0) partes.push(`${d} ${LUGAR[lugares[i]][d === 1 ? 0 : 1]}`); });
    if (partes.length < 2) return partes[0] || '';
    return partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
  }

  /* Resta sin canje de `cifras` cifras: cada dígito del sustraendo es menor o igual que el del minuendo. */
  function generarPar(cifras) {
    for (;;) {
      let a = 0;
      let b = 0;
      for (let i = 0; i < cifras; i++) {
        const md = i === 0 ? entre(2, 9) : entre(0, 9);   // la primera cifra nunca es 0 (y deja espacio para el sustraendo)
        // El sustraendo tacha algo en cada columna que tenga cuentas (así se practica cada lugar); en la
        // primera cifra nunca es 0 para que el sustraendo tenga `cifras` cifras.
        const sd = entre(md > 0 ? 1 : 0, md);
        a = a * 10 + md;
        b = b * 10 + sd;
      }
      if (a - b > 0) return { a: a, b: b };
    }
  }

  function generarMinuendo(cifras) {
    let a = entre(2, 9);
    for (let i = 1; i < cifras; i++) a = a * 10 + entre(0, 9);
    return a;
  }

  /* ---------- estado ---------- */
  const estado = {
    modo: 'jugar',
    nivel: 1,              // 1, 2 o 3 cifras
    puntos: 0,
    racha: 0,
    cola: [],         // preguntas pendientes; los errores se repiten al final
    indice: 0,
    perfectas: 0,
    falladas: [],
    q: null,          // pregunta en curso: a = minuendo, b = sustraendo
    erroresRespuesta: 0,
    resp: [],         // lo escrito en los recuadros de respuesta (un número en 1 cifra, un dígito por columna en 2 y 3); null = vacío
    activa: 0,        // recuadro de respuesta donde se escribe
    explorar: { a: 8, b: 3 }, // explorar en 1 cifra
    explorarMin: 0            // explorar en 2 y 3 cifras
  };

  let abaco = null;
  const posicional = () => estado.nivel > 1;

  /* ---------- pantallas ---------- */
  const PANTALLAS = ['pInicio', 'pJuego', 'pFin'];
  function mostrar(id) {
    PANTALLAS.forEach((p) => { $(p).hidden = p !== id; });
    $('btnInicio').hidden = id === 'pInicio';
    $('barra').dataset.pantalla = id;
    if (id === 'pJuego' && abaco) abaco.medir();
    global.scrollTo(0, 0);
    anim(() => gs.fromTo('#' + id, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'opacity,transform' }));
  }

  /* El mensaje se lee siempre (aria-live) pero, jugando, solo se ve un momento, en el lugar de las pestañas; la instrucción
     inicial de cada pregunta es "silenciosa" (no se muestra). */
  let relojAviso = null;
  function decir(texto, silencioso) {
    $('mensaje').textContent = texto;
    const globo = global.document.querySelector('.fila-pregunta .globo');
    global.clearTimeout(relojAviso);
    const quitar = () => { globo.classList.remove('aviso'); globo.parentElement.classList.remove('con-aviso'); };
    if (silencioso) quitar();
    else {
      globo.classList.add('aviso');
      globo.parentElement.classList.add('con-aviso'); // las pestañas se esconden mientras se lee el mensaje
      relojAviso = global.setTimeout(quitar, 4000);
    }
  }

  /* La mascota reacciona: salta si acierta, niega con la cabeza si falla. */
  function reaccion(tipo) {
    anim(() => {
      const m = global.document.querySelector('.globo-mascota');
      gs.killTweensOf(m);
      gs.set(m, { x: 0, y: 0, rotation: 0 });
      if (tipo === 'bien') {
        gs.to(m, { keyframes: [
          { y: -16, rotation: -14, duration: 0.18, ease: 'power2.out' },
          { y: 0, rotation: 14, duration: 0.18, ease: 'power2.in' },
          { y: -8, rotation: -6, duration: 0.14, ease: 'power2.out' },
          { y: 0, rotation: 0, duration: 0.14, ease: 'power2.in' }
        ] });
      } else {
        gs.to(m, { keyframes: [
          { x: -7, duration: 0.07 }, { x: 7, duration: 0.07 }, { x: -5, duration: 0.07 }, { x: 5, duration: 0.07 }, { x: 0, duration: 0.07 }
        ] });
      }
    });
  }

  /* ---------- inicio: nivel y fichas de números ---------- */
  const PASOS = {
    1: [
      '<b>Mira</b> la resta, por ejemplo <b>9 − 4</b>: el ábaco muestra <b>9</b> frutas.',
      '<b>Tacha</b> con el dedo o el mouse <b>4</b> frutas.',
      '<b>Escribe</b> en el recuadro de abajo cuántas quedan sin tachar y toca <b>Comprobar</b>.'
    ],
    2: [
      '<b>Mira</b> la resta, por ejemplo <b>47 − 23</b>: el ábaco muestra <b>4</b> decenas y <b>7</b> unidades.',
      '<b>Tacha</b> en cada columna lo que se resta: <b>2</b> decenas y <b>3</b> unidades.',
      '<b>Mira</b> a la derecha el número y lo que llevas tachado.',
      '<b>Escribe</b> en los recuadros de abajo lo que queda en cada columna, empezando por las unidades, y toca <b>Comprobar</b>.'
    ],
    3: [
      '<b>Mira</b> la resta, por ejemplo <b>568 − 235</b>: el ábaco muestra <b>5</b> centenas, <b>6</b> decenas y <b>8</b> unidades.',
      '<b>Tacha</b> en cada columna lo que se resta: <b>2</b> centenas, <b>3</b> decenas y <b>5</b> unidades.',
      '<b>Mira</b> a la derecha el número y lo que llevas tachado.',
      '<b>Escribe</b> en los recuadros de abajo lo que queda en cada columna, empezando por las unidades, y toca <b>Comprobar</b>.'
    ]
  };

  function actualizarInicio() {
    global.document.querySelectorAll('.nivel').forEach((b) => {
      b.setAttribute('aria-pressed', Number(b.dataset.nivel) === estado.nivel);
    });
    $('pasosLista').innerHTML = PASOS[estado.nivel].map((t) => '<li>' + t + '</li>').join('');
  }

  /* Medallón: minuendo (cuenta azul) − sustraendo (cuenta roja, la que se tacha). */
  function pintarMedallon(a, b) {
    const m = $('medallon');
    m.textContent = '';
    m.setAttribute('aria-label', `${a} menos ${b}`);
    const bola = (n, clase) => {
      const s = global.document.createElement('span');
      s.className = 'mb ' + clase;
      s.textContent = n;
      return s;
    };
    const menos = global.document.createElement('span');
    menos.className = 'menos';
    menos.textContent = '−';
    m.appendChild(bola(a, 'a'));
    m.appendChild(menos);
    m.appendChild(bola(b, 'b'));
  }

  /* ---------- ronda de juego ---------- */

  /* Las 10 preguntas de la ronda según el nivel. */
  function generarCola() {
    if (estado.nivel === 1) {
      // todas las restas de 1 cifra con resultado mayor que 0 (el sustraendo va del 1 al 8)
      const todos = [];
      for (let s = 1; s < MAX_UNA_CIFRA; s++) {
        for (let m = s + 1; m <= MAX_UNA_CIFRA; m++) todos.push({ a: m, b: s, repaso: false });
      }
      return barajar(todos).slice(0, POR_RONDA);
    }
    const vistos = new Set();
    const cola = [];
    for (let intentos = 0; cola.length < POR_RONDA && intentos < 500; intentos++) {
      const p = generarPar(estado.nivel);
      const clave = p.a + '-' + p.b;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      cola.push({ a: p.a, b: p.b, repaso: false });
    }
    return cola;
  }

  function iniciarRonda() {
    estado.modo = 'jugar';
    estado.puntos = 0;
    estado.racha = 0;
    estado.perfectas = 0;
    estado.falladas = [];
    marcador.v = 0;
    $('puntos').textContent = '0';
    $('pJuego').dataset.modo = 'jugar';
    $('pJuego').dataset.nivel = String(estado.nivel);

    estado.cola = generarCola();
    estado.indice = 0;

    mostrar('pJuego');
    mostrarPregunta();
  }

  function actualizarHud() {
    $('racha').textContent = estado.racha;
    const total = estado.cola.length;
    const avance = estado.indice;
    $('progreso').style.width = Math.min(100, (avance / total) * 100) + '%';
    $('progresoTxt').textContent = `Pregunta ${Math.min(estado.indice + 1, total)} de ${total}`;
  }

  /* Los puntos suben contando, no de golpe. */
  const marcador = { v: 0 };
  function sumar(puntos) {
    estado.puntos += puntos;
    pulso($('puntos'));
    if (gs && !REDUCIR) {
      gs.to(marcador, { v: estado.puntos, duration: 0.7, ease: 'power1.out', overwrite: true,
        onUpdate: () => { $('puntos').textContent = Math.round(marcador.v); } });
    } else {
      marcador.v = estado.puntos;
      $('puntos').textContent = estado.puntos;
    }
  }

  /* ---------- recuadro de la diferencia ---------- */
  function ajustarResultado() {
    const caja = $('resultado');
    if (caja.hidden) return;
    const pos = abaco.modo === 'posicional';
    caja.classList.toggle('pos', pos);
    const padre = caja.parentElement;
    const cs = global.getComputedStyle(padre);
    const ancho = padre.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let util;
    let cuentas;
    if (pos) {
      // c columnas de 3 cuentas: ancho − relleno de la caja (20) − huecos entre columnas − relleno de cada columna (20)
      const c = abaco.nCols;
      util = ancho - 20 - (c - 1) * 10 - c * 20;
      cuentas = 3 * c;
    } else {
      // una fila = 2 grupos de 5 (10 cuentas): ancho − relleno de la caja (20) − huecos y rellenos de los grupos (60)
      util = ancho - 20 - 60;
      cuentas = 10;
    }
    caja.style.setProperty('--r', Math.max(20, Math.min(34, Math.floor(util / cuentas))) + 'px');
  }

  const nuevo = (etiqueta, clase) => { const d = global.document.createElement(etiqueta); d.className = clase; return d; };

  /* 1 cifra: dibuja n cuentas numeradas del 1 al n en el orden más fácil de contar: filas de 10, cada fila en
     dos grupos de 5 (como un cuadro de diez). Con ocultas = true quedan invisibles (ocupan su lugar) para que
     luego lleguen volando una por una. Devuelve las cuentas en orden de conteo. */
  function pintarResultado(n, ocultas) {
    const cont = $('resultadoCuentas');
    cont.textContent = '';
    $('resultado').classList.remove('pos');
    $('resultadoVacio').hidden = n > 0;
    if (!n) return [];

    const cuentas = [];
    let fila = null;
    let grupo = null;
    for (let i = 0; i < n; i++) {
      if (i % 10 === 0) { fila = nuevo('div', 'fila-res'); cont.appendChild(fila); }
      if (i % 5 === 0) { grupo = nuevo('div', 'quinteto'); fila.appendChild(grupo); }
      const c = global.document.createElement('span');
      c.className = 'rb';
      c.textContent = i + 1;
      if (ocultas) c.style.opacity = '0';
      grupo.appendChild(c);
      cuentas.push(c);
    }
    ajustarResultado();
    return cuentas;
  }

  /* 2 y 3 cifras: una columna por lugar con las cuentas que quedan y, arriba, su dígito.
     Devuelve { cuentas (de izquierda a derecha), cols (por columna), colDe (columna de cada cuenta) }. */
  function pintarResultadoPos(columnas, ocultas) {
    const cont = $('resultadoCuentas');
    cont.textContent = '';
    $('resultadoVacio').hidden = true;

    const fila = nuevo('div', 'res-pos');
    const cuentas = [];
    const cols = [];
    const colDe = [];
    columnas.forEach((c, ci) => {
      const col = nuevo('div', 'res-col lugar-' + abaco.lugares[ci]);
      const digito = nuevo('div', 'res-digito');
      digito.textContent = c.quedan;
      if (ocultas) digito.style.opacity = '0';
      const rejilla = nuevo('div', 'res-grid');
      for (let i = 0; i < c.quedan; i++) {
        const rb = global.document.createElement('span');
        rb.className = 'rb';
        if (ocultas) rb.style.opacity = '0';
        rejilla.appendChild(rb);
        cuentas.push(rb);
        colDe.push(ci);
      }
      col.appendChild(digito);
      col.appendChild(rejilla);
      fila.appendChild(col);
      cols.push({ total: c.quedan, llegadas: 0, digito: digito });
    });
    cont.appendChild(fila);
    ajustarResultado();
    return { cuentas: cuentas, cols: cols, colDe: colDe };
  }

  /* ---------- respuesta escrita ---------- */
  const MAX_DIGITOS_RESP = 1; // en 1 cifra la diferencia llega hasta 8

  function limpiarRespuesta() {
    estado.resp = new Array(abaco.cajasResp.length).fill(null);
    estado.activa = abaco.cajasResp.length - 1; // en 2 y 3 cifras se empieza por las unidades
    abaco.cajasResp.forEach((c) => c.classList.remove('mal', 'bien'));
    abaco.pintarRespuesta(estado.resp, estado.activa);
  }

  const escribiendo = () => !!estado.q && estado.q.fase === 'construir' && estado.modo === 'jugar';

  function escribirDigito(d) {
    if (!escribiendo()) return;
    const ci = estado.activa;
    if (posicional()) {
      estado.resp[ci] = d;
      estado.activa = Math.max(0, ci - 1); // sigue hacia la izquierda: unidades, decenas, centenas
    } else {
      const v = estado.resp[0]; // 1 cifra: los dígitos se escriben uno detrás de otro
      estado.resp[0] = v !== null && String(v).length < MAX_DIGITOS_RESP ? v * 10 + d : d;
    }
    abaco.cajasResp[ci].classList.remove('mal');
    abaco.pintarRespuesta(estado.resp, estado.activa);
    Sonido.aterriza();
  }

  function borrarDigito() {
    if (!escribiendo()) return;
    let ci = estado.activa;
    if (!posicional()) {
      const v = estado.resp[0];
      estado.resp[0] = v === null || v < 10 ? null : Math.floor(v / 10);
    } else {
      if (estado.resp[ci] === null && ci < estado.resp.length - 1) ci++; // vacío: se borra el de la derecha
      estado.resp[ci] = null;
      estado.activa = ci;
    }
    abaco.cajasResp[ci].classList.remove('mal');
    abaco.pintarRespuesta(estado.resp, estado.activa);
  }

  function pintarTeclado() {
    const cont = $('teclado');
    cont.textContent = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach((n) => {
      const b = global.document.createElement('button');
      b.type = 'button';
      b.className = 'tecla';
      b.textContent = n;
      b.addEventListener('click', () => escribirDigito(n));
      cont.appendChild(b);
    });
    const borrar = global.document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'tecla borrar';
    borrar.textContent = '⌫';
    borrar.setAttribute('aria-label', 'Borrar el número');
    borrar.addEventListener('click', borrarDigito);
    cont.appendChild(borrar);
  }

  /* Revisa los recuadros de respuesta cuando ya se tachó lo que indica el sustraendo. */
  function comprobarRespuesta(q) {
    const da = abaco.digitos(q.a);
    const db = abaco.digitos(q.b);
    const esperado = posicional() ? da.map((d, i) => d - db[i]) : [q.a - q.b]; // sin canje: una columna, un dígito

    if (estado.resp.some((d) => d === null)) {
      decir(`¡Bien tachado! Ahora escribe lo que queda en ${posicional() ? 'los recuadros' : 'el recuadro'} de abajo.`);
      return;
    }

    const malas = esperado.map((s, ci) => estado.resp[ci] !== s);
    if (malas.some(Boolean)) {
      q.errores++;
      estado.erroresRespuesta++;
      estado.racha = 0;
      actualizarHud();
      Sonido.error();
      reaccion('mal');
      malas.forEach((m, ci) => {
        if (!m) return;
        const caja = abaco.cajasResp[ci];
        caja.classList.remove('mal');
        void caja.offsetWidth;
        caja.classList.add('mal');
      });
      const ci = malas.lastIndexOf(true); // la columna más a la derecha que falla: se revisa desde las unidades
      const primera = estado.erroresRespuesta === 1;
      if (posicional()) {
        const nombre = abaco.nombres[ci].toLowerCase();
        decir(primera ? `Revisa las ${nombre}: cuenta las que quedan sin tachar.` : `Pista: en las ${nombre}, ${da[ci]} − ${db[ci]} = ?`);
      } else {
        decir(primera ? 'Casi. Cuenta las que quedan sin tachar.' : `Pista: empieza en ${q.a} y cuenta hacia atrás ${q.b}.`);
      }
      global.setTimeout(() => {
        if (estado.q !== q || q.fase !== 'construir') return;
        let ultima = -1;
        abaco.cajasResp.forEach((caja, i) => {
          if (!caja.classList.contains('mal')) return; // si ya escribió otro número, se respeta
          caja.classList.remove('mal');
          estado.resp[i] = null;
          ultima = Math.max(ultima, i);
        });
        if (ultima >= 0) estado.activa = ultima;
        abaco.pintarRespuesta(estado.resp, estado.activa);
      }, 900);
      return;
    }

    // Todo bien: tachas y respuesta
    q.fase = 'resuelta';
    abaco.bloquear(true);
    abaco.ocultarSugerencia();
    abaco.cajasResp.forEach((caja) => caja.classList.add('bien'));
    abaco.pintarRespuesta(estado.resp, -1);
    $('teclado').hidden = true;
    $('panelConstruir').hidden = true;
    $('panelSiguiente').hidden = false;
    terminarPregunta(q, q.a - q.b);
  }

  /* ---------- una pregunta ---------- */
  function mostrarPregunta() {
    const base = estado.cola[estado.indice];
    estado.q = { a: base.a, b: base.b, repaso: base.repaso, fase: 'construir', errores: 0, pistas: 0 };
    estado.erroresRespuesta = 0;
    elegirFruta();

    abaco.usarModo(posicional() ? 'posicional' : 'general', estado.nivel);
    abaco.bloquear(false);
    abaco.ocultarSugerencia();
    abaco.mostrarMinuendo(base.a, true); // el ábaco muestra el minuendo
    limpiarRespuesta();
    $('resultado').hidden = true;
    $('resultadoCuentas').textContent = '';

    pintarMedallon(base.a, base.b);
    $('teclado').hidden = false;
    $('panelConstruir').hidden = false;
    $('panelSiguiente').hidden = true;
    $('btnSiguiente').hidden = true;

    const tarea = posicional() ? `Tacha ${base.b} en el ábaco, columna por columna. Luego escribe lo que queda.` : `Tacha ${base.b} de las ${base.a} frutas. Luego escribe cuántas quedan.`;
    decir(base.repaso ? 'Repasemos: ' + tarea.charAt(0).toLowerCase() + tarea.slice(1) : tarea, true);
    actualizarHud();

    anim(() => { // las pestañas bajan una tras otra
      gs.from('#medallon .mb, #medallon .menos', { y: 18, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'back.out(2)', clearProps: 'transform,opacity' });
    });
  }

  function comprobar() {
    const q = estado.q;
    if (!q || q.fase !== 'construir') return;
    const an = abaco.analizar();

    if (an.tachadas === 0) {
      decir('Toca las cuentas con el dedo para tacharlas.');
      return;
    }

    // ¿Tachó exactamente lo que indica el sustraendo? (1 cifra: cuántas cuentas; 2 y 3 cifras: cuántas en cada columna)
    let error = '';
    if (!posicional()) {
      if (an.tachadas < q.b) error = 'Faltan por tachar. ¡Sigue!';
      else if (an.tachadas > q.b) error = 'Tachaste de más. Toca las que sobran para quitarles la tacha.';
    } else {
      const digitos = abaco.digitos(q.b);
      for (let ci = an.columnas.length - 1; ci >= 0; ci--) { // se revisa desde las unidades
        const c = an.columnas[ci];
        if (c.tachadas !== digitos[ci]) {
          error = `Revisa las ${c.nombre.toLowerCase()}: ` + (c.tachadas < digitos[ci] ? 'faltan por tachar.' : 'tachaste de más.');
          break;
        }
      }
    }

    if (error) {
      q.errores++;
      estado.racha = 0;
      actualizarHud();
      Sonido.error();
      reaccion('mal');
      decir(error);
      return;
    }

    // lo tachado está bien: ahora se revisa la respuesta escrita
    comprobarRespuesta(q);
  }

  /* La pregunta se resolvió bien: puntos, racha, felicitación y botón para seguir. */
  function terminarPregunta(q, diferencia) {
    Sonido.acierto();
    reaccion('bien');

    const perfecta = q.errores === 0 && q.pistas === 0;
    let ganados = estado.erroresRespuesta === 0 && q.pistas === 0 ? 10 : 5;
    if (perfecta) {
      estado.racha++;
      if (!q.repaso) estado.perfectas++; // las repetidas no cuentan como "a la primera"
      ganados += Math.min(estado.racha, 5) * 2;
    }
    sumar(ganados);

    if (!perfecta) {
      estado.falladas.push(`${q.a} − ${q.b} = ${diferencia}`);
      if (!q.repaso) estado.cola.push({ a: q.a, b: q.b, repaso: true });
    }

    decir(`${alAzar(ELOGIOS)} ${q.a} − ${q.b} = ${diferencia}` + (perfecta && estado.racha >= 3 ? ` · Racha de ${estado.racha}` : ''));

    const caja = $('tablero').getBoundingClientRect();
    Confeti.lanzar(caja.left + caja.width / 2, caja.top + caja.height * 0.5, perfecta ? 120 : 60);

    const ultima = estado.indice >= estado.cola.length - 1;
    $('btnSiguiente').textContent = ultima ? 'Ver resultado ▶' : 'Siguiente ▶';
    $('btnSiguiente').hidden = false;
    anim(() => gs.from('#btnSiguiente', { y: 30, opacity: 0, duration: 0.4, ease: 'back.out(2)', clearProps: 'transform,opacity' }));
    actualizarHud();
  }

  function siguiente() {
    estado.indice++;
    if (estado.indice >= estado.cola.length) finRonda();
    else mostrarPregunta();
  }

  function pista() {
    const q = estado.q;
    if (!q || q.fase !== 'construir') return;
    q.pistas++;
    estado.racha = 0;
    actualizarHud();
    if (q.pistas === 1) {
      decir(posicional()
        ? `${q.b} son ${partesDe(abaco.digitos(q.b), abaco.lugares)}. Tacha eso en cada columna.`
        : `Hay ${fr(q.a)} y debes tachar ${q.b}. ¡Cuenta mientras tachas!`);
    } else if (q.pistas === 2 || !posicional()) {
      abaco.sugerir(q.b);
      decir('Tacha las cuentas con el contorno punteado.');
    } else {
      // 2 y 3 cifras: ayuda con la resta de la columna (desde las unidades) que todavía no está escrita bien
      const da = abaco.digitos(q.a);
      const db = abaco.digitos(q.b);
      let ci = -1;
      da.forEach((d, i) => { if (estado.resp[i] !== d - db[i]) ci = i; });
      if (ci < 0) decir('¡Todo está bien! Toca Comprobar.');
      else decir(`En las ${abaco.nombres[ci].toLowerCase()}: ${da[ci]} − ${db[ci]} = ?`);
    }
  }

  function finRonda() {
    const total = estado.cola.filter((p) => !p.repaso).length || POR_RONDA;
    const razon = estado.perfectas / total;
    const estrellas = razon >= 0.8 ? 3 : razon >= 0.5 ? 2 : 1;
    $('estrellas').innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = global.document.createElement('span');
      s.textContent = i < estrellas ? '⭐' : '☆';
      $('estrellas').appendChild(s);
    }
    $('finTitulo').textContent = estrellas === 3 ? '¡Eres un genio del ábaco!' : estrellas === 2 ? '¡Muy buen trabajo!' : '¡Sigue practicando!';
    $('finResumen').textContent = `Hiciste ${estado.puntos} puntos y acertaste ${estado.perfectas} de ${total} a la primera.`;

    const unicas = Array.from(new Set(estado.falladas));
    $('repaso').hidden = unicas.length === 0;
    $('repasoLista').textContent = '';
    unicas.forEach((t) => {
      const s = global.document.createElement('span');
      s.textContent = t;
      $('repasoLista').appendChild(s);
    });

    mostrar('pFin');
    anim(() => {
      gs.from('#estrellas span', { scale: 0, rotation: -200, duration: 0.7, stagger: 0.25, delay: 0.2, ease: 'back.out(2.5)', clearProps: 'transform' });
      gs.from('#finTitulo, #finResumen, #repaso, .acciones-fin', { y: 22, opacity: 0, duration: 0.4, stagger: 0.12, delay: 0.5, clearProps: 'transform,opacity' });
    });
    Sonido.fin();
    Confeti.canones(estrellas * 30);
  }

  /* ---------- modo explorar ---------- */
  function iniciarExplorar() {
    estado.modo = 'explorar';
    estado.q = null;
    $('pJuego').dataset.modo = 'explorar';
    $('pJuego').dataset.nivel = String(estado.nivel);
    mostrar('pJuego');
    abaco.usarModo(posicional() ? 'posicional' : 'general', estado.nivel);
    abaco.bloquear(false);
    abaco.ocultarSugerencia();
    elegirFruta();
    $('teclado').hidden = true;
    $('resultado').hidden = false;
    if (posicional()) {
      estado.explorarMin = generarMinuendo(estado.nivel);
      abaco.mostrarMinuendo(estado.explorarMin, true);
      decir('Toca o arrastra para tachar cuentas en cada columna y mira qué queda.');
    } else {
      abaco.mostrarMinuendo(estado.explorar.a, true);
      decir('Toca o arrastra para tachar cuentas y mira cuántas quedan.');
      pintarSelector();
    }
  }

  function pintarSelector() {
    $('valA').textContent = estado.explorar.a;
    $('valB').textContent = estado.explorar.b;
  }

  function leerExplorar(an) {
    if (abaco.modo === 'posicional') {
      pintarResultadoPos(an.columnas, false);
      if (an.tachadas === 0) {
        $('lecEcuacion').textContent = 'Tacha cuentas';
        $('lecSuma').textContent = `El número es ${an.minuendo}. Toca o arrastra para tachar.`;
      } else {
        $('lecEcuacion').textContent = `${an.minuendo} − ${an.tachado} = ${an.quedan}`;
        const queda = partesDe(an.columnas.map((c) => c.quedan), abaco.lugares);
        $('lecSuma').textContent = queda ? 'Quedan ' + queda : 'No queda ninguna cuenta';
      }
      return;
    }
    pintarResultado(an.quedan, false);
    if (an.tachadas === 0) {
      $('lecEcuacion').textContent = 'Tacha cuentas';
      $('lecSuma').textContent = `Hay ${fr(an.minuendo)}. Toca o arrastra para tachar.`;
    } else {
      $('lecEcuacion').textContent = `${an.minuendo} − ${an.tachadas} = ${an.quedan}`;
      $('lecSuma').textContent = `Sin tachar: ${fr(an.quedan)}`;
    }
  }

  /* ---------- arranque ---------- */
  function iniciar() {
    abaco = new global.AbacoResta($('tablero'), {
      alMover: (tachadas, tacho) => { if (tacho) Sonido.tacha(); else Sonido.destacha(); },
      alCambiar: (an) => { if (estado.modo === 'explorar') leerExplorar(an); }
    });

    if (global.ResizeObserver) new global.ResizeObserver(ajustarResultado).observe($('pJuego'));

    pintarTeclado();
    actualizarInicio();
    anim(() => gs.from('.nivel', { scale: 0, duration: 0.4, stagger: 0.03, ease: 'back.out(3)', clearProps: 'transform' }));

    global.document.querySelectorAll('.nivel').forEach((b) => {
      b.addEventListener('click', () => { estado.nivel = Number(b.dataset.nivel); actualizarInicio(); });
    });

    $('btnJugar').addEventListener('click', iniciarRonda);
    $('btnExplorar').addEventListener('click', iniciarExplorar);
    $('btnInicio').addEventListener('click', () => mostrar('pInicio'));
    $('btnOtra').addEventListener('click', iniciarRonda);
    $('btnCambiar').addEventListener('click', () => mostrar('pInicio'));

    // juego
    $('btnReiniciar').addEventListener('click', () => {
      if (estado.q && estado.q.fase === 'construir') { abaco.destachar(); if (posicional()) limpiarRespuesta(); }
    });
    // 2 y 3 cifras: se toca un recuadro de respuesta para escribir ahí; también vale el teclado del equipo
    $('tablero').addEventListener('click', (e) => {
      const caja = e.target.closest ? e.target.closest('.resp-caja') : null;
      if (!caja || !escribiendo()) return;
      estado.activa = Number(caja.dataset.ci);
      abaco.pintarRespuesta(estado.resp, estado.activa);
    });
    global.document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !escribiendo()) return;
      if (/^[0-9]$/.test(e.key)) escribirDigito(Number(e.key));
      else if (e.key === 'Backspace') borrarDigito();
    });
    $('btnComprobar').addEventListener('click', comprobar);
    $('btnPista').addEventListener('click', pista);
    $('btnSiguiente').addEventListener('click', siguiente);

    // explorar (1 cifra): minuendo y sustraendo con − y +
    global.document.querySelectorAll('.btn-mini').forEach((btn) => {
      btn.addEventListener('click', () => {
        const e = estado.explorar;
        const f = btn.dataset.factor;
        const delta = Number(btn.dataset.delta);
        if (f === 'a') {
          e.a = Math.max(1, Math.min(MAX_UNA_CIFRA, e.a + delta));
          if (e.b > e.a) e.b = e.a;      // no se puede quitar más de lo que hay
          pintarSelector();
          abaco.mostrarMinuendo(e.a);    // el cuadro general muestra el nuevo minuendo
        } else {
          e.b = Math.max(0, Math.min(e.a, e.b + delta));
          pintarSelector();
        }
      });
    });
    $('btnMostrar').addEventListener('click', () => abaco.tacharUltimas(estado.explorar.b));
    $('btnLimpiar').addEventListener('click', () => abaco.destachar());

    // explorar (2 y 3 cifras): un número nuevo cada vez
    $('btnOtro').addEventListener('click', () => {
      estado.explorarMin = generarMinuendo(estado.nivel);
      abaco.mostrarMinuendo(estado.explorarMin, true);
    });
    $('btnLimpiarPos').addEventListener('click', () => abaco.destachar());

    // sonido
    const icono = () => { $('btnSonido').textContent = Sonido.mudo ? '🔇' : '🔊'; };
    $('btnSonido').addEventListener('click', () => { Sonido.alternar(); icono(); });
    icono();
  }

  iniciar();
})(window);
