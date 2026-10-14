/* =============================================================
   LECTURAS.JS — el registro de lecturas
   -------------------------------------------------------------
   Cada lectura vive en su propia carpeta, separada del motor:

     lecturas/<id>/texto.js   EL TEXTO (lo escribe y edita una persona)
     lecturas/<id>/audio.js   la narración (lo genera herramientas/generar.py)
     lecturas/<id>/audio/     los .mp3

   Cualquier HTML puede usar cualquiera de ellas con el mismo motor:

     Lector.montar('#lector', { lectura: 'mia-y-el-libro', base: 'lecturas/' });

   Los archivos de una lectura se registran solos al cargarse:

     Lecturas.texto('<id>', { ...el texto... });
     Lecturas.audio('<id>', { clips: { ... } });

   Los mensajes de la narradora que se repiten en todas las lecturas («¡Muy
   bien!», «Ahora te toca a ti»…) viven una sola vez en lecturas/_comun/.
   Una lectura puede reemplazar cualquiera de ellos con su propio bloque
   `mensajes`.

   Las voces de los personajes también: el catálogo  lecturas/_comun/voces.js
   (Lecturas.voces) tiene una lista lista para usar. En `voces` de una lectura:
     lobo: 'lobo'                                      la del catálogo, tal cual
     cerdo: { catalogo: 'nino', etiqueta: '🐖 …' }    la del catálogo, con cambios
     otro: { voz: 'es-MX-JorgeNeural', rate: … }       una voz escrita a mano
   ============================================================= */
(function (raiz) {
  'use strict';

  var textos = {};      // id -> datos de texto.js
  var catalogo = null;  // nombre -> voz, de lecturas/_comun/voces.js
  var audios = {};      // id -> { clips, base }
  var COMUN = '_comun';

  // Dónde está el archivo que se está ejecutando: de ahí se resuelven los
  // audios, así una lectura funciona desde un HTML que esté en cualquier carpeta.
  function carpetaDelScript() {
    var s = raiz.document && raiz.document.currentScript;
    return s && s.src ? new URL('.', s.src).href : '';
  }

  /* ----- claves que unen cada fragmento de texto con su audio -----
     (herramientas/generar.py construye EXACTAMENTE las mismas) */
  var Claves = {
    texto:   function (voz, continuar, pedazo) { return 't|' + voz + '|' + (continuar ? 1 : 0) + '|' + pedazo; },
    modelo:  function (voz, objetivo)          { return 'm|' + voz + '|' + objetivo; },
    mensaje: function (categoria, frase)       { return 's|' + categoria + '|' + frase; }
  };

  var TIENE_LETRAS = /[\p{L}\p{N}]/u;

  function clip(id, clave) {
    var A = audios[id];
    var c = A && A.clips && A.clips[clave];
    if (!c) return null;
    return { audio: A.base + c.audio, ini: c.ini, fin: c.fin, tiempos: c.tiempos };
  }

  function mezclar(base, extra) {
    var r = {}, k;
    for (k in (base || {})) r[k] = base[k];
    for (k in (extra || {})) r[k] = extra[k];
    return r;
  }

  /* Convierte lo escrito en `voces` (nombres del catálogo o voces a mano) en
     voces completas. Lo que escribe la lectura manda sobre el catálogo.
     (herramientas/generar.py hace EXACTAMENTE lo mismo.) */
  function resolverVoces(voces, id) {
    var r = {};
    Object.keys(voces || {}).forEach(function (nombre) {
      var v = voces[nombre];
      if (typeof v === 'string') v = { catalogo: v };
      if (v && v.catalogo) {
        var base = catalogo && catalogo[v.catalogo];
        if (!base && raiz.console) {
          console.warn('[Lecturas] «' + id + '»: la voz «' + nombre + '» pide «' + v.catalogo +
            '», que no está en lecturas/_comun/voces.js');
        }
        v = mezclar(base, v);
        delete v.catalogo;
      }
      r[nombre] = v;
    });
    return r;
  }

  /* Une el texto con su audio en la estructura que usa el lector. */
  function compilar(id) {
    var T = textos[id], C = textos[COMUN] || {};
    var voces = resolverVoces(mezclar(C.voces, T.voces), id);
    var huecos = T.huecos || {};
    var faltantes = [];

    var L = {
      id: id,
      titulo: T.titulo || id,
      unidad: T.unidad || '',
      escenario: T.escenario || '',
      reflexion: T.reflexion || '',
      ajustes: mezclar(mezclar({ idioma: 'es-EC', reconocimiento: true, pausaEntreFrases: 0.38, pausaEntrePaginas: 0.9 }, C.ajustes), T.ajustes),
      voces: voces,
      mensajes: {},
      paginas: [],
      faltantes: faltantes
    };

    // mensajes: los de la lectura mandan; el resto viene de _comun
    var categorias = {}, k;
    for (k in (C.mensajes || {})) categorias[k] = COMUN;
    for (k in (T.mensajes || {})) categorias[k] = id;
    Object.keys(categorias).forEach(function (cat) {
      var fuente = categorias[cat];
      var lista = (textos[fuente].mensajes || {})[cat] || [];
      L.mensajes[cat] = lista.map(function (frase) {
        var c = clip(fuente, Claves.mensaje(cat, frase));
        if (!c) faltantes.push(frase);
        return mezclar({ texto: frase }, c);
      });
    });

    // páginas -> partes -> trozos (texto suelto / palabra que lee el estudiante)
    (T.paginas || []).forEach(function (pag) {
      var partes = (pag.partes || []).map(function (parte) {
        var pedazos = String(parte.texto).split(/(\{\{.+?\}\})/).filter(Boolean);
        var trozos = pedazos.map(function (pedazo, i) {
          if (pedazo.indexOf('{{') === 0) {
            var objetivo = pedazo.slice(2, -2), meta = huecos[objetivo] || {};
            var modelo = clip(id, Claves.modelo(parte.voz, objetivo));
            if (!modelo) faltantes.push(objetivo);
            return {
              tipo: 'hueco', texto: objetivo,
              silabas: meta.silabas || '', alternativas: meta.alternativas || [], nota: meta.nota || '',
              modelo: modelo
            };
          }
          var abierto = i + 1 < pedazos.length && pedazos[i + 1].indexOf('{{') === 0;
          var c = clip(id, Claves.texto(parte.voz, abierto, pedazo));
          if (!c && TIENE_LETRAS.test(pedazo)) faltantes.push(pedazo.trim());
          return mezclar({ tipo: 'texto', texto: pedazo }, c);
        });
        return { voz: parte.voz, efecto: parte.efecto || '', trozos: trozos };
      });
      L.paginas.push({ escena: pag.escena || '', lugar: pag.lugar || '', partes: partes });
    });

    if (faltantes.length && raiz.console) {
      console.warn('[Lecturas] «' + id + '»: ' + faltantes.length + ' fragmento(s) sin audio. ' +
        'Se leerán con la voz del navegador. Para generarlo: python herramientas/generar.py ' + id);
    }
    return L;
  }

  /* ----- cargar los archivos de una lectura si la página no los trae ya ----- */
  function cargarScript(url) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = ok;
      s.onerror = function () { mal(new Error('No se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }

  var Lecturas = {
    /** Lo llama texto.js. */
    texto: function (id, datos) { textos[id] = datos; },

    /** Lo llama voces.js (el catálogo de voces). */
    voces: function (datos) { catalogo = datos; },

    /** Lo llama audio.js. */
    audio: function (id, datos) {
      audios[id] = { clips: datos.clips || {}, base: carpetaDelScript() };
    },

    /**
     * cargar(id, base) -> Promise<lectura lista para el lector>
     * Si el HTML ya incluyó los .js con <script>, los usa; si no, los busca en
     * base + id + '/'.
     */
    cargar: function (id, base) {
      base = base || 'lecturas/';
      if (base.charAt(base.length - 1) !== '/') base += '/';
      var tareas = [];
      // el catálogo de voces; si no existe, las voces escritas a mano siguen funcionando
      if (!catalogo) tareas.push(cargarScript(base + COMUN + '/voces.js').catch(function () {}));
      [COMUN, id].forEach(function (k) {
        if (!textos[k]) tareas.push(cargarScript(base + k + '/texto.js'));
        // sin audio.js la lectura funciona igual, con la voz del navegador
        if (!audios[k]) tareas.push(cargarScript(base + k + '/audio.js').catch(function () {}));
      });
      return Promise.all(tareas).then(function () {
        if (!textos[id]) throw new Error('No encuentro la lectura «' + id + '» en ' + base + id + '/texto.js');
        return compilar(id);
      });
    },

    compilar: compilar,
    resolverVoces: resolverVoces,
    registradas: function () { return Object.keys(textos).filter(function (k) { return k !== COMUN; }); },
    claves: Claves
  };

  raiz.Lecturas = Lecturas;
  if (typeof module !== 'undefined' && module.exports) module.exports = Lecturas;
})(typeof window !== 'undefined' ? window : globalThis);
