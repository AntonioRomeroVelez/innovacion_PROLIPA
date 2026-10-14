/* Suma — lógica del juego: niveles, pantallas, preguntas, puntaje y modo explorar.
 *
 * Tres niveles de suma que se eligen en el inicio:
 *   1 cifra  (7 + 8)        dos cuadros de 10: naranja para el primer sumando y azul para el segundo.
 *   2 cifras (34 + 25)      ábaco por columnas: Decenas y Unidades.
 *   3 cifras (312 + 276)    ábaco por columnas: Centenas, Decenas y Unidades.
 * En 2 y 3 cifras las sumas son SIN LLEVAR: en cada columna los dos dígitos suman 9 o menos, así el resultado
 * de cada columna cabe en una sola cuadrícula.
 *
 * Flujo de cada pregunta (por ejemplo 34 + 25), igual en los tres niveles:
 *   1. El niño PINTA el primer sumando en naranja (arriba) y el segundo en azul (abajo), columna por columna.
 *   2. En 1 cifra, toca "Sumar": las cuentas de los dos cuadros se juntan, una por una y con su color, en un solo
 *      recuadro (la suma es juntar). En 2 y 3 cifras este paso no hace falta.
 *   3. Escribe la respuesta con el teclado en pantalla: un recuadro con el resultado (1 cifra) o un recuadro con
 *      el dígito de cada columna, debajo de ella (2 y 3 cifras).
 *   4. Toca "Comprobar": se revisa lo pintado y, si está bien, la respuesta.
 *
 * Usa GSAP (lib/gsap.min.js) para las animaciones; si no está cargada, el juego funciona igual sin ellas.
 * Archivo propio de la actividad de suma: no se comparte con las de resta ni multiplicación. */
(function (global) {
  'use strict';

  const POR_RONDA = 10;
  const MAX_UNA_CIFRA = 9;    // en 1 cifra los sumandos van del 1 al 9
  const $ = (id) => global.document.getElementById(id);

  const gs = global.gsap || null;
  const REDUCIR = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Ejecuta una animación solo si la librería está disponible y el usuario no pidió menos movimiento. */
  const anim = (fn) => { if (gs && !REDUCIR) fn(); };
  if (gs) global.document.documentElement.classList.add('gsap');

  const Sonido = global.SonidoSuma;
  const Confeti = global.ConfetiSuma;

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

  /* "3 decenas y 4 unidades" a partir de los dígitos por columna (los ceros no se nombran). */
  function partesDe(digitos, lugares) {
    const partes = [];
    digitos.forEach((d, i) => { if (d > 0) partes.push(`${d} ${LUGAR[lugares[i]][d === 1 ? 0 : 1]}`); });
    if (partes.length < 2) return partes[0] || '';
    return partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
  }

  /* Suma sin llevar de `cifras` cifras: en cada columna los dos dígitos suman 9 o menos.
     Los dos sumandos tienen `cifras` cifras y ningún dígito es 0, así se practica cada lugar. */
  function generarPar(cifras) {
    let a = 0;
    let b = 0;
    for (let i = 0; i < cifras; i++) {
      const da = entre(1, 8);
      const db = entre(1, 9 - da);
      a = a * 10 + da;
      b = b * 10 + db;
    }
    return { a: a, b: b };
  }

  /* ---------- estado ---------- */
  const estado = {
    modo: 'jugar',
    nivel: 1,              // 1, 2 o 3 cifras
    dificultad: 'facil',   // (solo 1 cifra) 'facil': el resultado tiene 1 cifra; 'experto': el resultado tiene 2 cifras
    puntos: 0,
    racha: 0,
    cola: [],         // preguntas pendientes; los errores se repiten al final
    indice: 0,
    perfectas: 0,
    falladas: [],
    q: null,          // pregunta en curso
    erroresRespuesta: 0,
    resp: [],         // lo escrito en los recuadros de respuesta (un número en 1 cifra, un dígito por columna en 2 y 3); null = vacío
    activa: 0,        // recuadro de respuesta donde se escribe
    conteo: null,     // (1 cifra) la animación que junta las cuentas en un solo recuadro
    clones: [],       // cuentas "en viaje" hacia ese recuadro
    explorar: { a: 3, b: 4 }
  };

  let abaco = null;
  const posicional = () => estado.nivel > 1;

  /* ---------- pantallas ---------- */
  const PANTALLAS = ['pInicio', 'pJuego', 'pFin'];
  function mostrar(id) {
    cancelarVuelo();
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
      '<b>Mira</b> la suma, por ejemplo <b>7 + 8</b>.',
      '<b>Pinta</b> con el dedo o el mouse: <b>7</b> frutas en el recuadro naranja y <b>8</b> en el recuadro azul.',
      '<b>Escribe</b> la respuesta en el recuadro de abajo y toca <b>Comprobar</b>.'
    ],
    2: [
      '<b>Mira</b> la suma, por ejemplo <b>34 + 25</b>.',
      '<b>Pinta</b> en cada columna: arriba, en naranja, <b>3</b> decenas y <b>4</b> unidades; abajo, en azul, <b>2</b> decenas y <b>5</b> unidades.',
      '<b>Mira</b> a la derecha el valor de lo que pintaste en cada fila.',
      '<b>Escribe</b> la respuesta en los recuadros de abajo, empezando por las unidades, y toca <b>Comprobar</b>.'
    ],
    3: [
      '<b>Mira</b> la suma, por ejemplo <b>312 + 276</b>.',
      '<b>Pinta</b> en cada columna: arriba, en naranja, <b>3</b> centenas, <b>1</b> decena y <b>2</b> unidades; abajo, en azul, <b>2</b> centenas, <b>7</b> decenas y <b>6</b> unidades.',
      '<b>Mira</b> a la derecha el valor de lo que pintaste en cada fila.',
      '<b>Escribe</b> la respuesta en los recuadros de abajo, empezando por las unidades, y toca <b>Comprobar</b>.'
    ]
  };

  function actualizarInicio() {
    global.document.querySelectorAll('.nivel[data-nivel]').forEach((b) => {
      b.setAttribute('aria-pressed', Number(b.dataset.nivel) === estado.nivel);
    });
    $('tarjetaDificultad').hidden = estado.nivel !== 1;
    global.document.querySelectorAll('.nivel[data-dif]').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.dif === estado.dificultad);
    });
    $('pasosLista').innerHTML = PASOS[estado.nivel].map((t) => '<li>' + t + '</li>').join('');
  }

  function pintarMedallon(a, b) {
    const m = $('medallon');
    m.textContent = '';
    m.setAttribute('aria-label', `${a} más ${b}`);
    const bola = (n, clase) => {
      const s = global.document.createElement('span');
      s.className = 'mb ' + clase;
      s.textContent = n;
      return s;
    };
    const mas = global.document.createElement('span');
    mas.className = 'mas';
    mas.textContent = '+';
    m.appendChild(bola(a, 'a'));
    m.appendChild(mas);
    m.appendChild(bola(b, 'b'));
  }

  /* ---------- ronda de juego ---------- */

  /* Las 10 preguntas de la ronda según el nivel. */
  function generarCola() {
    if (estado.nivel === 1) {
      // todas las sumas de 1 cifra sin repetir (7 + 8 y 8 + 7 cuentan como la misma); el orden de los sumandos es al azar.
      // Fácil: el resultado tiene 1 cifra (hasta 9). Experto: el resultado tiene 2 cifras (de 10 a 18).
      const todos = [];
      for (let t = 1; t <= MAX_UNA_CIFRA; t++) {
        for (let k = t; k <= MAX_UNA_CIFRA; k++) {
          if ((t + k >= 10) !== (estado.dificultad === 'experto')) continue;
          const par = Math.random() < 0.5 ? [t, k] : [k, t];
          todos.push({ a: par[0], b: par[1], repaso: false });
        }
      }
      return barajar(todos).slice(0, POR_RONDA);
    }
    const vistos = new Set();
    const cola = [];
    for (let intentos = 0; cola.length < POR_RONDA && intentos < 500; intentos++) {
      const p = generarPar(estado.nivel);
      const clave = p.a + '+' + p.b;
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

  /* ---------- recuadro del resultado ---------- */
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
    const tope = pos ? 26 : 34; // en columnas se limita para que todo quepa en pantalla
    caja.style.setProperty('--r', Math.max(20, Math.min(tope, Math.floor(util / cuentas))) + 'px');
  }

  const nuevo = (etiqueta, clase) => { const d = global.document.createElement(etiqueta); d.className = clase; return d; };

  /* 1 cifra: dibuja las cuentas del resultado en el orden más fácil de contar: filas de 10, cada fila en dos grupos
     de 5 (como un cuadro de diez). Las primeras n1 son naranja y las demás azules; cada una lleva su número.
     Devuelve las cuentas en orden de conteo. */
  function pintarResultado(n1, n2, ocultas) {
    const cont = $('resultadoCuentas');
    cont.textContent = '';
    $('resultado').classList.remove('pos');
    const total = n1 + n2;
    $('resultadoVacio').hidden = total > 0;
    if (!total) return [];

    const cuentas = [];
    let fila = null;
    let grupo = null;
    for (let i = 0; i < total; i++) {
      if (i % 10 === 0) { fila = nuevo('div', 'fila-res'); cont.appendChild(fila); }
      if (i % 5 === 0) { grupo = nuevo('div', 'quinteto'); fila.appendChild(grupo); }
      const c = global.document.createElement('span');
      c.className = 'rb ' + (i < n1 ? 'a' : 'b');
      c.textContent = i + 1;
      if (ocultas) c.style.opacity = '0';
      grupo.appendChild(c);
      cuentas.push(c);
    }
    ajustarResultado();
    return cuentas;
  }

  /* 2 y 3 cifras: una columna por lugar con todas sus cuentas (naranja y luego azul) y, arriba, el dígito de la
     suma de esa columna. Devuelve { cuentas (de izquierda a derecha), cols (por columna), colDe (columna de cada cuenta) }. */
  function pintarResultadoPos(columnas, ocultas) {
    const cont = $('resultadoCuentas');
    cont.textContent = '';
    $('resultadoVacio').hidden = true;

    const fila = nuevo('div', 'res-pos');
    const cuentas = [];
    const cols = [];
    const colDe = [];
    columnas.forEach((c, ci) => {
      const col = nuevo('div', 'res-col');
      const digito = nuevo('div', 'res-digito');
      digito.textContent = c.n1 + c.n2;
      if (ocultas) digito.style.opacity = '0';
      const rejilla = nuevo('div', 'res-grid');
      for (let i = 0; i < c.n1 + c.n2; i++) {
        const rb = global.document.createElement('span');
        rb.className = 'rb ' + (i < c.n1 ? 'a' : 'b');
        if (ocultas) rb.style.opacity = '0';
        rejilla.appendChild(rb);
        cuentas.push(rb);
        colDe.push(ci);
      }
      col.appendChild(digito);
      col.appendChild(rejilla);
      fila.appendChild(col);
      cols.push({ total: c.n1 + c.n2, llegadas: 0, digito: digito });
    });
    cont.appendChild(fila);
    ajustarResultado();
    return { cuentas: cuentas, cols: cols, colDe: colDe };
  }

  /* ---------- sumar: juntar las cuentas de los dos cuadros (1 cifra) ---------- */

  /* Una cuenta de uno de los cuadros viaja hasta su lugar en el recuadro donde se juntan; al llegar suena un tic
     (cada vez más agudo, como al contar). */
  function lanzarCuenta(k, destino, numero) {
    const origen = abaco.cuentas[k];
    const o = origen.getBoundingClientRect();
    const d = destino.getBoundingClientRect();
    const estilo = global.getComputedStyle(origen);
    const clon = global.document.createElement('div');
    clon.className = 'cuenta-vuelo';
    ['--c1', '--c2', '--c3'].forEach((v) => clon.style.setProperty(v, estilo.getPropertyValue(v)));
    clon.style.left = o.left + 'px';
    clon.style.top = o.top + 'px';
    clon.style.width = o.width + 'px';
    clon.style.height = o.height + 'px';
    global.document.body.appendChild(clon);
    estado.clones.push(clon);
    abaco.ocultarCuenta(k); // sale de su cuadro

    gs.fromTo(clon, { scale: 1.15 }, {
      x: (d.left + d.width / 2) - (o.left + o.width / 2),
      y: (d.top + d.height / 2) - (o.top + o.height / 2),
      scale: d.width / o.width,
      duration: 0.5, ease: 'power2.inOut',
      onComplete: () => {
        clon.remove();
        estado.clones = estado.clones.filter((x) => x !== clon);
        destino.style.opacity = '1';
        gs.fromTo(destino, { scale: 0.5 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
        Sonido.cuenta(numero);
      }
    });
  }

  /* Botón "Sumar": las cuentas pintadas pasan, una por una y conservando su color (primero las naranja y luego las
     azules), a un solo recuadro, donde quedan todas juntas, sin agrupar. Después se puede escribir la respuesta. */
  function juntarCuentas(q, an) {
    q.fase = 'sumando';
    abaco.bloquear(true);
    abaco.ocultarFantasma();
    $('btnSumar').hidden = true;
    Sonido.acierto();
    reaccion('bien');
    decir('¡Mira! Se juntan todas en un solo recuadro.');

    abaco.ponerEcuacion(q.a, q.b);
    const destinos = abaco.prepararGrupo(an.n1, an.n2);
    const origenes = abaco.cuentasPintadas();
    const total = destinos.length;

    const terminar = () => {
      estado.conteo = null;
      if (estado.q !== q) return;
      q.fase = 'sumado';
      abaco.marcarSumado(true);
      $('btnComprobar').hidden = false;
      $('teclado').hidden = false;
      decir(`${fr(q.a)} y ${fr(q.b)}, ¡juntos! ¿Cuántos hay en total? Escribe la respuesta.`);
      anim(() => gs.from('#teclado .tecla, .fila-resp', { y: 24, opacity: 0, duration: 0.35, stagger: 0.03, ease: 'back.out(2)', clearProps: 'transform,opacity' }));
    };

    if (!gs || REDUCIR) {
      destinos.forEach((c) => { c.style.opacity = ''; });
      origenes.forEach((o) => abaco.ocultarCuenta(o.k));
      terminar();
      return;
    }

    const inicio = 0.25;
    const paso = Math.min(0.11, 1.5 / total);
    const tl = gs.timeline();
    origenes.forEach((o, i) => {
      tl.call(() => lanzarCuenta(o.k, destinos[i], i + 1), null, inicio + i * paso);
    });
    tl.call(terminar, null, inicio + (total - 1) * paso + 0.9);
    estado.conteo = tl;
  }

  /* Cancela animaciones pendientes (al cambiar de pregunta o de pantalla) para que nunca quede nada atascado. */
  function cancelarVuelo() {
    if (estado.conteo) { estado.conteo.kill(); estado.conteo = null; }
    estado.clones.forEach((c) => { if (gs) gs.killTweensOf(c); c.remove(); });
    estado.clones = [];
  }

  /* ---------- respuesta escrita ---------- */
  const MAX_DIGITOS_RESP = 2; // en 1 cifra la suma llega hasta 18

  function limpiarRespuesta() {
    estado.resp = new Array(abaco.cajasResp.length).fill(null);
    estado.activa = abaco.cajasResp.length - 1; // en 2 y 3 cifras se empieza por las unidades
    abaco.cajasResp.forEach((c) => c.classList.remove('mal', 'bien'));
    abaco.pintarRespuesta(estado.resp, estado.activa);
  }

  const faseEscribir = () => (posicional() ? 'construir' : 'sumado'); // en 1 cifra se escribe después de sumar
  const escribiendo = () => !!estado.q && estado.q.fase === faseEscribir() && estado.modo === 'jugar';

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

  /* Revisa los recuadros de respuesta cuando las cuentas ya están bien pintadas. */
  function comprobarRespuesta(q) {
    const da = abaco.digitos(q.a);
    const db = abaco.digitos(q.b);
    const esperado = posicional() ? da.map((d, i) => d + db[i]) : [q.a + q.b]; // sin llevar: una columna, un dígito

    if (estado.resp.some((d) => d === null)) {
      decir(`¡Las cuentas están bien! Ahora escribe la respuesta en ${posicional() ? 'los recuadros' : 'el recuadro'} de abajo.`);
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
        decir(primera ? `Revisa las ${nombre}: cuenta las cuentas de arriba y de abajo.` : `Pista: en las ${nombre}, ${da[ci]} + ${db[ci]} = ?`);
      } else {
        decir(primera ? 'Casi. Cuenta todas las cuentas juntas.' : `Pista: empieza en ${Math.max(q.a, q.b)} y cuenta ${Math.min(q.a, q.b)} más.`);
      }
      global.setTimeout(() => {
        if (estado.q !== q || q.fase !== faseEscribir()) return;
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

    // Todo bien: cuentas y respuesta
    q.fase = 'resuelta';
    abaco.bloquear(true);
    abaco.ocultarFantasma();
    abaco.cajasResp.forEach((caja) => caja.classList.add('bien'));
    abaco.pintarRespuesta(estado.resp, -1);
    $('teclado').hidden = true;
    $('panelConstruir').hidden = true;
    $('panelSiguiente').hidden = false;
    terminarPregunta(q, q.a + q.b);
  }

  /* ---------- una pregunta ---------- */
  function mostrarPregunta() {
    const base = estado.cola[estado.indice];
    estado.q = { a: base.a, b: base.b, repaso: base.repaso, fase: 'construir', errores: 0, pistas: 0 };
    estado.erroresRespuesta = 0;
    cancelarVuelo();
    elegirFruta();

    abaco.usarModo(posicional() ? 'posicional' : 'general', estado.nivel);
    abaco.bloquear(false);
    abaco.ocultarFantasma();
    abaco.limpiarGrupo();
    abaco.compactar(!posicional(), false); // 1 cifra: tablero compacto para que todo quepa sin scroll en celular
    abaco.reiniciar();
    limpiarRespuesta();
    $('resultado').hidden = true;
    $('resultadoCuentas').textContent = '';

    pintarMedallon(base.a, base.b);
    // 1 cifra: primero se pinta y se suma; el teclado y "Comprobar" aparecen cuando las cuentas ya están juntas
    $('teclado').hidden = !posicional();
    $('btnSumar').hidden = posicional();
    $('btnComprobar').hidden = !posicional();
    $('panelConstruir').hidden = false;
    $('panelSiguiente').hidden = true;
    $('btnSiguiente').hidden = true;

    const tarea = posicional()
      ? `Pinta ${base.a} arriba, en naranja, y ${base.b} abajo, en azul. Luego escribe la respuesta.`
      : `Pinta ${base.a} en el recuadro naranja y ${base.b} en el azul. Luego escribe la respuesta.`;
    decir(base.repaso ? 'Repasemos: ' + tarea.charAt(0).toLowerCase() + tarea.slice(1) : tarea, true);
    actualizarHud();

    anim(() => { // las pestañas bajan una tras otra
      gs.from('#medallon .mb, #medallon .mas', { y: 18, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'back.out(2)', clearProps: 'transform,opacity' });
    });
  }

  function comprobar() {
    const q = estado.q;
    if (q && q.fase === 'sumado') { comprobarRespuesta(q); return; } // 1 cifra: ya sumó, ahora se revisa la respuesta
    if (!q || q.fase !== 'construir') return;
    const an = abaco.analizar();
    const esperado = q.a + q.b; // se comparan cantidades de cuentas en 1 cifra y valores en 2 y 3 cifras

    if (an.vacio) {
      decir('Pinta algunas cuentas con el dedo.');
      return;
    }

    let error = '';
    if (!posicional()) {
      // El color lo decide el recuadro: el primero solo da cuentas naranja y el segundo solo azules.
      // Vale en cualquier orden (a + b = b + a), pero cada recuadro debe tener el número que le toca.
      const bien = (an.n1 === q.a && an.n2 === q.b) || (an.n1 === q.b && an.n2 === q.a);
      if (!bien) {
        error = an.total < esperado ? 'Faltan cuentas. ¡Sigue pintando!'
          : an.total > esperado ? 'Pintaste de más. Borra las que sobran.'
            : 'Casi. Revisa cuántas pintaste en cada recuadro.';
      }
    } else {
      // En cada columna debe haber, arriba, las cuentas del dígito del primer sumando y, abajo, las del segundo
      // (o al revés en todas las columnas: a + b = b + a). Se avisa de la columna que no cuadra, empezando por
      // las unidades.
      const da = abaco.digitos(q.a);
      const db = abaco.digitos(q.b);
      const falla = (arriba, abajo) => an.columnas.map((c, ci) => !(c.n1 === arriba[ci] && c.n2 === abajo[ci]));
      const f1 = falla(da, db);
      const f2 = falla(db, da);
      if (f1.some(Boolean) && f2.some(Boolean)) {
        const fallas = f1.filter(Boolean).length <= f2.filter(Boolean).length ? f1 : f2;
        const orden = fallas.map((x, ci) => (x ? ci : -1)).filter((ci) => ci >= 0);
        const ci = orden[orden.length - 1]; // la más a la derecha: se revisa desde las unidades
        const c = an.columnas[ci];
        const hay = c.n1 + c.n2;
        const debe = da[ci] + db[ci];
        error = `Revisa las ${c.nombre.toLowerCase()}: ` + (hay < debe ? 'faltan cuentas.' : hay > debe ? 'sobran cuentas.' : '¿cuántas van arriba y cuántas abajo?');
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

    // las cuentas están bien: en 2 y 3 cifras se revisa la respuesta escrita; en 1 cifra, primero se juntan
    if (posicional()) comprobarRespuesta(q);
    else juntarCuentas(q, an);
  }

  /* La pregunta se resolvió bien: puntos, racha, felicitación y botón para seguir. */
  function terminarPregunta(q, total) {
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
      estado.falladas.push(`${q.a} + ${q.b} = ${total}`);
      if (!q.repaso) estado.cola.push({ a: q.a, b: q.b, repaso: true });
    }

    decir(`${alAzar(ELOGIOS)} ${q.a} + ${q.b} = ${total}` + (perfecta && estado.racha >= 3 ? ` · Racha de ${estado.racha}` : ''));

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
    if (!q || (q.fase !== 'construir' && q.fase !== 'sumado')) return;
    q.pistas++;
    estado.racha = 0;
    actualizarHud();
    if (q.fase === 'sumado') {
      decir('Cuenta uno por uno los del recuadro: ¿cuántos hay en total?');
      return;
    }
    if (q.pistas === 1) {
      decir(posicional()
        ? `${q.a} son ${partesDe(abaco.digitos(q.a), abaco.lugares)}; ${q.b} son ${partesDe(abaco.digitos(q.b), abaco.lugares)}.`
        : `${fr(q.a)} en el recuadro naranja y ${q.b} en el azul. ¡Cuenta mientras pintas!`);
    } else if (q.pistas === 2 || !posicional()) {
      abaco.fantasma(q.a, q.b);
      decir('Pinta los círculos punteados: naranja y azul.');
    } else {
      // 2 y 3 cifras: ayuda con la suma de la columna (desde las unidades) que todavía no está escrita bien
      const da = abaco.digitos(q.a);
      const db = abaco.digitos(q.b);
      let ci = -1;
      da.forEach((d, i) => { if (estado.resp[i] !== d + db[i]) ci = i; });
      if (ci < 0) decir('¡Todo está bien! Toca Comprobar.');
      else decir(`En las ${abaco.nombres[ci].toLowerCase()}: ${da[ci]} + ${db[ci]} = ?`);
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
    abaco.ocultarFantasma();
    abaco.limpiarGrupo();
    elegirFruta();
    // 1 cifra: tablero compacto para que todo el modo explorar quepa sin scroll en celular
    abaco.compactar(!posicional(), false);
    $('teclado').hidden = true;
    $('resultado').hidden = false;
    abaco.reiniciar();
    if (posicional()) {
      decir('Pinta con el dedo: arriba, en naranja, un número y abajo, en azul, el otro.');
    } else {
      decir('Pinta con el dedo: naranja en el primer recuadro y azul en el segundo.');
      pintarSelector();
    }
  }

  function pintarSelector() {
    $('valA').textContent = estado.explorar.a;
    $('valB').textContent = estado.explorar.b;
  }

  /* Estrategia de "completar 10": 8 + 7 → 8 + 2 = 10, y 10 + 5 = 15. */
  function completarDiez(n1, n2) {
    const base = Math.max(n1, n2);
    const otro = Math.min(n1, n2);
    const total = n1 + n2;
    if (total <= 10 || base >= 10 || otro === 0) return '';
    const falta = 10 - base;
    return `Completa 10: ${base} + ${falta} = 10 → 10 + ${otro - falta} = ${total}`;
  }

  function leerExplorar(an) {
    if (abaco.modo === 'posicional') {
      pintarResultadoPos(an.columnas, false);
      if (an.vacio) {
        $('lecEcuacion').textContent = 'Pinta en el ábaco';
        $('lecSuma').textContent = 'Naranja arriba y azul abajo en cada columna.';
      } else {
        $('lecEcuacion').textContent = `${an.valor1} + ${an.valor2} = ${an.valor1 + an.valor2}`;
        // se suma de derecha a izquierda: primero las unidades
        $('lecSuma').textContent = an.columnas.slice().reverse()
          .filter((c) => c.n1 + c.n2 > 0)
          .map((c) => `${c.nombre}: ${c.n1} + ${c.n2} = ${c.n1 + c.n2}`).join(' · ');
      }
      return;
    }
    pintarResultado(an.n1, an.n2, false);
    if (an.vacio) {
      $('lecEcuacion').textContent = 'Pinta en el ábaco';
      $('lecSuma').textContent = '';
    } else {
      $('lecEcuacion').textContent = `${an.n1} + ${an.n2} = ${an.total}`;
      $('lecSuma').textContent = completarDiez(an.n1, an.n2);
    }
  }

  /* ---------- arranque ---------- */
  function iniciar() {
    abaco = new global.AbacoSuma($('tablero'), {
      alMover: (total) => Sonido.cuenta(total),
      alCambiar: (an) => { if (estado.modo === 'explorar') leerExplorar(an); }
    });

    if (global.ResizeObserver) new global.ResizeObserver(ajustarResultado).observe($('pJuego'));

    pintarTeclado();
    actualizarInicio();
    anim(() => gs.from('.nivel', { scale: 0, duration: 0.4, stagger: 0.03, ease: 'back.out(3)', clearProps: 'transform' }));

    global.document.querySelectorAll('.nivel[data-nivel]').forEach((b) => {
      b.addEventListener('click', () => { estado.nivel = Number(b.dataset.nivel); actualizarInicio(); });
    });
    global.document.querySelectorAll('.nivel[data-dif]').forEach((b) => {
      b.addEventListener('click', () => { estado.dificultad = b.dataset.dif; actualizarInicio(); });
    });

    $('btnJugar').addEventListener('click', iniciarRonda);
    $('btnExplorar').addEventListener('click', iniciarExplorar);
    $('btnInicio').addEventListener('click', () => mostrar('pInicio'));
    $('btnOtra').addEventListener('click', iniciarRonda);
    $('btnCambiar').addEventListener('click', () => mostrar('pInicio'));

    // juego
    $('btnReiniciar').addEventListener('click', () => {
      if (estado.q && estado.q.fase === 'construir') { abaco.reiniciar(); if (posicional()) limpiarRespuesta(); }
      else if (estado.q && estado.q.fase === 'sumado') limpiarRespuesta(); // ya sumó: se borra lo escrito
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
    $('btnSumar').addEventListener('click', comprobar);
    $('btnPista').addEventListener('click', pista);
    $('btnSiguiente').addEventListener('click', siguiente);

    // explorar (1 cifra): cuántas cuentas naranja y azules con − y +
    global.document.querySelectorAll('.btn-mini').forEach((btn) => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.factor;
        estado.explorar[f] = Math.max(1, Math.min(MAX_UNA_CIFRA, estado.explorar[f] + Number(btn.dataset.delta)));
        pintarSelector();
      });
    });
    $('btnMostrar').addEventListener('click', () => abaco.mostrarSuma(estado.explorar.a, estado.explorar.b));
    $('btnGirar').addEventListener('click', () => {
      const e = estado.explorar;
      const t = e.a; e.a = e.b; e.b = t;
      pintarSelector();
      abaco.mostrarSuma(e.a, e.b);
    });
    $('btnLimpiar').addEventListener('click', () => abaco.reiniciar());

    // explorar (2 y 3 cifras): un ejemplo nuevo cada vez
    $('btnOtro').addEventListener('click', () => {
      const p = generarPar(estado.nivel);
      abaco.mostrarSuma(p.a, p.b);
    });
    $('btnLimpiarPos').addEventListener('click', () => abaco.reiniciar());

    // sonido
    const icono = () => { $('btnSonido').textContent = Sonido.mudo ? '🔇' : '🔊'; };
    $('btnSonido').addEventListener('click', () => { Sonido.alternar(); icono(); });
    icono();
  }

  iniciar();
})(window);
