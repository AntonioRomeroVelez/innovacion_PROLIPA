/* =============================================================
   LECTURA: Mía y el libro que volaba
   Entrada de la Unidad 1 · Cuentos de todas partes (Lengua, 6.º)
   -------------------------------------------------------------
   Este archivo es SOLO EL TEXTO. Se edita a mano. Después de cambiarlo:
       python herramientas/generar.py mia-y-el-libro
   (genera la narración en audio/ y escribe audio.js)

   Cómo se escribe:
     · Las palabras o frases que lee el ESTUDIANTE van entre {{ llaves dobles }}.
     · Cada una tiene su ficha en `huecos` (sílabas, alternativas, nota).
     · «voz» dice quién habla: narradora (viene de _comun) o una de `voces`.
   ============================================================= */
Lecturas.texto('mia-y-el-libro', {

  titulo: 'Mía y el libro que volaba',
  unidad: 'Unidad 1 · Cuentos de todas partes',
  escenario: 'mia',             // el dibujo que acompaña (ver motor/escena.js)

  // Lo que se muestra al terminar, para conversar en clase (opcional)
  reflexion: '¿Qué costumbre de tu comunidad te gustaría compartir? Cuéntaselo a tu clase.',

  // Los personajes que hablan además de la narradora. Salen del catálogo de voces
  // (lecturas/_comun/voces.js); lo que se escribe aquí manda sobre el catálogo.
  voces: {
    libro:   { catalogo: 'sabio', etiqueta: '📖 El libro' },
    abuela:  'abuela',
    anciano: { catalogo: 'abuelo', etiqueta: '👴 El anciano' },
    nina:    'nina'
  },

  // La ficha de cada palabra o frase que lee el estudiante.
  huecos: {
    'extraordinario': {
      silabas: 'ex-tra-or-di-na-rio',                 // pista después de un error
      nota: 'Se escribe con x: ex + tra. Es una de las palabras con x que verás en la unidad.'
    },
    'paracaídas de siete colores': {
      silabas: 'pa-ra-cai-das de sie-te co-lo-res'
    },
    'cuentos de todas partes': {
      silabas: 'cuen-tos de to-das par-tes'
    },
    'Alli puncha, wawa': {
      silabas: 'A-lli pun-cha, wa-wa',
      // el reconocedor oye el kichwa como si fuera español
      alternativas: ['ali puncha guagua', 'ali puncha wawa', 'ali punta guagua', 'ayi puncha wawa', 'alli pucha wawa'],
      nota: 'Es un saludo en kichwa. Las lenguas de nuestro país también son parte de los cuentos de todas partes.'
    },
    'murmullo': {
      silabas: 'mur-mu-llo',
      alternativas: ['murmuyo']
    },
    'lejos': {
      silabas: 'le-jos',
      nota: 'Se escribe con j: la «je» de «lejos» suena igual que la «ge» de «gente».'
    },
    'gigantes': {
      silabas: 'gi-gan-tes',
      nota: 'Se escribe con g: «gi» suena como «ji», pero lleva g.'
    },
    'con el alma lo agradece': {
      silabas: 'con el al-ma lo a-gra-de-ce'
    },
    'colección de historias': {
      silabas: 'co-lec-ción de his-to-rias',
      nota: 'Se escribe con cc porque viene de «colector», que tiene ct.'
    },
    'mensaje que viaja de voz en voz': {
      silabas: 'men-sa-je que via-ja de voz en voz',
      nota: 'Las palabras terminadas en -aje se escriben con j: mensaje, viaje, paisaje.'
    },
    'respeto': {
      silabas: 'res-pe-to'
    },
    '¿Qué cuento llevas dentro?': {
      silabas: '¿Qué cuen-to lle-vas den-tro?'
    }
  },

  // El cuento. Cada página es una escena; cada parte, una voz que habla.
  // `efecto` hace algo en el dibujo cuando empieza esa parte.
  paginas: [
    {
      escena: 'biblioteca', lugar: 'La biblioteca',
      partes: [
        { voz: 'narradora', texto: 'A Mía le encantaban los cuentos. Pero esa tarde, en la biblioteca, ocurrió algo {{extraordinario}}: el libro más grande del estante se abrió solo, y fue el cuento quien la eligió a ella.' },
        { voz: 'narradora', efecto: 'abrir', texto: 'Sus páginas se estiraron como alas, y sobre la cabeza de Mía se abrió un {{paracaídas de siete colores}}.' }
      ]
    },
    {
      escena: 'cielo', lugar: 'En el cielo',
      partes: [
        { voz: 'narradora', texto: 'El libro susurró con voz de viento:' },
        { voz: 'libro',     texto: '¡Agárrate fuerte! Vamos a recorrer los {{cuentos de todas partes}}.' },
        { voz: 'narradora', texto: 'Y, entre las nubes, Mía y el libro echaron a volar.' }
      ]
    },
    {
      escena: 'sierra', lugar: 'La sierra',
      partes: [
        { voz: 'narradora', texto: 'La primera parada fue en la sierra, entre montañas tan altas que parecían rozar el cielo. Allí, una abuela tejía un chal de mil colores. Al ver llegar a Mía, la saludó en kichwa: {{Alli puncha, wawa}}, que quiere decir: buenos días, pequeña.' },
        { voz: 'abuela',    texto: 'Cada hilo guarda un cuento. Escúchalo con atención y se quedará contigo para siempre.' }
      ]
    },
    {
      escena: 'selva', lugar: 'La Amazonía',
      partes: [
        { voz: 'narradora', texto: 'Después descendieron sobre la Amazonía, donde la lluvia canta sobre las hojas. Un anciano llevó a Mía hasta la orilla del río y le pidió que cerrara los ojos.' },
        { voz: 'anciano',   texto: 'El río también cuenta historias. Solo tienes que aprender a escuchar su {{murmullo}}.' },
        { voz: 'narradora', texto: 'Mía escuchó con calma y, entre el agua y las hojas, le pareció oír mil voces que venían de muy {{lejos}}.' }
      ]
    },
    {
      escena: 'costa', lugar: 'La costa',
      partes: [
        { voz: 'narradora', texto: 'Más tarde llegaron a la costa, donde el mar levantaba olas {{gigantes}}. Una niña pescadora, con los pies mojados y la risa fresca, recitó una copla:' },
        { voz: 'nina',      texto: 'En la playa de mi pueblo\ncanta el mar cuando amanece;\nquien escucha su cuento\n{{con el alma lo agradece}}.' }
      ]
    },
    {
      escena: 'atardecer', lugar: 'De regreso',
      partes: [
        { voz: 'narradora', texto: 'Mía comprendió algo: ninguna forma de contar era mejor que otra. Cada lugar guardaba una {{colección de historias}} distinta, y todas valían lo mismo.' },
        { voz: 'narradora', efecto: 'aterrizar', texto: 'Entonces el paracaídas descendió despacito, y el libro se posó sobre la mesa de la biblioteca.' }
      ]
    },
    {
      escena: 'noche', lugar: 'La biblioteca',
      partes: [
        { voz: 'libro',     texto: 'Un cuento es un {{mensaje que viaja de voz en voz}}.' },
        { voz: 'narradora', texto: 'Mía sonrió. Había aprendido que escuchar con {{respeto}} a quienes son diferentes a nosotros nos enseña cosas nuevas.' },
        { voz: 'narradora', texto: 'Y ahora el libro te mira a ti y te pregunta:' },
        { voz: 'libro',     texto: '{{¿Qué cuento llevas dentro?}}' }
      ]
    }
  ]
});
