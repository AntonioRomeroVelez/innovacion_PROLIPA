/* Cuentacuentos — biblioteca y lector.
 *
 * - La biblioteca lee la lista de cuentos de `cuentos/catalogo.js` (la crea herramientas/generar_cuento.py).
 * - Al abrir un cuento se carga su propio `cuentos/<id>/datos.js`: textos por personaje, audio de cada línea
 *   y el momento exacto en que se dice cada palabra. Cada cuento es independiente de los demás.
 * - Mientras suena el audio, se resalta la palabra que se está diciendo (como en un karaoke).
 *
 * No necesita servidor: funciona abriendo cuentacuentos.html con doble clic.
 * Usa GSAP (lib/gsap.min.js) para las animaciones; si no está cargada, funciona igual sin ellas.
 * Archivo propio de la actividad de cuentacuentos: no se comparte con las de matemáticas. */
(function (global) {
  'use strict';

  const $ = (id) => global.document.getElementById(id);
  const gs = global.gsap || null;
  const REDUCIR = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const anim = (fn) => { if (gs && !REDUCIR) fn(); };

  const CARPETA = 'cuentos/';
  const PAUSA_LINEA = 380;     // pausa entre una línea y la siguiente (ms)
  const PAUSA_PAGINA = 1100;   // pausa antes de pasar a la página siguiente (ms)
  const VELOCIDADES = [0.8, 1, 1.25];
  const TAMANOS = [1, 1.2, 1.4];

  /* ---------- utilidades ---------- */
  const el = (etiqueta, clase) => {
    const e = global.document.createElement(etiqueta);
    if (clase) e.className = clase;
    return e;
  };
  const guardar = (k, v) => { try { global.localStorage.setItem('cuentos.' + k, String(v)); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k, defecto) => {
    try { const v = global.localStorage.getItem('cuentos.' + k); return v === null ? defecto : v; } catch (e) { return defecto; }
  };
  const rutaDe = (id, rel) => CARPETA + encodeURIComponent(id) + '/' + String(rel).split('/').map(encodeURIComponent).join('/');

  function duracionTexto(ms) {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
  }

  /* ---------- estado ---------- */
  const estado = {
    cuento: null,         // datos del cuento abierto
    id: '',
    pagina: 0,
    linea: 0,
    palabra: -1,          // palabra resaltada en la línea actual
    nodos: [],            // por línea: los <span> de sus palabras
    sonando: false,
    silencio: false,      // si no hay audio, se lee "en silencio" con el reloj
    t0: 0,
    lineaAudio: -1,       // línea cuyo audio está cargado
    indVel: Number(leer('velocidad', 1)),
    indTam: Number(leer('tamano', 0)),
    token: 0,             // cambia cada vez que se cancela algo pendiente
    temporizador: 0,
    raf: 0,
    avisoSilencio: false
  };
  if (!(estado.indVel >= 0 && estado.indVel < VELOCIDADES.length)) estado.indVel = 1;
  if (!(estado.indTam >= 0 && estado.indTam < TAMANOS.length)) estado.indTam = 0;

  const audio = new global.Audio();   // un solo elemento de audio: una vez autorizado por un toque, sigue sonando solo
  audio.preload = 'auto';
  const precargados = new Map();

  const paginas = () => estado.cuento.paginas;
  const lineasDe = (p) => estado.cuento.paginas[p].lineas;
  const ruta = (rel) => rutaDe(estado.id, rel);

  /* ---------- pantallas ---------- */
  const PANTALLAS = ['pBiblioteca', 'pCuento', 'pFin'];
  function mostrar(id) {
    PANTALLAS.forEach((p) => { $(p).hidden = p !== id; });
    $('barra').dataset.pantalla = id;
    $('app').classList.toggle('modo-lector', id === 'pCuento');
    $('btnBiblioteca').hidden = id === 'pBiblioteca';
    global.scrollTo(0, 0);
    anim(() => gs.fromTo('#' + id, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'opacity,transform' }));
  }

  let temporizadorAviso = 0;
  function aviso(texto, ms) {
    const a = $('aviso');
    a.textContent = texto;
    a.hidden = false;
    global.clearTimeout(temporizadorAviso);
    temporizadorAviso = global.setTimeout(() => { a.hidden = true; }, ms || 2800);
  }

  /* ---------- biblioteca ---------- */
  function pintarBiblioteca() {
    const cont = $('estanteria');
    cont.textContent = '';
    const lista = global.CATALOGO || [];
    $('sinCuentos').hidden = lista.length > 0;

    lista.forEach((c) => {
      const tarjeta = el('button', 'tarjeta-cuento');
      tarjeta.type = 'button';
      tarjeta.setAttribute('aria-label', `Escuchar el cuento ${c.titulo}`);

      const portada = el('div', 'portada');
      if (c.portada) {
        const img = new global.Image();
        img.alt = '';
        img.draggable = false;
        img.src = rutaDe(c.id, c.portada);
        img.onerror = () => img.remove();
        portada.appendChild(img);
      }
      const boton = el('span', 'boton-escuchar');
      boton.textContent = '▶ Escuchar';
      portada.appendChild(boton);

      const info = el('div', 'tarjeta-info');
      const titulo = el('strong');
      titulo.textContent = c.titulo;
      info.appendChild(titulo);
      if (c.autor) {
        const autor = el('span', 'autor');
        autor.textContent = c.autor;
        info.appendChild(autor);
      }
      if (c.descripcion) {
        const resumen = el('span', 'resumen');
        resumen.textContent = c.descripcion;
        info.appendChild(resumen);
      }
      const datos = el('div', 'datos');
      const cifras = el('span');
      cifras.textContent = `🕒 ${duracionTexto(c.duracion)} · ${c.paginas} páginas`;
      const caras = el('div', 'caras');
      (c.personajes || []).forEach((p) => {
        const cara = el('span', 'cara');
        cara.style.setProperty('--pc', p.color);
        cara.textContent = p.emoji;
        cara.title = p.nombre;
        caras.appendChild(cara);
      });
      datos.appendChild(cifras);
      datos.appendChild(caras);
      info.appendChild(datos);

      tarjeta.appendChild(portada);
      tarjeta.appendChild(info);
      tarjeta.addEventListener('click', () => abrirCuento(c.id, true));
      cont.appendChild(tarjeta);
    });

    anim(() => gs.from('.tarjeta-cuento', { y: 30, opacity: 0, duration: 0.45, stagger: 0.1, ease: 'back.out(1.6)', clearProps: 'transform,opacity' }));
  }

  /* ---------- abrir un cuento ---------- */

  /* Carga cuentos/<id>/datos.js (una carpeta por cuento) y devuelve sus datos. */
  function cargarDatos(id) {
    return new Promise((resolver, rechazar) => {
      if (global.CUENTOS && global.CUENTOS[id]) { resolver(global.CUENTOS[id]); return; }
      const s = global.document.createElement('script');
      s.src = rutaDe(id, 'datos.js');
      s.onload = () => (global.CUENTOS && global.CUENTOS[id] ? resolver(global.CUENTOS[id]) : rechazar(new Error('datos vacíos')));
      s.onerror = () => rechazar(new Error('no se encontró datos.js'));
      global.document.head.appendChild(s);
    });
  }

  async function abrirCuento(id, leer) {
    try {
      estado.cuento = await cargarDatos(id);
    } catch (e) {
      aviso('No se pudo abrir el cuento. Revise que existan sus audios (generar_todos.bat).', 4500);
      return;
    }
    estado.id = id;
    detener();
    $('cuentoTitulo').textContent = estado.cuento.titulo;
    construirPuntos();
    mostrar('pCuento');
    global.history.replaceState(null, '', '#' + encodeURIComponent(id));
    mostrarPagina(0, 1);
    if (leer) estado.temporizador = global.setTimeout(() => reproducirLinea(0), 550); // se lee solo al elegirlo
  }

  function construirPuntos() {
    const cont = $('puntos');
    cont.textContent = '';
    paginas().forEach((_, i) => {
      const b = el('button', 'punto');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir a la página ${i + 1}`);
      b.addEventListener('click', () => irPagina(i));
      cont.appendChild(b);
    });
  }

  /* ---------- una página ---------- */
  function ponerImagenVacia(pag) {
    const caras = [...new Set(pag.lineas.map((l) => (estado.cuento.personajes[l.personaje] || {}).emoji).filter(Boolean))];
    const v = $('ilustracionVacia');
    v.textContent = caras.join(' ');
    if (pag.fondo) v.style.background = pag.fondo;
    v.hidden = false;
  }

  function mostrarPagina(n, direccion) {
    estado.pagina = n;
    estado.linea = 0;
    estado.palabra = -1;
    estado.lineaAudio = -1;
    const pag = paginas()[n];
    const total = paginas().length;

    const img = $('imgPagina');
    $('ilustracionVacia').hidden = true;
    if (pag.imagen) {
      img.hidden = false;
      img.onerror = () => { img.hidden = true; ponerImagenVacia(pag); };
      img.src = ruta(pag.imagen);
    } else {
      img.hidden = true;
      ponerImagenVacia(pag);
    }

    construirLineas(pag);
    $('cuentoPagina').textContent = `Página ${n + 1} de ${total}`;
    [...$('puntos').children].forEach((p, i) => {
      p.classList.toggle('actual', i === n);
      p.classList.toggle('hecha', i < n);
      if (i === n) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current');
    });
    $('btnPagAnterior').disabled = n === 0;
    $('btnPagSiguiente').disabled = n === total - 1;
    $('texto').scrollTop = 0;

    anim(() => {
      gs.fromTo('#ilustracion', { x: 40 * (direccion || 1), opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out', clearProps: 'transform,opacity' });
      gs.from('#texto .linea', { y: 18, opacity: 0, duration: 0.35, stagger: 0.08, delay: 0.15, ease: 'back.out(1.5)', clearProps: 'transform,opacity' });
    });
  }

  /* Dibuja las líneas de la página: la cara y el color de cada personaje y una palabra por <span>. */
  function construirLineas(pag) {
    const cont = $('texto');
    cont.textContent = '';
    cont.classList.remove('leyendo');
    cont.style.setProperty('--tam', TAMANOS[estado.indTam]);
    estado.nodos = [];

    pag.lineas.forEach((seg, li) => {
      const p = estado.cuento.personajes[seg.personaje] || { nombre: seg.personaje, emoji: '🗣️', color: '#2b8cf0' };
      const fila = el('div', 'linea' + (seg.personaje === 'narrador' ? ' narra' : ''));
      fila.dataset.i = li;
      fila.style.setProperty('--pc', p.color);

      const cara = el('div', 'cara');
      cara.textContent = p.emoji;
      cara.setAttribute('aria-hidden', 'true');
      const burbuja = el('div', 'burbuja');
      const nombre = el('span', 'nombre');
      nombre.textContent = p.nombre;
      const oracion = el('p', 'oracion');

      const spans = seg.palabras.map((pal, wi) => {
        const s = el('span', 'palabra');
        s.textContent = pal[0];
        s.dataset.w = wi;
        return s;
      });
      spans.forEach((s, wi) => {
        if (wi) oracion.appendChild(global.document.createTextNode(' '));
        oracion.appendChild(s);
      });
      estado.nodos.push(spans);

      burbuja.appendChild(nombre);
      burbuja.appendChild(oracion);
      fila.appendChild(cara);
      fila.appendChild(burbuja);
      cont.appendChild(fila);
    });
  }

  /* Marca la línea actual; las anteriores quedan como "leídas" y las siguientes limpias. */
  function marcarActiva(i) {
    const filas = [...$('texto').children];
    filas.forEach((f, k) => {
      f.classList.toggle('activa', k === i);
      estado.nodos[k].forEach((n) => {
        n.classList.toggle('dicha', k < i);
        n.classList.remove('activa');
      });
    });
    estado.palabra = -1;
    const fila = filas[i];
    if (fila) {
      const c = $('texto');
      const destino = fila.offsetTop - (c.clientHeight - fila.offsetHeight) / 2;
      c.scrollTo({ top: Math.max(0, destino), behavior: REDUCIR ? 'auto' : 'smooth' });
    }
  }

  /* ---------- reproducción ---------- */
  const tiempo = () => (estado.silencio
    ? (global.performance.now() - estado.t0) * VELOCIDADES[estado.indVel]
    : audio.currentTime * 1000);

  function limpiar() {
    global.clearTimeout(estado.temporizador);
    global.cancelAnimationFrame(estado.raf);
    estado.token++; // lo que estaba pendiente deja de valer
  }

  function actualizarPlay() {
    const b = $('btnPlay');
    b.textContent = estado.sonando ? '⏸' : '▶';
    b.setAttribute('aria-pressed', estado.sonando ? 'true' : 'false');
    b.setAttribute('aria-label', estado.sonando ? 'Pausar' : 'Escuchar el cuento');
    $('texto').classList.toggle('leyendo', estado.sonando);
  }

  function detener() {
    limpiar();
    audio.pause();
    estado.sonando = false;
    estado.silencio = false;
    estado.lineaAudio = -1;
    actualizarPlay();
  }

  function pausar() {
    limpiar();
    audio.pause();
    estado.sonando = false;
    actualizarPlay();
  }

  function precargar(seg) {
    if (!seg) return;
    const src = ruta(seg.audio);
    if (precargados.has(src)) return;
    const a = new global.Audio();
    a.preload = 'auto';
    a.src = src;
    precargados.set(src, a);
    if (precargados.size > 6) precargados.delete(precargados.keys().next().value);
  }

  function reproducirLinea(i, desdeMs) {
    const lineas = lineasDe(estado.pagina);
    if (i < 0 || i >= lineas.length) return;
    limpiar();
    const mio = estado.token;
    const seg = lineas[i];
    estado.linea = i;
    estado.lineaAudio = i;
    estado.silencio = false;
    estado.sonando = true;
    marcarActiva(i);
    actualizarPlay();
    precargar(lineas[i + 1]);

    audio.pause();
    audio.onended = () => { if (mio === estado.token) terminarLinea(); };
    audio.onerror = () => { if (mio === estado.token) iniciarSilencio(desdeMs || 0); };
    audio.defaultPlaybackRate = VELOCIDADES[estado.indVel];
    audio.src = ruta(seg.audio);

    const alistar = () => {
      audio.removeEventListener('loadedmetadata', alistar);
      if (mio !== estado.token) return;
      try { if (desdeMs > 0) audio.currentTime = desdeMs / 1000; } catch (e) { /* no crítico */ }
      audio.playbackRate = VELOCIDADES[estado.indVel];
      const promesa = audio.play();
      if (promesa && promesa.catch) {
        promesa.catch((e) => {
          if (mio !== estado.token) return;
          if (e && e.name === 'NotAllowedError') { pausar(); aviso('Toca ▶ para escuchar el cuento.'); }
          else iniciarSilencio(desdeMs || 0);
        });
      }
      estado.raf = global.requestAnimationFrame(bucle);
    };
    audio.addEventListener('loadedmetadata', alistar);
  }

  /* Si no se puede cargar el audio, se lee "en silencio": las palabras se resaltan con el reloj. */
  function iniciarSilencio(desdeMs) {
    if (!estado.sonando) return;
    audio.pause();
    estado.silencio = true;
    estado.t0 = global.performance.now() - (desdeMs || 0) / VELOCIDADES[estado.indVel];
    if (!estado.avisoSilencio) {
      estado.avisoSilencio = true;
      aviso('No se encontró el audio: se muestra la lectura en silencio.', 4500);
    }
    global.cancelAnimationFrame(estado.raf);
    estado.raf = global.requestAnimationFrame(bucle);
  }

  /* Resalta la palabra que se está diciendo en este instante. */
  function bucle() {
    if (!estado.sonando) return;
    const seg = lineasDe(estado.pagina)[estado.linea];
    const t = tiempo();
    const ps = seg.palabras;
    let w = -1;
    for (let k = 0; k < ps.length; k++) { if (ps[k][1] <= t) w = k; else break; }
    if (w !== estado.palabra) {
      estado.palabra = w;
      estado.nodos[estado.linea].forEach((n, k) => {
        n.classList.toggle('dicha', k < w);
        n.classList.toggle('activa', k === w);
      });
    }
    if (estado.silencio && t >= seg.duracion + 150) { terminarLinea(); return; }
    estado.raf = global.requestAnimationFrame(bucle);
  }

  function terminarLinea() {
    global.cancelAnimationFrame(estado.raf);
    estado.nodos[estado.linea].forEach((n) => { n.classList.add('dicha'); n.classList.remove('activa'); });
    estado.palabra = -1;
    if (!estado.sonando) return;
    const ultima = estado.linea === lineasDe(estado.pagina).length - 1;
    estado.temporizador = global.setTimeout(avanzar, ultima ? PAUSA_PAGINA : PAUSA_LINEA);
  }

  /* Pasa a la línea siguiente; al terminar la página, a la página siguiente; al final, al fin del cuento. */
  function avanzar() {
    if (estado.linea < lineasDe(estado.pagina).length - 1) reproducirLinea(estado.linea + 1);
    else if (estado.pagina < paginas().length - 1) irPagina(estado.pagina + 1, { leer: true });
    else finCuento();
  }

  function reanudar() {
    const reanudable = !estado.silencio && estado.lineaAudio === estado.linea && audio.src &&
      !audio.ended && audio.currentTime > 0 && audio.currentTime < (audio.duration || 0) - 0.05;
    if (!reanudable) { reproducirLinea(estado.linea, 0); return; }
    limpiar();
    const mio = estado.token;
    estado.sonando = true;
    actualizarPlay();
    audio.onended = () => { if (mio === estado.token) terminarLinea(); };
    audio.play().then(() => { if (mio === estado.token) estado.raf = global.requestAnimationFrame(bucle); })
      .catch(() => { if (mio === estado.token) reproducirLinea(estado.linea, 0); });
  }

  function alternar() {
    if (estado.sonando) pausar(); else reanudar();
  }

  /* ---------- navegación ---------- */
  function irPagina(n, opciones) {
    const o = opciones || {};
    const total = paginas().length;
    if (n < 0 || n >= total) return;
    const seguir = o.leer !== undefined ? o.leer : estado.sonando;
    const direccion = n >= estado.pagina ? 1 : -1;
    detener();
    mostrarPagina(n, direccion);
    const linea = o.linea || 0;
    if (linea) { estado.linea = linea; marcarActiva(linea); }
    if (seguir) {
      estado.sonando = true;
      actualizarPlay();
      estado.temporizador = global.setTimeout(() => reproducirLinea(linea), 450);
    }
  }

  function irLinea(l) {
    if (estado.sonando) { reproducirLinea(l); return; }
    limpiar();
    audio.pause();
    estado.lineaAudio = -1;
    estado.linea = l;
    marcarActiva(l);
  }

  function saltarLinea(delta) {
    let p = estado.pagina;
    let l = estado.linea + delta;
    if (l < 0) {
      if (p === 0) l = 0;
      else { p -= 1; l = lineasDe(p).length - 1; }
    } else if (l >= lineasDe(p).length) {
      if (p === paginas().length - 1) return;
      p += 1;
      l = 0;
    }
    if (p !== estado.pagina) irPagina(p, { linea: l });
    else irLinea(l);
  }

  function finCuento() {
    detener();
    [...$('puntos').children].forEach((p) => { p.classList.add('hecha'); p.classList.remove('actual'); });
    $('finTitulo').textContent = estado.cuento.titulo;
    mostrar('pFin');
    anim(() => gs.from('.fin-emoji', { scale: 0, rotation: -180, duration: 0.8, delay: 0.2, ease: 'back.out(2.5)', clearProps: 'transform' }));
    if (typeof global.confetti === 'function') {
      const base = { colors: ['#e8456b', '#f08a24', '#f4c20d', '#8fcc2a', '#19b3b8', '#2f7fe0', '#9b3fd1'], disableForReducedMotion: true, zIndex: 60, ticks: 170, shapes: ['circle', 'square', 'star'] };
      global.confetti(Object.assign({ particleCount: 70, angle: 60, spread: 60, startVelocity: 55, origin: { x: 0, y: 0.75 } }, base));
      global.confetti(Object.assign({ particleCount: 70, angle: 120, spread: 60, startVelocity: 55, origin: { x: 1, y: 0.75 } }, base));
    }
  }

  function volverALaBiblioteca() {
    detener();
    mostrar('pBiblioteca');
    global.history.replaceState(null, '', global.location.pathname);
  }

  /* ---------- arranque ---------- */
  function iniciar() {
    pintarBiblioteca();

    // tocar una palabra: se oye desde ahí; tocar una línea: se oye la línea completa
    $('texto').addEventListener('click', (e) => {
      const fila = e.target.closest('.linea');
      if (!fila) return;
      const i = Number(fila.dataset.i);
      const pal = e.target.closest('.palabra');
      const desde = pal ? Math.max(0, lineasDe(estado.pagina)[i].palabras[Number(pal.dataset.w)][1] - 80) : 0;
      reproducirLinea(i, desde);
    });

    $('btnPlay').addEventListener('click', alternar);
    $('btnLineaAnterior').addEventListener('click', () => saltarLinea(-1));
    $('btnLineaSiguiente').addEventListener('click', () => saltarLinea(1));
    $('btnPagAnterior').addEventListener('click', () => irPagina(estado.pagina - 1));
    $('btnPagSiguiente').addEventListener('click', () => irPagina(estado.pagina + 1));

    $('btnVelocidad').textContent = VELOCIDADES[estado.indVel] + '×';
    $('btnVelocidad').addEventListener('click', () => {
      const t = tiempo();
      estado.indVel = (estado.indVel + 1) % VELOCIDADES.length;
      const v = VELOCIDADES[estado.indVel];
      audio.playbackRate = v;
      audio.defaultPlaybackRate = v;
      if (estado.silencio) estado.t0 = global.performance.now() - t / v; // el reloj sigue donde iba
      $('btnVelocidad').textContent = v + '×';
      guardar('velocidad', estado.indVel);
      aviso('Velocidad: ' + v + '×', 1400);
    });

    $('btnTamano').addEventListener('click', () => {
      estado.indTam = (estado.indTam + 1) % TAMANOS.length;
      $('texto').style.setProperty('--tam', TAMANOS[estado.indTam]);
      guardar('tamano', estado.indTam);
      if (estado.cuento && !$('pCuento').hidden) marcarActiva(estado.linea);
    });

    $('btnBiblioteca').addEventListener('click', volverALaBiblioteca);
    $('btnMasCuentos').addEventListener('click', volverALaBiblioteca);
    $('btnOtraVez').addEventListener('click', () => abrirCuento(estado.id, true));

    // barra espaciadora: escuchar / pausar
    global.document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || $('pCuento').hidden) return;
      if (/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      e.preventDefault();
      alternar();
    });

    // enlace directo a un cuento:  cuentacuentos.html#leon-y-raton   o   cuentacuentos.html?c=leon-y-raton
    const pedido = decodeURIComponent((global.location.hash || '').replace(/^#/, '')) ||
      new global.URLSearchParams(global.location.search).get('c');
    if (pedido && (global.CATALOGO || []).some((c) => c.id === pedido)) abrirCuento(pedido, false);
  }

  iniciar();
})(window);
