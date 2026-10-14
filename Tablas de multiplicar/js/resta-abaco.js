/* Resta — componente de ábaco para restar, con dos modos:
 *
 *  1) "general" (resta de 1 cifra): UN solo cuadro de 2 filas × 10 columnas (20 círculos, con una marca en el 5).
 *     Muestra tantas cuentas como diga el minuendo, en orden de lectura.
 *
 *  2) "posicional" (resta de 2 o 3 cifras): columnas de valor posicional (Centenas, Decenas, Unidades).
 *     Cada columna es una cuadrícula de 3 × 3 (9 círculos) y muestra tantas cuentas como diga el dígito
 *     del minuendo en esa columna. Una cuenta de Decenas vale 10 y una de Centenas vale 100. Debajo de cada
 *     columna hay un recuadro para escribir la respuesta y, a la derecha, el valor del minuendo, lo que se
 *     lleva tachado y la respuesta escrita.
 *
 * En los dos modos la actividad MUESTRA el minuendo (mostrarMinuendo) y el estudiante TACHA con el dedo
 * (o el mouse) las cuentas que indica el sustraendo: cada cuenta tachada se ve opaca y con una X roja.
 *
 *   - Tocar o arrastrar sobre cuentas sin tachar las tacha.
 *   - Empezar sobre una cuenta ya tachada le quita la tacha (esa pasada destacha).
 *
 * Uso:
 *   const abaco = new AbacoResta(elemento, { alCambiar(analisis) {}, alMover(tachadas, tacho) {} });
 *   abaco.usarModo('general');           // o abaco.usarModo('posicional', 3) para centenas, decenas y unidades
 *   abaco.mostrarMinuendo(568, true);
 *   abaco.analizar() -> { minuendo, tachado, quedan, tachadas, columnas: [{ nombre, valor, hay, tachadas, quedan }] }
 *   abaco.cuentasRestantes() -> [{ k, el, col }]   // las que NO están tachadas, en orden de izquierda a derecha
 *
 * Archivo propio de la actividad de resta: no se comparte con las de suma ni multiplicación.
 */
(function (global) {
  'use strict';

  const COLUMNAS_GENERAL = 10;  // cuentas por fila en el modo general
  const N_GENERAL = 20;         // 2 filas × 10
  const POR_COLUMNA = 9;        // cuentas de cada columna posicional (3 × 3): un dígito del 0 al 9
  const RELLENO = 6;            // espacio interior de cada cuadro (px)
  const HUECO_COL = 10;         // separación entre columnas posicionales (px)
  const LADO_MAX = 46;          // tamaño máximo de una cuenta en el cuadro general (px)
  const LADO_MAX_POS = 44;      // ídem en las columnas posicionales
  const LATERAL = 84;           // ancho de la columna de la derecha con el valor de los números (px)
  const LATERAL_ANGOSTO = 54;   // ídem en pantallas angostas
  const NOMBRES = ['Centenas', 'Decenas', 'Unidades'];
  const VALORES = [100, 10, 1];
  const REDUCIR = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // La X roja que tacha una cuenta
  const SVG_TACHA = '<svg class="tacha" viewBox="0 0 100 100" aria-hidden="true"><path d="M26 26 L74 74 M74 26 L26 74"/></svg>';

  /* Pantalla grande: el ábaco tiene más sitio (el juego pone los controles a su derecha), así que las cuentas crecen. */
  const esAncha = () => !!(global.matchMedia && global.matchMedia('(min-width: 900px)').matches);

  function el(etiqueta, clase) {
    const e = global.document.createElement(etiqueta);
    if (clase) e.className = clase;
    return e;
  }

  class AbacoResta {
    constructor(contenedor, opciones) {
      const o = opciones || {};
      this.raiz = contenedor;
      this.alCambiar = o.alCambiar || function () {};
      this.alMover = o.alMover || function () {};
      this.bloqueado = false;
      this.arrastre = null;
      this.lado = 30;
      this.modo = '';
      this.nCols = 0;
      this.valorMinuendo = 0;
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
      raiz.setAttribute('role', 'group');
      raiz.setAttribute('aria-label', 'Ábaco de resta: tacha las cuentas con el dedo o el mouse');
      this.interior = el('div', 'tablero-interior');
      this.zona = el('div', 'cuadros');
      this.interior.appendChild(this.zona);
      raiz.appendChild(this.interior);
    }

    /* Cambia entre el cuadro general (1 cifra) y las columnas posicionales (2 o 3 cifras). */
    usarModo(modo, cifras) {
      const posicional = modo === 'posicional';
      const c = posicional ? Math.max(2, Math.min(3, cifras || 2)) : 1;
      if (this.modo === modo && this.nCols === c) return;
      this.modo = posicional ? 'posicional' : 'general';
      this.nCols = c;
      this.lugares = posicional ? [0, 1, 2].slice(3 - c) : [2]; // 0 centenas, 1 decenas, 2 unidades
      this.nombres = posicional ? this.lugares.map((l) => NOMBRES[l]) : [''];
      this.valores = posicional ? this.lugares.map((l) => VALORES[l]) : [1];
      this.n = posicional ? c * POR_COLUMNA : N_GENERAL;
      this.valorMinuendo = 0;
      this.hay = new Array(this.n).fill(false);      // la cuenta k forma parte del minuendo
      this.visible = new Array(this.n).fill(false);  // la cuenta k está a la vista
      this.tachadas = new Array(this.n).fill(false);
      this.columna = new Array(this.n).fill(0);      // columna a la que pertenece cada cuenta
      this._poblar();
      this._medirAhora();
    }

    /* Dibuja las cuentas del modo actual. */
    _poblar() {
      this.zona.textContent = '';
      this.zona.dataset.modo = this.modo;
      this.cuadros = [];
      this.cuentas = [];
      this.fantasmas = [];
      this.tachasSvg = [];
      this.cajasResp = [];   // recuadros de respuesta (uno por columna; solo en el modo posicional)
      this.valorA = null;    // valor del minuendo / de lo tachado / respuesta, a la derecha del tablero
      this.valorB = null;
      this.valorR = null;

      const celda = (k) => {
        const c = el('div', 'cuadro');
        c.dataset.k = k;
        const fantasma = el('div', 'fantasma');
        const cuenta = el('div', 'cuenta');
        c.appendChild(fantasma);
        c.appendChild(cuenta);
        c.insertAdjacentHTML('beforeend', SVG_TACHA);
        this.cuadros.push(c);
        this.cuentas.push(cuenta);
        this.fantasmas.push(fantasma);
        this.tachasSvg.push(c.querySelector('.tacha'));
        return c;
      };

      if (this.modo === 'general') {
        const general = el('div', 'cuadro-general'); // UN solo cuadro con todas las cuentas
        for (let k = 0; k < this.n; k++) general.appendChild(celda(k));
        this.zona.appendChild(general);
        const fila = el('div', 'fila-resp'); // debajo del cuadro: el recuadro para escribir cuántas quedan
        const resp = el('button', 'resp-caja general');
        resp.type = 'button';
        resp.dataset.ci = 0;
        resp.setAttribute('aria-label', 'Respuesta de la resta');
        fila.appendChild(resp);
        this.cajasResp.push(resp);
        this.zona.appendChild(fila);
      } else {
        const columnas = el('div', 'columnas-pos');
        for (let ci = 0; ci < this.nCols; ci++) {
          const col = el('div', 'col-pos lugar-' + this.lugares[ci]);
          const cab = el('div', 'col-cab');
          cab.innerHTML = '<b>' + this.nombres[ci] + '</b><small>' + this.valores[ci] + '</small>';
          const rejilla = el('div', 'col-grid');
          for (let i = 0; i < POR_COLUMNA; i++) {
            const k = ci * POR_COLUMNA + i;
            this.columna[k] = ci;
            rejilla.appendChild(celda(k));
          }
          col.appendChild(cab);
          col.appendChild(rejilla);
          const resp = el('button', 'resp-caja'); // aquí el niño escribe el dígito de lo que queda en esta columna
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

    /* Columna de la derecha: alineada con las filas de las columnas, muestra el valor del minuendo, el de lo
       tachado (el sustraendo) y la respuesta escrita. */
    _lateral() {
      const lado = el('div', 'col-lado');
      const hueco = el('div', 'col-cab'); // ocupa el mismo alto que los títulos de las columnas
      hueco.innerHTML = '<b>&nbsp;</b><small>&nbsp;</small>';
      const pareja = el('div', 'lado-pareja'); // minuendo y tachado se reparten el alto de la cuadrícula
      this.valorA = el('div', 'lado-valor v1');
      this.valorB = el('div', 'lado-valor v2');
      this.valorR = el('div', 'lado-valor vr');
      this.valorA.setAttribute('aria-label', 'Número del que se resta');
      this.valorB.setAttribute('aria-label', 'Lo que se tacha');
      this.valorR.setAttribute('aria-label', 'Respuesta');
      pareja.appendChild(this.valorA);
      pareja.appendChild(this.valorB);
      lado.appendChild(hueco);
      lado.appendChild(pareja);
      lado.appendChild(this.valorR);
      this._pintarLado(this.analizar());
      return lado;
    }

    _pintarLado(an) {
      if (!this.valorA) return;
      this.valorA.textContent = an.minuendo;
      this.valorB.textContent = an.tachado > 0 ? '−' + an.tachado : '0';
      this.valorA.classList.toggle('en-cero', an.minuendo === 0);
      this.valorB.classList.toggle('en-cero', an.tachado === 0);
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

    _notificar(an) {
      this._pintarLado(an);
      this.alCambiar(an);
    }

    /* El tamaño de la cuenta depende del ancho disponible y del modo. */
    _medir() {
      this._medirAhora = () => {
        const cs = global.getComputedStyle(this.interior);
        const ancho = this.interior.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        let lado;
        if (this.modo === 'general') {
          lado = Math.floor((ancho - 2 * RELLENO) / COLUMNAS_GENERAL);
          lado = Math.min(LADO_MAX + (esAncha() ? 10 : 0), lado);
        } else {
          // c columnas de 3 cuentas, con su relleno a cada lado, un hueco entre columnas y la columna de valores
          const lateral = ancho < 420 ? LATERAL_ANGOSTO : LATERAL;
          this.raiz.style.setProperty('--lat', lateral + 'px');
          const extra = this.nCols * 2 * RELLENO + this.nCols * HUECO_COL + lateral + 2;
          lado = Math.min(LADO_MAX_POS + (esAncha() ? 8 : 0), Math.floor((ancho - extra) / (3 * this.nCols)));
        }
        this.lado = Math.max(18, lado);
        this.raiz.style.setProperty('--b', this.lado + 'px');
      };
      this._medirAhora();
      if (global.ResizeObserver) new global.ResizeObserver(this._medirAhora).observe(this.interior);
      else global.addEventListener('resize', this._medirAhora);
    }

    /* Volver a medir (por ejemplo, justo después de mostrar una pantalla que estaba oculta). */
    medir() {
      this._medirAhora();
    }

    /* ---------- entrada del usuario ---------- */
    _escuchar() {
      const zona = this.zona;

      zona.addEventListener('pointerdown', (e) => {
        if (this.bloqueado) return;
        const k = this._cuentaEn(e.clientX, e.clientY);
        if (k === null) return;
        e.preventDefault();
        const tachar = !this.tachadas[k]; // empezar sobre una cuenta tachada: se destacha
        this.arrastre = { id: e.pointerId, tachar: tachar, x: e.clientX, y: e.clientY };
        try { zona.setPointerCapture(e.pointerId); } catch (_) { /* no crítico */ }
        if (this._tachar(k, tachar)) this._despues(tachar);
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
          if (k !== null && this._tachar(k, a.tachar)) cambio = true;
        }
        a.x = e.clientX;
        a.y = e.clientY;
        if (cambio) this._despues(a.tachar);
      });

      const soltar = (e) => {
        if (this.arrastre && e.pointerId === this.arrastre.id) this.arrastre = null;
      };
      zona.addEventListener('pointerup', soltar);
      zona.addEventListener('pointercancel', soltar);
    }

    /* Número de cuenta (a la vista) bajo un punto de la pantalla, o null si no hay ninguna. */
    _cuentaEn(x, y) {
      const e = global.document.elementFromPoint(x, y);
      const celda = e && e.closest ? e.closest('.cuadro') : null;
      if (!celda || !this.zona.contains(celda)) return null;
      const k = +celda.dataset.k;
      return this.visible[k] ? k : null;
    }

    /* Retraso de la transición CSS de la X y de la cuenta (para tachar en cascada). */
    _retrasoTacha(k, retraso) {
      this.tachasSvg[k].style.transitionDelay = retraso;
      this.cuentas[k].style.transitionDelay = retraso;
    }

    /* Tacha (tachar = true) o destacha (false) la cuenta k. Devuelve true si algo cambió. */
    _tachar(k, tachar) {
      if (!this.visible[k] || this.tachadas[k] === tachar) return false;
      this.tachadas[k] = tachar;
      this._retrasoTacha(k, '0ms');
      this.cuadros[k].classList.toggle('tachada', tachar);
      const gs = global.gsap;
      if (gs && !REDUCIR) { // la cuenta se "aprieta" un instante al tacharla
        gs.fromTo(this.cuentas[k], { scale: tachar ? 0.8 : 1.15 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
      }
      return true;
    }

    _despues(tacho) {
      const an = this.analizar();
      this.alMover(an.tachadas, tacho);
      this._notificar(an);
    }

    /* Animación de la cuenta k al aparecer o desaparecer. */
    _animar(k, antes, valor, retraso) {
      const c = this.cuentas[k];
      const gs = global.gsap;
      this.cuadros[k].classList.toggle('lleno', valor);
      if (!gs) { // alternativa sin librería: transición CSS
        c.style.transitionDelay = (valor ? retraso : 0) + 'ms';
        return;
      }
      if (valor && antes) return; // ya estaba a la vista: se queda como está
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

    /* ---------- API pública ---------- */

    /* Dígitos de un número, uno por columna (de la columna más grande a las unidades). */
    digitos(valor) {
      if (this.modo === 'general') return [valor];
      return String(Math.max(0, valor)).padStart(this.nCols, '0').slice(-this.nCols).split('').map(Number);
    }

    /* Resumen de lo que hay y de lo que se ha tachado, por columna y en total. */
    analizar() {
      const columnas = this.nombres.map((nombre, ci) => ({ nombre: nombre, valor: this.valores[ci], hay: 0, tachadas: 0, quedan: 0 }));
      for (let k = 0; k < this.n; k++) {
        if (!this.hay[k]) continue;
        const c = columnas[this.columna[k]];
        c.hay++;
        if (this.tachadas[k]) c.tachadas++;
      }
      let minuendo = 0;
      let tachado = 0;
      let cuentasTachadas = 0;
      columnas.forEach((c) => {
        c.quedan = c.hay - c.tachadas;
        minuendo += c.hay * c.valor;
        tachado += c.tachadas * c.valor;
        cuentasTachadas += c.tachadas;
      });
      return { minuendo: minuendo, tachado: tachado, quedan: minuendo - tachado, tachadas: cuentasTachadas, columnas: columnas };
    }

    /* Muestra el minuendo sin ninguna cuenta tachada. Las nuevas aparecen en onda.
       Con desdeCero, todas aparecen de nuevo (para empezar cada pregunta); si no, las que ya
       estaban a la vista se quedan como están (para cambiar el minuendo en el modo explorar). */
    mostrarMinuendo(valor, desdeCero) {
      this.valorMinuendo = valor;
      const digitos = this.digitos(valor);
      for (let k = 0; k < this.n; k++) {
        const hay = this.modo === 'general' ? k < valor : (k % POR_COLUMNA) < digitos[this.columna[k]];
        const estaba = this.visible[k];
        this.hay[k] = hay;
        this.visible[k] = hay;
        this.tachadas[k] = false;
        this._retrasoTacha(k, '0ms');
        this.cuadros[k].classList.remove('tachada');
        if (hay || estaba) this._animar(k, desdeCero ? false : estaba, hay, k * 30);
        else this.cuadros[k].classList.remove('lleno'); // vacía y sin nada que animar: queda limpia
      }
      this._notificar(this.analizar());
    }

    /* Quita todas las tachas (el minuendo se queda). */
    destachar() {
      for (let k = 0; k < this.n; k++) {
        if (!this.tachadas[k]) continue;
        this.tachadas[k] = false;
        this._retrasoTacha(k, '0ms');
        this.cuadros[k].classList.remove('tachada');
      }
      this._notificar(this.analizar());
    }

    /* Tacha las últimas b cuentas del minuendo, en cascada (solo modo general, para "Muéstramelo"). */
    tacharUltimas(b) {
      this.destachar();
      const m = this.valorMinuendo;
      const hasta = Math.max(0, m - b);
      let i = 0;
      for (let k = m - 1; k >= hasta; k--, i++) {
        this.tachadas[k] = true;
        this._retrasoTacha(k, (i * 90) + 'ms');
        this.cuadros[k].classList.add('tachada');
      }
      this._notificar(this.analizar());
    }

    /* Las cuentas que NO están tachadas, de izquierda a derecha (columna por columna): las que "quedan". */
    cuentasRestantes() {
      const lista = [];
      for (let k = 0; k < this.n; k++) if (this.hay[k] && !this.tachadas[k]) lista.push({ k: k, el: this.cuentas[k], col: this.columna[k] });
      return lista;
    }

    /* Oculta la cuenta k (porque "se va" al recuadro del resultado) sin cambiar lo tachado. */
    ocultarCuenta(k) {
      const gs = global.gsap;
      this.visible[k] = false;
      this.cuadros[k].classList.remove('lleno');
      if (gs) { gs.killTweensOf(this.cuentas[k]); gs.set(this.cuentas[k], { scale: 0, y: 0 }); }
    }

    /* Pista: marca con un contorno punteado las cuentas que conviene tachar para restar b
       (las últimas de cada columna). */
    sugerir(b) {
      const digitos = this.digitos(b);
      const hayPorColumna = this.analizar().columnas.map((c) => c.hay);
      this.fantasmas.forEach((g, k) => {
        let marcar = false;
        if (this.hay[k]) {
          const ci = this.columna[k];
          const pos = this.modo === 'general' ? k : k % POR_COLUMNA;
          const total = this.modo === 'general' ? this.valorMinuendo : hayPorColumna[ci];
          const aTachar = this.modo === 'general' ? b : digitos[ci];
          marcar = pos >= total - aTachar && pos < total;
        }
        g.classList.toggle('ver', marcar);
      });
    }

    ocultarSugerencia() {
      this.fantasmas.forEach((g) => g.classList.remove('ver'));
    }

    bloquear(si) {
      this.bloqueado = !!si;
      this.raiz.classList.toggle('bloqueado', this.bloqueado);
      if (this.bloqueado) this.arrastre = null;
    }
  }

  global.AbacoResta = AbacoResta;
})(window);
