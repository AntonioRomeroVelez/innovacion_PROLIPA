'use strict';
/* =====================================================================
   APP: pantallas, navegación, resultados, medallas y ajustes.
   ===================================================================== */
const App = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = U.esc;
  const pantalla = () => $('#pantalla');

  let juegoActivo = null;
  let ctxActual = null;
  let refrescarAviso = null;   // actualiza el consejo de voz de la bienvenida
  const historial = [];
  const guiasDichas = new Set();

  const estrellasHtml = n => [1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}">${i <= n ? '⭐' : '☆'}</span>`).join('');
  const colorVars = g => `--c:${g.color};--cd:${g.oscuro}`;

  function pararJuego() {
    if (juegoActivo) { juegoActivo.parar(); juegoActivo = null; }
    ctxActual = null;
    Voz.cancelar(); Sfx.detener();
  }

  /* Guía de Libi: la primera vez la dice con voz, luego solo burbuja. */
  function guiar(clave, texto, animo = 'feliz') {
    Libi.animo(animo, 1600);
    if (!guiasDichas.has(clave)) { guiasDichas.add(clave); Libi.hablar(texto); }
    else Libi.decir(texto);
  }

  /* gradoId: en Inicial (4 años) la voz es más lenta, fuerte y expresiva. */
  function marco(nombre, titulo, mostrarBarra = true, gradoId = null) {
    document.body.dataset.pantalla = nombre;
    if (gradoId) document.body.dataset.grado = gradoId; else delete document.body.dataset.grado;
    Voz.fijarPreset(gradoId === 'inicial' ? 'enf' : 'std');
    $('#barra').hidden = !mostrarBarra;
    $('#titulo-barra').textContent = titulo || 'Aprendo a leer con Libi';
    pantalla().scrollTop = 0;
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Navegación                                                        */
  /* ------------------------------------------------------------------ */
  function ir(nombre, params = {}, { sinHistorial = false } = {}) {
    pararJuego();
    Libi.callar();
    if (!sinHistorial) historial.push({ nombre, params });
    PANTALLAS[nombre](params);
  }
  function atras() {
    historial.pop();
    const prev = historial[historial.length - 1] || { nombre: 'inicio', params: {} };
    pararJuego();
    Libi.callar();
    PANTALLAS[prev.nombre](prev.params);
  }

  /* ------------------------------------------------------------------ */
  /*  Pantallas                                                         */
  /* ------------------------------------------------------------------ */
  const PANTALLAS = {};

  /* ---------- Bienvenida ---------- */
  PANTALLAS.bienvenida = () => {
    marco('bienvenida', '', false);
    const nombre = Estado.nombre;
    pantalla().innerHTML = `
      <section class="bienvenida">
        <div class="bienv-fondo" aria-hidden="true"><span>A</span><span>e</span><span>I</span><span>o</span><span>U</span><span>m</span><span>P</span><span>s</span></div>
        <div class="logo-marca"><img src="img/prolipa-logo.png" alt="PROLIPA, vanguardia en educación"></div>
        <h1 class="titulo-app">Aprendo a leer<br><span>con Libi</span></h1>
        <div class="libi libi-grande" data-mood="feliz"><div class="libi-cuerpo flota">${Libi.svg()}</div></div>
        <div class="bienv-form">
          ${nombre
            ? `<p class="saludo">¡Hola de nuevo, <b>${esc(nombre)}</b>!</p>
               <button class="enlace" type="button" id="cambiar-nombre">No soy ${esc(nombre)}</button>`
            : `<label class="campo" for="nombre">¿Cómo te llamas?</label>
               <input id="nombre" class="entrada" maxlength="18" autocomplete="off" placeholder="Escribe tu nombre">`}
          <button class="btn-grande btn-jugar" type="button" id="empezar">¡Vamos a jugar! ▶</button>
          <p class="aviso-voz" id="aviso-voz" hidden></p>
        </div>
      </section>`;
    UI.entrar($('.bienvenida'));
    if (window.gsap) gsap.from('.titulo-app', { y: -30, opacity: 0, duration: 0.7, ease: 'back.out(1.7)' });

    const aviso = () => {
      const el = $('#aviso-voz');
      if (!el) return;
      if (Voz.hayGrabaciones) { el.hidden = true; return; }
      if (!Voz.soportada) {
        el.hidden = false;
        el.textContent = 'Este navegador no puede hablar. Abre la app en Microsoft Edge o Google Chrome.';
      } else if (Voz.voces.length && !Voz.hayVozNatural) {
        el.hidden = false;
        el.textContent = 'Aviso: faltan las grabaciones de voz (carpeta audio/voz). Mira el README para generarlas.';
      } else el.hidden = true;
    };
    aviso();
    refrescarAviso = aviso;

    const inp = $('#nombre');
    const empezar = async () => {
      Sfx.asegurar();
      if (inp) Estado.nombre = inp.value;
      Sfx.acierto();
      Libi.animo('celebra', 1500);
      ir('inicio', {}, { sinHistorial: false });
      guiasDichas.add('bienvenida');
      Libi.hablar(FRASES.HOLA);
    };
    $('#empezar').addEventListener('click', empezar);
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') empezar(); });
    const cam = $('#cambiar-nombre');
    if (cam) cam.addEventListener('click', () => { Estado.nombre = ''; PANTALLAS.bienvenida(); });
  };

  /* ---------- Inicio: grados ---------- */
  PANTALLAS.inicio = () => {
    marco('inicio', 'Elige tu grado');
    historial.length = 0; historial.push({ nombre: 'inicio', params: {} });
    pantalla().innerHTML = `
      <section class="inicio">
        <h2 class="pregunta-grande">${Estado.nombre ? `${esc(Estado.nombre)}, ¿` : '¿'}qué grado quieres jugar?</h2>
        <div class="grados">
          ${CURRICULO.map(g => {
            const p = Estado.progresoGrado(g);
            const pct = p.max ? Math.round(p.est / p.max * 100) : 0;
            return `
            <button class="card-grado" type="button" data-g="${g.id}" style="${colorVars(g)}">
              <span class="cg-icono">${g.icono}</span>
              <span class="cg-nombre">${g.nombre}</span>
              <span class="cg-edad">${g.edad}</span>
              <span class="cg-desc">${g.desc}</span>
              <span class="cg-prog"><span class="barra"><i style="width:${pct}%"></i></span><b>${p.hechas}/${p.total} juegos</b></span>
            </button>`;
          }).join('')}
        </div>
      </section>`;
    $$('.card-grado').forEach(b => b.addEventListener('click', () => { Sfx.tocar(); ir('grado', { g: b.dataset.g }); }));
    if (window.gsap) gsap.from('.card-grado', { y: 40, opacity: 0, duration: 0.5, stagger: 0.09, ease: 'back.out(1.5)', clearProps: 'all' });
    guiar('inicio', FRASES.GUIAS.inicio);
  };

  /* ---------- Grado: niveles y actividades ---------- */
  PANTALLAS.grado = ({ g: gid }) => {
    const g = CURRICULO.find(x => x.id === gid);
    Estado.visitarGrado(gid);
    marco('grado', `${g.icono} ${g.nombre}`, true, g.id);
    const medGanada = id => !!Estado.d.medallas[id];
    pantalla().innerHTML = `
      <section class="grado" style="${colorVars(g)}">
        <div class="grado-cab">
          <button class="btn-chico" type="button" id="volver">⬅ Grados</button>
          <div><h2>${g.icono} ${g.nombre} <small>${g.edad}</small></h2><p>${g.desc}</p></div>
          <span class="medalla grande ${medGanada('grado:' + g.id) ? 'ganada' : ''}" title="${esc(g.medalla.nombre)}">${g.medalla.icono}</span>
        </div>
        <div class="subniveles">
          ${g.subniveles.map(sn => {
            const gan = medGanada(`sub:${g.id}.${sn.id}`);
            return `
            <article class="sub">
              <header>
                <span class="sub-icono">${sn.icono}</span>
                <div class="sub-texto"><h3>${sn.nombre}</h3><p>${sn.desc}</p></div>
                <span class="medalla ${gan ? 'ganada' : ''}" title="${esc(sn.medalla.nombre)}">${sn.medalla.icono}</span>
              </header>
              <div class="acts">
                ${sn.actividades.map(a => `
                  <button class="act" type="button" data-s="${sn.id}" data-a="${a.id}">
                    <span class="act-icono">${a.icono}</span>
                    <span class="act-titulo">${esc(a.titulo)}</span>
                    <span class="act-est">${estrellasHtml(Estado.estrellasDe(g.id, sn.id, a.id))}</span>
                  </button>`).join('')}
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>`;
    $('#volver').addEventListener('click', () => { Sfx.tocar(); atras(); });
    $$('.act').forEach(b => b.addEventListener('click', () => { Sfx.tocar(); ir('juego', { g: gid, s: b.dataset.s, a: b.dataset.a }); }));
    if (window.gsap) gsap.from('.sub', { y: 30, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', clearProps: 'all' });
    guiar('grado:' + gid, FRASES.GUIAS.grado);
  };

  /* ---------- Juego ---------- */
  PANTALLAS.juego = ({ g: gid, s: sid, a: aid }) => {
    const g = CURRICULO.find(x => x.id === gid);
    const sn = g.subniveles.find(x => x.id === sid);
    const act = sn.actividades.find(x => x.id === aid);
    marco('juego', `${g.nombre} · ${sn.nombre}`, true, g.id);
    pantalla().innerHTML = `
      <section class="juego" style="${colorVars(g)}">
        <div class="juego-top">
          <button class="btn-chico" type="button" id="salir">⬅ Salir</button>
          <div class="juego-titulo"><span>${act.icono}</span> ${esc(act.titulo)}</div>
          <div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i id="barra-prog"></i></div>
        </div>
        <div class="escenario" id="escenario"></div>
      </section>`;
    $('#salir').addEventListener('click', () => { Sfx.tocar(); atras(); });

    const barra = $('#barra-prog');
    const ctx = {
      raiz: $('#escenario'),
      grado: g, sub: sn, act,
      progreso(i, total) {
        const pct = total ? Math.round(i / total * 100) : 0;
        barra.style.width = pct + '%';
        barra.parentElement.setAttribute('aria-valuenow', pct);
      },
      terminar(res) { if (ctxActual === ctx) resultado(g, sn, act, res); }
    };
    ctxActual = ctx;
    juegoActivo = Juegos.iniciar(act, ctx);
    Libi.callar();
  };

  /* ---------- Medallas ---------- */
  PANTALLAS.medallas = () => {
    marco('medallas', '🏅 Mis medallas');
    const todas = Estado.todasLasMedallas();
    const ganadas = todas.filter(m => Estado.d.medallas[m.id]).length;
    const celda = m => {
      const ok = !!Estado.d.medallas[m.id];
      return `
        <button class="medalla-card ${ok ? 'ganada' : 'bloqueada'}" type="button" data-id="${m.id}" ${m.color ? `style="--c:${m.color}"` : ''}>
          <span class="m-icono">${ok ? m.icono : '❔'}</span>
          <span class="m-nombre">${ok ? esc(m.nombre) : '¿Qué será?'}</span>
          <span class="m-desc">${esc(m.desc)}</span>
        </button>`;
    };
    pantalla().innerHTML = `
      <section class="medallas">
        <div class="grado-cab">
          <button class="btn-chico" type="button" id="volver">⬅ Volver</button>
          <div><h2>🏅 Mis medallas</h2><p>Tienes ${ganadas} de ${todas.length}. ¡Sigue jugando para ganar más!</p></div>
        </div>
        <h3 class="m-grupo">Logros</h3>
        <div class="medallas-grid">${todas.filter(m => m.tipo === 'logro').map(celda).join('')}</div>
        ${CURRICULO.map(g => `
          <h3 class="m-grupo" style="color:${g.oscuro}">${g.icono} ${g.nombre}</h3>
          <div class="medallas-grid">${todas.filter(m => m.id.startsWith('sub:' + g.id + '.') || m.id === 'grado:' + g.id).map(celda).join('')}</div>`).join('')}
      </section>`;
    $('#volver').addEventListener('click', () => { Sfx.tocar(); atras(); });
    $$('.medalla-card').forEach(b => b.addEventListener('click', () => {
      const m = todas.find(x => x.id === b.dataset.id);
      const ok = !!Estado.d.medallas[m.id];
      Sfx.tocar();
      Libi.decir(ok ? `${m.nombre}: ${m.desc}` : `Todavía no la tienes: ${m.desc}`, 5000);
      if (ok) { Sfx.estrella(); Libi.animo('celebra', 1500); }
      Voz.secuencia([ok ? FRASES.MEDALLA_SI(m.nombre) : FRASES.MEDALLA_NO, m.desc], { pausaMs: 300 });
    }));
    guiar('medallas', FRASES.GUIAS.medallas);
  };

  /* ------------------------------------------------------------------ */
  /*  Resultado                                                         */
  /* ------------------------------------------------------------------ */
  function siguienteActividad(g, sn, act) {
    const i = sn.actividades.indexOf(act);
    if (i < sn.actividades.length - 1) return { s: sn.id, a: sn.actividades[i + 1].id };
    const j = g.subniveles.indexOf(sn);
    if (j < g.subniveles.length - 1) { const s2 = g.subniveles[j + 1]; return { s: s2.id, a: s2.actividades[0].id }; }
    return null;
  }

  function resultado(g, sn, act, res) {
    pararJuego();
    let est = res.est;
    if (est == null) {
      const r = res.total ? res.ok / res.total : 1;
      est = r >= 0.85 ? 3 : r >= 0.6 ? 2 : 1;
    }
    const nuevas = Estado.registrar(g.id, sn.id, act.id, est, res.mejor || 0);
    UI.actualizarEstrellas();
    const sig = siguienteActividad(g, sn, act);
    const nombre = Estado.nombre;

    const titulo = FRASES.FIN.titulos[est - 1];
    const detalle = res.est != null
      ? 'Ya escuchaste todos los sonidos.'
      : `Acertaste ${res.ok} de ${res.total} a la primera.`;

    const h = UI.modal({
      cerrable: false,
      clase: 'modal-resultado',
      html: `
        <div class="libi libi-grande" data-mood="celebra"><div class="libi-cuerpo flota">${Libi.svg()}</div></div>
        <h2>${titulo}${nombre ? `, ${esc(nombre)}` : ''}</h2>
        <div class="est-grandes" aria-label="${est} estrellas">${[1, 2, 3].map(i => `<span class="${i <= est ? 'on' : ''}">${i <= est ? '⭐' : '☆'}</span>`).join('')}</div>
        <p class="detalle">${detalle}</p>
        ${nuevas.length ? `<div class="medallas-nuevas"><p>¡Medalla nueva!</p>${nuevas.map(m => `
          <div class="medalla-nueva"><span>${m.icono}</span><b>${esc(m.nombre)}</b></div>`).join('')}</div>` : ''}
        <div class="acciones">
          <button class="btn-grande" type="button" data-repetir>🔁 Otra vez</button>
          ${sig ? '<button class="btn-grande verde" type="button" data-sig>Siguiente ➜</button>' : ''}
          <button class="btn-chico" type="button" data-menu>${sig ? 'Menú' : 'Volver al menú'}</button>
        </div>`
    });

    // Celebración
    Sfx.fanfarria();
    setTimeout(() => Sfx.aplauso(2.6), 450);
    UI.confeti(est === 3 || nuevas.length ? 'grande' : 'normal');
    if (window.gsap) {
      gsap.from(h.el.querySelectorAll('.est-grandes span'), { scale: 0, rotation: -180, duration: 0.6, stagger: 0.25, delay: 0.3, ease: 'back.out(2.2)' });
      if (nuevas.length) gsap.from(h.el.querySelectorAll('.medalla-nueva'), { scale: 0, duration: 0.7, delay: 1.1, stagger: 0.2, ease: 'elastic.out(1,0.5)' });
    }
    const dicho = [titulo, FRASES.FIN.estrellas[est - 1]];
    if (nuevas.length === 1) dicho.push(FRASES.FIN.medalla, nuevas[0].nombre);
    else if (nuevas.length > 1) dicho.push(FRASES.FIN.medallas(Math.min(nuevas.length, FRASES.FIN.NUEVAS_MAX)));
    setTimeout(() => Voz.secuencia(dicho, { pausaMs: 250 }), 900);

    const cerrarYIr = fn => { Voz.cancelar(); h.cerrar(); fn(); };
    h.el.querySelector('[data-repetir]').addEventListener('click', () =>
      cerrarYIr(() => { historial.pop(); ir('juego', { g: g.id, s: sn.id, a: act.id }); }));
    const bs = h.el.querySelector('[data-sig]');
    if (bs) bs.addEventListener('click', () =>
      cerrarYIr(() => { historial.pop(); ir('juego', { g: g.id, s: sig.s, a: sig.a }); }));
    h.el.querySelector('[data-menu]').addEventListener('click', () => cerrarYIr(() => atras()));
  }

  /* ------------------------------------------------------------------ */
  /*  Ajustes                                                           */
  /* ------------------------------------------------------------------ */
  function abrirAjustes() {
    Sfx.asegurar();
    const aj = Estado.ajustes;
    const voces = Voz.voces;
    const opcionesVoz = voces.map(v =>
      `<option value="${esc(v.voiceURI)}" ${Voz.elegida && v.voiceURI === Voz.elegida.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})${Voz.esNatural(v) ? ' ⭐ natural' : ''}</option>`).join('');
    const h = UI.modal({
      clase: 'modal-ajustes',
      html: `
        <h2>⚙️ Ajustes</h2>
        <div class="aj-grupo">
          <label for="aj-nombre">Mi nombre</label>
          <input id="aj-nombre" class="entrada" maxlength="18" value="${esc(Estado.nombre)}" placeholder="Escribe tu nombre" autocomplete="off">
        </div>
        <div class="aj-grupo">
          <label>Voz de Libi</label>
          ${Voz.hayGrabaciones
            ? `<p class="aj-nota bien">✅ Voces grabadas de Ecuador: Libi (Andrea) y el narrador de los cuentos (Luis).</p>
               <button class="btn-chico" type="button" id="aj-probar">🔊 Probar la voz</button>`
            : ''}
          ${voces.length
            ? `<details class="aj-det" ${Voz.hayGrabaciones ? '' : 'open'}>
                 <summary>${Voz.hayGrabaciones ? 'Voz de respaldo del navegador' : 'Voz del navegador'}</summary>
                 <div class="aj-fila"><select id="aj-voz" class="entrada" aria-label="Voz del navegador">${opcionesVoz}</select>
                 ${Voz.hayGrabaciones ? '' : '<button class="btn-chico" type="button" id="aj-probar">🔊 Probar</button>'}</div>
                 <p class="aj-nota" id="aj-nota"></p>
               </details>`
            : (Voz.hayGrabaciones ? '' : `<p class="aj-nota malo">${Voz.soportada
                ? 'No se encontraron voces en español en este dispositivo. Instala una voz en español o abre la app en Microsoft Edge.'
                : 'Este navegador no puede hablar. Usa Microsoft Edge o Google Chrome.'}</p>`)}
        </div>
        <div class="aj-grupo">
          <label>Velocidad de la voz</label>
          <div class="aj-vel" role="radiogroup">
            ${[['lenta', '🐢 Lenta'], ['normal', '🙂 Normal'], ['rapida', '🐇 Rápida']].map(([v, t]) =>
              `<button class="btn-chico ${aj.velocidad === v ? 'on' : ''}" type="button" role="radio" aria-checked="${aj.velocidad === v}" data-vel="${v}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="aj-grupo">
          <label class="aj-sw"><input type="checkbox" id="aj-efectos" ${aj.efectos ? 'checked' : ''}> Sonidos de premio y aplausos</label>
        </div>
        <div class="aj-grupo">
          <button class="btn-chico peligro" type="button" id="aj-reset">🗑️ Borrar mi progreso</button>
        </div>
        <button class="btn-grande" type="button" data-cerrar>Listo</button>`,
      alCerrar: () => Estado.guardar()
    });

    const el = h.el;
    const nombre = el.querySelector('#aj-nombre');
    nombre.addEventListener('input', () => { Estado.nombre = nombre.value; });

    const nota = el.querySelector('#aj-nota');
    const pintarNota = () => {
      if (!nota || !Voz.elegida) return;
      const nat = Voz.esNatural(Voz.elegida);
      nota.className = 'aj-nota ' + (nat ? 'bien' : 'aviso');
      nota.textContent = nat
        ? 'Esta voz del navegador es natural.'
        : 'Esta voz del navegador suena más robótica; solo se usa si falta alguna grabación.';
    };
    pintarNota();

    const sel = el.querySelector('#aj-voz');
    if (sel) {
      sel.addEventListener('change', () => {
        Voz.elegir(sel.value); aj.voz = sel.value; Estado.guardar(); pintarNota();
        Voz.decir(FRASES.AJUSTES.prueba);
      });
    }
    const probar = el.querySelector('#aj-probar');
    if (probar) probar.addEventListener('click', () => Voz.decir(FRASES.AJUSTES.prueba));
    el.querySelectorAll('[data-vel]').forEach(b => b.addEventListener('click', () => {
      aj.velocidad = b.dataset.vel; Voz.fijarVelocidad(aj.velocidad); Estado.guardar();
      el.querySelectorAll('[data-vel]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      Voz.decir(FRASES.AJUSTES.velocidad);
    }));
    el.querySelector('#aj-efectos').addEventListener('change', e => {
      aj.efectos = e.target.checked; Sfx.efectos = aj.efectos; Estado.guardar();
      if (aj.efectos) Sfx.acierto();
    });
    el.querySelector('#aj-reset').addEventListener('click', () => {
      if (confirm('¿Seguro que quieres borrar todas las estrellas y medallas?')) {
        Estado.reiniciar(); UI.actualizarEstrellas(); h.cerrar();
        ir('inicio', {}, { sinHistorial: true });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Arranque                                                          */
  /* ------------------------------------------------------------------ */
  function iniciar() {
    Voz.iniciar();
    Voz.elegir(Estado.ajustes.voz);
    Voz.fijarVelocidad(Estado.ajustes.velocidad);
    Voz.alCambiar(e => {
      if (e !== 'voces') return;
      Voz.elegir(Estado.ajustes.voz);
      if (refrescarAviso && $('#aviso-voz')) refrescarAviso();
    });
    Sfx.efectos = Estado.ajustes.efectos;
    Libi.montar($('#libi-fijo'));
    UI.actualizarEstrellas();

    $('#btn-inicio').addEventListener('click', () => { Sfx.tocar(); ir('inicio'); });
    $('#btn-medallas').addEventListener('click', () => { Sfx.tocar(); ir('medallas'); });
    $('#btn-ajustes').addEventListener('click', () => { Sfx.tocar(); abrirAjustes(); });
    $('#contador-estrellas').addEventListener('click', () => { Sfx.estrella(); Libi.animo('feliz', 1500); Libi.decir(`¡Tienes ${Estado.estrellas} estrellas!`, 3500); });

    PANTALLAS.bienvenida();
  }

  return { iniciar, ir, atras, abrirAjustes };
})();

function $$(s, r = document) { return [...r.querySelectorAll(s)]; }
document.addEventListener('DOMContentLoaded', App.iniciar);
