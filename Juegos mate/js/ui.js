/* Interfaz: perfil del jugador, menú, misión del nivel, pantallas de pausa / nivel / fin, animaciones (GSAP), confeti y reporte. */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const DESIGN_W = 440, TOP = 56 + 52, BAR = 76;   // encabezado + franja de misión · barra inferior
  const OPS = Rules.OPS;
  const MODE_NAMES = { pair: '2 burbujas', multi: 'Varias burbujas' };
  const MODE_SHORT = { pair: '2 burbujas', multi: 'varias' };
  const gradeName = g => Rules.ordinal(g);
  const HOWTO = {
    suma: {
      pair:  'Toca <b>exactamente 2 burbujas</b> que sumen el número objetivo. Ej.: 4 + 6 = 10.',
      multi: 'Toca las burbujas que <b>sumen</b> el número objetivo. Puedes usar 2, 3 o más. Ej.: 2 + 3 + 5 = 10.'
    },
    resta: {
      pair:  'Toca <b>2 burbujas</b>: la mayor menos la menor debe dar el número objetivo. Ej.: 9 − 4 = 5.',
      multi: 'Toca una burbuja de partida y luego las que <b>restas</b>, en orden. Ej.: 20 − 5 − 3 = 12.'
    },
    mult: {
      pair:  'Toca <b>exactamente 2 burbujas</b> que multiplicadas den el número objetivo. Ej.: 3 × 4 = 12.',
      multi: 'Toca las burbujas cuyo <b>producto</b> sea el número objetivo. Puedes usar 2 o más. Ej.: 2 × 2 × 3 = 12.'
    },
    div: {
      pair:  'Toca <b>2 burbujas</b>: la mayor dividida entre la menor debe dar el número objetivo. Ej.: 20 ÷ 4 = 5.',
      multi: 'Toca una burbuja de partida y luego las que <b>divides</b>, en orden. Ej.: 48 ÷ 2 ÷ 4 = 6.'
    }
  };
  const HOWTO_TAIL = ' Completa los objetivos de cada nivel para ganar premios y subir de rango. ¡Cuidado con la línea de arriba!';
  const OP_COLORS = { suma: '#22b35e', resta: '#ff8a1f', mult: '#a742c9', div: '#19b5c4' };
  const CONFETTI_COLORS = ['#0a63ad', '#1a7fd1', '#ffffff', '#ffc933', '#ff8a1f', '#22b35e', '#a742c9', '#ec4899'];
  const JOY = ['¡Muy bien, {n}!', '¡Genial!', '¡Excelente, {n}!', '¡Eso es!', '¡Sigue así, {n}!', '¡Increíble!', '¡Bravo, {n}!'];
  const OOPS = ['¡Casi, {n}! Inténtalo otra vez', '¡Tú puedes, {n}!', 'Revisa la operación', '¡No te rindas, {n}!'];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ───────── Datos guardados en el navegador (por jugador) ───────── */
  const MAX_PLAYERS = 3;   // jugadores que se guardan en cada equipo

  const store = (function () {
    const KEY = 'prolipa-bolas-v2';
    const data = { sound: true, op: 'suma', diff: 'normal', current: '', players: {} };
    try { Object.assign(data, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* sin almacenamiento */ }
    if (!data.players || typeof data.players !== 'object') data.players = {};
    /* Conserva los 3 jugadores más recientes (el jugador indicado en keep siempre se queda) */
    function trim(keep) {
      const ps = data.players;
      const keys = Object.keys(ps).sort((a, b) => (b === keep) - (a === keep) || (ps[b].last || 0) - (ps[a].last || 0));
      keys.slice(MAX_PLAYERS).forEach(k => { delete ps[k]; });
    }
    (function migrate() {
      const out = {};
      Object.keys(data.players).forEach(k => {
        const p = data.players[k];
        if (!p || !p.name) return;
        const nk = p.name.trim().toLowerCase();
        const q = out[nk] || (out[nk] = { best: {}, bestLevel: 1, last: 0, name: p.name.trim(), animal: p.animal || 'gato' });
        Object.keys(p.best || {}).forEach(r => { q.best[r] = Math.max(q.best[r] || 0, p.best[r]); });
        q.bestLevel = Math.max(q.bestLevel, p.bestLevel || 1);
        if ((p.last || 0) >= q.last) { q.last = p.last || 0; q.animal = p.animal || q.animal; }
        if (k === data.current) data.current = nk;
      });
      data.players = out;
      if (!out[data.current]) data.current = '';
      trim(data.current);
    })();
    return { data, trim, save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sin almacenamiento */ } } };
  })();

  const player = () => store.data.players[store.data.current] || null;
  const firstName = () => { const p = player(); return p ? p.name.split(/\s+/)[0] : ''; };
  const rankName = lv => Rules.rankFor(lv);
  const withName = t => t.replace('{n}', firstName());

  const initKey = Rules.parseKey(store.data.grade ? Rules.makeKey(String(store.data.grade), store.data.digits) : store.data.diff);
  const sel = { op: OPS[store.data.op] ? store.data.op : 'suma', grade: initKey.grade, digits: initKey.digits, mode: store.data.mode === 'multi' ? 'multi' : 'pair' };
  const diffKey = () => Rules.makeKey(sel.grade, sel.digits);
  const el = {
    stage: $('stage'), field: $('field'), cv: $('cv'), fx: $('fxLayer'),
    profile: $('screenProfile'), menu: $('screenMenu'), pause: $('screenPause'), level: $('screenLevel'), over: $('screenOver'),
    score: $('score'), targetNum: $('targetNum'), target: $('target'), wave: $('wave'), waveFill: $('waveFill'),
    expr: $('expr'), exprText: $('exprText'), exprExtra: $('exprExtra'), banner: $('banner'),
    streak: $('streakNum'),
    opChip: $('opChip'), opSign: $('opChipSign'), opName: $('opChipName'), opSub: $('opChipSub'),
    btnSound: $('btnSound'),
    avatar: $('avatar'), grow: $('avatarGrow'), questTitle: $('questTitle'), time: $('time'), slots: $('slots'),
    inName: $('inName'), btnReady: $('btnReady')
  };

  let fieldH = 560, scale = 1, curLevel = 1, curTarget = 0, lastResult = null;

  /* ───────── Tamaño: el escenario se escala para caber en cualquier pantalla ───────── */
  function fit(relayout) {
    const vw = window.innerWidth || DESIGN_W, vh = window.innerHeight || 700;
    if (relayout) {
      const availH = vh / (vw / DESIGN_W);
      fieldH = Math.max(540, Math.min(900, Math.round(availH - TOP - BAR)));
    }
    document.body.classList.toggle('fullbleed', vw <= 520);
    const H = TOP + fieldH + BAR;
    scale = Math.min(vw / DESIGN_W, vh / H, 1.6);
    el.stage.style.setProperty('--fieldH', fieldH + 'px');
    el.stage.style.transform = 'translate(' + ((vw - DESIGN_W * scale) / 2) + 'px,' + ((vh - H * scale) / 2) + 'px) scale(' + scale + ')';
    const lineY = Game.resize(fieldH, (window.devicePixelRatio || 1) * scale);
    el.stage.style.setProperty('--lineY', lineY + 'px');
  }

  /* ───────── Engranaje del objetivo ───────── */
  (function buildGear() {
    const teeth = 14, step = (Math.PI * 2) / teeth, pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      pts.push([41, a - step * 0.3], [48, a - step * 0.17], [48, a + step * 0.17], [41, a + step * 0.3]);
    }
    $('gearPath').setAttribute('d', 'M' + pts.map(p => (50 + p[0] * Math.cos(p[1])).toFixed(2) + ' ' + (50 + p[0] * Math.sin(p[1])).toFixed(2)).join('L') + 'Z');
  })();

  /* ───────── Pantallas ───────── */
  function showScreen(node) {
    gsap.killTweensOf(node);
    node.classList.add('show');
    const card = node.querySelector('.menu-card, .panel');
    gsap.fromTo(node, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(card, { y: 28, scale: 0.9 }, { y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.7)', clearProps: 'transform' });
  }

  function hideScreen(node) {
    if (!node.classList.contains('show')) return;
    gsap.killTweensOf(node);
    gsap.to(node, { opacity: 0, duration: 0.22, onComplete: () => node.classList.remove('show') });
  }

  /* ───────── ¿Quién va a jugar? ───────── */
  let draft = { name: '', animal: '' };

  function recentPlayers() {
    return Object.keys(store.data.players)
      .map(k => ({ key: k, p: store.data.players[k] }))
      .sort((a, b) => (b.p.last || 0) - (a.p.last || 0))
      .slice(0, MAX_PLAYERS);
  }

  /* Cuadrícula de animales para elegir (se arma una sola vez) */
  function buildAnimals() {
    const box = $('animals');
    box.innerHTML = '';
    Avatar.ANIMALS.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'animal';
      b.dataset.animal = a.id;
      b.setAttribute('role', 'radio');
      b.innerHTML = '<div class="animal-av"></div><b></b>';
      b.querySelector('b').textContent = a.name;
      Avatar.render(b.querySelector('.animal-av'), { animal: a.id }, 1, 'happy');
      b.addEventListener('click', () => {
        Sound.unlock(); Sound.click();
        draft.animal = a.id;
        renderProfile();
        const av = b.querySelector('.animal-av');
        Avatar.setMood(av, 'joy');
        setTimeout(() => Avatar.setMood(av, 'happy'), 900);
        gsap.fromTo(av, { y: 0, scale: 0.9 }, { keyframes: [{ y: -12, scale: 1.1, duration: 0.18, ease: 'power2.out' }, { y: 0, scale: 1, duration: 0.3, ease: 'bounce.out' }] });
      });
      box.appendChild(b);
    });
  }

  const normKey = n => n.trim().replace(/\s+/g, ' ').toLowerCase();

  /* Avisa que solo se guardan 3 jugadores y a quién se borraría si entra uno nuevo */
  function updateNote() {
    const note = $('fullNote');
    const ps = store.data.players;
    const keys = Object.keys(ps).sort((a, b) => (ps[b].last || 0) - (ps[a].last || 0));
    if (keys.length < MAX_PLAYERS) { note.hidden = true; return; }
    const k = normKey(draft.name);
    note.hidden = false;
    if (k && !ps[k]) {
      const victim = ps[keys[keys.length - 1]];
      note.textContent = 'Este equipo guarda solo ' + MAX_PLAYERS + ' jugadores: con un nombre nuevo se borrará a ' + victim.name.split(/\s+/)[0] + ' (el que jugó hace más tiempo).';
      note.classList.add('warn');
    } else {
      note.textContent = 'Este equipo guarda hasta ' + MAX_PLAYERS + ' jugadores.';
      note.classList.remove('warn');
    }
  }

  function renderProfile() {
    document.querySelectorAll('.animal').forEach(b => {
      const on = b.dataset.animal === draft.animal;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', on);
    });
    const list = recentPlayers();
    $('recent').hidden = !list.length;
    const box = $('recentList');
    box.innerHTML = '';
    list.forEach(({ key, p }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rp';
      b.innerHTML = '<div class="rp-av"></div><span></span>';
      b.querySelector('span').textContent = p.name.split(/\s+/)[0];
      Avatar.render(b.querySelector('.rp-av'), p, p.bestLevel || 1, 'happy');
      b.addEventListener('click', () => { Sound.unlock(); Sound.click(); choosePlayer(key); });
      box.appendChild(b);
    });
    el.btnReady.disabled = !(draft.name.trim() && draft.animal);
    updateNote();
  }

  /* El formulario siempre empieza vacío: cada estudiante escribe su nombre o toca el suyo en la lista */
  function openProfile() {
    draft = { name: '', animal: '' };
    el.inName.value = draft.name;
    renderProfile();
    hideScreen(el.menu);
    showScreen(el.profile);
  }

  function openProfileBoot() {
    draft = { name: '', animal: '' };
    el.inName.value = '';
    renderProfile();
  }

  function choosePlayer(key) {
    store.data.current = key;
    store.data.players[key].last = Date.now();
    store.save();
    enterMenu();
  }

  function saveProfile() {
    const name = draft.name.trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!name || !draft.animal) return;
    const key = name.toLowerCase();
    const prev = store.data.players[key] || { best: {}, bestLevel: 1 };
    store.data.players[key] = Object.assign(prev, { name, animal: draft.animal, last: Date.now() });
    store.data.current = key;
    store.trim(key);
    store.save();
    Sound.unlock();
    Sound.click();
    enterMenu();
  }

  function enterMenu() {
    refreshMenu();
    fit(true);
    hideScreen(el.profile);
    showScreen(el.menu);
    gsap.from('.op-btn', { y: 16, opacity: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out', delay: 0.1, clearProps: 'all' });
  }

  /* ───────── Menú ───────── */
  function recordFor(op, diff, mode) { const p = player(); return (p && p.best && p.best[op + '-' + diff + '-' + mode]) || 0; }

  /* Botones de grado 1.º a 10.º (se arman una sola vez) */
  function buildGrades() {
    const box = $('grades');
    box.innerHTML = '';
    Rules.GRADES.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.grade = g;
      b.setAttribute('role', 'radio');
      b.innerHTML = g + '<small>.º</small>';
      b.addEventListener('click', () => { Sound.unlock(); Sound.click(); sel.grade = g; sel.digits = Rules.defaultDigits(g); refreshMenu(); });
      box.appendChild(b);
    });
  }

  function refreshMenu() {
    const p = player();
    document.querySelectorAll('.op-btn').forEach(b => {
      const on = b.dataset.op === sel.op;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', on);
      b.querySelector('i').textContent = recordFor(b.dataset.op, diffKey(), sel.mode);
    });
    document.querySelectorAll('#grades button').forEach(b => {
      const on = b.dataset.grade === sel.grade;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', on);
    });
    document.querySelectorAll('.dig').forEach(b => {
      const d = +b.dataset.digits;
      const on = d === sel.digits;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', on);
      b.querySelector('small').textContent = Rules.exampleFor(sel.op, d);
    });
    document.querySelectorAll('.mode').forEach(b => {
      const on = b.dataset.mode === sel.mode;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', on);
    });
    $('gradeInfo').textContent = gradeName(sel.grade) + ' · ' + Rules.describe(sel.op, diffKey());
    const text = HOWTO[sel.op][sel.mode] + HOWTO_TAIL;
    $('howto').innerHTML = HOWTO[sel.op][sel.mode];
    $('howtoPause').innerHTML = text;
    $('howto').style.borderLeftColor = $('howtoPause').style.borderLeftColor = OP_COLORS[sel.op];
    if (p) {
      /* El personaje conserva los accesorios del mejor nivel que ha alcanzado */
      Avatar.render($('menuMascot'), p, p.bestLevel || 1, 'happy');
      $('playerHello').textContent = '¡Hola, ' + firstName() + '!';
      $('playerCourse').textContent = 'Mejor nivel: ' + (p.bestLevel || 1);
    }
  }

  /* ───────── Misión: el personaje y los libros del nivel ───────── */
  let baseMood = 'happy', holdMood = false, moodTimer = 0, sayTimer = 0, slotEls = [], wasDanger = false;

  const levelTitle = () => firstName() + ' · Nivel ' + curLevel + ' · ' + rankName(curLevel);

  function setMood(m, hold) {
    clearTimeout(moodTimer);
    Avatar.setMood(el.grow, m);
    holdMood = !!hold;
    if (hold) moodTimer = setTimeout(() => { holdMood = false; Avatar.setMood(el.grow, baseMood); }, hold);
  }

  function say(text, ms) {
    clearTimeout(sayTimer);
    el.questTitle.textContent = text;
    el.questTitle.classList.add('say');
    sayTimer = setTimeout(() => { el.questTitle.textContent = levelTitle(); el.questTitle.classList.remove('say'); }, ms || 1700);
  }

  function renderAvatar() { Avatar.render(el.grow, player(), curLevel, holdMood ? 'joy' : baseMood); }

  function setChip() {
    el.opChip.dataset.op = sel.op;
    el.opSign.textContent = OPS[sel.op].sign;
    el.opName.textContent = OPS[sel.op].name;
    el.opSub.textContent = sel.grade + '.º · ' + Rules.digitsLabel(sel.digits) + ' · ' + MODE_SHORT[sel.mode];
  }

  function buildSlots(goal, lit) {
    el.slots.innerHTML = '';
    slotEls = [];
    for (let i = 0; i < goal; i++) {
      const s = document.createElement('span');
      s.className = 'slot' + (i < lit ? ' on' : '');
      s.innerHTML = '<img src="assets/prolipa-icon.png" alt="">';
      el.slots.appendChild(s);
      slotEls.push(s);
    }
  }

  function pips(slot) {
    const colors = ['#ffc933', '#ff8a1f', '#22b35e', '#2f7fe0', '#ec4899', '#a742c9'];
    colors.forEach((c, i) => {
      const p = document.createElement('i');
      p.className = 'pip';
      p.style.cssText = 'left:7px;top:8px;background:' + c;
      slot.appendChild(p);
      const a = (i / colors.length) * Math.PI * 2;
      gsap.fromTo(p, { x: 0, y: 0, opacity: 1, scale: 1 }, {
        x: Math.cos(a) * 17, y: Math.sin(a) * 17, opacity: 0, scale: 0.3, duration: 0.55, ease: 'power2.out', onComplete: () => p.remove()
      });
    });
  }

  /* ───────── Flujo de la partida ───────── */
  function play() {
    Sound.unlock();
    Sound.click();
    store.data.op = sel.op;
    store.data.grade = sel.grade;
    store.data.digits = sel.digits;
    store.data.mode = sel.mode;
    store.save();
    Game.quit();
    fit(true);
    curLevel = 1;
    baseMood = 'happy'; holdMood = false; wasDanger = false;
    setChip();
    el.time.textContent = '00:00';
    hideScreen(el.menu);
    hideScreen(el.over);
    hideScreen(el.pause);
    hideScreen(el.level);
    Game.start(sel.op, diffKey(), sel.mode);
  }

  function goMenu() {
    Sound.click();
    Game.quit();
    hideScreen(el.pause);
    hideScreen(el.over);
    hideScreen(el.level);
    enterMenu();
  }

  function pauseGame() {
    if (Game.getState() !== 'playing') return;
    Sound.click();
    resetFinishButton();
    Game.pause();
    showScreen(el.pause);
  }

  function resumeGame() {
    Sound.click();
    hideScreen(el.pause);
    Game.resume();
  }

  /* "Terminar actividad" pide una segunda pulsación para evitar toques accidentales */
  let finishTimer = 0;
  function resetFinishButton() {
    clearTimeout(finishTimer);
    const b = $('btnFinish');
    b.classList.remove('confirm');
    b.querySelector('span').textContent = 'Terminar actividad y ver reporte';
  }

  function finishActivity() {
    const b = $('btnFinish');
    if (!b.classList.contains('confirm')) {
      Sound.click();
      b.classList.add('confirm');
      b.querySelector('span').textContent = '¿Seguro? Toca otra vez';
      finishTimer = setTimeout(resetFinishButton, 3500);
      return;
    }
    resetFinishButton();
    Sound.click();
    hideScreen(el.pause);
    Game.finish('manual');
  }

  /* ───────── Nivel completado ───────── */
  function showLevelComplete(info) {
    const p = player();
    $('lvTitle').textContent = '¡Nivel ' + info.level + ' completado!';
    Avatar.render($('lvMascot'), p, info.next, 'joy');
    $('lvRank').textContent = firstName() + ' ahora es ' + rankName(info.next);
    const gift = Avatar.unlock(info.next);
    $('lvUnlock').textContent = gift ? '¡Ganaste ' + gift + '!' : '¡Sigue creciendo!';
    $('lvNext').textContent = 'Siguiente meta: resolver ' + info.nextGoal + ' objetivos';
    const stars = $('lvStars').querySelectorAll('svg');
    stars.forEach(s => s.classList.remove('on'));
    showScreen(el.level);
    gsap.from($('lvMascot'), { scale: 0.3, y: 40, duration: 0.8, ease: 'elastic.out(1, 0.55)' });
    gsap.from('#lvUnlock', { scale: 0.5, opacity: 0, duration: 0.5, delay: 0.5, ease: 'back.out(3)' });
    stars.forEach((s, i) => {
      if (i >= info.stars) return;
      setTimeout(() => {
        s.classList.add('on');
        gsap.fromTo(s, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' });
        Sound.star(i + 3);
      }, 600 + i * 380);
    });
    celebrate();
  }

  function nextLevel() {
    Sound.click();
    hideScreen(el.level);
    Game.nextLevel();
    say('¡Nivel ' + curLevel + '! Meta: ' + Rules.goalFor(curLevel) + ' objetivos', 2600);
    setMood('joy', 1400);
  }

  /* ───────── Confeti ───────── */
  let bookShape = null;
  try {
    bookShape = confetti.shapeFromPath({ path: 'M2 0h6a2 2 0 0 1 2 2v26a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z' });
  } catch (e) { /* versión sin shapeFromPath */ }

  function celebrate() {
    if (typeof confetti !== 'function') return;
    const r = el.stage.getBoundingClientRect();
    const origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height * 0.42) / window.innerHeight };
    const shapes = bookShape ? [bookShape, 'circle', 'square'] : ['circle', 'square'];
    confetti({ particleCount: 90, spread: 100, startVelocity: 46, origin, colors: CONFETTI_COLORS, shapes, scalar: 1.2, ticks: 170, zIndex: 100 });
    setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: origin.x - 0.15, y: origin.y + 0.1 }, colors: CONFETTI_COLORS, shapes, scalar: 1.1, zIndex: 100 }), 250);
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: origin.x + 0.15, y: origin.y + 0.1 }, colors: CONFETTI_COLORS, shapes, scalar: 1.1, zIndex: 100 }), 250);
  }

  function fireworks() {
    if (typeof confetti !== 'function') return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => confetti({
        particleCount: 60, spread: 360, startVelocity: 28, gravity: 0.8, ticks: 180, zIndex: 100,
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.15 + Math.random() * 0.35 },
        colors: CONFETTI_COLORS, shapes: bookShape ? [bookShape, 'circle'] : ['circle'], scalar: 1.1
      }), i * 260);
    }
  }

  /* ───────── Ganchos del juego → interfaz ───────── */
  const scoreObj = { v: 0 };
  let exprTimer = 0;

  function showExpr(info) {
    clearTimeout(exprTimer);
    const box = el.expr;
    if (!info) { box.classList.remove('show'); return; }
    let txt = info.expr;
    let extra = '';
    if (info.state === 'partial') {
      if (info.total != null) txt += ' = ' + info.total;
      if (info.remaining > 0 && sel.op === 'suma' && info.total != null) extra = 'faltan ' + info.remaining;
    } else if (info.state === 'success') {
      txt += ' = ' + info.total;
    } else if (info.state === 'error') {
      txt += ' = ' + info.total;
      extra = '≠ ' + curTarget;
    }
    box.style.fontSize = txt.length > 26 ? '15px' : (txt.length > 20 ? '18px' : '');
    el.exprText.textContent = txt;
    el.exprExtra.textContent = extra;
    const cls = info.state === 'success' ? 'ok' : (info.state === 'error' ? 'bad' : '');
    box.classList.remove('ok', 'bad');
    void box.offsetWidth;
    if (cls) box.classList.add(cls);
    box.classList.add('show');
    if (cls) exprTimer = setTimeout(() => box.classList.remove('show'), 1100);
  }

  function showBanner(kind, text) {
    const b = el.banner;
    b.className = 'banner ' + kind;
    b.querySelector('span').textContent = text;
    gsap.killTweensOf(b);
    gsap.timeline()
      .set(b, { opacity: 1, xPercent: -50, yPercent: -50, y: 0, scale: 0.2, rotation: -8 })
      .to(b, { scale: 1.12, rotation: 0, duration: 0.35, ease: 'back.out(2.2)' })
      .to(b, { scale: 1, duration: 0.15 })
      .to(b, { opacity: 0, y: -46, duration: 0.4, delay: 0.55, ease: 'power1.in' });
  }

  function floatText(x, y, text) {
    const d = document.createElement('div');
    d.className = 'float';
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    el.fx.appendChild(d);
    gsap.timeline({ onComplete: () => d.remove() })
      .fromTo(d, { xPercent: -50, yPercent: -50, y: 0, scale: 0.4, opacity: 0 }, { y: -50, scale: 1.2, opacity: 1, duration: 0.3, ease: 'back.out(2.4)' })
      .to(d, { y: -110, opacity: 0, duration: 0.5, delay: 0.25, ease: 'power1.in' });
  }

  const hooks = {
    score(total) {
      gsap.to(scoreObj, { v: total, duration: 0.5, ease: 'power2.out', overwrite: true, onUpdate: () => { el.score.textContent = Math.round(scoreObj.v); } });
      if (total > 0) gsap.fromTo(el.score, { scale: 1.4 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    },
    target(t, isNew) {
      curTarget = t;
      el.targetNum.textContent = t;
      el.targetNum.className = String(t).length >= 4 ? 'xl' : (String(t).length >= 3 ? 'l' : '');
      if (isNew) gsap.fromTo(el.target, { scale: 0.3, rotation: -120 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)' });
    },
    expr: showExpr,
    streak(s) {
      el.streak.textContent = s;
      el.streak.parentNode.classList.toggle('on', s > 0);
    },
    wave(p, soon) {
      el.waveFill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)) + ')';
      el.wave.classList.toggle('soon', soon);
    },
    level(l) {
      curLevel = l;
      renderAvatar();
      el.questTitle.textContent = levelTitle();
      setChip();
    },
    goal(lv, hit, goal, lit) {
      if (!lit || slotEls.length !== goal) {
        buildSlots(goal, hit);
      } else {
        const s = slotEls[hit - 1];
        if (s) {
          s.classList.add('on');
          gsap.fromTo(s, { scale: 0, rotation: -60 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)' });
          pips(s);
        }
      }
      gsap.to(el.grow, { scale: 1 + 0.22 * (hit / goal), duration: 0.45, ease: 'back.out(2)' });
    },
    react(kind, streak) {
      if (kind === 'joy') {
        setMood('joy', 1200);
        say(streak >= 3 ? '¡Racha de ' + streak + '!' : withName(pick(JOY)));
      } else {
        setMood('oops', 1200);
        say(withName(pick(OOPS)));
      }
    },
    time(t) { el.time.textContent = Report.mmss(t); },
    banner: showBanner,
    float: floatText,
    danger(level) {
      el.field.classList.toggle('danger', level > 0);
      baseMood = level > 0 ? 'worry' : 'happy';
      if (!holdMood) Avatar.setMood(el.grow, baseMood);
      if (level > 0 && !wasDanger) say('¡Cuidado, ' + firstName() + '! Se llena', 2000);
      wasDanger = level > 0;
    },
    levelComplete: showLevelComplete,
    over(st) {
      const p = player();
      const key = st.op + '-' + st.diff + '-' + st.mode;
      p.best = p.best || {};
      const prev = recordFor(st.op, st.diff, st.mode);
      const isRecord = st.score > prev;
      if (isRecord) p.best[key] = st.score;
      p.bestLevel = Math.max(p.bestLevel || 1, st.level);
      store.save();
      lastResult = { stats: st, isRecord, best: p.best[key] || 0, finishedAt: new Date() };

      const full = st.endedBy === 'full';
      const total = st.hits + st.errors;
      const acc = total ? Math.round((st.hits / total) * 100) : 0;
      const phrase = acc >= 90 ? '¡Excelente!' : (acc >= 70 ? '¡Muy bien!' : (acc >= 40 ? '¡Buen intento!' : '¡Sigue practicando!'));
      $('overTitle').textContent = full ? '¡Se llenó el tablero!' : 'Actividad terminada';
      $('overSub').textContent = firstName() + ' llegó al rango ' + rankName(st.level) + ' · ' + phrase;
      Avatar.render($('overMascot'), p, st.level, isRecord ? 'joy' : (full ? 'oops' : 'happy'));
      $('overBest').textContent = p.best[key] || 0;
      $('stLevel').textContent = st.level;
      $('stTime').textContent = Report.mmss(st.time);
      $('stHits').textContent = st.hits;
      $('stErrors').textContent = st.errors;
      $('stAcc').textContent = acc + '%';
      $('stStreak').textContent = st.bestStreak;
      $('ribbon').classList.toggle('show', isRecord);
      const out = $('overScore');
      out.textContent = '0';
      showScreen(el.over);
      const o = { v: 0 };
      gsap.to(o, { v: st.score, duration: 1, ease: 'power2.out', delay: 0.3, onUpdate: () => { out.textContent = Math.round(o.v); } });
      if (isRecord) { Sound.record(); setTimeout(fireworks, 400); }
    }
  };

  /* ───────── Reporte PDF ───────── */
  async function downloadReport() {
    if (!lastResult) return;
    const p = player();
    const btn = $('btnReport'), label = btn.querySelector('span'), old = label.textContent;
    const st = lastResult.stats;
    btn.disabled = true;
    label.textContent = 'Generando…';
    let done = '¡Reporte descargado!';
    try {
      await Report.download({
        name: p.name,
        profile: { animal: p.animal },
        opName: OPS[st.op].name,
        diffName: gradeName(Rules.parseKey(st.diff).grade),
        digitsName: Rules.digitsLabel(Rules.parseKey(st.diff).digits),
        diffKey: Rules.parseKey(st.diff).grade,
        modeName: MODE_NAMES[st.mode],
        rank: Rules.rankFor(st.level),
        stats: st,
        best: lastResult.best,
        isRecord: lastResult.isRecord,
        finishedAt: lastResult.finishedAt
      });
    } catch (e) {
      console.error(e);
      done = 'No se pudo crear el reporte';
    }
    label.textContent = done;
    setTimeout(() => { label.textContent = old; btn.disabled = false; }, 2400);
  }

  /* ───────── Adornos de fondo (burbujas flotantes con el icono de Prolipa) ───────── */
  function buildDeco() {
    const host = $('backdrop');
    const colors = ['#ef4444', '#19b5c4', '#ffc933', '#22b35e', '#ff8a1f', '#a742c9', '#ec4899', '#2f7fe0'];
    for (let i = 0; i < 12; i++) {
      const size = 70 + Math.random() * 90;
      const d = document.createElement('div');
      d.className = 'deco';
      d.style.cssText = 'width:' + size + 'px;height:' + size + 'px;background:radial-gradient(circle at 32% 28%,' +
        colors[i % colors.length] + 'ff,' + colors[i % colors.length] + 'cc 60%,#00000044);' +
        'left:' + (Math.random() * 94) + '%;top:' + (Math.random() * 90) + '%;';
      d.innerHTML = '<img src="assets/prolipa-icon-white.png" alt=""><b style="font-size:' + (size * 0.4) + 'px">' + (1 + (i % 9)) + '</b>';
      host.appendChild(d);
      gsap.to(d, {
        x: 'random(-60,60)', y: 'random(-70,70)', rotation: 'random(-25,25)',
        duration: 'random(3.5,6.5)', repeat: -1, yoyo: true, repeatRefresh: true, ease: 'sine.inOut'
      });
    }
  }

  /* ───────── Sonido ───────── */
  function refreshSound() {
    Sound.setEnabled(store.data.sound);
    el.btnSound.querySelector('use').setAttribute('href', store.data.sound ? '#i-sound' : '#i-mute');
  }

  /* ───────── Eventos ───────── */
  const typing = () => document.activeElement && document.activeElement.tagName === 'INPUT';

  function bind() {
    /* Perfil */
    el.inName.addEventListener('input', () => { draft.name = el.inName.value; el.btnReady.disabled = !(draft.name.trim() && draft.animal); updateNote(); });
    el.inName.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (!el.btnReady.disabled) saveProfile(); else el.inName.blur(); } });
    el.btnReady.addEventListener('click', saveProfile);
    $('btnChangePlayer').addEventListener('click', () => { Sound.unlock(); Sound.click(); openProfile(); });

    /* Menú */
    document.querySelectorAll('.op-btn').forEach(b => b.addEventListener('click', () => {
      Sound.unlock(); Sound.click();
      sel.op = b.dataset.op;
      refreshMenu();
      gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', clearProps: 'transform' });
    }));
    document.querySelectorAll('.dig').forEach(b => b.addEventListener('click', () => {
      Sound.unlock(); Sound.click();
      sel.digits = +b.dataset.digits;
      refreshMenu();
      gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', clearProps: 'transform' });
    }));
    document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => {
      Sound.unlock(); Sound.click();
      sel.mode = b.dataset.mode;
      refreshMenu();
      gsap.fromTo(b, { scale: 0.95 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', clearProps: 'transform' });
    }));
    $('btnPlay').addEventListener('click', play);

    /* Partida */
    $('btnPause').addEventListener('click', pauseGame);
    $('btnResume').addEventListener('click', resumeGame);
    $('btnRestart').addEventListener('click', play);
    $('btnFinish').addEventListener('click', finishActivity);
    $('btnNext').addEventListener('click', nextLevel);
    $('btnReport').addEventListener('click', downloadReport);
    $('btnAgain').addEventListener('click', play);
    $('btnMenuP').addEventListener('click', goMenu);
    $('btnMenuO').addEventListener('click', goMenu);
    el.btnSound.addEventListener('click', () => {
      store.data.sound = !store.data.sound;
      store.save();
      refreshSound();
      Sound.unlock();
      Sound.click();
    });

    window.addEventListener('resize', () => { if (!typing()) fit(!Game.isRunning()); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
    document.addEventListener('keydown', e => {
      if (typing()) return;
      const st = Game.getState();
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (st === 'playing') pauseGame();
        else if (st === 'paused') resumeGame();
      } else if ((e.key === 'Enter' || e.key === ' ') && st === 'levelup' && el.level.classList.contains('show')) {
        e.preventDefault();
        nextLevel();
      }
    });
  }

  /* ───────── Arranque: lo primero es saber quién va a jugar ───────── */
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load('700 30px Fredoka').catch(() => {}) : Promise.resolve();
  Promise.all([Assets.ready, fontReady]).then(() => {
    Game.init(el.cv, hooks);
    refreshSound();
    setChip();
    fit(true);
    bind();
    buildDeco();
    buildAnimals();
    buildGrades();
    openProfileBoot();
    document.body.classList.remove('loading');
    gsap.from(el.stage, { y: 40, opacity: 0, duration: 0.6, ease: 'power3.out' });
    gsap.from('#profileCard > *', { y: 16, opacity: 0, duration: 0.4, stagger: 0.05, delay: 0.2, ease: 'power2.out', clearProps: 'all' });
  });
})();
