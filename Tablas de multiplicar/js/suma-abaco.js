/* Suma — componente de ábaco para sumar, con dos modos:
 *
 *  1) "general" (suma de 1 cifra): dos cuadros de 5 × 2 círculos (20 en total, el modelo clásico para sumar
 *     hasta 20). El primer cuadro (izquierda, o arriba en celular) es naranja y el segundo, azul.
 *
 *  2) "posicional" (suma de 2 o 3 cifras): columnas de valor posicional (Centenas, Decenas, Unidades).
 *     En cada columna hay DOS cuadrículas de 3 × 3: la de arriba (naranja) para el dígito del primer sumando
 *     y la de abajo (azul) para el dígito del segundo, igual que al sumar en vertical. Una cuenta de Decenas
 *     vale 10 y una de Centenas vale 100. Debajo de cada columna hay un recuadro para escribir la respuesta y,
 *     a la derecha, el valor de lo pintado en cada fila (primer número, segundo número y respuesta).
 *
 * El estudiante llena los círculos con cuentas pasando el dedo (o el mouse). NO elige color: el color lo
 * decide el cuadro donde pinta (naranja o azul).
 *
 *   - Tocar o arrastrar sobre círculos vacíos los pinta.
 *   - Empezar sobre una cuenta ya pintada borra esa pasada.
 *
 * Uso:
 *   const abaco = new AbacoSuma(elemento, { alCambiar(analisis) {}, alMover(total) {} });
 *   abaco.usarModo('general');           // o abaco.usarModo('posicional', 3) para centenas, decenas y unidades
 *   abaco.analizar() -> { n1, n2, total, vacio, valor1, valor2, columnas: [{ nombre, valor, n1, n2 }] }
 *   abaco.cuentasPintadas() -> [{ k, color, el }]   // en orden de lectura (columna por columna en el modo posicional)
 *
 * Archivo propio de la actividad de suma: no se comparte con las de resta ni multiplicación.
 */
(function (global) {
  'use strict';

  // modo general
  const POR_CUADRO = 10;
  const CUADROS = 2;
  const COLUMNAS = 5;
  const HUECO = 14;           // separación entre los dos cuadros (px)
  const LADO_MAX = 52;        // tamaño máximo de una cuenta (px)
  const LADO_MAX_APILADO = 52;
  const LADO_COMPACTO = 34;   // tamaño máximo en modo compacto (cuadros apilados)
  const LADO_MIN_JUNTOS = 40; // si cabrían a 40 px o más, se muestran lado a lado
  // modo posicional
  const POR_REJILLA = 9;      // cada dígito de cada sumando se pinta en una cuadrícula de 3 × 3
  const HUECO_COL = 10;       // separación entre columnas (px)
  const LADO_MAX_POS = 44;
  const LADO_COMPACTO_POS = 20;
  const LATERAL = 84;         // ancho de la columna de la derecha con el valor de cada número (px)
  const LATERAL_ANGOSTO = 54; // ídem en pantallas angostas
  // comunes
  const RELLENO = 6;          // espacio interior de cada cuadro (px)
  const NOMBRES = ['Centenas', 'Decenas', 'Unidades'];
  const VALORES = [100, 10, 1];
  const REDUCIR = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Pantalla grande: el ábaco tiene más sitio (el juego pone los controles a su derecha), así que las cuentas crecen. */
  const esAncha = () => !!(global.matchMedia && global.matchMedia('(min-width: 900px)').matches);

  function el(etiqueta, clase) {
    const e = global.document.createElement(etiqueta);
    if (clase) e.className = clase;
    return e;
  }

  class AbacoSuma {
    constructor(contenedor, opciones) {
      const o = opciones || {};
      this.raiz = contenedor;
      this.alCambiar = o.alCambiar || function () {};
      this.alMover = o.alMover || function () {};
      this.bloqueado = false;
      this.arrastre = null;
      this.lado = 40;
      this.compacto = false;
      this.modo = '';
      this.nCols = 0;
      this._estructura();
      this._escuchar();
      this._medir();
      this.usarModo('general');
    }

    /* ---------- construcción ---------- */

    /* Lo que no cambia: el marco azul y el contenedor donde se dibujan las cuentas. */
    _estructura() {
      const raiz = this.raiz;
      raiz.classList.add('tablero');
      raiz.style.setProperty('--relleno', RELLENO + 'px');
      raiz.style.setProperty('--hueco', HUECO + 'px');
      raiz.setAttribute('role', 'group');
      raiz.setAttribute('aria-label', 'Ábaco de suma: pinta las cuentas arrastrando el dedo o el mouse');
      this.interior = el('div', 'tablero-interior');
      this.zona = el('div', 'cuadros');
      this.interior.appendChild(this.zona);
      raiz.appendChild(this.interior);
    }

    /* Cambia entre los dos cuadros de 10 (1 cifra) y las columnas posicionales (2 o 3 cifras). */
    usarModo(modo, cifras) {
      const posicional = modo === 'posicional';
      const c = posicional ? Math.max(2, Math.min(3, cifras || 2)) : 1;
      const nuevoModo = posicional ? 'posicional' : 'general';
      if (this.modo === nuevoModo && this.nCols === c) return;
      this.modo = nuevoModo;
      this.nCols = c;
      this.lugares = posicional ? [0, 1, 2].slice(3 - c) : [2]; // 0 centenas, 1 decenas, 2 unidades
      this.nombres = posicional ? this.lugares.map((l) => NOMBRES[l]) : [''];
      this.valores = posicional ? this.lugares.map((l) => VALORES[l]) : [1];
      this.n = posicional ? c * 2 * POR_REJILLA : POR_CUADRO * CUADROS;
      this.celdas = new Array(this.n).fill(0); // 0 vacía, 1 naranja (primer sumando), 2 azul (segundo)
      this.columna = new Array(this.n).fill(0);
      this._poblar();
      this._medirAhora();
    }

    /* Color de la cuenta k: lo decide el cuadro. Primer cuadro = 1 (naranja), segundo = 2 (azul). */
    _colorDe(k) {
      if (this.modo === 'general') return k < POR_CUADRO ? 1 : 2;
      return (k % (2 * POR_REJILLA)) < POR_REJILLA ? 1 : 2;
    }

    /* Lugar de la cuenta k dentro de su cuadro (0, 1, 2…, en orden de lectura). */
    _posicion(k) {
      return this.modo === 'general' ? k % POR_CUADRO : (k % (2 * POR_REJILLA)) % POR_REJILLA;
    }

    /* Dibuja los cuadros del modo actual. */
    _poblar() {
      this.zona.textContent = '';
      this.zona.dataset.modo = this.modo;
      this.cuadros = new Array(this.n);
      this.cuentas = new Array(this.n);
      this.fantasmas = new Array(this.n);
      this.ecuacionA = null; // (1 cifra) "a + b =" junto a la respuesta
      this.ecuacionB = null;
      this.grupoCont = null; // (1 cifra) donde se juntan las cuentas de los dos cuadros al sumar
      this.cajasResp = [];   // recuadros de respuesta (uno por columna en el modo posicional; uno solo en el general)
      this.valorA = null;    // valor de lo pintado en naranja / en azul / respuesta, a la derecha del tablero
      this.valorB = null;
      this.valorR = null;

      const celda = (k) => {
        const c = el('div', 'cuadro c' + this._colorDe(k)); // el color fijo del cuadro va en la celda
        c.dataset.k = k;
        const fantasma = el('div', 'fantasma');
        const cuenta = el('div', 'cuenta');
        c.appendChild(fantasma);
        c.appendChild(cuenta);
        this.cuadros[k] = c;
        this.cuentas[k] = cuenta;
        this.fantasmas[k] = fantasma;
        return c;
      };

      if (this.modo === 'general') {
        for (let d = 0; d < CUADROS; d++) {
          const cuadro = el('div', 'decena d' + (d + 1)); // d1: naranja, d2: azul
          for (let i = 0; i < POR_CUADRO; i++) cuadro.appendChild(celda(d * POR_CUADRO + i));
          this.zona.appendChild(cuadro);
        }
        // Un solo recuadro donde, al sumar, se juntan las cuentas de los dos cuadros (cada una con su color)
        const filaGrupo = el('div', 'fila-grupo');
        const grupo = el('div', 'grupo-suma');
        this.grupoCont = el('div', 'cuentas-juntas');
        grupo.appendChild(this.grupoCont);
        filaGrupo.appendChild(grupo);
        this.zona.appendChild(filaGrupo);
        const fila = el('div', 'fila-resp'); // debajo: "6 + 4 = [ ]", el recuadro para escribir la suma
        const ecuacion = el('div', 'ecuacion-grupo');
        ecuacion.innerHTML = '<span class="n-a"></span><span>+</span><span class="n-b"></span><span>=</span>';
        this.ecuacionA = ecuacion.children[0];
        this.ecuacionB = ecuacion.children[2];
        fila.appendChild(ecuacion);
        const resp = el('button', 'resp-caja general');
        resp.type = 'button';
        resp.dataset.ci = 0;
        resp.setAttribute('aria-label', 'Respuesta de la suma');
        fila.appendChild(resp);
        this.cajasResp.push(resp);
        this.zona.appendChild(fila);
      } else {
        const columnas = el('div', 'columnas-pos');
        for (let ci = 0; ci < this.nCols; ci++) {
          const col = el('div', 'col-pos lugar-' + this.lugares[ci]);
          const cab = el('div', 'col-cab');
          cab.innerHTML = '<b>' + this.nombres[ci] + '</b><small>' + this.valores[ci] + '</small>';
          const arriba = el('div', 'col-grid g1'); // naranja: dígito del primer sumando
          const abajo = el('div', 'col-grid g2');  // azul: dígito del segundo sumando
          for (let i = 0; i < POR_REJILLA; i++) {
            const k1 = ci * 2 * POR_REJILLA + i;
            const k2 = k1 + POR_REJILLA;
            this.columna[k1] = ci;
            this.columna[k2] = ci;
            arriba.appendChild(celda(k1));
            abajo.appendChild(celda(k2));
          }
          col.appendChild(cab);
          col.appendChild(arriba);
          col.appendChild(abajo);
          const resp = el('button', 'resp-caja'); // aquí el niño escribe el dígito de la suma de esta columna
          resp.type = 'button';
          resp.dataset.ci = ci;
          resp.setAttribute('aria-label', 'Respuesta de las ' + this.nombres[ci].toLowerCase());
          col.appendChild(resp);
          this.cajasResp.push(resp);
          columnas.appendChild(col);
        }
        columnas.appendChild(this._lateral());
        this.zona.appendChild(columnas);
      }

      // Con GSAP, la escala de las cuentas la maneja la librería (si no, lo hace la transición CSS)
      if (global.gsap) {
        global.gsap.set(this.cuentas, { scale: 0 });
        this.raiz.classList.add('con-gsap');
      }
    }

    /* Columna de la derecha: alineada con las filas de las columnas, muestra el valor del primer número (naranja),
       del segundo (azul) y de la respuesta escrita. */
    _lateral() {
      const lado = el('div', 'col-lado');
      const hueco = el('div', 'col-cab'); // ocupa el mismo alto que los títulos de las columnas
      hueco.innerHTML = '<b>&nbsp;</b><small>&nbsp;</small>';
      this.valorA = el('div', 'lado-valor v1');
      this.valorB = el('div', 'lado-valor v2');
      this.valorR = el('div', 'lado-valor vr');
      this.valorA.setAttribute('aria-label', 'Valor del primer número');
      this.valorB.setAttribute('aria-label', 'Valor del segundo número');
      this.valorR.setAttribute('aria-label', 'Respuesta');
      lado.appendChild(hueco);
      lado.appendChild(this.valorA);
      lado.appendChild(this.valorB);
      lado.appendChild(this.valorR);
      this._pintarLado(this.analizar());
      return lado;
    }

    _pintarLado(an) {
      if (!this.valorA) return;
      this.valorA.textContent = an.valor1;
      this.valorB.textContent = an.valor2;
      this.valorA.classList.toggle('en-cero', an.valor1 === 0);
      this.valorB.classList.toggle('en-cero', an.valor2 === 0);
    }

    /* (1 cifra) Prepara el recuadro donde se juntan las cuentas: n1 naranja y luego n2 azules, todas juntas y sin
       agrupar (sin filas de 10 ni grupos de 5), como las manzanas de un dibujo: el niño ve el total. Quedan
       invisibles, ocupando su lugar, para que lleguen volando una por una. Devuelve las cuentas en orden de llegada. */
    prepararGrupo(n1, n2) {
      this.raiz.classList.add('con-grupo');
      const cont = this.grupoCont;
      cont.textContent = '';
      const cuentas = [];
      for (let i = 0; i < n1 + n2; i++) {
        const c = el('span', 'rb ' + (i < n1 ? 'a' : 'b'));
        c.style.opacity = '0';
        cont.appendChild(c);
        cuentas.push(c);
      }
      return cuentas;
    }

    /* (1 cifra) Escribe la suma "a + b =" junto al recuadro de la respuesta. */
    ponerEcuacion(a, b) {
      if (!this.ecuacionA) return;
      this.ecuacionA.textContent = a;
      this.ecuacionB.textContent = b;
    }

    /* Vuelve a esconder el recuadro de las cuentas juntas y la respuesta (para empezar otra pregunta). */
    limpiarGrupo() {
      this.raiz.classList.remove('con-grupo', 'sumado');
      if (this.grupoCont) this.grupoCont.textContent = '';
    }

    /* Una vez juntas las cuentas, se muestra el recuadro para escribir la respuesta. */
    marcarSumado(si) {
      this.raiz.classList.toggle('sumado', !!si);
    }

    /* Muestra en los recuadros de respuesta los dígitos escritos (null = vacío) y marca el recuadro activo. */
    pintarRespuesta(digitos, activa) {
      this.cajasResp.forEach((c, ci) => {
        const d = digitos[ci];
        const hay = d !== null && d !== undefined;
        c.textContent = hay ? d : '';
        c.classList.toggle('puesto', hay);
        c.classList.toggle('activa', ci === activa);
      });
      if (this.valorR) {
        const alguno = digitos.some((d) => d !== null && d !== undefined);
        this.valorR.textContent = alguno ? digitos.map((d) => (d === null || d === undefined ? '_' : d)).join('') : '?';
        this.valorR.classList.toggle('en-cero', !alguno);
      }
    }

    /* El tamaño de la cuenta depende del ancho y del modo. */
    _medir() {
      // Tamaño ideal de una cuenta. En modo compacto se achican para dejar sitio al recuadro del resultado
      // sin necesidad de hacer scroll.
      this._ladoIdeal = () => {
        const cs = global.getComputedStyle(this.interior);
        const ancho = this.interior.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        if (this.modo === 'posicional') {
          // c columnas de 3 cuentas, con su relleno a cada lado, un hueco entre columnas y la columna de valores
          const c = this.nCols;
          const lateral = ancho < 420 ? LATERAL_ANGOSTO : LATERAL;
          this.raiz.style.setProperty('--lat', lateral + 'px');
          const extra = c * 2 * RELLENO + c * HUECO_COL + lateral + 2;
          const lado = Math.floor((ancho - extra) / (3 * c));
          return Math.max(16, Math.min(this.compacto ? LADO_COMPACTO_POS : LADO_MAX_POS + (esAncha() ? 8 : 0), lado));
        }
        const juntos = Math.floor((ancho - 4 * RELLENO - HUECO) / (2 * COLUMNAS));
        const apilado = Math.floor((ancho - 2 * RELLENO) / COLUMNAS);
        if (juntos >= LADO_MIN_JUNTOS) return Math.min(LADO_MAX + (esAncha() ? 8 : 0), juntos);
        const lado = Math.max(18, Math.min(LADO_MAX_APILADO, apilado));
        return this.compacto ? Math.min(lado, LADO_COMPACTO) : lado;
      };
      this._medirAhora = () => {
        this.lado = this._ladoIdeal();
        this.raiz.style.setProperty('--b', this.lado + 'px');
        // tamaño de las cuentas del recuadro donde se juntan (1 cifra): caben 6 por fila + sus huecos y rellenos (50 px)
        const cs = global.getComputedStyle(this.interior);
        const ancho = this.interior.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        this.raiz.style.setProperty('--r', Math.max(18, Math.min(36, Math.floor((ancho - 50) / 6))) + 'px');
      };
      this._medirAhora();
      if (global.ResizeObserver) new global.ResizeObserver(this._medirAhora).observe(this.interior);
      else global.addEventListener('resize', this._medirAhora);
    }

    /* Volver a medir (por ejemplo, justo después de mostrar una pantalla que estaba oculta). */
    medir() {
      this._medirAhora();
    }

    /* Modo compacto: achica el tablero (con animación si hay GSAP) o lo devuelve a su tamaño normal. */
    compactar(si, animar) {
      this.compacto = !!si;
      if (this._tweenLado) { this._tweenLado.kill(); this._tweenLado = null; }
      const destino = this._ladoIdeal();
      const gs = global.gsap;
      if (animar && gs && !REDUCIR && Math.abs(destino - this.lado) > 0.5) {
        const o = { v: this.lado };
        this._tweenLado = gs.to(o, {
          v: destino, duration: 0.45, ease: 'power2.inOut',
          onUpdate: () => { this.lado = o.v; this.raiz.style.setProperty('--b', o.v + 'px'); },
          onComplete: () => { this._tweenLado = null; this._medirAhora(); }
        });
      } else {
        this._medirAhora();
      }
    }

    /* ---------- entrada del usuario ---------- */
    _escuchar() {
      const zona = this.zona;

      zona.addEventListener('pointerdown', (e) => {
        if (this.bloqueado) return;
        const k = this._cuentaEn(e.clientX, e.clientY);
        if (k === null) return;
        e.preventDefault();
        const pintar = this.celdas[k] === 0; // empezar sobre una cuenta pintada: se borra
        this.arrastre = { id: e.pointerId, pintar: pintar, x: e.clientX, y: e.clientY };
        try { zona.setPointerCapture(e.pointerId); } catch (_) { /* no crítico */ }
        if (this._poner(k, pintar, 0)) this._despues();
      });

      zona.addEventListener('pointermove', (e) => {
        const a = this.arrastre;
        if (!a || e.pointerId !== a.id) return;
        // se recorre el trayecto en pasos cortos para no saltarse cuentas si el dedo va rápido
        const dx = e.clientX - a.x;
        const dy = e.clientY - a.y;
        const paso = Math.max(4, this.lado / 3);
        const pasos = Math.max(1, Math.ceil(Math.hypot(dx, dy) / paso));
        let cambio = false;
        for (let i = 1; i <= pasos; i++) {
          const k = this._cuentaEn(a.x + (dx * i) / pasos, a.y + (dy * i) / pasos);
          if (k !== null && this._poner(k, a.pintar, 0)) cambio = true;
        }
        a.x = e.clientX;
        a.y = e.clientY;
        if (cambio) this._despues();
      });

      const soltar = (e) => {
        if (this.arrastre && e.pointerId === this.arrastre.id) this.arrastre = null;
      };
      zona.addEventListener('pointerup', soltar);
      zona.addEventListener('pointercancel', soltar);
    }

    /* Número de cuenta bajo un punto de la pantalla, o null si no hay ninguna. */
    _cuentaEn(x, y) {
      const e = global.document.elementFromPoint(x, y);
      const celda = e && e.closest ? e.closest('.cuadro') : null;
      if (!celda || !this.zona.contains(celda)) return null;
      return +celda.dataset.k;
    }

    /* Pinta (pintar = true) o borra (false) la cuenta k. Devuelve true si algo cambió. */
    _poner(k, pintar, retraso) {
      const antes = this.celdas[k];
      const valor = pintar ? this._colorDe(k) : 0;
      if (antes === valor) return false;
      this.celdas[k] = valor;
      this._animar(k, antes, valor, retraso);
      return true;
    }

    /* Animación de la cuenta k al pasar de "antes" a "valor" (0 = vacía): aparece con rebote o se desinfla. */
    _animar(k, antes, valor, retraso) {
      const c = this.cuentas[k];
      const gs = global.gsap;
      this.cuadros[k].classList.toggle('lleno', !!valor);
      if (!gs) { // alternativa sin librería: transición CSS
        c.style.transitionDelay = (valor ? retraso : 0) + 'ms';
        return;
      }
      gs.killTweensOf(c);
      if (REDUCIR) {
        gs.set(c, { scale: valor ? 1 : 0, y: 0 });
      } else if (valor) {
        gs.fromTo(c, { scale: 0.2, y: 0 },
          { scale: 1, duration: 0.55, delay: retraso / 1000, ease: 'elastic.out(1, 0.5)', immediateRender: false });
      } else {
        gs.to(c, { scale: 0, y: 0, duration: 0.18, ease: 'back.in(2)' });
      }
    }

    _despues() {
      const an = this.analizar();
      this.alMover(an.total);
      this._notificar(an);
    }

    _notificar(an) {
      this._pintarLado(an);
      this.alCambiar(an);
    }

    /* ---------- API pública ---------- */

    /* Dígitos de un número, uno por columna (de la columna más grande a las unidades). */
    digitos(valor) {
      if (this.modo === 'general') return [valor];
      return String(Math.max(0, valor)).padStart(this.nCols, '0').slice(-this.nCols).split('').map(Number);
    }

    /* Resumen de lo pintado: cuentas naranja (n1) y azules (n2), por columna y en total, y el valor de cada sumando. */
    analizar() {
      const columnas = this.nombres.map((nombre, ci) => ({ nombre: nombre, valor: this.valores[ci], n1: 0, n2: 0 }));
      let n1 = 0;
      let n2 = 0;
      this.celdas.forEach((v, k) => {
        if (!v) return;
        const c = columnas[this.columna[k]];
        if (v === 1) { n1++; c.n1++; } else { n2++; c.n2++; }
      });
      let valor1 = 0;
      let valor2 = 0;
      columnas.forEach((c) => { valor1 += c.n1 * c.valor; valor2 += c.n2 * c.valor; });
      return { n1: n1, n2: n2, total: n1 + n2, vacio: n1 + n2 === 0, valor1: valor1, valor2: valor2, columnas: columnas };
    }

    reiniciar() {
      for (let k = 0; k < this.n; k++) this._poner(k, false, 0);
      this._notificar(this.analizar());
    }

    /* Pinta el primer sumando (naranja) y el segundo (azul), en onda. */
    mostrarSuma(a, b) {
      if (this.modo === 'general') {
        for (let k = 0; k < this.n; k++) {
          const i = this._posicion(k);
          const debe = k < POR_CUADRO ? i < a : i < b;
          this._poner(k, debe, (k < POR_CUADRO ? i : i + a) * 45);
        }
      } else {
        const da = this.digitos(a);
        const db = this.digitos(b);
        for (let k = 0; k < this.n; k++) {
          const ci = this.columna[k];
          const i = this._posicion(k);
          const debe = this._colorDe(k) === 1 ? i < da[ci] : i < db[ci];
          this._poner(k, debe, (ci * POR_REJILLA + i) * 45);
        }
      }
      this._notificar(this.analizar());
    }

    /* Cuentas pintadas, en orden de lectura: primero las del cuadro 1 (naranja) y luego las del cuadro 2 (azul);
       en el modo posicional, columna por columna (de izquierda a derecha), naranja y luego azul.
       Es el mismo orden en que llegan al recuadro del resultado. */
    cuentasPintadas() {
      const lista = [];
      this.celdas.forEach((v, k) => { if (v) lista.push({ k: k, color: v, el: this.cuentas[k] }); });
      return lista;
    }

    /* Oculta la cuenta k (por ejemplo, porque "se va" al recuadro del resultado) sin cambiar lo pintado.
       Al volver a empezar con reiniciar() todo queda limpio. */
    ocultarCuenta(k) {
      const gs = global.gsap;
      if (gs) { gs.killTweensOf(this.cuentas[k]); gs.set(this.cuentas[k], { scale: 0, y: 0 }); }
    }

    /* Contorno punteado como guía, con el color de cada sumando: a círculos en el cuadro naranja y b en el azul
       (en el modo posicional, los dígitos de cada sumando en su columna). */
    fantasma(a, b) {
      const da = this.digitos(a);
      const db = this.digitos(b);
      this.fantasmas.forEach((g, k) => {
        const i = this._posicion(k);
        const ci = this.columna[k];
        const color = this._colorDe(k);
        const hasta = this.modo === 'general' ? (color === 1 ? a : b) : (color === 1 ? da[ci] : db[ci]);
        const ver = i < hasta;
        g.classList.toggle('ver', ver);
        g.classList.toggle('g1', ver && color === 1);
        g.classList.toggle('g2', ver && color === 2);
      });
    }

    ocultarFantasma() {
      this.fantasmas.forEach((g) => { g.classList.remove('ver', 'g1', 'g2'); });
    }

    bloquear(si) {
      this.bloqueado = !!si;
      this.raiz.classList.toggle('bloqueado', this.bloqueado);
      if (this.bloqueado) this.arrastre = null;
    }
  }

  global.AbacoSuma = AbacoSuma;
})(window);
