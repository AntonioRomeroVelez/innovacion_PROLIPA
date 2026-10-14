/* =============================================================
   ESCUCHA.JS — el micrófono: oír al estudiante y comprobar su lectura
   -------------------------------------------------------------
   Tres maneras de comprobar, de la mejor a la más básica:

   1. RECONOCIMIENTO  El navegador transcribe lo que dice el estudiante y se
                      compara con la palabra o frase que debía leer: tiene que ser
                      EXACTAMENTE la misma (ver «Comparar», más abajo).
                      (Chrome, Edge y Android; necesita internet.)
   2. BÁSICO          Si no hay reconocimiento, se detecta solo que habló
                      (volumen del micrófono). No se puede saber QUÉ dijo.
   3. MANUAL          Si no hay micrófono, un botón "ya lo leí".

   La actividad le dice al estudiante en cuál modo está: nunca finge
   comprobar lo que no comprueba.

   Privacidad: con RECONOCIMIENTO, Chrome envía el audio al servicio de
   reconocimiento de voz de Google. Esta actividad no graba ni guarda nada.
   Se puede evitar entrando con  ?basico=1  o con  AJUSTES.reconocimiento=false.
   ============================================================= */
(function (raiz) {
  'use strict';

  /* ---------------------------------------------------------
     1. Comparar lo que se oyó con lo que se debía leer

     La lectura tiene que ser EXACTAMENTE la misma: las mismas palabras, con las
     mismas letras. No cuentan las mayúsculas, los signos de puntuación ni las
     tildes (el reconocedor no puede «oírlas»), ni cómo parta o una las palabras
     («para caídas» = «paracaídas»). Pero una letra distinta ya es otra palabra:
     «ladrillo» no vale por «ladrillos», ni «ano» por «año».
     --------------------------------------------------------- */
  var UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete',
    'veintiocho', 'veintinueve'];
  var DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  var CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
    'setecientos', 'ochocientos', 'novecientos'];

  // El reconocedor escribe «7» cuando oye «siete»: se pasan los números a palabras
  // (en el objetivo y en lo oído) para que se comparen igual.
  function enPalabras(n) {
    if (n < 30) return UNIDADES[n];
    if (n < 100) return DECENAS[Math.floor(n / 10)] + (n % 10 ? ' y ' + UNIDADES[n % 10] : '');
    if (n === 100) return 'cien';
    if (n < 1000) return CENTENAS[Math.floor(n / 100)] + (n % 100 ? ' ' + enPalabras(n % 100) : '');
    if (n < 1000000) {
      var miles = Math.floor(n / 1000);
      return (miles === 1 ? 'mil' : enPalabras(miles) + ' mil') + (n % 1000 ? ' ' + enPalabras(n % 1000) : '');
    }
    return String(n);
  }

  function normalizar(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ñ/g, '\u0001')                                  // la ñ es otra letra: se guarda aparte
      .normalize('NFD').replace(/[̀-ͯ]/g, '')         // sin tildes ni diéresis
      .replace(/\u0001/g, 'ñ')
      .replace(/\d+/g, function (n) { return ' ' + enPalabras(parseInt(n, 10)) + ' '; })
      .replace(/[^a-zñ0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Lo que se compara: las letras, sin espacios (el reconocedor a veces parte o une palabras)
  function clave(s) { return normalizar(s).replace(/ /g, ''); }

  function distancia(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        var costo = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + costo);
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }

  function similitud(a, b) {
    var m = Math.max(a.length, b.length);
    return m ? 1 - distancia(a, b) / m : 1;
  }

  /**
   * evaluar(objetivo, oidos[], alternativas[])
   *  oidos         lo que oyó el reconocedor
   *  alternativas  otras formas de escribir el objetivo que también se aceptan (p. ej. un
   *                saludo en kichwa, que el reconocedor oye como español)
   * Devuelve { ok, puntaje, oido }:  ok solo si lo oído es EXACTAMENTE el objetivo (o una
   * de sus alternativas); puntaje es el parecido (1 si es exacto) y sirve solo para informar.
   */
  function evaluar(objetivo, oidos, alternativas) {
    var claves = [objetivo].concat(alternativas || []).map(clave).filter(Boolean);
    var mejor = { ok: false, puntaje: 0, oido: '' };
    (oidos || []).forEach(function (oido) {
      var c = clave(oido);
      if (!c) return;
      claves.forEach(function (t) {
        var igual = c === t, p = igual ? 1 : similitud(c, t);
        if ((igual && !mejor.ok) || (igual === mejor.ok && p > mejor.puntaje)) mejor = { ok: igual, puntaje: p, oido: oido };
      });
    });
    return mejor;
  }

  /* ---------------------------------------------------------
     2. El micrófono
     --------------------------------------------------------- */
  var SR = raiz.SpeechRecognition || raiz.webkitSpeechRecognition;
  var hayMedia = !!(raiz.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  var actual = null;      // la escucha en curso, para poder cortarla

  function terminarActual(res) {
    if (actual) actual.finalizar(res);
  }

  /* ----- 2a. Con reconocimiento de voz ----- */
  function escucharConReconocimiento(objetivo, op) {
    return new Promise(function (resolve) {
      var rec = new SR();
      var pulso = null;
      // El reconocedor no da el volumen (y abrir el micrófono por segunda vez lo deja sordo
      // en Android), así que la barra se mueve mientras detecta sonido.
      function pararPulso() { clearInterval(pulso); pulso = null; if (op.alNivel) op.alNivel(0); }
      function iniciarPulso() {
        if (pulso || !op.alNivel) return;
        pulso = setInterval(function () { op.alNivel(0.25 + Math.random() * 0.6); }, 60);
      }
      rec.lang = op.idioma || 'es-EC';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      var terminado = false, oidoFinal = '', mejor = null, errorTipo = '', timer = null;

      function cerrar(res) {
        if (terminado) return;
        terminado = true;
        clearTimeout(timer);
        actual = null;
        clearInterval(pulso);
        try { rec.abort(); } catch (e) {}
        resolve(res);
      }
      actual = { finalizar: cerrar };

      rec.onstart = function () { if (op.alEscuchando) op.alEscuchando(); if (op.alNivel) op.alNivel(0); };
      rec.onsoundstart = iniciarPulso;
      rec.onsoundend = pararPulso;
      rec.onspeechstart = function () { if (op.alVoz) op.alVoz(); };

      rec.onresult = function (e) {
        // lo oído hasta ahora: la mejor hipótesis de cada resultado, una a continuación de la otra
        var texto = '', esFinal = e.results.length > 0;
        for (var i = 0; i < e.results.length; i++) {
          texto += (i ? ' ' : '') + e.results[i][0].transcript;
          if (!e.results[i].isFinal) esFinal = false;
        }
        texto = texto.trim();
        if (!texto) return;
        oidoFinal = texto;
        mejor = evaluar(objetivo, [texto], op.alternativas);
        if (op.alInterino) op.alInterino({ texto: texto, puntaje: mejor.puntaje });
        // Solo se da por buena cuando el reconocedor ya terminó de oír (resultado final)
        if (esFinal && mejor.ok) cerrar({ ok: true, motivo: 'acierto', oido: texto, puntaje: 1 });
      };

      rec.onerror = function (e) {
        errorTipo = e.error || 'error';
        if (raiz.console) console.warn('[Escucha] error de reconocimiento:', errorTipo);
        if (op.alDiagnostico) op.alDiagnostico(errorTipo);
      };

      // Al terminar de escuchar: ¿lo último que se oyó es exactamente lo que debía leer?
      function veredicto() {
        if (mejor && mejor.ok) return { ok: true, motivo: 'acierto', oido: oidoFinal, puntaje: 1 };
        if (!oidoFinal) return { ok: false, motivo: 'silencio' };
        return { ok: false, motivo: 'incorrecto', oido: oidoFinal, puntaje: mejor ? mejor.puntaje : 0 };
      }

      rec.onend = function () {
        if (terminado) return;
        if (errorTipo === 'not-allowed' || errorTipo === 'service-not-allowed') return cerrar({ ok: false, motivo: 'error-permiso' });
        if (errorTipo === 'network') return cerrar({ ok: false, motivo: 'error-red' });
        if (errorTipo === 'audio-capture') return cerrar({ ok: false, motivo: 'error-mic' });
        cerrar(veredicto());
      };

      timer = setTimeout(function () {
        if (terminado) return;
        cerrar(veredicto());
      }, op.tiempo || 10000);

      try { rec.start(); } catch (e) { cerrar({ ok: false, motivo: 'error' }); }
    });
  }

  /* ----- 2b. Básico: solo detectar que habló ----- */
  function escucharBasico(op) {
    return new Promise(function (resolve) {
      var terminado = false, flujo = null, ctx = null, timer = null, intervalo = null;

      function cerrar(res) {
        if (terminado) return;
        terminado = true;
        clearTimeout(timer); clearInterval(intervalo);
        actual = null;
        try { if (flujo) flujo.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        try { if (ctx) ctx.close(); } catch (e) {}
        resolve(res);
      }
      actual = { finalizar: cerrar };

      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then(function (f) {
          if (terminado) { f.getTracks().forEach(function (t) { t.stop(); }); return; }
          flujo = f;
          var AC = raiz.AudioContext || raiz.webkitAudioContext;
          ctx = new AC();
          var fuente = ctx.createMediaStreamSource(f);
          var an = ctx.createAnalyser();
          an.fftSize = 1024;
          fuente.connect(an);
          var buf = new Uint8Array(an.fftSize);
          if (op.alEscuchando) op.alEscuchando();

          if (ctx.state === 'suspended') ctx.resume();    // algunos navegadores lo arrancan en pausa

          var inicio = Date.now(), vozMs = 0, silencioMs = 0, hablando = false, ventana = [];

          intervalo = setInterval(function () {
            an.getByteTimeDomainData(buf);
            var suma = 0;
            for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; suma += v * v; }
            var rms = Math.sqrt(suma / buf.length);
            if (op.alNivel) op.alNivel(Math.min(1, rms * 5));

            // Piso de ruido que se adapta: el valor más bajo de los últimos 2 s.
            // (Medirlo solo al principio fallaba si el niño ya estaba hablando:
            //  las pausas entre palabras lo bajan.)
            ventana.push(rms);
            if (ventana.length > 40) ventana.shift();
            if (Date.now() - inicio < 400) return;                      // primeras muestras: solo medir
            var piso = Math.min.apply(null, ventana);
            var umbral = Math.max(0.03, piso * 3 + 0.012);

            if (rms > umbral) {
              vozMs += 50; silencioMs = 0;
              if (!hablando) { hablando = true; if (op.alVoz) op.alVoz(); }
            } else if (hablando) {
              silencioMs += 50;
            }
            // habló lo suficiente y se calló un momento
            if (vozMs >= 600 && silencioMs >= 450) cerrar({ ok: true, motivo: 'voz', puntaje: 1 });
          }, 50);

          timer = setTimeout(function () {
            cerrar(vozMs >= 600 ? { ok: true, motivo: 'voz', puntaje: 1 } : { ok: false, motivo: 'silencio' });
          }, op.tiempo || 10000);
        })
        .catch(function () { cerrar({ ok: false, motivo: 'error-permiso' }); });
    });
  }

  /* ----- 2c. Manual: sin micrófono ----- */
  function esperarManual() {
    return new Promise(function (resolve) {
      actual = { finalizar: function (res) { actual = null; resolve(res); } };
    });
  }

  /* ---------------------------------------------------------
     3. API
     --------------------------------------------------------- */
  var Escucha = {
    puedeReconocer: !!SR,
    hayMicrofono: hayMedia,

    /** Pide permiso para usar el micrófono (y lo suelta enseguida). */
    pedirPermiso: function () {
      if (!hayMedia) return Promise.resolve(false);
      return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (f) { f.getTracks().forEach(function (t) { t.stop(); }); return true; })
        .catch(function () { return false; });
    },

    /**
     * escuchar(objetivo, { modo, alternativas, idioma, tiempo,
     *                      alEscuchando, alVoz, alInterino, alNivel })
     *  modo: 'reconocimiento' | 'basico' | 'manual'
     * -> Promise<{ ok, motivo, oido, puntaje }>
     *    motivo: acierto | voz | manual | incorrecto | silencio | saltar |
     *            cancelado | error-permiso | error-red | error-mic | error
     */
    escuchar: function (objetivo, op) {
      op = op || {};
      terminarActual({ ok: false, motivo: 'cancelado' });
      if (op.modo === 'reconocimiento' && SR) return escucharConReconocimiento(objetivo, op);
      if (op.modo === 'basico' && hayMedia) return escucharBasico(op);
      return esperarManual();
    },

    /** El estudiante pulsó "saltar". */
    saltar: function () { terminarActual({ ok: false, motivo: 'saltar' }); },
    /** El estudiante pulsó "ya lo leí" (modo manual). */
    confirmarManual: function () { terminarActual({ ok: true, motivo: 'manual', puntaje: 1 }); },
    cancelar: function () { terminarActual({ ok: false, motivo: 'cancelado' }); },
    enCurso: function () { return !!actual; },

    // expuestas para poder probarlas
    normalizar: normalizar,
    similitud: similitud,
    evaluar: evaluar
  };

  raiz.Escucha = Escucha;
  if (typeof module !== 'undefined' && module.exports) module.exports = Escucha;
})(typeof window !== 'undefined' ? window : globalThis);
