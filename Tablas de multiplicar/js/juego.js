/* Lógica del juego: pantallas, preguntas, puntaje y modo explorar.
 *
 * Flujo de cada pregunta (por ejemplo 7 × 8), con el mismo diseño que la suma y la resta:
 *   1. El niño PINTA un rectángulo de 7 filas por 8 cuentas (cada cuenta es una fruta; cada fila tiene su color).
 *   2. Escribe la respuesta con el teclado en pantalla, en el recuadro de debajo del ábaco.
 *   3. Toca "Comprobar": se revisa el rectángulo y, si está bien, la respuesta. */
(function (global) {
  'use strict';

  const POR_RONDA = 10;
  const $ = (id) => global.document.getElementById(id);

  /* ---------- utilidades ---------- */
  const plural = (n, uno, varios) => (n === 1 ? uno : varios);
  const filasDe = (m, n) => `${m} ${plural(m, 'fila', 'filas')} de ${n} ${plural(n, 'cuenta', 'cuentas')}`;
  const barajar = (lista) => {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const pulso = (nodo) => {
    nodo.classList.remove('pulso');
    void nodo.offsetWidth;
    nodo.classList.add('pulso');
  };
  const sumaRepetida = (veces, valor) => Array(veces).fill(valor).join(' + ');

  const ELOGIOS = ['¡Excelente!', '¡Muy bien!', '¡Genial!', '¡Lo lograste!', '¡Así se hace!'];

  /* Cada pregunta se juega con una fruta distinta (img/frutas/<archivo>.png): las cuentas del ábaco son ese dibujo
     sobre un disco del color de su fila. */
  const FRUTAS = ['manzana', 'pera', 'pina', 'banano', 'fresa', 'naranja', 'uvas', 'sandia', 'cereza', 'mango'];
  const urlFruta = (f) => new global.URL('img/frutas/' + f + '.png', global.document.baseURI).href;
  FRUTAS.forEach((f) => { const im = new global.Image(); im.src = urlFruta(f); }); // se precargan
  let fruta = FRUTAS[0];
  function elegirFruta() {
    let f;
    do { f = FRUTAS[Math.floor(Math.random() * FRUTAS.length)]; } while (f === fruta);
    fruta = f;
    global.document.documentElement.style.setProperty('--fruta', 'url("' + urlFruta(f) + '")');
  }

  /* ---------- estado ---------- */
  const estado = {
    modo: 'jugar',
    tablas: new Set([2]),
    puntos: 0,
    racha: 0,
    cola: [],         // preguntas pendientes; los errores se repiten al final
    indice: 0,
    perfectas: 0,
    falladas: [],
    q: null,          // pregunta en curso
    erroresRespuesta: 0,
    resp: null,       // lo escrito en el recuadro de respuesta (un número); null = vacío
    explorar: { a: 3, b: 4 }
  };

  let abaco = null;

  /* ---------- pantallas ---------- */
  const PANTALLAS = ['pInicio', 'pJuego', 'pFin'];
  function mostrar(id) {
    PANTALLAS.forEach((p) => { $(p).hidden = p !== id; });
    $('btnInicio').hidden = id === 'pInicio';
    $('barra').dataset.pantalla = id;
    if (id === 'pJuego' && abaco) abaco.medir();
    global.scrollTo(0, 0);
  }

  /* El mensaje se lee siempre (aria-live) pero, jugando, solo se ve un momento, en el lugar de las pestañas; la
     instrucción inicial de cada pregunta es "silenciosa" (no se muestra). */
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

  /* Pestañas de la pregunta: primer número (naranja), signo y segundo número (azul). */
  function pintarMedallon(a, b) {
    const m = $('medallon');
    m.textContent = '';
    m.setAttribute('aria-label', `${a} por ${b}`);
    const ficha = (clase, texto) => {
      const e = global.document.createElement('span');
      e.className = clase;
      e.textContent = texto;
      return e;
    };
    m.appendChild(ficha('mb a', a));
    m.appendChild(ficha('op', '×'));
    m.appendChild(ficha('mb b', b));
  }

  /* ---------- inicio: fichas de tablas ---------- */
  function pintarFichas() {
    const cont = $('fichas');
    cont.textContent = '';
    for (let t = 1; t <= 10; t++) {
      const b = global.document.createElement('button');
      b.className = 'ficha';
      b.textContent = t;
      b.setAttribute('aria-pressed', estado.tablas.has(t));
      b.setAttribute('aria-label', 'Tabla del ' + t);
      b.addEventListener('click', () => {
        if (estado.tablas.has(t)) { if (estado.tablas.size > 1) estado.tablas.delete(t); }
        else estado.tablas.add(t);
        pintarFichas();
      });
      cont.appendChild(b);
    }
    const todas = global.document.createElement('button');
    todas.className = 'ficha todas';
    const todasSi = estado.tablas.size === 10;
    todas.textContent = todasSi ? 'Quitar selección' : 'Todas las tablas';
    todas.setAttribute('aria-pressed', todasSi);
    todas.addEventListener('click', () => {
      estado.tablas = todasSi ? new Set([2]) : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      pintarFichas();
    });
    cont.appendChild(todas);
  }

  /* ---------- herramientas de pintura ---------- */
  function elegirHerramienta(nombre) {
    abaco.usarHerramienta(nombre);
    $('herrLapiz').setAttribute('aria-pressed', nombre === 'lapiz');
    $('herrRect').setAttribute('aria-pressed', nombre === 'rect');
  }

  /* ---------- ronda de juego ---------- */
  function iniciarRonda() {
    estado.modo = 'jugar';
    estado.puntos = 0;
    estado.racha = 0;
    estado.perfectas = 0;
    estado.falladas = [];
    $('pJuego').dataset.modo = 'jugar';
    abaco.mostrarCorchetes(true); // los corchetes muestran filas y columnas del rectángulo pintado (arriba y a la izquierda)
    abaco.reservaAlto = 90;       // el recuadro de respuesta ocupa sitio debajo del ábaco

    const vistos = new Set();
    const pool = [];
    estado.tablas.forEach((t) => {
      for (let k = 1; k <= 10; k++) {
        const clave = Math.min(t, k) + 'x' + Math.max(t, k);
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        pool.push(Math.random() < 0.5 ? [t, k] : [k, t]);
      }
    });
    estado.cola = barajar(pool).slice(0, POR_RONDA).map((par) => ({ a: par[0], b: par[1], repaso: false }));
    estado.indice = 0;

    mostrar('pJuego');
    mostrarPregunta();
  }

  function actualizarHud() {
    $('puntos').textContent = estado.puntos;
    $('racha').textContent = estado.racha;
    const total = estado.cola.length;
    const avance = estado.indice;
    $('progreso').style.width = Math.min(100, (avance / total) * 100) + '%';
    $('progresoTxt').textContent = `Pregunta ${Math.min(estado.indice + 1, total)} de ${total}`;
  }

  function sumar(puntos) {
    estado.puntos += puntos;
    $('puntos').textContent = estado.puntos;
    pulso($('puntos'));
  }

  /* ---------- respuesta escrita ---------- */
  const MAX_DIGITOS_RESP = 3; // el producto llega hasta 100

  function limpiarRespuesta() {
    estado.resp = null;
    const caja = $('respCaja');
    caja.textContent = '';
    caja.classList.remove('mal', 'bien');
  }

  const escribiendo = () => !!estado.q && estado.q.fase === 'construir' && estado.modo === 'jugar';

  function mostrarRespuesta() { $('respCaja').textContent = estado.resp === null ? '' : estado.resp; }

  function escribirDigito(d) {
    if (!escribiendo()) return;
    const v = estado.resp; // los dígitos se escriben uno detrás de otro
    estado.resp = v !== null && String(v).length < MAX_DIGITOS_RESP ? v * 10 + d : d;
    $('respCaja').classList.remove('mal');
    mostrarRespuesta();
    global.Sonido.cuenta(d);
  }

  function borrarDigito() {
    if (!escribiendo()) return;
    const v = estado.resp;
    estado.resp = v === null || v < 10 ? null : Math.floor(v / 10);
    $('respCaja').classList.remove('mal');
    mostrarRespuesta();
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

  /* Recuadro "7 × 8 = [ ]" debajo del ábaco, dentro del marco azul. */
  function crearFilaRespuesta() {
    const fila = global.document.createElement('div');
    fila.className = 'fila-resp';
    fila.innerHTML = '<div class="ecuacion-grupo"><span class="n-a"></span><span>×</span><span class="n-b"></span><span>=</span></div>';
    const caja = global.document.createElement('button');
    caja.type = 'button';
    caja.id = 'respCaja';
    caja.className = 'resp-caja';
    caja.setAttribute('aria-label', 'Respuesta de la multiplicación');
    fila.appendChild(caja);
    abaco.interior.appendChild(fila);
  }

  /* ---------- una pregunta ---------- */
  function mostrarPregunta() {
    const base = estado.cola[estado.indice];
    estado.q = { a: base.a, b: base.b, repaso: base.repaso, fase: 'construir', errores: 0, pistas: 0 };
    estado.erroresRespuesta = 0;
    elegirFruta();

    abaco.bloquear(false);
    abaco.ocultarFantasma();
    abaco.reiniciar();
    limpiarRespuesta();

    pintarMedallon(base.a, base.b);
    global.document.querySelector('.ecuacion-grupo .n-a').textContent = base.a;
    global.document.querySelector('.ecuacion-grupo .n-b').textContent = base.b;
    $('herramientas').hidden = false;
    $('teclado').hidden = false;
    $('panelConstruir').hidden = false;
    $('panelSiguiente').hidden = true;
    $('btnSiguiente').hidden = true;

    decir(base.repaso ? `Repasemos: pinta ${base.a} × ${base.b}.` : `Pinta ${base.a} × ${base.b} en el ábaco.`, true);
    actualizarHud();
  }

  function comprobar() {
    const q = estado.q;
    if (!q || q.fase !== 'construir') return;
    const an = abaco.analizar();

    if (an.vacio) {
      decir('Pinta algunas cuentas con el dedo.');
      return;
    }

    const correcto = an.rectangulo &&
      ((an.filas === q.a && an.columnas === q.b) || (an.filas === q.b && an.columnas === q.a));

    if (!correcto) {
      q.errores++;
      estado.racha = 0;
      actualizarHud();
      global.Sonido.error();
      decir(an.rectangulo
        ? `Pintaste ${filasDe(an.filas, an.columnas)}. ¡Inténtalo otra vez!`
        : 'Forma un rectángulo completo, sin huecos.');
      return;
    }

    // Rectángulo correcto: ahora se revisa la respuesta escrita
    if (estado.resp === null) {
      decir('¡Bien pintado! Ahora escribe la respuesta en el recuadro de abajo.');
      return;
    }

    const producto = q.a * q.b;
    const caja = $('respCaja');
    if (estado.resp !== producto) {
      q.errores++;
      estado.erroresRespuesta++;
      estado.racha = 0;
      caja.classList.remove('mal');
      void caja.offsetWidth;
      caja.classList.add('mal');
      global.Sonido.error();
      decir(estado.erroresRespuesta === 1
        ? 'Casi. Mira cuántas cuentas pintaste e inténtalo otra vez.'
        : `Pista: ${sumaRepetida(q.a, q.b)}.`);
      global.setTimeout(() => {
        if (estado.q === q && q.fase === 'construir' && caja.classList.contains('mal')) { // si ya escribió otro número, se respeta
          caja.classList.remove('mal');
          estado.resp = null;
          mostrarRespuesta();
        }
      }, 900);
      actualizarHud();
      return;
    }

    // Todo bien: rectángulo y respuesta
    q.fase = 'resuelta';
    abaco.bloquear(true);
    abaco.ocultarFantasma();
    abaco.celebrar();
    caja.classList.add('bien');
    global.Sonido.acierto();
    $('herramientas').hidden = true;
    $('teclado').hidden = true;
    $('panelConstruir').hidden = true;
    $('panelSiguiente').hidden = false;

    const perfecta = q.errores === 0 && q.pistas === 0;
    let ganados = estado.erroresRespuesta === 0 && q.pistas === 0 ? 10 : 5;
    if (perfecta) {
      estado.racha++;
      if (!q.repaso) estado.perfectas++; // las repetidas no cuentan como "a la primera"
      ganados += Math.min(estado.racha, 5) * 2;
    }
    sumar(ganados);

    if (!perfecta) {
      estado.falladas.push(`${q.a} × ${q.b} = ${producto}`);
      if (!q.repaso) estado.cola.push({ a: q.a, b: q.b, repaso: true });
    }

    decir(`${alAzar(ELOGIOS)} ${q.a} × ${q.b} = ${producto}` + (perfecta && estado.racha >= 3 ? ` · Racha de ${estado.racha}` : ''));

    const marco = $('tablero').getBoundingClientRect();
    global.Confeti.lanzar(marco.left + marco.width / 2, marco.top + marco.height * 0.55, perfecta ? 110 : 60);

    const ultima = estado.indice >= estado.cola.length - 1;
    $('btnSiguiente').textContent = ultima ? 'Ver resultado ▶' : 'Siguiente ▶';
    $('btnSiguiente').hidden = false;
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
      decir(`${q.a} filas hacia abajo y ${q.b} cuentas hacia el lado (o al revés).`);
    } else if (q.pistas === 2) {
      abaco.fantasma(q.a, q.b);
      decir('Pinta los círculos punteados.');
    } else {
      decir(`Cuenta las frutas: ${sumaRepetida(q.a, q.b)}.`);
    }
  }

  function finRonda() {
    const total = POR_RONDA;
    const razon = estado.perfectas / total;
    const estrellas = razon >= 0.8 ? 3 : razon >= 0.5 ? 2 : 1;
    $('estrellas').innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = global.document.createElement('span');
      s.textContent = i < estrellas ? '⭐' : '☆';
      s.style.animationDelay = (i * 0.25) + 's';
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
    global.Sonido.fin();
    global.Confeti.lanzar(global.innerWidth / 2, global.innerHeight * 0.4, estrellas * 50);
  }

  /* ---------- modo explorar ---------- */
  function iniciarExplorar() {
    estado.modo = 'explorar';
    estado.q = null;
    $('pJuego').dataset.modo = 'explorar';
    abaco.mostrarCorchetes(true); // aquí sí: los corchetes enseñan filas × columnas
    abaco.reservaAlto = 0;
    elegirFruta();
    mostrar('pJuego');
    abaco.bloquear(false);
    abaco.ocultarFantasma();
    abaco.reiniciar();
    $('herramientas').hidden = false;
    decir('Pinta con el dedo y descubre la multiplicación.');
    pintarSelector();
  }

  function pintarSelector() {
    $('valA').textContent = estado.explorar.a;
    $('valB').textContent = estado.explorar.b;
  }

  function leerExplorar(an) {
    const ec = $('lecEcuacion');
    const su = $('lecSuma');
    if (an.vacio) {
      ec.textContent = 'Pinta en el ábaco';
      su.textContent = '';
    } else if (an.rectangulo) {
      ec.textContent = `${an.filas} × ${an.columnas} = ${an.total}`;
      su.textContent = an.filas > 1 ? sumaRepetida(an.filas, an.columnas) : '';
    } else {
      ec.textContent = `${an.total} cuentas`;
      su.textContent = 'Forma un rectángulo completo.';
    }
  }

  /* ---------- arranque ---------- */
  function iniciar() {
    abaco = new global.Abaco($('tablero'), {
      alMover: (columna) => global.Sonido.cuenta(columna),
      alCambiar: (an) => { if (estado.modo === 'explorar') leerExplorar(an); }
    });

    crearFilaRespuesta();
    pintarTeclado();
    pintarFichas();

    $('btnJugar').addEventListener('click', iniciarRonda);
    $('btnExplorar').addEventListener('click', iniciarExplorar);
    $('btnInicio').addEventListener('click', () => mostrar('pInicio'));
    $('btnOtra').addEventListener('click', iniciarRonda);
    $('btnCambiar').addEventListener('click', () => mostrar('pInicio'));

    // herramientas
    $('herrLapiz').addEventListener('click', () => elegirHerramienta('lapiz'));
    $('herrRect').addEventListener('click', () => elegirHerramienta('rect'));
    $('btnReiniciar').addEventListener('click', () => {
      if (estado.modo === 'explorar' || (estado.q && estado.q.fase === 'construir')) abaco.reiniciar();
      if (estado.q && estado.q.fase === 'construir') { limpiarRespuesta(); }
    });
    global.document.addEventListener('keydown', (e) => { // también vale el teclado del equipo
      if (e.ctrlKey || e.metaKey || e.altKey || !escribiendo()) return;
      if (/^[0-9]$/.test(e.key)) escribirDigito(Number(e.key));
      else if (e.key === 'Backspace') borrarDigito();
    });

    // juego
    $('btnComprobar').addEventListener('click', comprobar);
    $('btnPista').addEventListener('click', pista);
    $('btnSiguiente').addEventListener('click', siguiente);

    // explorar
    global.document.querySelectorAll('.btn-mini').forEach((btn) => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.factor;
        estado.explorar[f] = Math.max(1, Math.min(10, estado.explorar[f] + Number(btn.dataset.delta)));
        pintarSelector();
      });
    });
    $('btnMostrar').addEventListener('click', () => abaco.rectangulo(estado.explorar.a, estado.explorar.b));
    $('btnGirar').addEventListener('click', () => {
      const e = estado.explorar;
      const t = e.a; e.a = e.b; e.b = t;
      pintarSelector();
      abaco.rectangulo(e.a, e.b);
    });

    // sonido
    const icono = () => { $('btnSonido').textContent = global.Sonido.mudo ? '🔇' : '🔊'; };
    $('btnSonido').addEventListener('click', () => { global.Sonido.alternar(); icono(); });
    icono();
  }

  iniciar();
})(window);
