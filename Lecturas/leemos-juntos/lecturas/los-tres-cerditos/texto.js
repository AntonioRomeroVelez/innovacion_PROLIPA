/* =============================================================
   LECTURA: Los tres cerditos y el lobo feroz
   -------------------------------------------------------------
   Cuento tradicional. Cada personaje tiene su propia voz.
   Después de cambiar este texto:
       python herramientas/generar.py los-tres-cerditos
   Lo que lee el ESTUDIANTE va entre {{ llaves dobles }} y tiene su ficha en `huecos`.
   ============================================================= */
Lecturas.texto('los-tres-cerditos', {

  titulo: 'Los tres cerditos y el lobo feroz',
  unidad: 'Unidad 1 · Cuentos de todas partes',

  reflexion: '¿Por qué el tercer cerdito se salvó? ¿Qué te enseña este cuento sobre el esfuerzo?',

  // Una voz distinta para cada personaje (la narradora viene de _comun)
  voces: {
    mama:     { catalogo: 'mama',    etiqueta: 'Mamá',            color: '#e76f51' },
    primero:  { catalogo: 'nino',    etiqueta: 'Cerdito pequeño', color: '#e9c46a' },
    segundo:  { catalogo: 'amigo',   etiqueta: 'Cerdito mediano', color: '#2a9d8f' },
    tercero:  { catalogo: 'maestro', etiqueta: 'Cerdito mayor',   color: '#4361ee' },
    lobo:     { catalogo: 'lobo',    etiqueta: 'Lobo',            color: '#6c757d' }
  },

  huecos: {
    'ladrillos': {
      silabas: 'la-dri-llos'
    },
    'cerditos': {
      silabas: 'cer-di-tos',
      nota: 'Se escribe con c antes de e: cerdo, cerdito, cerca.'
    },
    '¡Soplaré y soplaré, y tu casa derribaré!': {
      silabas: '¡So-pla-ré y so-pla-ré, y tu ca-sa de-rri-ba-ré!',
      alternativas: ['soplaré y soplaré y tu casa derrivaré']       // b y v suenan igual
    },
    '¡Por los pelos de mi barbilla!': {
      silabas: '¡Por los pe-los de mi bar-bi-lla!'
    },
    'chimenea': {
      silabas: 'chi-me-ne-a',
      nota: 'Se escribe con ch: chimenea, chocolate, chicle.'
    },
    'trabajo': {
      silabas: 'tra-ba-jo',
      nota: 'Se escribe con j: trabajo, trabajar, trabajador.'
    },
    'esfuerzo': {
      silabas: 'es-fuer-zo',
      nota: 'Termina en -zo: esfuerzo, abrazo, regalo con z.'
    },
    'valiente': {
      silabas: 'va-lien-te'
    },
    'caldero': {
      silabas: 'cal-de-ro'
    },
    '¡Sí que se puede!': {
      silabas: '¡Sí que se pue-de!'
    }
  },

  mensajes: {
    fin: ['Y colorín colorado, este cuento se ha acabado.']
  },

  paginas: [
    {
      partes: [
        { voz: 'narradora', texto: 'Había una vez tres {{cerditos}} que vivían con su mamá en el campo. Ya eran grandes, y un día llegó la hora de hacer cada uno su propia casa.' },
        { voz: 'mama',      texto: 'Hijos míos, el mundo está lleno de peligros. Construyan casas fuertes y cuídense del lobo feroz.' },
        { voz: 'narradora', texto: 'Los tres cerditos se despidieron con un beso y salieron a buscar su camino.' }
      ]
    },
    {
      partes: [
        { voz: 'narradora', texto: 'El cerdito más pequeño se encontró con un campesino que llevaba un carro lleno de paja.' },
        { voz: 'primero',   texto: '¡Qué buena idea! Con esta paja haré mi casa en un santiamén, y después a jugar.' },
        { voz: 'narradora', texto: 'Y así, sin mucho esfuerzo, la casita de paja quedó lista antes del mediodía.' }
      ]
    },
    {
      partes: [
        { voz: 'narradora', texto: 'El cerdito del medio vio a un leñador con un montón de tablas.' },
        { voz: 'segundo',   texto: 'Con estas maderas haré una casa más firme. ¡Y también me sobrará tiempo para cantar!' },
        { voz: 'narradora', texto: 'Clavó unas cuantas tablas, y la casita de madera quedó lista antes del atardecer.' }
      ]
    },
    {
      partes: [
        { voz: 'narradora', texto: 'El tercer cerdito, el mayor, se encontró con un albañil que transportaba {{ladrillos}}.' },
        { voz: 'tercero',   texto: 'Una casa de ladrillos es la más segura. Me costará mucho {{trabajo}}, pero valdrá la pena.' },
        { voz: 'narradora', texto: 'Mientras sus hermanos jugaban, él levantó pared tras pared, ladrillo sobre ladrillo, hasta el anochecer.' }
      ]
    },
    {
      partes: [
        { voz: 'narradora', texto: 'Un día, el lobo feroz, con la barriga vacía, llegó a la casita de paja y llamó a la puerta.' },
        { voz: 'lobo',      texto: 'Cerdito, cerdito, déjame entrar.' },
        { voz: 'primero',   texto: '{{¡Por los pelos de mi barbilla!}} ¡No te dejaré entrar!' },
        { voz: 'lobo',      texto: '{{¡Soplaré y soplaré, y tu casa derribaré!}}' },
        { voz: 'narradora', texto: 'El lobo sopló con todas sus fuerzas, y la casita de paja salió volando. El cerdito corrió hasta la casa de su hermano.' }
      ]
    },
    {
      partes: [
        { voz: 'narradora', texto: 'Poco después, el lobo llegó a la casita de madera. Los dos hermanos temblaban de miedo.' },
        { voz: 'lobo',      texto: 'Cerditos, cerditos, déjenme entrar.' },
        { voz: 'segundo',   texto: '¡Nunca, nunca, nunca! ¡Vete de aquí, lobo malo!' },
        { voz: 'lobo',      texto: '¡Soplaré y soplaré, y su casa derribaré!' },
        { voz: 'narradora', texto: 'Sopló y sopló, y las tablas se desarmaron una por una. Los dos cerditos salieron corriendo hacia la casa de ladrillos.' }
      ]
    },
    {
      partes: [
        { voz: 'tercero',   texto: 'Pasen, hermanos, rápido. Aquí estaremos a salvo.' },
        { voz: 'narradora', texto: 'El lobo, furioso, llegó a la tercera casa y llamó con un golpe fuerte.' },
        { voz: 'lobo',      texto: 'Cerditos, cerditos, déjenme entrar o...' },
        { voz: 'tercero',   texto: '¡No entrarás! Esta casa es firme, porque la hice con {{esfuerzo}}.' },
        { voz: 'lobo',      texto: '¡Soplaré y soplaré, y su casa derribaré!' },
        { voz: 'narradora', texto: 'El lobo sopló hasta quedarse sin aire, pero la casa de ladrillos ni se movió.' }
      ]
    },
    {
      partes: [
        { voz: 'narradora', texto: 'Entonces el lobo, con muy malas ideas, trepó al tejado para entrar por la {{chimenea}}.' },
        { voz: 'tercero',   texto: 'Hermanos, pongan agua a hervir en el {{caldero}}. Ya sé cómo ayudarlo a bajar.' },
        { voz: 'narradora', texto: 'Cuando el lobo se deslizó por el hueco, cayó en el agua caliente.' },
        { voz: 'lobo',      texto: '¡Auuu! ¡Qué calor! ¡Nunca más volveré por aquí!' },
        { voz: 'narradora', texto: 'Y salió corriendo por el campo, dando saltos y aullidos, hasta perderse en el bosque.' }
      ]
    },
    {
      partes: [
        { voz: 'primero',   texto: 'Hermano, qué {{valiente}} fuiste. Nos salvaste la vida.' },
        { voz: 'segundo',   texto: 'Tienes razón: el trabajo bien hecho nos protege. La próxima vez, construiremos con más cuidado.' },
        { voz: 'tercero',   texto: 'Juntos podemos levantar una casa para todos. {{¡Sí que se puede!}}' },
        { voz: 'mama',      texto: 'Estoy orgullosa de ustedes, hijos míos. Aprendieron que el esfuerzo siempre da frutos.' },
        { voz: 'narradora', texto: 'Y los tres cerditos vivieron felices, juntos y a salvo, en la casa de ladrillos.' }
      ]
    }
  ]
});
