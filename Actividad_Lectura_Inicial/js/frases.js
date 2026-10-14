'use strict';
/* =====================================================================
   FRASES: todo lo que la app dice con voz (además del contenido de
   datos.js). Se comparte con tools/extraer-textos.js para generar las
   grabaciones, así que cualquier frase nueva debe vivir aquí.
   ===================================================================== */
const FRASES = {
  ELOGIOS: ['¡Muy bien!', '¡Excelente!', '¡Bravo!', '¡Genial!', '¡Lo lograste!', '¡Fantástico!', '¡Qué bien!', '¡Súper!'],
  ANIMOS: ['¡Casi! Inténtalo otra vez.', '¡Tú puedes! Prueba de nuevo.', 'Escucha otra vez y prueba.', '¡Sigue intentando!'],
  CONSEJOS: [
    '¡Toca el altavoz para escuchar otra vez!',
    '¡Escucha con mucha atención!',
    '¡Cada estrella te acerca a una medalla!',
    '¡Las vocales son A, E, I, O, U!',
    '¡Tú puedes aprender a leer!',
    '¡Vamos a jugar con las letras!'
  ],
  HOLA: '¡Hola! Soy Libi, el libro viajero. ¡Vamos a aprender a leer!',
  GUIAS: {
    inicio: '¡Elige un grado para empezar!',
    grado: '¡Toca un juego para empezar!',
    medallas: '¡Mira todas tus medallas!'
  },
  FIN: {
    titulos: ['¡Buen trabajo!', '¡Muy bien!', '¡Increíble!'],       // 1, 2, 3 estrellas
    estrellas: ['Ganaste una estrella', 'Ganaste dos estrellas', 'Ganaste tres estrellas'],
    medalla: '¡Ganaste una medalla nueva!',
    medallas: n => `¡Ganaste ${n} medallas nuevas!`,
    NUEVAS_MAX: 6
  },
  PALMAS_ERROR: 'Escucha con atención, y aplaude una vez por cada parte.',
  ORDENA_ERROR: 'Casi. Revisa el orden de las palabras.',
  MEDALLA_SI: nombre => `Medalla ${nombre}`,
  MEDALLA_NO: 'Todavía no la tienes',
  AJUSTES: {
    prueba: 'Hola, soy Libi. ¿Te gusta mi voz?',
    velocidad: 'Así hablo ahora. ¿Se entiende bien?'
  },

  /* Normaliza un texto para buscar su grabación (misma regla en la
     herramienta que genera el audio). */
  norm(t) { return String(t).replace(/[«»]/g, '').replace(/\s+/g, ' ').trim(); },

  /* Palabra suelta sin signos (para tocar una palabra). */
  palabra(t) { return String(t).replace(/[.,;:!?¡¿«»"“”()…]/g, '').trim(); },

  /* Parte una lectura en frases (se narra frase por frase). Devuelve
     [{ texto, idx:[índices de palabras] }]. */
  trocear(tokens) {
    const frases = [];
    let cur = [];
    tokens.forEach((tk, i) => {
      cur.push(i);
      if (/[.!?…;:]$/.test(tk)) { frases.push(cur); cur = []; }
    });
    if (cur.length) frases.push(cur);
    return frases.map(idx => ({ idx, texto: idx.map(i => tokens[i]).join(' ') }));
  }
};
