/* =============================================================
   LECTOR.JS — "Leemos juntos"
   -------------------------------------------------------------
   Cuenta una lectura con audio, resalta el texto palabra por palabra, y cada
   vez que llega a una palabra o frase iluminada, le pasa el turno al
   estudiante: abre el micrófono, comprueba lo que lee y sigue.

   Es un componente: se monta en un <div> de CUALQUIER HTML y muestra la
   lectura que se le pida. El texto NO está aquí: vive en
   lecturas/<id>/texto.js (ver motor/lecturas.js).

     <div id="lector" data-lectura="mia-y-el-libro" data-base="lecturas/"></div>
     <script>Lector.montar('#lector');</script>

   o, sin atributos:   Lector.montar('#lector', { lectura: 'mia-y-el-libro', base: '../lecturas/' });
   También se puede elegir con la dirección:  pagina.html?lectura=otra-lectura

   Depende de:  lecturas.js (el texto y el audio), escucha.js (micrófono) y,
   si la lectura trae dibujo, escena.js. Nada más: ni librerías ni conexión.
   Solo cabe UNA lectura montada por página.
   ============================================================= */
(function (raiz) {
  'use strict';

  var CANCELADO = { cancelado: true };     // para salir de la lectura al reiniciar

  /* Lo que se dibuja dentro del contenedor */
  var PLANTILLA = '' +
    '<main class="app" id="app" data-estado="portada">' +
    '  <header class="cabecera">' +
    '    <div><span class="unidad" id="unidad"></span><h1 id="titulo"></h1></div>' +
    '    <div class="modo" id="modo" role="status"></div>' +
    '  </header>' +
    '  <section class="escenario" aria-hidden="true"><svg id="lienzo"></svg><div class="lugar" id="lugar"></div></section>' +
    '  <section class="libro">' +
    '    <div class="avance" id="avance" aria-label="Avance de la lectura"></div>' +
    '    <article class="pagina" id="pagina" aria-live="polite"></article>' +
    '    <p class="leyenda" id="leyenda" hidden></p>' +
    '    <p class="nota" id="nota" hidden></p>' +
    '  </section>' +
    '  <section class="turno" id="turno" data-est="espera" hidden>' +
    '    <button class="orbe" id="orbe" type="button" aria-label="Micrófono"><span>🎤</span></button>' +
    '    <div class="turno-texto"><p class="turno-consigna" id="consigna"></p>' +
    '      <div class="onda" id="onda" aria-hidden="true"><canvas id="ondaLienzo" width="320" height="44"></canvas></div>' +
    '      <p class="turno-silabas" id="silabas" hidden></p><p class="turno-oido" id="oido" hidden></p></div>' +
    '    <div class="turno-botones">' +
    '      <button class="boton" id="btnModelo" type="button">🔊 Escuchar cómo se dice</button>' +
    '      <button class="boton principal" id="btnManual" type="button" hidden>✋ Ya lo leí</button>' +
    '      <button class="boton claro" id="btnSaltar" type="button">Saltar ›</button>' +
    '    </div>' +
    '  </section>' +
    '  <nav class="mandos" aria-label="Controles de la lectura">' +
    '    <button class="boton" id="btnPausa" type="button">⏸ Pausa</button>' +
    '    <button class="boton claro" id="btnRepetir" type="button">↺ Repetir la frase</button>' +
    '    <button class="boton claro" id="btnLento" type="button" aria-pressed="false">🐢 Más despacio</button>' +
    '  </nav>' +
    '</main>' +
    '<div class="portada" id="portada"><div class="portada-caja">' +
    '  <p class="unidad" id="portadaUnidad"></p><h2>Leemos juntos</h2><p class="subtitulo" id="portadaTitulo"></p>' +
    '  <ul class="pasos">' +
    '    <li><span>🎧</span><div>Escucha la lectura.</div></li>' +
    '    <li><span>✨</span><div>Cuando una palabra se ilumine, <b>léela en voz alta</b>.</div></li>' +
    '    <li><span>🎤</span><div>El micrófono te escucha: si la lees igual, se pone <b>verde ✔</b>; si no, <b>roja ✘</b> y lo intentas otra vez. Si ya la leíste, toca <b>«Ya lo leí»</b>.</div></li>' +
    '  </ul>' +
    '  <button class="boton grande" id="btnEmpezar" type="button">Empezar a leer ▸</button>' +
    '  <p class="aviso" id="avisoPortada" hidden></p>' +
    '  <p class="privacidad" id="privacidad" hidden>' +
    '    Para comprobar lo que lees, tu navegador usa el reconocimiento de voz de Google. Esta actividad no graba ni guarda tu voz. ' +
    '    <button class="enlace" id="btnSinReconocimiento" type="button">Prefiero que no se compruebe lo que digo</button>' +
    '  </p>' +
    '</div></div>' +
    '<div class="final" id="final" hidden><div class="final-caja">' +
    '  <div class="estrellas" id="estrellas" aria-hidden="true"></div>' +
    '  <h2>¡Lo leímos juntos!</h2><p class="final-resumen" id="resumen"></p>' +
    '  <div class="practicar" id="practicar" hidden><p>Para practicar un poco más, toca y escucha:</p><div class="practicar-lista" id="practicarLista"></div></div>' +
    '  <p class="reflexion" id="reflexion" hidden></p>' +
    '  <button class="boton grande" id="btnOtraVez" type="button">↺ Leer otra vez</button>' +
    '</div></div>';

  function crear(raizEl, H, opciones) {
  var A = H.ajustes || {};
  raizEl.classList.add('lj');
  raizEl.innerHTML = PLANTILLA;

  var params = new URLSearchParams(location.search);
  var X = Math.min(16, Math.max(1, Number(params.get('x')) || 1));   // solo para pruebas: acelera todo
  var forzarBasico = params.has('basico') || A.reconocimiento === false;

  // el dibujo que acompaña a esta lectura (si trae)
  var esc = H.escenario && raiz.Escenarios && raiz.Escenarios[H.escenario] || null;
  function escIr(nombre, op) { if (esc && nombre) esc.ir(nombre, op); }
  function escCelebrar() { if (esc) esc.celebrar(); }

  function q(id) { return raizEl.querySelector('#' + id); }
  var el = {};
  ['app', 'unidad', 'titulo', 'modo', 'lugar', 'avance', 'pagina', 'leyenda', 'nota', 'turno', 'orbe', 'onda', 'ondaLienzo', 'consigna',
   'silabas', 'oido', 'btnModelo', 'btnManual', 'btnSaltar', 'btnPausa', 'btnRepetir', 'btnLento', 'portada',
   'portadaUnidad', 'portadaTitulo', 'btnEmpezar', 'avisoPortada', 'privacidad', 'btnSinReconocimiento',
   'final', 'estrellas', 'resumen', 'practicar', 'practicarLista', 'reflexion', 'btnOtraVez', 'lienzo'
  ].forEach(function (id) { el[id] = q(id); });

  var E = {
    gen: 0,                  // cambia al reiniciar: corta todo lo que esté en marcha
    modo: 'manual',          // reconocimiento | basico | manual
    pausado: false,
    lento: false,
    clip: null,              // el audio que está sonando
    esperando: [],           // quienes esperan a que se quite la pausa
    huecos: [],              // todos los turnos del estudiante, en orden
    leidas: 0, verificadas: 0, practicar: [],
    ultimo: {},              // último mensaje de cada tipo, para no repetir
    turno: null, modeloEnCurso: null, saltarPedido: false, manualPedido: false, repetirPedido: false,
    avisoFijo: false,        // hay un aviso escrito en el panel del turno que debe quedarse
    avisado: false
  };

  /* ---------------------------------------------------------
     Utilidades de tiempo y pausa
     --------------------------------------------------------- */
  function ritmo() { return (E.lento ? 0.85 : 1) * X; }
  function dormir(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function verificar(gen) { if (gen !== E.gen) throw CANCELADO; }

  async function punto(gen) {
    verificar(gen);
    while (E.pausado) {
      await new Promise(function (r) { E.esperando.push(r); });
      verificar(gen);
    }
  }

  async function esperar(ms, gen) {
    var resto = ms / X;
    while (resto > 0) { await punto(gen); await dormir(Math.min(resto, 50)); resto -= 50; }
  }

  function elegir(clave, lista) {
    if (lista.length === 1) return lista[0];
    var i, intentos = 0;
    do { i = Math.floor(Math.random() * lista.length); intentos++; } while (i === E.ultimo[clave] && intentos < 8);
    E.ultimo[clave] = i;
    return lista[i];
  }

  /* ---------------------------------------------------------
     Audio
     --------------------------------------------------------- */
  var cacheAudio = {};
  function audioDe(c) {
    var a = cacheAudio[c.audio];
    if (!a) { a = new Audio(); a.preload = 'auto'; a.src = c.audio; cacheAudio[c.audio] = a; }
    return a;
  }

  /* Reproduce un fragmento (entre c.ini y c.fin). Devuelve una Promise con
     'fin', 'repetir' o 'cortado'.
       · Con audio (c.audio) suena el .mp3. Si el navegador no lo deja sonar, o
         el archivo no está, el tiempo corre igual con el reloj y el texto se
         resalta de todos modos.
       · Sin audio pero con c.hablar se lee con la voz del navegador: es lo que
         pasa con un texto nuevo al que todavía no se le generó la narración.
     La lectura nunca se queda trabada. */
  function reproducir(c, alTiempo) {
    return new Promise(function (resolve) {
      if (!c || (!c.audio && !c.hablar)) { resolve('fin'); return; }
      var a = c.audio ? audioDe(c) : null;
      var sim = !a, tSim = c.ini, ultimo = performance.now(), hecho = false, poll, hablando = false;

      function terminar(r) {
        if (hecho) return;
        hecho = true; clearInterval(poll);
        if (a) { try { a.pause(); } catch (e) {} }
        if (hablando) { try { raiz.speechSynthesis.cancel(); } catch (e) {} }
        if (E.clip === ctl) E.clip = null;
        resolve(r);
      }
      function iniciarSim() { if (!sim) { sim = true; ultimo = performance.now(); } }

      var ctl = {
        pausar: function () {
          if (a && !sim) { try { a.pause(); } catch (e) {} }
          if (hablando) { try { raiz.speechSynthesis.pause(); } catch (e) {} }
        },
        reanudar: function () {
          if (a && !sim) { var p = a.play(); if (p && p.catch) p.catch(iniciarSim); }
          if (hablando) { try { raiz.speechSynthesis.resume(); } catch (e) {} }
        },
        ajustarRitmo: function () { if (a) a.playbackRate = Math.min(16, ritmo()); },
        terminar: terminar
      };
      E.clip = ctl;

      if (a) {
        try { a.currentTime = c.ini; } catch (e) {}
        a.playbackRate = Math.min(16, ritmo());
        var p = a.play();
        if (p && p.catch) p.catch(iniciarSim);
      } else if (c.hablar && raiz.speechSynthesis && X === 1) {
        try {
          var es = (raiz.speechSynthesis.getVoices() || []).filter(function (v) { return /^es/i.test(v.lang); });
          if (es.length) {                       // solo si hay una voz en español: si no, mejor en silencio
            var u = new SpeechSynthesisUtterance(c.hablar);
            u.voice = es[0]; u.lang = es[0].lang; u.rate = E.lento ? 0.8 : 0.95;
            u.onend = u.onerror = function () { hablando = false; };
            hablando = true;
            raiz.speechSynthesis.speak(u);
          }
        } catch (e) { hablando = false; }
      }

      poll = setInterval(function () {
        var ahora = performance.now(), dt = (ahora - ultimo) / 1000;
        ultimo = ahora;
        if (E.pausado) return;
        var t;
        if (sim) { tSim += dt * ritmo(); t = tSim; }
        else { if (a.error) { iniciarSim(); return; } t = a.currentTime; }
        if (alTiempo) alTiempo(t);
        if (sim ? (t >= c.fin && !hablando) : (t >= c.fin || a.ended)) terminar('fin');
      }, 30);
    });
  }

  /* Un fragmento al que todavía no se le generó el audio: se lee con la voz del
     navegador y el resaltado avanza por reloj, repartido según el largo de cada palabra. */
  function clipSinAudio(z) {
    if (z._sinAudio) return z._sinAudio;
    var dur = Math.max(1.2, z.texto.length * 0.062);
    var pesos = z._palabras.map(function (sp) { return Math.max(sp.textContent.length, 2); });
    var total = pesos.reduce(function (x, y) { return x + y; }, 0), t0 = 0;
    var tiempos = pesos.map(function (w) { var t1 = t0 + dur * w / total; var r = [t0, t1]; t0 = t1; return r; });
    z._sinAudio = { audio: '', ini: 0, fin: dur, tiempos: tiempos, hablar: z.texto.replace(/\s+/g, ' ').trim() };
    return z._sinAudio;
  }

  /* Sonidos cortos hechos con el navegador (sin archivos) */
  var ac = null;
  function ctxAudio() {
    try {
      if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
      if (ac && ac.state === 'suspended') ac.resume();
    } catch (e) {}
    return ac;
  }
  function tono(frec, ini, dur, vol, tipo) {
    var c = ctxAudio(); if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + ini;
      o.type = tipo || 'sine'; o.frequency.value = frec;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  function sonido(tipo) {
    if (tipo === 'ok') { tono(660, 0, 0.18, 0.16); tono(880, 0.09, 0.18, 0.16); tono(1320, 0.18, 0.32, 0.14); }
  }

  /* ---------------------------------------------------------
     Dibujar el texto
     --------------------------------------------------------- */
  function pegarPalabras(texto, cont, lista) {
    texto.split(/(\s+)/).forEach(function (p) {
      if (!p) return;
      if (/^\s+$/.test(p)) {
        cont.appendChild(p.indexOf('\n') >= 0 ? document.createElement('br') : document.createTextNode(' '));
      } else if (/[\p{L}\p{N}]/u.test(p)) {
        var s = document.createElement('span');
        s.className = 'pal'; s.textContent = p;
        cont.appendChild(s); lista.push(s);
      } else {
        cont.appendChild(document.createTextNode(p));
      }
    });
  }

  function dibujarPagina(pi) {
    var pag = H.paginas[pi];
    el.pagina.innerHTML = '';
    pag.partes.forEach(function (parte) {
      var p = document.createElement('p');
      p.className = 'parte';
      p.setAttribute('data-voz', parte.voz);
      var personaje = H.voces && H.voces[parte.voz];
      if (personaje && personaje.color) p.style.setProperty('--c', personaje.color);
      if (personaje && personaje.etiqueta) {
        var et = document.createElement('span');
        et.className = 'etiqueta'; et.textContent = personaje.etiqueta;
        p.appendChild(et);
      }
      parte.trozos.forEach(function (z) {
        z._palabras = [];
        if (z.tipo === 'hueco') {
          var h = document.createElement('span');
          h.className = 'hueco';
          pegarPalabras(z.texto, h, z._palabras);
          p.appendChild(h);
          z._el = h;
        } else {
          pegarPalabras(z.texto, p, z._palabras);
        }
      });
      el.pagina.appendChild(p);
    });
    el.pagina.classList.remove('entra'); void el.pagina.offsetWidth; el.pagina.classList.add('entra');
    el.lugar.textContent = pag.lugar || '';
  }

  function resaltar(palabras, tiempos, t) {
    var cur = -1, i;
    for (i = 0; i < tiempos.length; i++) { if (t >= tiempos[i][0] - 0.02) cur = i; else break; }
    for (i = 0; i < palabras.length; i++) {
      var dicha = i < cur || (i === cur && t > tiempos[i][1] + 0.05);
      palabras[i].classList.toggle('dicha', dicha);
      palabras[i].classList.toggle('diciendo', i === cur && !dicha);
    }
  }
  function marcarTodasDichas(palabras) {
    palabras.forEach(function (s) { s.classList.add('dicha'); s.classList.remove('diciendo'); });
  }

  /* ---------------------------------------------------------
     La narradora habla fuera del cuento (feedback, bienvenida, final)
     --------------------------------------------------------- */
  async function decir(categoria, gen, donde) {
    var lista = H.mensajes[categoria];
    if (!lista || !lista.length) return;
    var m = elegir(categoria, lista);
    var destino = donde === 'turno' ? el.consigna : el.leyenda;
    if (destino === el.leyenda) el.leyenda.hidden = false;
    var antes = destino.textContent;
    destino.textContent = m.texto;
    await reproducir(m);
    verificar(gen);
    if (destino === el.leyenda) { el.leyenda.hidden = true; }
    else destino.textContent = antes;
  }

  /* ---------------------------------------------------------
     El avance (puntitos) y la nota "¿Sabías que…?"
     --------------------------------------------------------- */
  function dibujarAvance() {
    el.avance.innerHTML = '';
    E.huecos.forEach(function (h) {
      var d = document.createElement('span');
      d.className = 'punto'; h._punto = d;
      el.avance.appendChild(d);
    });
  }
  function mostrarNota(texto) { el.nota.textContent = texto; el.nota.hidden = false; }
  function ocultarNota() { el.nota.hidden = true; }

  /* ---------------------------------------------------------
     El turno del estudiante
     --------------------------------------------------------- */
  function estadoTurno(est) { el.turno.setAttribute('data-est', est); if (est !== 'escuchando' && est !== 'voz') limpiarOnda(); }

  /* La barra que muestra la línea de la voz: una onda que se desplaza con el volumen */
  var onda = [];
  function dibujarOnda() {
    var c = el.ondaLienzo, g = c.getContext('2d'), w = c.width, h = c.height, mid = h / 2;
    g.clearRect(0, 0, w, h);
    g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = getComputedStyle(el.turno).getPropertyValue('--rojo').trim() || '#e5484d';
    g.beginPath();
    var paso = w / 63;
    for (var i = 0; i < onda.length; i++) {
      var x = w - (onda.length - 1 - i) * paso;
      var y = mid + (i % 2 ? -1 : 1) * onda[i] * (mid - 3);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    if (!onda.length) { g.moveTo(0, mid); g.lineTo(w, mid); }
    g.stroke();
  }
  function pushOnda(n) { onda.push(n); if (onda.length > 64) onda.shift(); dibujarOnda(); }
  function limpiarOnda() { onda = []; if (el.ondaLienzo) dibujarOnda(); }

  function textoConsigna() {
    return E.modo === 'manual'
      ? '✋ Lee en voz alta lo que está iluminado y toca «Ya lo leí».'
      : '🎤 Lee en voz alta lo que está iluminado.';
  }

  function limpiarLeidas(h) { h._palabras.forEach(function (s) { s.classList.remove('leida'); }); }

  // Un aviso escrito (nunca hablado) que se queda hasta que se oiga algo
  function avisar(texto) {
    el.oido.textContent = texto;
    el.oido.hidden = false;
    E.avisoFijo = true;
  }

  // Espera, pero se corta en cuanto el estudiante toca «Ya lo leí» o «Saltar»
  async function esperarSalvoMando(ms, gen) {
    for (var resto = ms; resto > 0 && !E.manualPedido && !E.saltarPedido; resto -= 50) await esperar(50, gen);
  }

  /* El turno del estudiante es solo visual: ni voz ni sonidos que lo guíen.
       · La palabra (o frase) se ilumina y llama la atención.
       · Si la lee EXACTAMENTE igual: se pone verde con ✔ y la lectura sigue.
       · Si no: se pone roja con ✘ y se vuelve a escuchar, las veces que haga falta,
         hasta que la lea bien o toque «Ya lo leí». */
  async function turnoDelEstudiante(h, gen) {
    var span = h._el;
    E.turno = { h: h };
    E.manualPedido = false;
    E.avisoFijo = false;
    span.classList.add('pendiente');
    h._punto.classList.add('actual');
    ocultarNota();

    el.turno.hidden = false;
    el.consigna.textContent = textoConsigna();
    el.silabas.hidden = true; el.oido.hidden = true;
    el.btnManual.hidden = false;
    el.btnRepetir.disabled = true;
    el.btnModelo.disabled = !(h.modelo && h.modelo.audio);
    estadoTurno('espera');
    // se centra la palabra iluminada; el panel del micrófono flota abajo (ver .turno en el CSS)
    try { span.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}

    var resultado = 'ok';
    while (true) {
      await punto(gen);
      while (E.modeloEnCurso) { await E.modeloEnCurso; verificar(gen); }   // no escuchar mientras suena el modelo
      if (consumirSaltar()) { resultado = 'practicar'; break; }
      if (consumirManual()) { await exito(h, gen); break; }

      limpiarLeidas(h);
      span.classList.remove('mal', 'tiembla');
      if (!E.avisoFijo) el.oido.hidden = true;
      el.consigna.textContent = textoConsigna();
      estadoTurno('espera');

      var r = await Escucha.escuchar(h.texto, {
        modo: E.modo,
        alternativas: h.alternativas,
        idioma: A.idioma,
        alEscuchando: function () { estadoTurno('escuchando'); span.classList.add('escuchando'); },
        alVoz: function () { estadoTurno('voz'); },
        alDiagnostico: function (tipo) {
          var msg = { 'no-speech': 'El navegador no oyó voz. Revisa que el micrófono correcto esté elegido y acércate un poco.',
                      'audio-capture': 'No se encontró un micrófono que funcione.',
                      'not-allowed': 'El navegador bloqueó el micrófono (candado de la barra de direcciones → Permitir).',
                      'service-not-allowed': 'El navegador no permite el reconocimiento de voz en esta página (usa localhost o https).',
                      'network': 'Sin internet: el reconocimiento de voz de Chrome la necesita.',
                      'language-not-supported': 'El idioma no está disponible en este navegador.' }[tipo];
          if (msg) avisar('⚠ ' + msg);
        },
        alNivel: function (n) { el.orbe.style.setProperty('--nivel', n.toFixed(2)); pushOnda(n); },
        alInterino: function (d) {
          E.avisoFijo = false;
          el.oido.textContent = 'Te escuché: «' + d.texto + '»';
          el.oido.hidden = false;
        }
      });
      verificar(gen);
      span.classList.remove('escuchando');
      el.orbe.style.setProperty('--nivel', 0);

      if (r.ok) {
        if (r.motivo === 'acierto') E.verificadas++;
        await exito(h, gen);
        break;
      }
      if (consumirSaltar() || r.motivo === 'saltar') { resultado = 'practicar'; break; }

      if (r.motivo === 'cancelado') continue;        // pausa o modelo: se vuelve a escuchar sin contar

      if (r.motivo === 'error-permiso' || r.motivo === 'error-mic') {
        cambiarModo('manual', 'No pudimos usar el micrófono. Cuando leas, toca «Ya lo leí».');
        continue;
      }
      if (r.motivo === 'error-red' || r.motivo === 'error') {
        cambiarModo(Escucha.hayMicrofono ? 'basico' : 'manual',
          'Sin conexión no se pueden comprobar las palabras: ahora solo notaré cuando hables.');
        continue;
      }

      if (r.motivo === 'silencio') {
        // nadie leyó: se avisa por escrito y se vuelve a escuchar
        avisar('🎤 No te escuché. Acércate al micrófono y léelo en voz alta, o toca «Ya lo leí».');
        estadoTurno('espera');
        await esperarSalvoMando(600, gen);
        continue;
      }

      // 'incorrecto': lo que se oyó no es EXACTAMENTE lo que debía leer -> rojo con ✘, y otra vez
      E.avisoFijo = false;
      estadoTurno('fallo');
      span.classList.remove('tiembla'); void span.offsetWidth;
      span.classList.add('mal', 'tiembla');
      if (h.silabas) { el.silabas.textContent = h.silabas; el.silabas.hidden = false; }
      await esperarSalvoMando(1500, gen);
    }

    // ---- cierre del turno ----
    span.classList.remove('pendiente', 'escuchando', 'mal', 'tiembla');
    h._punto.classList.remove('actual');
    if (resultado === 'practicar') {
      span.classList.add('practicar');
      h._punto.classList.add('practicar');
      E.practicar.push(h);
    }
    el.turno.hidden = true;
    E.turno = null;
    el.btnRepetir.disabled = false;
    await esperar(300, gen);
  }

  // Bien leída: verde con ✔, un momento para verlo, y sigue. Sin voz ni sonido.
  async function exito(h, gen) {
    h._el.classList.remove('pendiente', 'mal', 'tiembla');
    h._el.classList.add('ok');
    h._palabras.forEach(function (s) { s.classList.add('leida'); });
    h._punto.classList.add('ok');
    E.leidas++;
    estadoTurno('acierto');
    escCelebrar();
    if (h.nota) mostrarNota(h.nota);
    await esperar(1000, gen);
  }

  function consumirManual() {
    if (!E.manualPedido) return false;
    E.manualPedido = false;
    return true;
  }

  function consumirSaltar() {
    if (!E.saltarPedido) return false;
    E.saltarPedido = false;
    return true;
  }

  function cambiarModo(modo, aviso) {
    E.modo = modo;
    pintarModo();
    if (aviso) avisar(aviso);
  }

  function pintarModo() {
    el.modo.textContent = E.modo === 'reconocimiento' ? '🎙️ Comprobaré lo que lees'
      : E.modo === 'basico' ? '🎙️ Notaré cuando hables (no comprueba las palabras)'
      : '✋ Sin micrófono: confirmas tú con un botón';
  }

  /* ---------------------------------------------------------
     El cuento
     --------------------------------------------------------- */
  async function leerTrozo(z, gen) {
    var r;
    do {
      E.repetirPedido = false;
      z._palabras.forEach(function (s) { s.classList.remove('dicha', 'diciendo'); });
      var c = z.audio ? z : clipSinAudio(z);
      r = await reproducir(c, function (t) { resaltar(z._palabras, c.tiempos || [], t); });
      verificar(gen);
    } while (r === 'repetir');
    marcarTodasDichas(z._palabras);
  }

  function aplicarEfecto(efecto) {
    if (esc && esc.efecto && efecto) esc.efecto(efecto);
  }

  async function contar(gen) {
    // bienvenida
    dibujarPagina(0);
    escIr(H.paginas[0].escena, { instantaneo: true });
    await esperar(400, gen);
    await decir('bienvenida', gen);
    await esperar(300, gen);

    for (var pi = 0; pi < H.paginas.length; pi++) {
      var pag = H.paginas[pi];
      if (pi > 0) {
        await esperar((A.pausaEntrePaginas || 0.9) * 1000, gen);
        dibujarPagina(pi);
        escIr(pag.escena);
        await esperar(1200, gen);                 // se ve llegar al nuevo lugar antes de leer
        ocultarNota();
      }
      for (var k = 0; k < pag.partes.length; k++) {
        var parte = pag.partes[k];
        if (parte.efecto) aplicarEfecto(parte.efecto);
        for (var j = 0; j < parte.trozos.length; j++) {
          var z = parte.trozos[j];
          await punto(gen);
          if (z.tipo === 'texto') {
            if (z._palabras.length) await leerTrozo(z, gen);       // (solo puntuación: no hay nada que leer)
          } else {
            await esperar(180, gen);
            await turnoDelEstudiante(z, gen);
          }
        }
        await esperar((A.pausaEntreFrases || 0.38) * 1000, gen);
      }
    }

    await esperar(500, gen);
    await decir('fin', gen);
    mostrarFinal();
  }

  /* ---------------------------------------------------------
     Empezar, pausar, reiniciar
     --------------------------------------------------------- */
  function preparar() {
    E.huecos = [];
    H.paginas.forEach(function (p) {
      p.partes.forEach(function (pa) { pa.trozos.forEach(function (z) { if (z.tipo === 'hueco') E.huecos.push(z); }); });
    });
    E.leidas = 0; E.verificadas = 0; E.practicar = [];
    dibujarAvance();
    // los audios se bajan de una vez: son pocos y así no hay esperas
    var todos = [];
    H.paginas.forEach(function (p) { p.partes.forEach(function (pa) { pa.trozos.forEach(function (z) {
      if (z.tipo === 'texto') todos.push(z); else todos.push(z.modelo);
    }); }); });
    Object.keys(H.mensajes).forEach(function (k) { H.mensajes[k].forEach(function (m) { todos.push(m); }); });
    todos.forEach(function (c) { if (c && c.audio) audioDe(c); });
  }

  function iniciarHistoria() {
    E.gen++;
    var gen = E.gen;
    E.pausado = false; E.saltarPedido = false; E.manualPedido = false; E.turno = null; E.modeloEnCurso = null;
    el.btnPausa.textContent = '⏸ Pausa';
    el.turno.hidden = true; el.final.hidden = true; el.nota.hidden = true; el.leyenda.hidden = true;
    el.app.setAttribute('data-estado', 'leyendo');
    preparar();
    pintarModo();
    contar(gen).catch(function (e) { if (e !== CANCELADO) { console.error(e); } });
  }

  function detenerTodo() {
    E.gen++;                                   // todo lo pendiente se cancela solo
    if (E.clip) E.clip.terminar('cortado');
    Escucha.cancelar();
    E.esperando.splice(0).forEach(function (r) { r(); });
  }

  function pausar() {
    E.pausado = true;
    el.btnPausa.textContent = '▶ Seguir';
    if (E.clip) E.clip.pausar();
    if (E.turno) Escucha.cancelar();           // se vuelve a abrir el micrófono al seguir
  }
  function reanudar() {
    E.pausado = false;
    el.btnPausa.textContent = '⏸ Pausa';
    if (E.clip) E.clip.reanudar();
    E.esperando.splice(0).forEach(function (r) { r(); });
  }

  el.btnPausa.addEventListener('click', function () { E.pausado ? reanudar() : pausar(); });

  el.btnRepetir.addEventListener('click', function () {
    if (E.turno) return;
    if (E.pausado) reanudar();
    if (E.clip) E.clip.terminar('repetir');
  });

  el.btnLento.addEventListener('click', function () {
    E.lento = !E.lento;
    el.btnLento.setAttribute('aria-pressed', String(E.lento));
    el.btnLento.classList.toggle('principal', E.lento);
    if (E.clip && E.clip.ajustarRitmo) E.clip.ajustarRitmo();
  });

  el.btnSaltar.addEventListener('click', function () {
    if (!E.turno) return;
    E.saltarPedido = true;
    if (E.clip) E.clip.terminar('cortado');
    Escucha.saltar();
  });

  el.orbe.addEventListener('click', function () { if (E.turno && Escucha.enCurso()) Escucha.cancelar(); });   // tocar el micrófono: volver a escuchar
  el.btnManual.addEventListener('click', function () {
    if (!E.turno) return;
    if (Escucha.enCurso()) Escucha.confirmarManual();
    else E.manualPedido = true;                  // justo entre dos intentos: se aplica enseguida
  });

  el.btnModelo.addEventListener('click', function () {
    if (!E.turno || !E.turno.h.modelo || E.modeloEnCurso) return;
    Escucha.cancelar();
    E.modeloEnCurso = reproducir(E.turno.h.modelo).then(function () { E.modeloEnCurso = null; });
  });

  /* ---------------------------------------------------------
     El final
     --------------------------------------------------------- */
  function mostrarFinal() {
    var total = E.huecos.length, n = E.leidas;
    var estrellas = n / total >= 0.85 ? 3 : n / total >= 0.55 ? 2 : 1;
    el.estrellas.innerHTML = [1, 2, 3].map(function (i) {
      return '<span class="' + (i <= estrellas ? '' : 'apagada') + '">⭐</span>';
    }).join('');

    var texto = 'Leíste ' + n + ' de ' + total + ' palabras y frases en voz alta.';
    if (E.modo !== 'reconocimiento') {
      texto += ' En este dispositivo no se pudieron comprobar las palabras, así que contamos tu lectura por confianza.';
    }
    el.resumen.textContent = texto;

    el.practicarLista.innerHTML = '';
    el.practicar.hidden = E.practicar.length === 0;
    E.practicar.forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'boton claro';
      b.textContent = '🔊 ' + h.texto;
      b.addEventListener('click', function () { if (h.modelo) reproducir(h.modelo); });
      el.practicarLista.appendChild(b);
    });

    el.reflexion.hidden = !H.reflexion;
    if (H.reflexion) {
      el.reflexion.textContent = '';
      var neg = document.createElement('b');
      neg.textContent = 'Piensa y reflexiona: ';
      el.reflexion.appendChild(neg);
      el.reflexion.appendChild(document.createTextNode(H.reflexion));
    }
    el.final.hidden = false;
    escCelebrar();
    sonido('ok');
  }

  el.btnOtraVez.addEventListener('click', function () {
    detenerTodo();
    escIr(H.paginas[0].escena, { instantaneo: true });
    iniciarHistoria();
  });

  /* ---------------------------------------------------------
     La portada: se pide el micrófono y empieza el cuento
     --------------------------------------------------------- */
  async function empezar() {
    ctxAudio();                                 // el clic desbloquea el sonido del navegador
    if (E.avisado) { ocultarPortada(); iniciarHistoria(); return; }

    el.btnEmpezar.disabled = true;
    var modo, aviso = '';

    if (!Escucha.hayMicrofono) {
      modo = 'manual';
      aviso = window.isSecureContext === false
        ? 'El navegador no deja usar el micrófono en esta dirección (hace falta https o localhost). Confirmarás tu lectura con un botón.'
        : 'Este dispositivo no tiene micrófono disponible. Confirmarás tu lectura con un botón.';
    } else if (forzarBasico || !Escucha.puedeReconocer) {
      modo = 'basico';
      if (!forzarBasico) aviso = 'Este navegador no puede comprobar las palabras: solo notará cuando hables. Para que las compruebe, usa Chrome o Edge.';
    } else {
      modo = 'reconocimiento';
    }

    if (modo !== 'manual') {
      var permitido = await Escucha.pedirPermiso();
      if (!permitido) {
        modo = 'manual';
        aviso = 'No pudimos usar el micrófono (¿le diste permiso?). Confirmarás tu lectura con un botón.';
      }
    }

    E.modo = modo;
    el.btnEmpezar.disabled = false;
    if (aviso) {
      el.avisoPortada.textContent = aviso;
      el.avisoPortada.hidden = false;
      el.btnEmpezar.textContent = 'Entendido, empezar ▸';
      E.avisado = true;
      return;
    }
    ocultarPortada();
    iniciarHistoria();
  }

  function ocultarPortada() { el.portada.hidden = true; }

  el.btnEmpezar.addEventListener('click', empezar);

  el.btnSinReconocimiento.addEventListener('click', function () {
    forzarBasico = true;
    el.privacidad.hidden = true;
    el.avisoPortada.textContent = 'Listo: no se usará el reconocimiento de voz. Solo se notará cuando hables.';
    el.avisoPortada.hidden = false;
  });

  /* ---------------------------------------------------------
     Arranque
     --------------------------------------------------------- */
  document.title = H.titulo + ' · Leemos juntos';
  el.unidad.textContent = H.unidad;
  el.titulo.textContent = H.titulo;
  el.portadaUnidad.textContent = H.unidad;
  el.portadaTitulo.textContent = H.titulo;
  el.privacidad.hidden = !(Escucha.puedeReconocer && !forzarBasico);

  if (esc) esc.montar(el.lienzo);
  else el.app.classList.add('sin-escenario');
  escIr(H.paginas[0].escena, { instantaneo: true });
  dibujarPagina(0);
  preparar();
  }   // fin de crear()

  /* ---------------------------------------------------------
     montar(contenedor, { lectura, base })
     --------------------------------------------------------- */
  function escapar(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function fallar(raizEl, mensaje) {
    raizEl.innerHTML = '<div class="lj-error"><b>No se pudo abrir la lectura.</b><br>' + escapar(mensaje) + '</div>';
    if (raiz.console) console.error('[Lector] ' + mensaje);
    return Promise.resolve(null);          // el aviso ya está en pantalla; montar() devuelve null
  }

  function montar(contenedor, opciones) {
    opciones = opciones || {};
    var raizEl = typeof contenedor === 'string' ? document.querySelector(contenedor) : contenedor;
    if (!raizEl) { if (raiz.console) console.error('[Lector] no encuentro el contenedor ' + contenedor); return Promise.resolve(null); }
    if (!raiz.Lecturas) return fallar(raizEl, 'Falta cargar motor/lecturas.js antes que lector.js.');

    // la dirección (?lectura=...) manda sobre lo que diga la página: sirve para probar otra lectura
    var id = opciones.lectura || new URLSearchParams(location.search).get('lectura') || raizEl.getAttribute('data-lectura');
    var base = opciones.base || raizEl.getAttribute('data-base') || 'lecturas/';
    raizEl.classList.add('lj');
    if (!id) return fallar(raizEl, 'Falta decir qué lectura mostrar: data-lectura="..." en el contenedor, o { lectura: "..." } en Lector.montar.');

    raizEl.innerHTML = '<p class="lj-estado">Cargando la lectura…</p>';
    return raiz.Lecturas.cargar(id, base).then(
      function (H) { crear(raizEl, H, opciones); return H; },
      function (e) { return fallar(raizEl, e.message); }
    );
  }

  raiz.Lector = { montar: montar };
})(window);
