/* =============================================================
   LECTURA DE EJEMPLO: El viaje de una palabra
   -------------------------------------------------------------
   Una lectura corta, sin dibujo, para ver cómo se escribe una lectura nueva.
   Sirve de PLANTILLA: copia esta carpeta, cámbiale el nombre y el texto, y
   ejecuta
       python herramientas/generar.py <nombre-de-tu-carpeta>

   QUÉ SE PUEDE PONER
   ------------------
   titulo, unidad    lo que se muestra arriba y en la portada
   escenario         (opcional) un dibujo que acompaña; sin él la página
                     muestra solo el texto, como aquí
   voces             personajes además de la narradora (que viene de _comun).
                     Lo más fácil: elegir uno del catálogo de voces
                     (lecturas/_comun/voces.js; para oírlos: herramientas/muestras.py).
                       nino: 'nino'                          tal cual
                       palabra: { catalogo: 'hada', etiqueta: '…' }   con cambios
                     También se puede escribir a mano: voz/rate/pitch (cómo suena)
                     y etiqueta/color (cómo se ve).
   huecos            la ficha de cada palabra o frase que lee el estudiante:
                       silabas       pista después de un error
                       alternativas  otras formas de escribir LO MISMO que también se
                                     aceptan (útil con palabras de otras lenguas, que el
                                     reconocedor escribe como español). La lectura debe ser
                                     exacta: no se ponen aquí otras palabras ni plurales.
                       nota          «¿Sabías que…?» al leerla bien
   paginas           el texto. Cada parte lleva `voz` y `texto`; lo que va
                     entre {{ llaves dobles }} lo lee el estudiante.
   mensajes          (opcional) reemplaza los de _comun. Aquí cambiamos el final.

   LA VOZ Y LOS TIEMPOS NO SE ESCRIBEN A MANO: los genera generar.py.
   ============================================================= */
Lecturas.texto('el-viaje-de-una-palabra', {

  titulo: 'El viaje de una palabra',
  unidad: 'Unidad 1 · Cuentos de todas partes',

  voces: {
    nino:    'nino',
    palabra: { catalogo: 'hada', etiqueta: '💬 La palabra', color: '#e84393' }
  },

  huecos: {
    'equipaje': {
      silabas: 'e-qui-pa-je',
      nota: 'Las palabras terminadas en -aje se escriben con j: equipaje, viaje, mensaje.'
    },
    'viaje': {
      silabas: 'via-je',
      nota: 'También lleva j: viaje, equipaje, paisaje.'
    },
    'lejano': {
      silabas: 'le-ja-no',
      nota: 'Se escribe con j: lejano, lejos, lejanía.'
    },
    'amistad': {
      silabas: 'a-mis-tad'
    }
  },

  mensajes: {
    fin: ['Y así termina el viaje de una palabra pequeña.']
  },

  paginas: [
    {
      partes: [
        { voz: 'narradora', texto: 'Una palabra muy pequeña quiso conocer el mundo. Preparó su {{equipaje}} y emprendió un largo {{viaje}}.' },
        { voz: 'narradora', texto: 'Cruzó montañas, atravesó el mar y llegó a un país muy {{lejano}}, donde un niño la esperaba con una sonrisa.' },
        { voz: 'nino',      texto: '¡Bienvenida! ¿Cómo te llamas?' },
        { voz: 'palabra',   texto: 'Me llamo {{amistad}}. En mi lengua suena distinto, pero significa lo mismo que en la tuya.' },
        { voz: 'narradora', texto: 'Y desde ese día, las dos lenguas se hicieron amigas.' }
      ]
    }
  ]
});
