/* =============================================================
   CATÁLOGO DE VOCES — una lista de personajes listos para usar
   -------------------------------------------------------------
   Cada línea es un tipo de personaje (el lobo, la abuela, el rey…) con la voz
   que mejor le va. Para escucharlos todos:
       python herramientas/muestras.py        y abrir  herramientas/muestras/index.html

   CÓMO SE USA, en el  texto.js  de cualquier lectura:

       voces: {
         lobo:   'lobo',                                  // tal cual está aquí
         abuela: 'abuela',
         cerdo1: { catalogo: 'nino', etiqueta: '🐖 Cerdito de paja', color: '#e9c46a' },
         rey:    { catalogo: 'rey', voz: 'es-MX-JorgeNeural' }   // el rey, pero con otra voz
       }

   · A la izquierda va el nombre que usarás en cada frase:  { voz: 'lobo', texto: '…' }
   · Lo que escribas en la lectura manda sobre lo que diga el catálogo.
   · La narración siempre se llama  narradora. Para que la lea un hombre:
         voces: { narradora: 'narrador' }

   PARA CAMBIAR UNA VOZ  edita su línea aquí y ejecuta
       python herramientas/generar.py
   Se vuelve a grabar solo lo que cambió, en todas las lecturas que la usan.

   PARA AÑADIR UN PERSONAJE  copia una línea y cambia el nombre y la voz.

   QUE NO SUENE ROBÓTICA
     · Cada personaje tiene una VOZ DISTINTA (otro país, otro timbre) en lugar de
       forzar una sola voz hasta el extremo: las voces estiradas se oyen artificiales.
     · Por eso  rate  y  pitch  son suaves. Mantenlos entre  -10% y +6%  y entre
       -6Hz y +6Hz; más allá empieza a sonar a máquina.
     · No existen voces infantiles en español: niño y niña usan voces jóvenes un
       poquito más agudas.
     · Si una voz te suena robótica, márcala con el botón 🤖 de la página de muestras
       y pega la lista en  herramientas/voces-descartadas.json . Esas voces salen
       marcadas en la página y  generar.py  avisa si alguna lectura las usa.
     · Las voces «multilingües» (grupo Pruebas) son más expresivas, pero su acento
       puede no ser nativo. Escúchalas antes de usarlas: la palabra modelo
       («escucha cómo se dice») sale con la misma voz del personaje.

   Campos:  voz, rate, pitch   cómo suena      etiqueta, color  cómo se ve
            grupo, ejemplo     solo para la página de muestras
   ============================================================= */
Lecturas.voces({

  /* ---------- Narración (sin etiqueta: la narradora no lleva rótulo) ---------- */
  'narradora': { grupo: 'Narración', voz: 'es-EC-AndreaNeural', rate: '-4%', pitch: '+0Hz',
    ejemplo: 'Había una vez, en un pueblo junto al río, una niña que soñaba con volar.' },
  'narrador':  { grupo: 'Narración', voz: 'es-EC-LuisNeural',   rate: '-4%', pitch: '+0Hz',
    ejemplo: 'Cuando el sol se escondió detrás de la montaña, todo el valle quedó en silencio.' },

  /* ---------- Niños y amigos ---------- */
  'nino':   { grupo: 'Niños y amigos', voz: 'es-PE-AlexNeural',  rate: '+0%', pitch: '+4Hz', etiqueta: '👦 El niño',  color: '#0096c7',
    ejemplo: '¡Mira lo que encontré! ¿Me ayudas a llevarlo a casa?' },
  'nina':   { grupo: 'Niños y amigos', voz: 'es-US-PalomaNeural', rate: '+0%', pitch: '+6Hz', etiqueta: '👧 La niña',  color: '#e84393',
    ejemplo: '¿Me cuentas otro cuento, por favor? ¡Solo uno más!' },
  'amigo':  { grupo: 'Niños y amigos', voz: 'es-PY-MarioNeural',  rate: '+2%', pitch: '+3Hz', etiqueta: '🧑 El amigo', color: '#43aa8b',
    ejemplo: '¡Vamos a jugar! Yo corro hasta el árbol y tú me alcanzas.' },
  'amiga':  { grupo: 'Niños y amigos', voz: 'es-PY-TaniaNeural',  rate: '+2%', pitch: '+4Hz', etiqueta: '👩 La amiga', color: '#b5179e',
    ejemplo: 'No tengas miedo, yo voy contigo. Juntas lo lograremos.' },

  /* ---------- Familia ---------- */
  'mama':   { grupo: 'Familia', voz: 'es-MX-DaliaNeural',   rate: '-6%',  pitch: '-2Hz', etiqueta: '👩 La mamá',    color: '#f3722c',
    ejemplo: 'Ven a cenar, mi vida, que se enfría la sopa. Y lávate las manos.' },
  'papa':   { grupo: 'Familia', voz: 'es-CL-LorenzoNeural', rate: '-2%',  pitch: '-1Hz', etiqueta: '👨 El papá',    color: '#577590',
    ejemplo: 'Con paciencia y trabajo, hijo mío, todo se puede lograr.' },
  'abuela': { grupo: 'Familia', voz: 'es-CO-SalomeNeural',  rate: '-12%', pitch: '-4Hz', etiqueta: '👵 La abuela',  color: '#e76f51',
    ejemplo: 'Siéntate a mi lado, pequeña, que te voy a contar una historia muy antigua.' },
  'abuelo': { grupo: 'Familia', voz: 'es-CO-GonzaloNeural', rate: '-10%', pitch: '-6Hz', etiqueta: '👴 El abuelo',  color: '#2a9d8f',
    ejemplo: 'En mis tiempos, el río cantaba por las noches. Escucha con atención y lo oirás.' },

  /* ---------- Escuela ---------- */
  'maestra': { grupo: 'Escuela', voz: 'es-AR-ElenaNeural', rate: '-2%', pitch: '+0Hz', etiqueta: '👩‍🏫 La maestra', color: '#7b5cff',
    ejemplo: 'Buenos días, niños. Hoy vamos a aprender algo nuevo. ¿Quién quiere empezar?' },
  'maestro': { grupo: 'Escuela', voz: 'es-AR-TomasNeural', rate: '-2%', pitch: '+0Hz', etiqueta: '👨‍🏫 El maestro', color: '#3f37c9',
    ejemplo: 'Muy bien, lo han hecho excelente. Ahora lean el texto en voz alta.' },

  /* ---------- Fantasía ---------- */
  'rey':     { grupo: 'Fantasía', voz: 'es-ES-AlvaroNeural',  rate: '-8%',  pitch: '-4Hz', etiqueta: '👑 El rey',     color: '#9a6a00',
    ejemplo: 'Yo soy el rey de estas tierras, y ordeno que se abran las puertas del castillo.' },
  'reina':   { grupo: 'Fantasía', voz: 'es-ES-ElviraNeural',  rate: '-4%',  pitch: '+0Hz', etiqueta: '👸 La reina',   color: '#c9184a',
    ejemplo: 'Bienvenidos a mi palacio. Hoy celebraremos con música y con flores.' },
  'hada':    { grupo: 'Fantasía', voz: 'es-ES-XimenaNeural',  rate: '+0%',  pitch: '+4Hz', etiqueta: '🧚 El hada',    color: '#d64fa0',
    ejemplo: 'Con un toque de mi varita, tu deseo se hará realidad. ¡Pídelo con el corazón!' },
  'bruja':   { grupo: 'Fantasía', voz: 'es-CR-MariaNeural',   rate: '-6%',  pitch: '-4Hz', etiqueta: '🧙 La bruja',   color: '#6a4c93',
    ejemplo: 'Mezclaré tres gotas de lluvia y una hoja de luna. ¡Será una poción maravillosa!' },
  'gigante': { grupo: 'Fantasía', voz: 'es-CR-JuanNeural',    rate: '-10%', pitch: '-6Hz', etiqueta: '🏔️ El gigante', color: '#6c584c',
    ejemplo: '¿Quién se atreve a pisar mi montaña? ¡Que se acerque, si es valiente!' },
  'sabio':   { grupo: 'Fantasía', voz: 'es-EC-LuisNeural',    rate: '-6%',  pitch: '-1Hz', etiqueta: '🦉 El sabio',   color: '#4361ee',
    ejemplo: 'Un cuento es un mensaje que viaja de voz en voz. Escúchalo con atención.' },

  /* ---------- Animales ---------- */
  'animal-pequeno': { grupo: 'Animales', voz: 'es-PE-CamilaNeural',    rate: '+4%', pitch: '+6Hz', etiqueta: '🐭 El animalito',    color: '#e07a5f',
    ejemplo: '¡Cuidado, cuidado! Hay algo grande detrás del árbol. ¡Corran, corran!' },
  'animal-grande':  { grupo: 'Animales', voz: 'es-VE-SebastianNeural', rate: '-8%', pitch: '-5Hz', etiqueta: '🐻 El animal grande', color: '#7f5539',
    ejemplo: 'Yo cuidaré el bosque. Nadie se acercará a mis amigos mientras yo esté aquí.' },
  'zorro':          { grupo: 'Animales', voz: 'es-UY-MateoNeural',     rate: '-2%', pitch: '+2Hz', etiqueta: '🦊 El zorro',         color: '#e36414',
    ejemplo: 'Amigo mío, tengo una idea brillante. Solo tienes que confiar en mí.' },
  'lobo':           { grupo: 'Animales', voz: 'es-MX-JorgeNeural',     rate: '-8%', pitch: '-6Hz', etiqueta: '🐺 El lobo',          color: '#6c757d',
    ejemplo: 'Cerditos, cerditos, déjenme entrar. Si no, soplaré y soplaré.' },

  /* ---------- Aventura ---------- */
  'pirata':  { grupo: 'Aventura', voz: 'es-CU-ManuelNeural', rate: '-4%', pitch: '-3Hz', etiqueta: '🏴‍☠️ El pirata',  color: '#264653',
    ejemplo: '¡Todos a cubierta! El tesoro está en la isla, y el mapa lo tengo yo.' },
  'locutor': { grupo: 'Aventura', voz: 'es-US-AlonsoNeural', rate: '+0%', pitch: '+0Hz', etiqueta: '🎙️ El locutor', color: '#d00000',
    ejemplo: 'Queridos oyentes, ¡bienvenidos a nuestro programa! Hoy les traemos una noticia extraordinaria.' },

  /* ---------- Pruebas: voces multilingües (más expresivas; revisa el acento) ---------- */
  'narradora-expresiva': { grupo: 'Pruebas', voz: 'en-US-AvaMultilingualNeural',    rate: '-4%', pitch: '+0Hz',
    ejemplo: 'Había una vez, en un pueblo junto al río, una niña que soñaba con volar.' },
  'narrador-expresivo':  { grupo: 'Pruebas', voz: 'en-US-AndrewMultilingualNeural', rate: '-4%', pitch: '+0Hz',
    ejemplo: 'Cuando el sol se escondió detrás de la montaña, todo el valle quedó en silencio.' },
  'amiga-expresiva':     { grupo: 'Pruebas', voz: 'en-US-EmmaMultilingualNeural',   rate: '+0%', pitch: '+0Hz', etiqueta: '👩 La amiga', color: '#b5179e',
    ejemplo: 'No tengas miedo, yo voy contigo. Juntas lo lograremos.' },
  'amigo-expresivo':     { grupo: 'Pruebas', voz: 'en-US-BrianMultilingualNeural',  rate: '+0%', pitch: '+0Hz', etiqueta: '🧑 El amigo', color: '#43aa8b',
    ejemplo: '¡Vamos a jugar! Yo corro hasta el árbol y tú me alcanzas.' }
});
