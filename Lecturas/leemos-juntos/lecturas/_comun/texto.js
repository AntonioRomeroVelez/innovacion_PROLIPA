/* =============================================================
   LO COMÚN A TODAS LAS LECTURAS
   -------------------------------------------------------------
   · La voz de la narradora.
   · Los mensajes que dice en cualquier lectura (el saludo del principio y la
     despedida). Se graban una sola vez y se usan en todas.

   Una lectura puede cambiar cualquiera de estas cosas poniendo la suya en su
   propio texto.js (la suya manda). Después de cambiar algo aquí:
       python herramientas/generar.py
   ============================================================= */
Lecturas.texto('_comun', {

  ajustes: {
    idioma: 'es-EC',            // idioma del reconocimiento de voz
    reconocimiento: true,       // false = nunca usar el reconocimiento de voz del navegador
    pausaEntreFrases: 0.38,     // segundos
    pausaEntrePaginas: 0.9
  },

  // La voz de la narradora viene del catálogo (lecturas/_comun/voces.js).
  // Para cambiarla en TODAS las lecturas, cambia aquí 'narradora' por otra del catálogo.
  voces: {
    narradora: 'narradora'
  },

  // Solo el saludo del principio y la despedida. Mientras el estudiante lee NO hay voz que lo
  // guíe (ni «ahora te toca», ni felicitaciones, ni ayudas): la palabra se ilumina, y se pone
  // verde con ✔ si la lee bien o roja con ✘ si no. Ver motor/lector.js.
  mensajes: {
    bienvenida: [
      'Hola. Hoy vamos a leer juntos un cuento. Yo leo, y cuando una palabra se ilumine, te toca a ti.'
    ],
    fin: [
      'Y colorín colorado, este cuento se ha acabado.'
    ]
  }
});
