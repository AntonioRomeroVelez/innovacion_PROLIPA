/* Componente reutilizable: ábaco para pintar.
 *
 * Es una cuadrícula de círculos vacíos, sin números en los bordes. El estudiante los va llenando
 * con cuentas de colores pasando el dedo (o el mouse) por encima. Cada cuenta que se pinta lleva
 * su número de conteo (1, 2, 3…) en el orden en que se pintó, así que el último número es el
 * total de cuentas, es decir, el resultado de la multiplicación. Si se borra una cuenta, las
 * siguientes se renumeran.
 *
 *   - Herramienta "lapiz": tocar o arrastrar pinta cuenta por cuenta (empezar sobre una cuenta
 *     ya pintada borra).
 *   - Herramienta "rect": arrastrar de una esquina a la opuesta pinta (o borra) todo el rectángulo.
 *
 * Opcionalmente (mostrarCorchetes) muestra dos corchetes con el número de filas (borde izquierdo)
 * y de columnas (borde de arriba) del rectángulo pintado; se usa en el juego y en el modo explorar.
 *
 * Uso:
 *   const abaco = new Abaco(elemento, { alCambiar(analisis) {}, alMover(columna) {} });
 *   abaco.analizar() -> { total, vacio, rectangulo, filas, columnas, r0, c0 }
 */
(function (global) {
  'use strict';

  const BANDA = 1.0;        // ancho/alto de la banda de los corchetes, en diámetros de cuenta
  const MAX_CUENTA_PX = 38; // en celular el tablero cabe sin hacer scroll
  const ENSANCHE_MAX = 1.8; // en pantallas grandes cada casilla puede ser hasta 1,8 veces más ancha que alta
  const MAX_CUENTA_ANCHA = 60; // en pantallas grandes (el juego pone los controles a la derecha) las cuentas crecen
  const esAncha = () => !!(global.matchMedia && global.matchMedia('(min-width: 900px)').matches);

  // [brillo, base, sombra] por fila
  const COLORES = [
    ['#ff9db4', '#e8456b', '#a8234a'],
    ['#ffc58a', '#f08a24', '#b25a0a'],
    ['#ffe58a', '#f4c20d', '#b58900'],
    ['#dcf58a', '#8fcc2a', '#5a8f10'],
    ['#86e6a8', '#1fa85a', '#0f6b36'],
    ['#8de8ea', '#19b3b8', '#0a7478'],
    ['#9ccaff', '#2f7fe0', '#164f9e'],
    ['#b4b1ff', '#5a52e0', '#342da0'],
    ['#dca6ff', '#9b3fd1', '#64208f'],
    ['#ffa8e0', '#d93fa8', '#8f1f6a']
  ];

  function el(etiqueta, clase, texto) {
    const e = global.document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  class Abaco {
    constructor(contenedor, opciones) {
      const o = opciones || {};
      this.raiz = contenedor;
      this.nFilas = o.filas || 10;
      this.nCols = o.columnas || 10;
      this.alCambiar = o.alCambiar || function () {};
      this.alMover = o.alMover || function () {};
      this.celdas = Array.from({ length: this.nFilas }, () => new Array(this.nCols).fill(false));
      this.orden = []; // cuentas pintadas, en el orden en que se pintaron (índice = fila * columnas + columna)
      this.bloqueado = false;
      this.arrastre = null;
      this.herramienta = 'lapiz';
      this.reservaAlto = 0; // alto extra (px) que el juego ocupa debajo del ábaco; las cuentas se achican para que todo quepa
      this.corchetes = false;
      this._construir();
      this._escuchar();
      this._medir();
      this.usarHerramienta('lapiz');
      this.mostrarCorchetes(false);
    }

    /* ---------- construcción ---------- */
    _construir() {
      const raiz = this.raiz;
      raiz.classList.add('tablero');
      raiz.style.setProperty('--nf', this.nFilas);
      raiz.style.setProperty('--nc', this.nCols);
      raiz.setAttribute('role', 'group');
      raiz.setAttribute('aria-label', 'Ábaco de multiplicar: pinta las cuentas arrastrando el dedo o el mouse');

      this.interior = el('div', 'tablero-interior');
      this.marco = el('div', 'marco');
      this.marco.dataset.rect = '0';

      // corchete horizontal (columnas) y vertical (filas)
      const ch = el('div', 'corchete corchete-h');
      const lh = el('div', 'linea');
      this.insigniaH = el('span', 'insignia');
      lh.appendChild(this.insigniaH);
      ch.appendChild(lh);

      const cv = el('div', 'corchete corchete-v');
      const lv = el('div', 'linea');
      this.insigniaV = el('span', 'insignia');
      lv.appendChild(this.insigniaV);
      cv.appendChild(lv);

      // cuadrícula
      this.cuadricula = el('div', 'cuadricula');
      this.cuadros = [];
      this.cuentas = [];
      this.fantasmas = [];
      this.numeros = [];
      for (let r = 0; r < this.nFilas; r++) {
        const col = COLORES[r % COLORES.length];
        const filaCuadros = [];
        const filaCuentas = [];
        const filaFantasmas = [];
        const filaNumeros = [];
        for (let c = 0; c < this.nCols; c++) {
          const cuadro = el('div', 'cuadro');
          cuadro.dataset.r = r;
          cuadro.dataset.c = c;
          cuadro.style.setProperty('--c1', col[0]);
          cuadro.style.setProperty('--c2', col[1]);
          cuadro.style.setProperty('--c3', col[2]);
          const fantasma = el('div', 'fantasma');
          const cuenta = el('div', 'cuenta');
          const num = el('span', 'num'); // el número de conteo va dentro de la cuenta
          cuenta.appendChild(num);
          cuadro.appendChild(fantasma);
          cuadro.appendChild(cuenta);
          this.cuadricula.appendChild(cuadro);
          filaCuadros.push(cuadro);
          filaCuentas.push(cuenta);
          filaFantasmas.push(fantasma);
          filaNumeros.push(num);
        }
        this.cuadros.push(filaCuadros);
        this.cuentas.push(filaCuentas);
        this.fantasmas.push(filaFantasmas);
        this.numeros.push(filaNumeros);
      }

      this.marco.appendChild(ch);
      this.marco.appendChild(cv);
      this.marco.appendChild(this.cuadricula);
      this.interior.appendChild(this.marco);
      raiz.appendChild(this.interior);
    }

    /* El tamaño de la cuenta depende del ancho disponible. */
    _medir() {
      this._medirAhora = () => {
        const cs = global.getComputedStyle(this.interior);
        const ancho = this.interior.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const banda = this.corchetes ? BANDA : 0;
        const bAncho = Math.floor(ancho / (banda + this.nCols)); // lo máximo que cabe a lo ancho
        let b;  // alto de cada casilla
        let bw; // ancho de cada casilla
        if (esAncha()) {
          // que el tablero también quepa a lo alto de la pantalla (encabezado, marcador y pregunta y el marco ocupan ~350 px)
          const alto = Math.floor((global.innerHeight - 350 - this.reservaAlto) / (banda + this.nFilas));
          b = Math.max(18, Math.min(MAX_CUENTA_ANCHA, bAncho, Math.max(MAX_CUENTA_PX, alto)));
          // las casillas se ensanchan para que el ábaco ocupe el ancho del marco (las cuentas siguen siendo círculos)
          bw = Math.max(b, Math.min(bAncho, Math.round(b * ENSANCHE_MAX)));
        } else {
          b = Math.max(18, Math.min(MAX_CUENTA_PX, bAncho));
          bw = b;
        }
        this.raiz.style.setProperty('--b', b + 'px');
        this.raiz.style.setProperty('--bw', bw + 'px');
      };
      this._medirAhora();
      if (global.ResizeObserver) new global.ResizeObserver(this._medirAhora).observe(this.interior);
      else global.addEventListener('resize', this._medirAhora);
      global.addEventListener('resize', this._medirAhora); // también cambia el alto disponible
    }

    /* Volver a medir (por ejemplo, justo después de mostrar una pantalla que estaba oculta). */
    medir() {
      this._medirAhora();
    }

    /* ---------- entrada del usuario ---------- */
    _escuchar() {
      const g = this.cuadricula;

      g.addEventListener('pointerdown', (e) => {
        if (this.bloqueado) return;
        const celda = this._celdaEn(e.clientX, e.clientY, false);
        if (!celda) return;
        e.preventDefault();
        this.arrastre = {
          id: e.pointerId,
          valor: !this.celdas[celda[0]][celda[1]], // true: pintar, false: borrar
          ancla: celda,
          ultima: celda,
          base: this.celdas.map((f) => f.slice()),
          baseOrden: this.orden.slice()
        };
        try { g.setPointerCapture(e.pointerId); } catch (_) { /* no crítico */ }
        if (this.herramienta === 'rect') this._rect(celda, celda);
        else this._trazo(celda, celda);
      });

      g.addEventListener('pointermove', (e) => {
        const a = this.arrastre;
        if (!a || e.pointerId !== a.id) return;
        if (this.herramienta === 'rect') {
          const celda = this._celdaEn(e.clientX, e.clientY, true);
          if (celda[0] !== a.ultima[0] || celda[1] !== a.ultima[1]) {
            a.ultima = celda;
            this._rect(a.ancla, celda);
          }
        } else {
          const celda = this._celdaEn(e.clientX, e.clientY, false);
          if (!celda) { a.ultima = null; return; }
          if (!a.ultima) {
            a.ultima = celda;
            this._trazo(celda, celda);
          } else if (celda[0] !== a.ultima[0] || celda[1] !== a.ultima[1]) {
            this._trazo(a.ultima, celda);
            a.ultima = celda;
          }
        }
      });

      const soltar = (e) => {
        if (this.arrastre && e.pointerId === this.arrastre.id) this.arrastre = null;
      };
      g.addEventListener('pointerup', soltar);
      g.addEventListener('pointercancel', soltar);
    }

    /* Celda [fila, columna] bajo un punto de la pantalla. Con ajustar=true se acota al borde. */
    _celdaEn(x, y, ajustar) {
      const caja = this.cuadricula.getBoundingClientRect();
      let c = Math.floor((x - caja.left) / (caja.width / this.nCols));
      let r = Math.floor((y - caja.top) / (caja.height / this.nFilas));
      const fuera = r < 0 || r >= this.nFilas || c < 0 || c >= this.nCols;
      if (fuera && !ajustar) return null;
      r = Math.max(0, Math.min(this.nFilas - 1, r));
      c = Math.max(0, Math.min(this.nCols - 1, c));
      return [r, c];
    }

    /* Pinta (o borra) en línea recta entre dos celdas, para no dejar huecos si el dedo va rápido. */
    _trazo(desde, hasta) {
      const dr = hasta[0] - desde[0];
      const dc = hasta[1] - desde[1];
      const pasos = Math.max(Math.abs(dr), Math.abs(dc));
      let cambio = false;
      for (let k = 0; k <= pasos; k++) {
        const t = pasos ? k / pasos : 0;
        const r = Math.round(desde[0] + dr * t);
        const c = Math.round(desde[1] + dc * t);
        if (this._poner(r, c, this.arrastre.valor, 0)) cambio = true;
      }
      if (cambio) this._despues(hasta[1]);
    }

    /* Rectángulo entre dos esquinas; fuera de él se conserva lo que había al empezar el gesto. */
    _rect(a, b) {
      const rmin = Math.min(a[0], b[0]);
      const rmax = Math.max(a[0], b[0]);
      const cmin = Math.min(a[1], b[1]);
      const cmax = Math.max(a[1], b[1]);
      let cambio = false;
      for (let r = 0; r < this.nFilas; r++) {
        for (let c = 0; c < this.nCols; c++) {
          const dentro = r >= rmin && r <= rmax && c >= cmin && c <= cmax;
          const v = dentro ? this.arrastre.valor : this.arrastre.base[r][c];
          if (this._poner(r, c, v, 0)) cambio = true;
        }
      }
      // Numeración ordenada: lo que ya estaba conserva su lugar y las cuentas nuevas del rectángulo
      // se numeran fila por fila (de izquierda a derecha y de arriba abajo).
      const antes = new Set(this.arrastre.baseOrden);
      const quedan = this.arrastre.baseOrden.filter((i) => this.celdas[Math.floor(i / this.nCols)][i % this.nCols]);
      const nuevas = [];
      for (let r = 0; r < this.nFilas; r++) {
        for (let c = 0; c < this.nCols; c++) {
          const i = r * this.nCols + c;
          if (this.celdas[r][c] && !antes.has(i)) nuevas.push(i);
        }
      }
      this.orden = quedan.concat(nuevas);
      if (cambio) this._despues(b[1]);
    }

    /* Deja la celda en pintada/vacía. Devuelve true si cambió. */
    _poner(r, c, valor, retraso) {
      if (this.celdas[r][c] === valor) return false;
      this.celdas[r][c] = valor;
      const i = r * this.nCols + c;
      if (valor) {
        this.orden.push(i);
      } else {
        const p = this.orden.indexOf(i);
        if (p >= 0) this.orden.splice(p, 1);
        this.numeros[r][c].textContent = '';
      }
      this.cuentas[r][c].style.transitionDelay = (valor ? retraso : 0) + 'ms';
      this.cuadros[r][c].classList.toggle('lleno', valor);
      return true;
    }

    /* Escribe en cada cuenta pintada su número de conteo: su lugar en el orden en que se pintó (1, 2, 3…).
       El número más alto es el total de cuentas. */
    _numerar() {
      this.orden.forEach((i, p) => {
        const num = this.numeros[Math.floor(i / this.nCols)][i % this.nCols];
        num.textContent = p + 1;
        num.classList.toggle('n3', p + 1 >= 100); // 3 cifras: letra un poco más chica para que quepa
      });
    }

    _despues(columna) {
      this._numerar();
      this._marcar(this.analizar());
      this.alMover(columna);
      this.alCambiar(this.analizar());
    }

    _marcar(an) {
      if (an.rectangulo) {
        const m = this.marco;
        m.dataset.rect = '1';
        m.style.setProperty('--r0', an.r0);
        m.style.setProperty('--c0', an.c0);
        m.style.setProperty('--kr', an.filas);
        m.style.setProperty('--kc', an.columnas);
        this.insigniaV.textContent = an.filas;
        this.insigniaH.textContent = an.columnas;
      } else {
        this.marco.dataset.rect = '0';
      }
    }

    /* ---------- API pública ---------- */
    analizar() {
      let total = 0;
      let r0 = Infinity; let r1 = -1; let c0 = Infinity; let c1 = -1;
      for (let r = 0; r < this.nFilas; r++) {
        for (let c = 0; c < this.nCols; c++) {
          if (!this.celdas[r][c]) continue;
          total++;
          if (r < r0) r0 = r;
          if (r > r1) r1 = r;
          if (c < c0) c0 = c;
          if (c > c1) c1 = c;
        }
      }
      if (total === 0) return { total: 0, vacio: true, rectangulo: false, filas: 0, columnas: 0, r0: 0, c0: 0 };
      const filas = r1 - r0 + 1;
      const columnas = c1 - c0 + 1;
      return {
        total: total,
        vacio: false,
        rectangulo: filas * columnas === total, // sin huecos ni cuentas sueltas
        filas: filas,
        columnas: columnas,
        r0: r0,
        c0: c0
      };
    }

    usarHerramienta(nombre) {
      this.herramienta = nombre === 'rect' ? 'rect' : 'lapiz';
      this.raiz.dataset.herramienta = this.herramienta;
    }

    /* Muestra u oculta los corchetes con el número de filas y columnas. */
    mostrarCorchetes(si) {
      this.corchetes = !!si;
      this.raiz.dataset.corchetes = this.corchetes ? '1' : '0';
      this.raiz.style.setProperty('--banda', this.corchetes ? BANDA : 0);
      this._medirAhora();
    }

    reiniciar() {
      for (let r = 0; r < this.nFilas; r++) for (let c = 0; c < this.nCols; c++) this._poner(r, c, false, 0);
      this.orden = [];
      this._marcar(this.analizar());
      this.alCambiar(this.analizar());
    }

    /* m filas con n cuentas cada una, pintadas en onda desde la esquina superior izquierda y numeradas fila por fila */
    rectangulo(m, n) {
      for (let r = 0; r < this.nFilas; r++) {
        for (let c = 0; c < this.nCols; c++) this._poner(r, c, r < m && c < n, r * 70 + c * 22);
      }
      this.orden = [];
      for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) this.orden.push(r * this.nCols + c);
      this._numerar();
      this._marcar(this.analizar());
      this.alCambiar(this.analizar());
    }

    /* Contorno punteado de m filas × n columnas como guía. */
    fantasma(m, n) {
      for (let r = 0; r < this.nFilas; r++) {
        for (let c = 0; c < this.nCols; c++) this.fantasmas[r][c].classList.toggle('ver', r < m && c < n);
      }
    }

    ocultarFantasma() {
      this.fantasma(0, 0);
    }

    bloquear(si) {
      this.bloqueado = !!si;
      this.raiz.classList.toggle('bloqueado', this.bloqueado);
      if (this.bloqueado) this.arrastre = null;
    }

    /* Las cuentas pintadas dan un saltito en onda. */
    celebrar() {
      for (let r = 0; r < this.nFilas; r++) {
        for (let c = 0; c < this.nCols; c++) {
          if (!this.celdas[r][c]) continue;
          const b = this.cuentas[r][c];
          b.style.animationDelay = ((r + c) * 35) + 'ms';
          b.classList.remove('salta');
          void b.offsetWidth; // reinicia la animación
          b.classList.add('salta');
        }
      }
      global.clearTimeout(this._temporizadorSalto);
      this._temporizadorSalto = global.setTimeout(() => {
        this.cuentas.forEach((fila) => fila.forEach((b) => b.classList.remove('salta')));
      }, 1800);
    }
  }

  global.Abaco = Abaco;
})(window);
