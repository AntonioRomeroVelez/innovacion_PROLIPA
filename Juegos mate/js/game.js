/* Núcleo del juego: física (Matter.js), selección de burbujas, niveles con metas y dibujo en canvas. */
const Game = (function () {
  'use strict';
  const { Engine, Bodies, Body, Composite } = Matter;

  const W = 440;                 // ancho lógico del campo
  const WALL_L = 30, WALL_R = 410;
  const R = 33;                  // radio de las burbujas
  const FLOOR = 26;              // franja inferior (queda detrás del engranaje del objetivo)
  const PILE = 470;              // alto máximo de la pila: la capacidad es parecida en cualquier pantalla
  let LINE_Y = 62;               // línea de peligro (se ajusta al alto del campo)
  const STEP = 1000 / 60;
  const PALETTE = [
    '#ef4444', '#19b5c4', '#ffc933', '#22b35e', '#ff8a1f', '#a742c9',
    '#ec4899', '#2f7fe0', '#8bd22b', '#5b5bd6', '#b45f3c', '#64748b'
  ];
  const colorFor = v => PALETTE[(v - 1) % PALETTE.length];
  const rnd = (a, b) => a + Math.random() * (b - a);

  const noop = () => {};
  let hooks = {
    score: noop, target: noop, expr: noop, streak: noop, wave: noop, level: noop, goal: noop, react: noop,
    time: noop, banner: noop, float: noop, danger: noop, levelComplete: noop, over: noop
  };

  let cv, ctx;
  let H = 560, k = 1;
  let engine, world;
  let balls = [], selected = [], tasks = [];
  let state = 'menu';            // menu | playing | paused | levelup | over
  let op = 'suma', diff = '3', mode = 'pair', maxN = 2;   // diff = grado (1 a 10) · mode = 'pair' (2 burbujas) o 'multi' (varias)
  let nextId = 1, simT = 0, acc = 0, lastTs = 0;
  let target = 0, score = 0, streak = 0, bestStreak = 0, hits = 0, errors = 0, level = 1, playTime = 0;
  let goal = 5, levelHits = 0, levelErrors = 0, levelStartT = 0, levelLog = [];
  let ballsSolved = 0, endedBy = '', startedAt = null, lastSec = -1;
  let waveTimer = 10, waveInterval = 10, idle = 0, hintBall = null;
  let dangerTime = 0, nearDanger = false, lastDangerSec = 0;
  let dragging = false, lastPt = null;
  let sprites = { body: {}, gloss: null };
  let bg = null;

  /* ───────── Programador de tareas en tiempo de juego (se detiene con la pausa) ───────── */
  function later(sec, fn) { tasks.push({ t: simT + sec, fn }); }
  function runTasks() {
    if (!tasks.length) return;
    const due = tasks.filter(x => x.t <= simT).sort((a, b) => a.t - b.t);
    if (!due.length) return;
    tasks = tasks.filter(x => x.t > simT);
    due.forEach(x => x.fn());
  }

  /* ───────── Mundo físico ───────── */
  function buildWorld() {
    engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    engine.gravity.y = 1.25;
    world = engine.world;
    const opt = { isStatic: true, friction: 0.25, restitution: 0.1 };
    Composite.add(world, [
      Bodies.rectangle(WALL_L - 50, H / 2 - 600, 100, H + 2000, opt),
      Bodies.rectangle(WALL_R + 50, H / 2 - 600, 100, H + 2000, opt),
      Bodies.rectangle(W / 2, H - FLOOR + 50, W + 400, 100, opt)
    ]);
  }

  function addBall(value, x, y, vy) {
    const body = Bodies.circle(x, y, R, {
      restitution: 0.25, friction: 0.08, frictionStatic: 0.4, frictionAir: 0.012, density: 0.0016, slop: 0.02
    });
    Body.setVelocity(body, { x: rnd(-1, 1), y: vy || 0 });
    Body.setAngularVelocity(body, rnd(-0.08, 0.08));
    const ball = {
      id: nextId++, value, body, color: colorFor(value),
      selected: false, popping: false, popAt: 0, big: false, quiet: false, order: 0,
      vs: 1, age: 0, shake: 0
    };
    Composite.add(world, body);
    balls.push(ball);
    return ball;
  }

  function spawnWave(vals) {
    vals.forEach((v, i) => {
      addBall(v, rnd(WALL_L + R + 4, WALL_R - R - 4), -R - 10 - i * (R * 2 + 8), 2);
    });
  }

  function active() { return balls.filter(b => !b.popping); }

  /* ───────── Partida ───────── */
  function reset() {
    buildWorld();
    balls = []; selected = []; tasks = [];
    FX.clear();
    simT = 0; acc = 0; lastTs = 0; nextId = 1;
    score = 0; streak = 0; bestStreak = 0; hits = 0; errors = 0; level = 1; playTime = 0;
    goal = Rules.goalFor(1); levelHits = 0; levelErrors = 0; levelStartT = 0; levelLog = [];
    ballsSolved = 0; endedBy = ''; lastSec = -1;
    idle = 0; hintBall = null; dangerTime = 0; nearDanger = false; lastDangerSec = 0; dragging = false;
  }

  function start(o, d, m) {
    op = o; diff = d; mode = m === 'multi' ? 'multi' : 'pair'; maxN = mode === 'pair' ? 2 : 3;
    const timing = Rules.timingFor(diff);
    reset();
    startedAt = new Date();
    waveInterval = waveTimer = timing.base;
    state = 'playing';
    Sound.unlock();

    const first = Rules.randomPair(op, diff);
    target = first.t;
    spawnWave([first.a, first.b, Rules.randomBall(op, diff)]);

    hooks.score(0, 0);
    hooks.target(target, true);
    hooks.streak(0);
    hooks.level(1);
    hooks.goal(1, 0, goal, false);
    hooks.time(0);
    hooks.expr(null);
    hooks.wave(0, false);
    hooks.danger(0);
  }

  function intervalForLevel() {
    const t = Rules.timingFor(diff);
    return Math.max(t.min, t.base - (level - 1) * 0.6);
  }

  function dropWave() {
    const board = active().map(b => b.value);
    let vals = Array.from({ length: Rules.waveSizeFor(level) }, () => Rules.randomBall(op, diff));
    vals = Rules.ensureSolvable(op, diff, board, vals, target, Math.random, maxN);
    spawnWave(vals);
    Sound.wave();
  }

  function changeTarget() {
    const nt = Rules.nextTarget(op, diff, active().map(b => b.value), target, Math.random, maxN);
    target = nt.target;
    hooks.target(target, true);
    if (nt.spawn) later(0.5, () => spawnWave(nt.spawn));
  }

  /* ───────── Selección ───────── */
  function clearHint() { idle = 0; hintBall = null; }

  function selectBall(b) {
    b.selected = true;
    selected.push(b);
    Sound.select(selected.length);
    clearHint();
    evaluateSelection();
  }

  function unselectBall(b) {
    b.selected = false;
    selected = selected.filter(x => x !== b);
    Sound.unselect();
    clearHint();
    evaluateSelection();
  }

  function evaluateSelection() {
    const vals = selected.map(b => b.value);
    const r = Rules.evaluate(op, vals, target, mode);
    if (r.state === 'success') return success(r);
    if (r.state === 'error') return failure(r);
    hooks.expr(r.state === 'idle' ? null : r);
  }

  function failure(r) {
    errors++;
    levelErrors++;
    streak = 0;
    dragging = false;           // un error termina el gesto: hay que volver a tocar
    selected.forEach(b => {
      b.selected = false;
      b.shake = 1;
      FX.ring(b.body.position.x, b.body.position.y, '#ff3b3b');
    });
    selected = [];
    Sound.error();
    hooks.expr({ state: 'error', expr: r.expr, total: r.total });
    hooks.streak(0);
    hooks.react('oops', 0);
  }

  /* Solo explotan las burbujas que el estudiante resuelve: nada se elimina solo. */
  function success(r) {
    const group = selected.slice();
    selected = [];
    dragging = false;
    const n = group.length;
    hits++; levelHits++; streak++;
    ballsSolved += n;
    bestStreak = Math.max(bestStreak, streak);

    const pts = n * 10 + (n > 2 ? (n - 2) * 10 : 0) + Math.min(streak, 10) * 5;
    let cx = 0, cy = 0;
    group.forEach(b => { cx += b.body.position.x; cy += b.body.position.y; });
    cx /= n; cy /= n;

    group.forEach((b, i) => popBall(b, i * 0.07, i, {}));
    Sound.combo(n);
    Sound.star(levelHits);

    score += pts;
    hooks.score(score, pts);
    hooks.float(cx, cy - 8, '+' + pts, 'good');
    hooks.streak(streak);
    hooks.expr({ state: 'success', expr: r.expr, total: r.total });
    hooks.react('joy', streak);
    hooks.goal(level, levelHits, goal, true);
    if (streak % 5 === 0) later(0.3, () => hooks.banner('streak', '¡Racha x' + streak + '!'));

    clearHint();
    if (levelHits >= goal) completeLevel(); else changeTarget();
  }

  /* ───────── Niveles ───────── */
  function completeLevel() {
    const total = levelHits + levelErrors;
    const acc = total ? levelHits / total : 1;
    const info = {
      level, goal, hits: levelHits, errors: levelErrors, time: playTime - levelStartT,
      stars: acc >= 0.9 ? 3 : (acc >= 0.7 ? 2 : 1), completed: true
    };
    levelLog.push(info);
    state = 'levelup';          // se detienen las oleadas mientras se celebra
    dragging = false;
    hooks.expr(null);
    hooks.danger(0);
    const next = level + 1;
    later(1.0, () => {
      Sound.cheer();
      hooks.levelComplete(Object.assign({ next, nextGoal: Rules.goalFor(next) }, info));
    });
  }

  function nextLevel() {
    if (state !== 'levelup') return;
    level++;
    levelHits = 0; levelErrors = 0; levelStartT = playTime;
    goal = Rules.goalFor(level);
    waveInterval = intervalForLevel();
    waveTimer = waveInterval;   // un respiro antes de la próxima oleada
    state = 'playing';
    lastTs = 0;
    hooks.level(level);
    hooks.goal(level, 0, goal, false);
    changeTarget();
    clearHint();
  }

  function popBall(b, delay, idx, o) {
    if (b.popping) return;
    b.popping = true;
    b.popAt = simT + delay + 0.1;
    b.order = idx;
    b.big = !!o.big;
    b.quiet = !!o.quiet;
  }

  function explode(b) {
    const i = balls.indexOf(b);
    if (i < 0) return;
    balls.splice(i, 1);
    Composite.remove(world, b.body);
    const p = b.body.position;
    FX.pop(p.x, p.y, b.color, { big: b.big });
    if (!b.quiet) Sound.pop(b.order);
    const range = R * 3.2;
    for (const o of balls) {
      if (o.popping) continue;
      const dx = o.body.position.x - p.x, dy = o.body.position.y - p.y, d = Math.hypot(dx, dy);
      if (d < range && d > 0.1) {
        const s = 2.6 * (1 - d / range);
        Body.setVelocity(o.body, { x: o.body.velocity.x + dx / d * s, y: o.body.velocity.y + dy / d * s - 0.6 });
      }
    }
  }

  /* Termina la partida: reason 'full' (se llenó el tablero) o 'manual' (el estudiante terminó la actividad) */
  function finish(reason) {
    if (state !== 'playing' && state !== 'paused') return;
    levelLog.push({
      level, goal, hits: levelHits, errors: levelErrors, time: playTime - levelStartT, stars: 0, completed: false
    });
    state = 'over';
    endedBy = reason;
    dragging = false;
    selected.forEach(b => { b.selected = false; });
    selected = [];
    hooks.expr(null);
    hooks.danger(0);
    if (reason === 'full') {
      Sound.gameOver();
      later(1.4, () => hooks.over(stats()));   // se alcanza a ver el tablero lleno
    } else {
      later(0.05, () => hooks.over(stats()));
    }
  }

  function stats() {
    return {
      op, diff, mode, score, hits, errors, bestStreak, level, goal, levelHits, time: playTime,
      levelsDone: levelLog.filter(l => l.completed).length,
      ballsSolved, levelLog: levelLog.slice(), endedBy, startedAt
    };
  }

  /* ───────── Bucle de simulación ───────── */
  function tick(dt) {
    simT += dt;
    for (const b of balls) {
      b.age += dt;
      if (b.shake > 0) b.shake = Math.max(0, b.shake - dt * 2.2);
      const want = b.popping ? (simT >= b.popAt - 0.1 ? 1.35 : 1.1) : (b.selected ? 1.1 : 1);
      b.vs += (want - b.vs) * Math.min(1, dt * 22);
    }
    const due = balls.filter(b => b.popping && simT >= b.popAt);
    due.forEach(explode);
    runTasks();
    FX.update(dt);

    if (state !== 'playing') return;
    playTime += dt;
    const sec = Math.floor(playTime);
    if (sec !== lastSec) { lastSec = sec; hooks.time(playTime); }

    /* Oleadas de burbujas */
    waveTimer -= dt;
    if (active().length <= 2 && waveTimer > 1.5) waveTimer = 1.2;
    hooks.wave(1 - Math.max(0, waveTimer) / waveInterval, waveTimer < 2);
    if (waveTimer <= 0) { dropWave(); waveTimer = waveInterval; }

    /* Peligro: burbujas quietas por encima de la línea */
    let over = false, near = false;
    for (const b of balls) {
      if (b.popping || b.age < 1.2 || b.body.speed > 1.5) continue;
      const top = b.body.position.y - R;
      if (top < LINE_Y) over = true;
      else if (top < LINE_Y + 46) near = true;
    }
    nearDanger = near;
    dangerTime = over ? dangerTime + dt : Math.max(0, dangerTime - dt * 2);
    hooks.danger(Math.min(1, dangerTime / 3));
    const dangerSec = Math.ceil(3 - dangerTime);
    if (over && dangerSec !== lastDangerSec) Sound.tick();
    lastDangerSec = over ? dangerSec : 0;
    if (dangerTime >= 3) { finish('full'); return; }

    /* Pista automática si el jugador se atasca */
    if (!selected.length) {
      idle += dt;
      if (idle > 12 && !hintBall) {
        const act = active();
        const combo = Rules.findCombo(op, act.map(b => b.value), target, maxN);
        if (combo) hintBall = act[combo[0]];
      }
    }
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = lastTs ? Math.min(100, ts - lastTs) : 16;
    lastTs = ts;
    if (state === 'menu') return;
    if (state !== 'paused') {
      acc += dt;
      while (acc >= STEP) {
        Engine.update(engine, STEP);
        tick(STEP / 1000);
        acc -= STEP;
      }
    }
    render();
  }

  /* ───────── Dibujo ───────── */
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * k);
    c.height = Math.ceil(h * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    return { c, g };
  }

  function bodySprite(color) {
    if (sprites.body[color]) return sprites.body[color];
    const pad = 10, size = (R + pad) * 2;
    const { c, g } = makeCanvas(size, size);
    g.translate(size / 2, size / 2);
    g.save();
    g.shadowColor = 'rgba(0,30,70,0.35)';
    g.shadowBlur = 8;
    g.shadowOffsetY = 4;
    g.beginPath();
    g.arc(0, 0, R - 1, 0, Math.PI * 2);
    g.fillStyle = Color.shade(color, -0.3);
    g.fill();
    g.restore();
    const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R);
    gr.addColorStop(0, Color.shade(color, 0.4));
    gr.addColorStop(0.55, color);
    gr.addColorStop(1, Color.shade(color, -0.25));
    g.beginPath();
    g.arc(0, 0, R - 1.5, 0, Math.PI * 2);
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = Color.shade(color, -0.42);
    g.stroke();
    sprites.body[color] = { c, size };
    return sprites.body[color];
  }

  function glossSprite() {
    if (sprites.gloss) return sprites.gloss;
    const size = R * 2;
    const { c, g } = makeCanvas(size, size);
    g.translate(R, R);
    g.save();
    g.beginPath();
    g.arc(0, 0, R - 2, 0, Math.PI * 2);
    g.clip();
    g.rotate(-0.7);
    const gr = g.createLinearGradient(0, -R, 0, -R * 0.25);
    gr.addColorStop(0, 'rgba(255,255,255,0.8)');
    gr.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(0, -R * 0.62, R * 0.55, R * 0.27, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(-R * 0.62, -R * 0.2, R * 0.075, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(-R * 0.5, -R * 0.02, R * 0.04, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, R * 0.8, 0.15 * Math.PI, 0.6 * Math.PI); g.stroke();
    sprites.gloss = { c, size };
    return sprites.gloss;
  }

  function buildBackground() {
    const { c, g } = makeCanvas(W, H);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f4f9ff');
    grad.addColorStop(1, '#d9e9fa');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    /* Tablero de ajedrez suave */
    const T = (WALL_R - WALL_L) / 7;
    g.fillStyle = 'rgba(10,99,173,0.07)';
    for (let r = 0, y = 0; y < H; y += T, r++) {
      for (let col = 0; col < 7; col++) {
        if ((r + col) % 2 === 0) g.fillRect(WALL_L + col * T, y, T, T);
      }
    }

    /* Franjas laterales con iconos */
    const side = (x0, x1) => {
      const sg = g.createLinearGradient(x0, 0, x1, 0);
      sg.addColorStop(0, '#003f7d');
      sg.addColorStop(1, '#0a63ad');
      g.fillStyle = sg;
      g.fillRect(x0, 0, x1 - x0, H);
      if (Assets.iconWhite && Assets.iconWhite.naturalWidth) {
        g.globalAlpha = 0.22;
        for (let y = 20; y < H; y += 64) g.drawImage(Assets.iconWhite, (x0 + x1) / 2 - 10, y, 20, 22);
        g.globalAlpha = 1;
      }
    };
    side(0, WALL_L);
    side(WALL_R, W);
    for (const x of [WALL_L, WALL_R]) {
      g.fillStyle = '#7cc4ff';
      g.fillRect(x - (x === WALL_L ? 2 : 0), 0, 2, H);
    }
    /* Piso: franja azul donde queda el engranaje del objetivo */
    const fy = H - FLOOR;
    const floor = g.createLinearGradient(0, fy, 0, H);
    floor.addColorStop(0, '#0a63ad');
    floor.addColorStop(1, '#003f7d');
    g.fillStyle = floor;
    g.fillRect(0, fy, W, FLOOR);
    g.fillStyle = '#7cc4ff';
    g.fillRect(0, fy, W, 3);
    const sh = g.createLinearGradient(0, fy - 18, 0, fy);
    sh.addColorStop(0, 'rgba(0,63,125,0)');
    sh.addColorStop(1, 'rgba(0,63,125,0.16)');
    g.fillStyle = sh;
    g.fillRect(WALL_L, fy - 18, WALL_R - WALL_L, 18);
    bg = c;
  }

  function drawLine() {
    const danger = dangerTime > 0 || (state === 'over' && endedBy === 'full');
    ctx.save();
    ctx.lineWidth = danger ? 4 : 3;
    ctx.setLineDash([11, 8]);
    ctx.lineDashOffset = -simT * 14;
    if (danger) {
      ctx.strokeStyle = 'rgba(239,68,68,' + (0.65 + 0.35 * Math.sin(simT * 14)) + ')';
    } else if (nearDanger) {
      ctx.strokeStyle = 'rgba(255,138,31,' + (0.7 + 0.3 * Math.sin(simT * 7)) + ')';
    } else {
      ctx.strokeStyle = 'rgba(0,63,125,0.45)';
    }
    ctx.beginPath();
    ctx.moveTo(WALL_L, LINE_Y);
    ctx.lineTo(WALL_R, LINE_Y);
    ctx.stroke();
    ctx.restore();
    if (danger && state === 'playing') {
      const txt = '¡CUIDADO!  ' + Math.max(1, Math.ceil(3 - dangerTime));
      ctx.save();
      ctx.font = '700 22px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(txt).width + 30;
      ctx.fillStyle = 'rgba(239,68,68,0.94)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(W / 2 - w / 2, LINE_Y - 56, w, 34, 17) : ctx.rect(W / 2 - w / 2, LINE_Y - 56, w, 34);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, W / 2, LINE_Y - 38);
      ctx.restore();
    }
  }

  function drawLinks() {
    if (selected.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      selected.forEach((b, i) => (i ? ctx.lineTo(b.body.position.x, b.body.position.y) : ctx.moveTo(b.body.position.x, b.body.position.y)));
    };
    ctx.strokeStyle = 'rgba(0,99,173,0.45)'; ctx.lineWidth = 14; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 6; path(); ctx.stroke();
    ctx.restore();
  }

  function drawBall(b) {
    const p = b.body.position;
    const bs = bodySprite(b.color), gs = glossSprite();
    const shakeX = b.shake > 0 ? Math.sin(simT * 70) * b.shake * 6 : 0;
    ctx.save();
    ctx.translate(p.x + shakeX, p.y);
    ctx.scale(b.vs, b.vs);
    ctx.drawImage(bs.c, -bs.size / 2, -bs.size / 2, bs.size, bs.size);

    /* Icono de Prolipa: gira con la burbuja, como un sello grabado */
    if (Assets.iconWhite && Assets.iconWhite.naturalWidth) {
      const iw = R * 1.3, ih = iw * 446 / 404;
      ctx.save();
      ctx.rotate(b.body.angle);
      ctx.globalAlpha = 0.42;
      ctx.drawImage(Assets.iconWhite, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    }
    ctx.drawImage(gs.c, -gs.size / 2, -gs.size / 2, gs.size, gs.size);

    /* Número siempre derecho para que se lea bien (6 y 9 no se confunden) */
    const fs = b.value >= 1000 ? 17 : (b.value >= 100 ? 21 : (b.value >= 10 ? 27 : 33));
    ctx.font = '700 ' + fs + 'px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = Color.shade(b.color, -0.5);
    ctx.strokeText(b.value, 0, 2);
    ctx.fillStyle = '#fff';
    ctx.fillText(b.value, 0, 2);

    if (b.selected) {
      ctx.beginPath();
      ctx.arc(0, 0, R + 3, 0, Math.PI * 2);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = 'rgba(0,150,255,0.95)';
      ctx.shadowBlur = 16;
      ctx.stroke();
    } else if (b === hintBall && !b.popping) {
      ctx.beginPath();
      ctx.arc(0, 0, R + 6, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = -simT * 40;
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(simT * 7);
      ctx.strokeStyle = '#ffb300';
      ctx.stroke();
    }
    ctx.restore();
  }

  function render() {
    const s = cv.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (bg) ctx.drawImage(bg, 0, 0, cv.width, cv.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    drawLine();
    drawLinks();
    for (const b of balls) drawBall(b);
    FX.draw(ctx);
  }

  /* ───────── Entrada (mouse / táctil) ───────── */
  function toLocal(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function hit(x, y) {
    let best = null, bd = Infinity;
    for (const b of balls) {
      if (b.popping) continue;
      const d = Math.hypot(b.body.position.x - x, b.body.position.y - y);
      if (d <= R * 1.1 && d < bd) { best = b; bd = d; }
    }
    return best;
  }

  /* Selecciona todas las burbujas que toca el dedo entre dos puntos (un deslizamiento rápido no se salta ninguna) */
  function sweep(a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12));
    for (let i = 1; i <= n; i++) {
      if (!dragging || state !== 'playing') return;
      const ball = hit(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n);
      if (ball && !ball.selected) selectBall(ball);
    }
  }

  function onDown(e) {
    Sound.unlock();
    if (state !== 'playing') return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }
    const pt = toLocal(e);
    const b = hit(pt.x, pt.y);
    dragging = true;
    lastPt = pt;
    clearHint();
    if (!b) return;
    if (b.selected) unselectBall(b); else selectBall(b);
  }

  function onMove(e) {
    if (!dragging || state !== 'playing') return;
    const pt = toLocal(e);
    sweep(lastPt, pt);
    lastPt = pt;
  }

  function onUp(e) {
    if (dragging && state === 'playing' && e && e.type === 'pointerup') sweep(lastPt, toLocal(e));
    dragging = false;
    lastPt = null;
  }

  /* ───────── API pública ───────── */
  function init(canvas, h) {
    cv = canvas;
    ctx = cv.getContext('2d');
    hooks = Object.assign(hooks, h || {});
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    requestAnimationFrame(frame);
  }

  /* fieldH = alto lógico del campo · px = píxeles reales por unidad lógica */
  function resize(fieldH, px) {
    if (state === 'playing' || state === 'paused' || state === 'levelup') fieldH = H;
    H = fieldH;
    LINE_Y = Math.max(62, H - FLOOR - PILE);
    k = Math.max(1, Math.min(3, px));
    cv.width = Math.round(W * k);
    cv.height = Math.round(H * k);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    sprites = { body: {}, gloss: null };
    Assets.ready.then(buildBackground);
    if (Assets.icon && Assets.icon.naturalWidth) buildBackground();
    return LINE_Y;
  }

  function pause() { if (state === 'playing') { state = 'paused'; dragging = false; } }
  function resume() { if (state === 'paused') { state = 'playing'; lastTs = 0; } }
  function quit() { state = 'menu'; dragging = false; selected = []; hooks.expr(null); hooks.danger(0); }

  return {
    init, resize, start, pause, resume, quit, finish, nextLevel,
    isRunning: () => state === 'playing' || state === 'paused' || state === 'levelup',
    getState: () => state,
    stats,
    /* Para pruebas */
    _debug: () => ({ balls, selected, target, score, streak, W, H, k, state, hint: !!hintBall, waveTimer, idle, level, goal, levelHits })
  };
})();
