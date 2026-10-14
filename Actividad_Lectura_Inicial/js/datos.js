'use strict';
/* =====================================================================
   DATOS PEDAGÓGICOS — Aprendo a leer con Libi (PROLIPA)
   Todo el contenido del currículo vive aquí. Para agregar palabras,
   lecturas o actividades basta con editar este archivo.
   ===================================================================== */

/* Si algún día se agregan grabaciones reales (mp3) en /audio, poner true.
   Se buscan como audio/animales/<id>.mp3 y audio/naturaleza/<id>.mp3.
   Si el archivo no existe, la app usa voz/sonido sintético. */
const USAR_ARCHIVOS_DE_AUDIO = false;

/* ---------------------------------------------------------------------
   LÉXICO: palabra | ilustración | sílabas | pista (opcional)
   --------------------------------------------------------------------- */
const PAL = {};
`
avión|✈️|a-vión
abeja|🐝|a-be-ja
araña|🕷️|a-ra-ña
elefante|🐘|e-le-fan-te
estrella|⭐|es-tre-lla
escalera|🪜|es-ca-le-ra
iguana|🦎|i-gua-na
isla|🏝️|is-la
iglesia|⛪|i-gle-sia
oso|🐻|o-so
ojo|👁️|o-jo
oveja|🐑|o-ve-ja
uva|🍇|u-va
uña|💅|u-ña
unicornio|🦄|u-ni-cor-nio
mamá|👩|ma-má
papá|👨|pa-pá
mapa|🗺️|ma-pa
puma|🐆|pu-ma|un felino de los Andes
pelo|🦱|pe-lo|crece en la cabeza
masa|🫓|ma-sa|sirve para hacer pan
sapo|🐸|sa-po
sopa|🍲|so-pa
sola|🧍|so-la|sin compañía
lima|🍋|li-ma|fruta cítrica
lupa|🔍|lu-pa
pila|🔋|pi-la
ola|🌊|o-la
sala|🛋️|sa-la
paso|👣|pa-so
melón|🍈|me-lón
miel|🍯|miel
mono|🐒|mo-no
mundo|🌎|mun-do
pez|🐟|pez
piña|🍍|pi-ña
pollo|🍗|po-llo
silla|🪑|si-lla
suma|➕|su-ma
semáforo|🚦|se-má-fo-ro
lápiz|✏️|lá-piz
leche|🥛|le-che
libro|📖|li-bro
lobo|🐺|lo-bo
luna|🌙|lu-na
brazo|💪|bra-zo
brócoli|🥦|bró-co-li
brújula|🧭|brú-ju-la
abrigo|🧥|a-bri-go
cobra|🐍|co-bra
crema|🧴|cre-ma
crayón|🖍️|cra-yón
dragón|🐉|dra-gón
dromedario|🐪|dro-me-da-rio
cocodrilo|🐊|co-co-dri-lo
ladrillo|🧱|la-dri-llo
fresa|🍓|fre-sa
frío|🥶|frí-o
fruta|🍎|fru-ta
grillo|🦗|gri-llo
grúa|🏗️|grú-a
premio|🏆|pre-mio
príncipe|🤴|prín-ci-pe
prado|🌿|pra-do
trigo|🌾|tri-go
trompeta|🎺|trom-pe-ta
tractor|🚜|trac-tor
blusa|👚|blu-sa
cable|🔌|ca-ble
clase|🏫|cla-se
clip|📎|clip
bicicleta|🚲|bi-ci-cle-ta
flecha|🏹|fle-cha
flamenco|🦩|fla-men-co
flor|🌸|flor
globo|🎈|glo-bo
regla|📏|re-gla
pluma|🪶|plu-ma
plato|🍽️|pla-to
playa|🏖️|pla-ya
plátano|🍌|plá-ta-no
planeta|🪐|pla-ne-ta
queso|🧀|que-so
mosquito|🦟|mos-qui-to
casa|🏠|ca-sa
coco|🥥|co-co
cuna|🛏️|cu-na
gato|🐱|ga-to
gorro|🧢|go-rro
gusano|🐛|gu-sa-no
guitarra|🎸|gui-ta-rra
jirafa|🦒|ji-ra-fa
jugo|🧃|ju-go
llave|🔑|lla-ve
calle|🛣️|ca-lle
lluvia|🌧️|llu-via
payaso|🤡|pa-ya-so
yoyó|🪀|yo-yó
yuca|🍠|yu-ca
gallina|🐔|ga-lli-na
montaña|⛰️|mon-ta-ña
niño|👦|ni-ño
chancho|🐖|chan-cho
chocolate|🍫|cho-co-la-te
mochila|🎒|mo-chi-la
chupete|🍼|chu-pe-te
perro|🐕|pe-rro
carro|🚗|ca-rro
torre|🗼|to-rre
hormiga|🐜|hor-mi-ga
hada|🧚|ha-da
helado|🍦|he-la-do
hielo|🧊|hie-lo
hilo|🧵|hi-lo
hoja|🍃|ho-ja
huevo|🥚|hue-vo
zapato|👟|za-pa-to
cebra|🦓|ce-bra
cielo|☁️|cie-lo
zorro|🦊|zo-rro
cereza|🍒|ce-re-za
sol|☀️|sol
pan|🍞|pan
mano|✋|ma-no
pato|🦆|pa-to
tomate|🍅|to-ma-te
manzana|🍏|man-za-na
conejo|🐰|co-ne-jo
mariposa|🦋|ma-ri-po-sa
tren|🚆|tren
barco|🚢|bar-co
beso|😘|be-so
col|🥬|col
cono|🍦|co-no
rojo|🔴|ro-jo
`.trim().split('\n').forEach(linea => {
  const [t, e, s, h] = linea.split('|');
  PAL[t] = { t, e, s: s.split('-'), h: h || '' };
});

const VOCALES = ['a', 'e', 'i', 'o', 'u'];
const sil = cons => VOCALES.map(v => cons + v);
const palabrasQueEmpiezanCon = vocal =>
  Object.values(PAL).filter(p => p.t[0] === vocal && p.s.length >= 2).map(p => p.t);

/* ---------------------------------------------------------------------
   SONIDOS DEL MUNDO (Inicial)
   --------------------------------------------------------------------- */
const NATURALEZA = [
  { id: 'lluvia', e: '🌧️', n: 'la lluvia' },
  { id: 'viento', e: '💨', n: 'el viento' },
  { id: 'trueno', e: '⛈️', n: 'el trueno' },
  { id: 'mar', e: '🌊', n: 'el mar' },
  { id: 'pajaro', e: '🐦', n: 'el pajarito' },
  { id: 'grillo', e: '🦗', n: 'el grillo' },
  { id: 'fuego', e: '🔥', n: 'el fuego' },
  { id: 'rio', e: '💧', n: 'el río' }
];

const ANIMALES = [
  { id: 'perro', e: '🐶', n: 'el perro', voz: 'guau, guau' },
  { id: 'gato', e: '🐱', n: 'el gato', voz: 'miau, miau' },
  { id: 'vaca', e: '🐮', n: 'la vaca', voz: 'muuu, muuu' },
  { id: 'pollito', e: '🐥', n: 'el pollito', voz: 'pío, pío, pío' },
  { id: 'gallo', e: '🐓', n: 'el gallo', voz: 'quiquiriquí' },
  { id: 'pato', e: '🦆', n: 'el pato', voz: 'cuac, cuac' },
  { id: 'oveja', e: '🐑', n: 'la oveja', voz: 'beee, beee' },
  { id: 'cerdo', e: '🐷', n: 'el cerdito', voz: 'oinc, oinc' },
  { id: 'rana', e: '🐸', n: 'la rana', voz: 'croac, croac' },
  { id: 'abeja', e: '🐝', n: 'la abeja', voz: 'bzzzz, bzzzz' }
];

/* ---------------------------------------------------------------------
   RIMAS (Inicial)
   --------------------------------------------------------------------- */
const RIMAS = [
  { a: 'gato', b: 'pato', otras: ['sol', 'pan'] },
  { a: 'luna', b: 'cuna', otras: ['casa', 'flor'] },
  { a: 'casa', b: 'masa', otras: ['luna', 'pez'] },
  { a: 'mono', b: 'cono', otras: ['gato', 'oso'] },
  { a: 'queso', b: 'beso', otras: ['mapa', 'sapo'] },
  { a: 'ojo', b: 'rojo', otras: ['uva', 'mano'] },
  { a: 'sol', b: 'col', otras: ['luna', 'pez'] }
];

/* ---------------------------------------------------------------------
   COMPLETA LA SÍLABA (2º EGB): [palabra, posición del hueco, opciones]
   La primera opción es la correcta.
   --------------------------------------------------------------------- */
const COMPLETA_A = [
  ['queso', 0, ['que', 'ce', 'ke']],
  ['mosquito', 1, ['qui', 'ci', 'ki']],
  ['casa', 0, ['ca', 'ka', 'za']],
  ['coco', 0, ['co', 'ko', 'go']],
  ['gato', 0, ['ga', 'ja', 'gua']],
  ['guitarra', 0, ['gui', 'ji', 'gi']],
  ['jirafa', 0, ['ji', 'gi', 'hi']],
  ['jugo', 0, ['ju', 'gu', 'hu']],
  ['zapato', 0, ['za', 'sa', 'ca']],
  ['cebra', 0, ['ce', 'se', 'ze']],
  ['cielo', 0, ['cie', 'sie', 'zie']],
  ['zorro', 0, ['zo', 'so', 'co']],
  ['cereza', 2, ['za', 'sa', 'ca']]
];
const COMPLETA_B = [
  ['llave', 0, ['lla', 'ya', 'la']],
  ['lluvia', 0, ['llu', 'yu', 'lu']],
  ['payaso', 1, ['ya', 'lla', 'ia']],
  ['gallina', 1, ['lli', 'yi', 'li']],
  ['piña', 1, ['ña', 'na', 'nia']],
  ['niño', 1, ['ño', 'no', 'nio']],
  ['montaña', 2, ['ña', 'na', 'ma']],
  ['leche', 1, ['che', 'ce', 'se']],
  ['mochila', 1, ['chi', 'ci', 'si']],
  ['chocolate', 0, ['cho', 'co', 'so']],
  ['perro', 1, ['rro', 'ro', 'rra']],
  ['carro', 1, ['rro', 'ro', 'rre']],
  ['torre', 1, ['rre', 're', 'rra']],
  ['guitarra', 2, ['rra', 'ra', 'rro']],
  ['hormiga', 0, ['hor', 'or', 'jor']],
  ['huevo', 0, ['hue', 'ue', 'gue']],
  ['hielo', 0, ['hie', 'ie', 'ye']],
  ['helado', 0, ['he', 'e', 'je']]
];

/* ---------------------------------------------------------------------
   COMPLETA LA ORACIÓN (2º EGB)
   --------------------------------------------------------------------- */
const CLOZE = [
  { o: 'El ___ ladra mucho.', c: 'perro', x: ['gato', 'pato'] },
  { o: 'La vaca nos da ___.', c: 'leche', x: ['pan', 'sopa'] },
  { o: 'Yo leo un ___.', c: 'libro', x: ['plato', 'globo'] },
  { o: 'El ___ vuela por el cielo.', c: 'avión', x: ['tren', 'barco'] },
  { o: 'El ___ navega en el mar.', c: 'barco', x: ['tren', 'avión'] },
  { o: 'En el prado hay una ___.', c: 'flor', x: ['regla', 'pluma'] },
  { o: 'Mi mamá prepara una rica ___.', c: 'sopa', x: ['silla', 'lupa'] },
  { o: 'Me pongo el ___ cuando hace frío.', c: 'abrigo', x: ['globo', 'plato'] },
  { o: 'La ___ hace la miel.', c: 'abeja', x: ['araña', 'oveja'] }
];

/* ---------------------------------------------------------------------
   ORDENA LA ORACIÓN
   --------------------------------------------------------------------- */
const ORACIONES_2 = [
  { e: '🐱', t: 'El gato bebe leche.' },
  { e: '👩‍🍳', t: 'Mi mamá cocina sopa.' },
  { e: '🐸', t: 'La rana salta mucho.' },
  { e: '☀️', t: 'El sol brilla fuerte.' },
  { e: '📖', t: 'Papá lee un libro.' },
  { e: '🦆', t: 'Los patos nadan en el río.' }
];
const ORACIONES_3A = [
  { e: '🐕', t: 'Mi perro juega en el parque.' },
  { e: '🌅', t: 'El sol sale por la mañana.' },
  { e: '📚', t: 'Los niños leen un libro nuevo.' },
  { e: '🦋', t: 'La mariposa vuela sobre las flores.' },
  { e: '🍲', t: 'Mamá cocina una sopa deliciosa.' },
  { e: '📘', t: 'Libi viaja por las montañas.' }
];
const ORACIONES_3B = [
  { e: '🍊', t: 'Ana toma jugo de naranja en el recreo.' },
  { e: '🌧️', t: 'Cuando llueve me pongo mi abrigo amarillo.' },
  { e: '🏫', t: 'Los estudiantes juegan en el patio de la escuela.' },
  { e: '🦙', t: 'La llama camina despacio por el páramo.' },
  { e: '🎂', t: 'Mi abuela prepara un pastel para mi cumpleaños.' },
  { e: '🚲', t: 'Mi hermano aprendió a montar bicicleta.' }
];

/* ---------------------------------------------------------------------
   SINÓNIMOS Y ANTÓNIMOS (palabra, ilustración)
   --------------------------------------------------------------------- */
const ANTONIMOS = [
  [['grande', '🐘'], ['pequeño', '🐭']],
  [['día', '☀️'], ['noche', '🌙']],
  [['frío', '🥶'], ['caliente', '🥵']],
  [['alto', '🏢'], ['bajo', '🏠']],
  [['feliz', '😀'], ['triste', '😢']],
  [['rápido', '🐆'], ['lento', '🐢']],
  [['abierto', '🚪'], ['cerrado', '🔒']],
  [['arriba', '⬆️'], ['abajo', '⬇️']],
  [['limpio', '✨'], ['sucio', '🐷']],
  [['duro', '🪨'], ['blando', '🧸']]
];
const SINONIMOS = [
  [['contento', '😀'], ['alegre', '😄']],
  [['casa', '🏠'], ['hogar', '🏡']],
  [['auto', '🚗'], ['carro', '🚙']],
  [['bonito', '🌺'], ['hermoso', '🌸']],
  [['veloz', '🏎️'], ['rápido', '🐆']],
  [['cansado', '😴'], ['agotado', '🥱']],
  [['enojado', '😡'], ['molesto', '😠']],
  [['pequeño', '🐁'], ['chico', '🐤']],
  [['amigo', '🧑‍🤝‍🧑'], ['compañero', '👫']]
];

/* ---------------------------------------------------------------------
   LECTURAS CON RESALTADO Y PREGUNTAS
   --------------------------------------------------------------------- */
const LECT_1 = [
  { titulo: 'Mi mamá', e: '👩‍👧', texto: 'Mi mamá me ama.',
    preguntas: [{ q: '¿Quién me ama?', op: ['👩 Mi mamá', '🐸 El sapo', '🐻 El oso'], r: 0 }] },
  { titulo: 'El oso', e: '🐻', texto: 'El oso sale a pasear.',
    preguntas: [{ q: '¿Quién sale a pasear?', op: ['🐻 El oso', '🐸 El sapo', '🐆 El puma'], r: 0 }] },
  { titulo: 'El sapo', e: '🐸', texto: 'El sapo salta en la sala.',
    preguntas: [{ q: '¿Dónde salta el sapo?', op: ['🛋️ En la sala', '🌊 En el mar', '🏖️ En la playa'], r: 0 }] },
  { titulo: 'La sopa', e: '🍲', texto: 'Papá pone la sopa.',
    preguntas: [{ q: '¿Quién pone la sopa?', op: ['👨 Papá', '👩 Mamá', '🐻 El oso'], r: 0 }] }
];
const LECT_2 = [
  { titulo: 'El gato', e: '🐱', texto: 'El gato come pescado. El gato está feliz.',
    preguntas: [{ q: '¿Qué come el gato?', op: ['🐟 Pescado', '🍎 Una fruta', '🍞 Pan'], r: 0 }] },
  { titulo: 'La rana', e: '🐸', texto: 'La rana brinca en el prado verde. Croac, croac, croac.',
    preguntas: [{ q: '¿Dónde brinca la rana?', op: ['🌿 En el prado', '🏖️ En la playa', '🏫 En la clase'], r: 0 }] },
  { titulo: 'El tren', e: '🚆', texto: 'El tren pasa por el puente. Los niños lo saludan.',
    preguntas: [{ q: '¿Quién saluda al tren?', op: ['👧 Los niños', '🐕 Los perros', '🦆 Los patos'], r: 0 }] },
  { titulo: 'Mi libro', e: '📖', texto: 'Yo tengo un libro grande. Me gusta leer cuentos en clase.',
    preguntas: [{ q: '¿Qué le gusta leer?', op: ['📚 Cuentos', '🍽️ Platos', '🎈 Globos'], r: 0 }] }
];
const LECT_3 = [
  { titulo: 'Libi viaja por Ecuador', e: '📘', texto:
      'Libi es un libro que viaja por las escuelas de Ecuador. Cada mañana sale de su biblioteca en Quito y mira el volcán Cotopaxi. ' +
      'En el camino ve llamas, ríos y campos verdes. Un día encontró a un niño que quería aprender a leer. ' +
      'Libi le enseñó las letras y el niño le dio las gracias.',
    preguntas: [
      { q: '¿Por dónde viaja Libi?', op: ['🏫 Por las escuelas de Ecuador', '🌊 Por el mar', '🏙️ Por otro país'], r: 0 },
      { q: '¿Qué volcán mira cada mañana?', op: ['🌋 El Cotopaxi', '🏝️ Galápagos', '🏖️ La playa'], r: 0 },
      { q: '¿A quién encontró Libi un día?', op: ['🦙 A una llama', '👦 A un niño que quería leer', '🐟 A un pez'], r: 1 },
      { q: '¿Qué le enseñó Libi al niño?', op: ['🔤 Las letras', '🍎 A cocinar', '🚶 A caminar'], r: 0 }
    ] },
  { titulo: 'La feria del sábado', e: '🧺', texto:
      'El sábado Ana va a la feria con su abuela. Compran papas, choclos y frutas frescas. ' +
      'Ana escoge una piña dulce y un racimo de uvas. Después toman un jugo de naranja. ' +
      'Ana regresa feliz a casa con su canasta llena.',
    preguntas: [
      { q: '¿Con quién va Ana a la feria?', op: ['👵 Con su abuela', '👨 Con su papá', '🐕 Con su perro'], r: 0 },
      { q: '¿Qué fruta dulce escoge Ana?', op: ['🍍 Una piña', '🍌 Un plátano', '🍓 Una fresa'], r: 0 },
      { q: '¿Qué toman después?', op: ['🥛 Leche', '🍊 Jugo de naranja', '🧃 Agua'], r: 1 },
      { q: '¿Cómo regresa Ana a casa?', op: ['😀 Feliz', '😢 Triste', '😴 Dormida'], r: 0 }
    ] },
  { titulo: 'La llama Luna', e: '🦙', texto:
      'La llama Luna camina por el páramo. El viento frío sopla muy fuerte. ' +
      'Luna tiene frío y busca a su mamá. Su mamá la abraza con su lana suave y calentita. ' +
      'Ahora Luna está tranquila y feliz.',
    preguntas: [
      { q: '¿Cómo se llama la llama?', op: ['🌙 Luna', '☀️ Sol', '⭐ Estrella'], r: 0 },
      { q: '¿Cómo sopla el viento?', op: ['💨 Frío y fuerte', '☀️ Calientito', '🌧️ Con lluvia'], r: 0 },
      { q: '¿A quién busca Luna?', op: ['🦙 A su mamá', '🐕 A un perro', '📘 A Libi'], r: 0 },
      { q: '¿Cómo termina Luna?', op: ['😌 Tranquila y feliz', '😠 Enojada', '😢 Perdida'], r: 0 }
    ] }
];

/* ---------------------------------------------------------------------
   CURRÍCULO POR GRADOS, SUBNIVELES Y ACTIVIDADES
   tipo: fonoteca | eleccion | armar | palmas | lectura | ordena
   --------------------------------------------------------------------- */
const letra = (g, nombre, sonido, cons, ejSil) =>
  ({ kind: 'letra', g, nombre, sonido, silabas: sil(cons), ejSil });
const grupo = (g, silabas, ejSil, nota) =>
  ({ kind: 'letra', g, nombre: null, sonido: null, silabas, ejSil, nota });
const vocal = (g, v, ej) =>
  ({ kind: 'letra', g, nombre: null, sonido: v, silabas: [], ej });

const todas = (...cons) => cons.flatMap(sil);

const CURRICULO = [
  /* ============================ INICIAL ============================ */
  {
    id: 'inicial', nombre: 'Inicial', edad: '4 años', icono: '🐣', color: '#ff7eb6', oscuro: '#d23f86',
    desc: 'Vocales, sonidos del mundo y primeros juegos de fonética.',
    medalla: { nombre: 'Pequeño explorador', icono: '🎒' },
    subniveles: [
      {
        id: 'vocales', nombre: 'Las vocales', icono: '🅰️', desc: 'Conozco la A, E, I, O, U',
        medalla: { nombre: 'Rey de las vocales', icono: '👑' },
        actividades: [
          { id: 'fono', tipo: 'fonoteca', titulo: 'Fonoteca de vocales', icono: '🎧',
            items: [
              vocal('Aa', 'a', ['avión', 'abeja', 'araña']),
              vocal('Ee', 'e', ['elefante', 'estrella', 'escalera']),
              vocal('Ii', 'i', ['iguana', 'isla', 'iglesia']),
              vocal('Oo', 'o', ['oso', 'ojo', 'oveja']),
              vocal('Uu', 'u', ['uva', 'uña', 'unicornio'])
            ] },
          { id: 'suena', tipo: 'eleccion', gen: 'sonidoGrafia', titulo: '¿Dónde suena...?', icono: '👂',
            params: { pool: VOCALES, n: 6, nopt: 3, mayus: true, repetir: true, instruccion: 'Escucha y toca la vocal' } },
          { id: 'inicia', tipo: 'eleccion', gen: 'imagenInicial', titulo: '¿Con qué vocal empieza?', icono: '🖼️',
            params: { n: 6, nopt: 3 } }
        ]
      },
      {
        id: 'mundo', nombre: 'Sonidos del mundo', icono: '🌳', desc: 'Naturaleza y animales',
        medalla: { nombre: 'Oído de naturalista', icono: '🦻' },
        actividades: [
          { id: 'fono', tipo: 'fonoteca', titulo: 'Fonoteca de la naturaleza', icono: '🎧',
            items: NATURALEZA.map(x => ({ kind: 'sonido', g: x.e, nombre: x.n, natural: x.id })).concat(
              ANIMALES.slice(0, 6).map(x => ({ kind: 'sonido', g: x.e, nombre: x.n, animal: x.id }))) },
          { id: 'natu', tipo: 'eleccion', gen: 'naturaleza', titulo: '¿Qué suena?', icono: '🌧️',
            params: { n: 6, nopt: 3 } },
          { id: 'anim', tipo: 'eleccion', gen: 'animales', titulo: '¿Quién lo dice?', icono: '🐮',
            params: { n: 6, nopt: 3 } }
        ]
      },
      {
        id: 'fonetica', nombre: 'Escucho y juego', icono: '👏', desc: 'Sílabas, rimas y palabras',
        medalla: { nombre: 'Campeón de los sonidos', icono: '🏅' },
        actividades: [
          { id: 'palmas', tipo: 'palmas', titulo: 'Palmas de sílabas', icono: '👏',
            params: { pool: ['sol', 'pan', 'gato', 'casa', 'luna', 'mano', 'pato', 'conejo', 'tomate', 'zapato', 'elefante', 'mariposa'], n: 5 } },
          { id: 'rimas', tipo: 'eleccion', gen: 'rima', titulo: 'Busca la rima', icono: '🎵',
            params: { n: 5 } },
          { id: 'palabra', tipo: 'eleccion', gen: 'palabraImagen', titulo: '¿Cuál es la palabra?', icono: '🔎',
            params: { pool: ['gato', 'pato', 'casa', 'luna', 'mano', 'sol', 'pan', 'oso', 'uva', 'conejo', 'tomate', 'zapato'], n: 6, nopt: 3 } }
        ]
      }
    ]
  },

  /* ============================== 1º EGB ============================== */
  {
    id: 'egb1', nombre: '1º EGB', edad: '5 años', icono: '🌟', color: '#ffa63d', oscuro: '#d97706',
    desc: 'Sílabas simples con M, P, S, L y primeras palabras.',
    medalla: { nombre: 'Gran lector de 1º', icono: '🎓' },
    subniveles: [
      {
        id: 'mp', nombre: 'La M y la P', icono: '🅼', desc: 'ma me mi mo mu · pa pe pi po pu',
        medalla: { nombre: 'Maestro de la M y la P', icono: '🥇' },
        actividades: [
          { id: 'fono', tipo: 'fonoteca', titulo: 'Fonoteca M y P', icono: '🎧',
            items: [
              letra('Mm', 'eme', null, 'm', { ma: 'mamá', me: 'melón', mi: 'miel', mo: 'mono', mu: 'mundo' }),
              letra('Pp', 'pe', null, 'p', { pa: 'papá', pe: 'pez', pi: 'piña', po: 'pollo', pu: 'puma' })
            ] },
          { id: 'suena', tipo: 'eleccion', gen: 'sonidoGrafia', titulo: '¿Dónde suena...?', icono: '👂',
            params: { pool: todas('m', 'p'), n: 8, nopt: 3, afin: 'vocal', instruccion: 'Escucha y toca la sílaba' } },
          { id: 'forma', tipo: 'armar', titulo: 'Forma palabras', icono: '🧩',
            params: { palabras: ['mamá', 'papá', 'mapa', 'puma', 'pelo'], extra: todas('m', 'p'), n: 5 } }
        ]
      },
      {
        id: 'sl', nombre: 'La S y la L', icono: '🅻', desc: 'sa se si so su · la le li lo lu',
        medalla: { nombre: 'Maestro de la S y la L', icono: '🥈' },
        actividades: [
          { id: 'fono', tipo: 'fonoteca', titulo: 'Fonoteca S y L', icono: '🎧',
            items: [
              letra('Ss', 'ese', null, 's', { sa: 'sapo', se: 'semáforo', si: 'silla', so: 'sopa', su: 'suma' }),
              letra('Ll', 'ele', null, 'l', { la: 'lápiz', le: 'leche', li: 'libro', lo: 'lobo', lu: 'luna' })
            ] },
          { id: 'suena', tipo: 'eleccion', gen: 'sonidoGrafia', titulo: '¿Dónde suena...?', icono: '👂',
            params: { pool: todas('s', 'l'), n: 8, nopt: 3, afin: 'vocal', instruccion: 'Escucha y toca la sílaba' } },
          { id: 'forma', tipo: 'armar', titulo: 'Forma palabras', icono: '🧩',
            params: { palabras: ['masa', 'sapo', 'sopa', 'sola', 'lima', 'lupa', 'pila', 'ola', 'oso', 'sala'], extra: todas('s', 'l', 'm', 'p'), n: 5 } }
        ]
      },
      {
        id: 'palabras', nombre: 'Mis primeras palabras', icono: '📘', desc: 'Leo palabras y frases cortas',
        medalla: { nombre: 'Lector valiente', icono: '📘' },
        actividades: [
          { id: 'imagen', tipo: 'eleccion', gen: 'imagenSilaba', titulo: '¿Con qué sílaba empieza?', icono: '🖼️',
            params: { pool: ['mamá', 'papá', 'mapa', 'puma', 'pelo', 'masa', 'sapo', 'sopa', 'sola', 'lima', 'lupa', 'pila', 'sala', 'paso'], n: 6 } },
          { id: 'forma', tipo: 'armar', titulo: 'Constructor de palabras', icono: '🧩',
            params: { palabras: ['mamá', 'papá', 'mapa', 'puma', 'pelo', 'masa', 'sapo', 'sopa', 'sola', 'lima', 'lupa', 'pila', 'oso', 'sala', 'paso'], extra: todas('m', 'p', 's', 'l'), n: 6 } },
          { id: 'lee', tipo: 'lectura', titulo: 'Leo con Libi', icono: '📖', textos: LECT_1 }
        ]
      }
    ]
  },

  /* ============================== 2º EGB ============================== */
  {
    id: 'egb2', nombre: '2º EGB', edad: '6-7 años', icono: '🚀', color: '#3ec28f', oscuro: '#15935f',
    desc: 'Sílabas trabadas, consonantes especiales y oraciones.',
    medalla: { nombre: 'Gran lector de 2º', icono: '🎓' },
    subniveles: [
      {
        id: 'tr', nombre: 'Trabadas con R', icono: '🅱️', desc: 'br · cr · dr · fr · gr · pr · tr',
        medalla: { nombre: 'Domador de la R', icono: '🦁' },
        actividades: [
          { id: 'fono', tipo: 'fonoteca', titulo: 'Fonoteca trabadas con R', icono: '🎧',
            items: [
              grupo('br', sil('br'), { bra: 'brazo', bri: 'abrigo', bro: 'brócoli', bru: 'brújula' }),
              grupo('cr', sil('cr'), { cra: 'crayón', cre: 'crema' }),
              grupo('dr', sil('dr'), { dra: 'dragón', dri: 'ladrillo', dro: 'dromedario' }),
              grupo('fr', sil('fr'), { fre: 'fresa', fri: 'frío', fru: 'fruta' }),
              grupo('gr', sil('gr'), { gri: 'grillo', gru: 'grúa' }),
              grupo('pr', sil('pr'), { pra: 'prado', pre: 'premio', pri: 'príncipe' }),
              grupo('tr', sil('tr'), { tra: 'tractor', tri: 'trigo', tro: 'trompeta' })
            ] },
          { id: 'suena', tipo: 'eleccion', gen: 'sonidoGrafia', titulo: '¿Dónde suena...?', icono: '👂',
            params: { pool: todas('br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr'), n: 8, nopt: 3, afin: 'vocal', instruccion: 'Escucha y toca la sílaba' } },
          { id: 'forma', tipo: 'armar', titulo: 'Forma palabras', icono: '🧩',
            params: { palabras: ['brazo', 'libro', 'brócoli', 'cobra', 'crema', 'crayón', 'dragón', 'cocodrilo', 'fresa', 'fruta', 'grillo', 'premio', 'trompeta', 'tractor', 'abrigo', 'ladrillo'],
              extra: todas('br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr'), n: 6 } }
        ]
      },
      {
        id: 'tl', nombre: 'Trabadas con L', icono: '🅻', desc: 'bl · cl · fl · gl · pl',
        medalla: { nombre: 'Domador de la L', icono: '🦄' },
        actividades: [
          { id: 'fono', tipo: 'fonoteca', titulo: 'Fonoteca trabadas con L', icono: '🎧',
            items: [
              grupo('bl', sil('bl'), { ble: 'cable', blu: 'blusa' }),
              grupo('cl', sil('cl'), { cla: 'clase', cle: 'bicicleta', cli: 'clip' }),
              grupo('fl', sil('fl'), { fla: 'flamenco', fle: 'flecha', flo: 'flor' }),
              grupo('gl', sil('gl'), { gle: 'iglesia', glo: 'globo' }),
              grupo('pl', sil('pl'), { pla: 'plato', plu: 'pluma' })
            ] },
          { id: 'suena', tipo: 'eleccion', gen: 'sonidoGrafia', titulo: '¿Dónde suena...?', icono: '👂',
            params: { pool: todas('bl', 'cl', 'fl', 'gl', 'pl'), n: 8, nopt: 3, afin: 'vocal', instruccion: 'Escucha y toca la sílaba' } },
          { id: 'forma', tipo: 'armar', titulo: 'Forma palabras', icono: '🧩',
            params: { palabras: ['blusa', 'cable', 'clase', 'bicicleta', 'flecha', 'flamenco', 'globo', 'iglesia', 'regla', 'pluma', 'plato', 'playa', 'plátano', 'planeta'],
              extra: todas('bl', 'cl', 'fl', 'gl', 'pl'), n: 6 } }
        ]
      },
      {
        id: 'especiales', nombre: 'Letras especiales', icono: '🔡', desc: 'c/qu · g/gu/j · ll/y · ñ · ch · rr · h · z',
        medalla: { nombre: 'Detective de letras', icono: '🕵️' },
        actividades: [
          { id: 'fono', tipo: 'fonoteca', titulo: 'Fonoteca de letras especiales', icono: '🎧',
            items: [
              grupo('C · Qu', ['ca', 'que', 'qui', 'co', 'cu'], { ca: 'casa', que: 'queso', qui: 'mosquito', co: 'coco', cu: 'cuna' }),
              grupo('G · Gu', ['ga', 'gue', 'gui', 'go', 'gu'], { ga: 'gato', gui: 'guitarra', go: 'gorro', gu: 'gusano' }),
              grupo('J', sil('j'), { ji: 'jirafa', jo: 'ojo', ju: 'jugo' }),
              grupo('Ll', sil('ll'), { lla: 'llave', lle: 'calle', lli: 'gallina', llo: 'pollo', llu: 'lluvia' }),
              grupo('Y', sil('y'), { ya: 'payaso', yo: 'yoyó', yu: 'yuca' }),
              grupo('Ñ', sil('ñ'), { ña: 'araña', ño: 'niño' }),
              grupo('Ch', sil('ch').map(s => s), { cha: 'chancho', che: 'leche', chi: 'mochila', cho: 'chocolate', chu: 'chupete' }),
              grupo('Rr', ['rra', 'rre', 'rri', 'rro', 'rru'], { rra: 'guitarra', rre: 'torre', rro: 'perro' }),
              grupo('H', sil('h'), { ha: 'hada', he: 'helado', hi: 'hilo', ho: 'hoja', hu: 'huevo' }, 'La H no suena'),
              grupo('Z · Ce · Ci', ['za', 'ce', 'ci', 'zo', 'zu'], { za: 'zapato', ce: 'cebra', ci: 'cielo', zo: 'zorro' })
            ] },
          { id: 'compa', tipo: 'eleccion', gen: 'completaSilaba', titulo: 'Completa: C, Qu, G, J, Z', icono: '✏️',
            params: { items: COMPLETA_A, n: 6 } },
          { id: 'compb', tipo: 'eleccion', gen: 'completaSilaba', titulo: 'Completa: Ll, Y, Ñ, Ch, Rr, H', icono: '✏️',
            params: { items: COMPLETA_B, n: 6 } }
        ]
      },
      {
        id: 'oraciones', nombre: 'Leo oraciones', icono: '📝', desc: 'Leo, completo y ordeno',
        medalla: { nombre: 'Escritor de oraciones', icono: '✍️' },
        actividades: [
          { id: 'lee', tipo: 'lectura', titulo: 'Leo con Libi', icono: '📖', textos: LECT_2 },
          { id: 'cloze', tipo: 'eleccion', gen: 'completaOracion', titulo: 'Completa la oración', icono: '🧠',
            params: { n: 5 } },
          { id: 'ordena', tipo: 'ordena', titulo: 'Ordena la oración', icono: '🔀',
            params: { oraciones: ORACIONES_2, n: 4 } }
        ]
      }
    ]
  },

  /* ============================== 3º EGB ============================== */
  {
    id: 'egb3', nombre: '3º EGB', edad: '7-8 años', icono: '🏆', color: '#6b7cff', oscuro: '#3a4bd8',
    desc: 'Comprensión lectora, oraciones y vocabulario.',
    medalla: { nombre: 'Gran lector de 3º', icono: '🎓' },
    subniveles: [
      {
        id: 'comprension', nombre: 'Comprensión lectora', icono: '📚', desc: 'Cuentos con Libi',
        medalla: { nombre: 'Lector estrella', icono: '🌟' },
        actividades: LECT_3.map((t, i) => ({
          id: 'c' + (i + 1), tipo: 'lectura', titulo: t.titulo, icono: t.e, textos: [t]
        }))
      },
      {
        id: 'ordena', nombre: 'Ordena la oración', icono: '🔀', desc: 'Pongo las palabras en orden',
        medalla: { nombre: 'Arquitecto de oraciones', icono: '🏗️' },
        actividades: [
          { id: 'oa', tipo: 'ordena', titulo: 'Oraciones cortas', icono: '🧱',
            params: { oraciones: ORACIONES_3A, n: 5 } },
          { id: 'ob', tipo: 'ordena', titulo: 'Oraciones largas', icono: '🏰',
            params: { oraciones: ORACIONES_3B, n: 5 } }
        ]
      },
      {
        id: 'sinant', nombre: 'Sinónimos y antónimos', icono: '🔁', desc: 'Parecidos y contrarios',
        medalla: { nombre: 'Sabio de las palabras', icono: '🦉' },
        actividades: [
          { id: 'sin', tipo: 'eleccion', gen: 'sinonimo', titulo: 'Sinónimos (parecidos)', icono: '🤝',
            params: { n: 6 } },
          { id: 'ant', tipo: 'eleccion', gen: 'antonimo', titulo: 'Antónimos (contrarios)', icono: '↔️',
            params: { n: 6 } }
        ]
      }
    ]
  }
];

/* ---------------------------------------------------------------------
   Verificación en desarrollo: avisa si algún dato apunta a una palabra
   que no existe en el léxico.
   --------------------------------------------------------------------- */
(function validarDatos() {
  const falta = new Set();
  const ver = k => { if (!PAL[k]) falta.add(k); };
  CURRICULO.forEach(g => g.subniveles.forEach(s => s.actividades.forEach(a => {
    const p = a.params || {};
    (p.palabras || []).forEach(ver);
    (p.pool || []).forEach(k => { if (a.gen !== 'sonidoGrafia') ver(k); });
    (a.items || []).forEach(it => {
      (it.ej || []).forEach(ver);
      Object.values(it.ejSil || {}).forEach(ver);
    });
  })));
  RIMAS.forEach(r => { ver(r.a); ver(r.b); r.otras.forEach(ver); });
  CLOZE.forEach(c => { ver(c.c); c.x.forEach(ver); });
  [...COMPLETA_A, ...COMPLETA_B].forEach(c => ver(c[0]));
  if (falta.size) console.warn('[datos] Palabras sin definir en PAL:', [...falta]);
})();
