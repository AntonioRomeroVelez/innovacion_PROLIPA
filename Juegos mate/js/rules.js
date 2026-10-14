/* Reglas del juego (sin DOM): operaciones, rangos por nivel y generación de burbujas con solución. */
(function (root) {
  'use strict';

  const OPS = {
    suma:  { id: 'suma',  sign: '+', name: 'Suma' },
    resta: { id: 'resta', sign: '−', name: 'Resta' },
    mult:  { id: 'mult',  sign: '×', name: 'Multiplicación' },
    div:   { id: 'div',   sign: '÷', name: 'División' }
  };

  /* ───────── Dificultad = grado + dígitos ─────────
     · El GRADO (1.º a 10.º de Educación General Básica de Ecuador) sugiere cuántos dígitos usar y fija la velocidad.
     · Los DÍGITOS (1, 2 o 3) definen qué tan grandes son los números. Siempre se piensa en que se puedan resolver
       DE CABEZA: con 3 dígitos los números son redondos (terminan en 0).
     La clave de dificultad es "grado:dígitos", por ejemplo "4:2". */
  const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const DIGITS = [1, 2, 3];
  const defaultDigits = grade => (+grade <= 2 ? 1 : (+grade <= 5 ? 2 : 3));
  const makeKey = (grade, digits) => grade + ':' + digits;

  function parseKey(key) {
    const parts = String(key).split(':');
    const grade = GRADES.indexOf(parts[0]) >= 0 ? parts[0] : '3';
    const digits = DIGITS.indexOf(+parts[1]) >= 0 ? +parts[1] : defaultDigits(grade);
    return { grade, digits };
  }

  const range = (lo, hi, step) => {
    step = step || 1;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
    return out;
  };

  const ri = (a, b, rng) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Configuración: vals = números que pueden aparecer en las burbujas · tMin/tMax = rango del objetivo */
  function plain(vals, tMin, tMax) {
    const set = new Set(vals);
    return { vals, vMin: vals[0], vMax: vals[vals.length - 1], tMin, tMax, has: v => set.has(v), draw: rng => pick(vals, rng) };
  }

  /* Mitad números chicos (2 a 9) y mitad grandes: para multiplicar "2 dígitos × 1 dígito" */
  function mixed(small, big, tMin, tMax) {
    const vals = small.concat(big);
    const set = new Set(vals);
    return {
      vals, vMin: vals[0], vMax: vals[vals.length - 1], tMin, tMax, has: v => set.has(v),
      draw: rng => (rng() < 0.5 ? pick(small, rng) : pick(big, rng))
    };
  }

  /* Divisiones exactas: divisores de 2 a dMax y dividendos = divisor × cociente dentro de [lo, hi] */
  function division(dMax, qMin, qMax, qStep, lo, hi) {
    const divisors = range(2, dMax);
    const dividendSet = new Set();
    const quotients = range(qMin, qMax, qStep).filter(q => divisors.some(d => d * q >= lo && d * q <= hi));
    divisors.forEach(d => quotients.forEach(q => { if (d * q >= lo && d * q <= hi) dividendSet.add(d * q); }));
    const dividends = Array.from(dividendSet).sort((x, y) => x - y);
    const vals = Array.from(new Set(divisors.concat(dividends))).sort((x, y) => x - y);
    const set = new Set(vals);
    return {
      vals, vMin: vals[0], vMax: vals[vals.length - 1], tMin: quotients[0], tMax: quotients[quotients.length - 1],
      has: v => set.has(v), draw: rng => (rng() < 0.5 ? pick(divisors, rng) : pick(dividends, rng)),
      divisors, dividends, dividendSet, quotients, dMax
    };
  }

  function build(op, grade, digits) {
    const g = +grade;
    switch (op) {
      case 'suma':
        if (digits === 1) return plain(range(1, 9), 3, g <= 1 ? 10 : (g === 2 ? 14 : 18));
        if (digits === 2) return plain(range(10, g <= 5 ? 60 : 99), 20, g <= 5 ? 99 : 150);
        return plain(range(100, g <= 6 ? 500 : 900, 10), 200, g <= 6 ? 900 : 1400);
      case 'resta':
        if (digits === 1) return plain(range(1, 9), 1, 8);
        if (digits === 2) return plain(range(10, g <= 5 ? 70 : 99), 5, g <= 5 ? 60 : 85);
        return plain(range(100, g <= 6 ? 600 : 900, 10), 20, g <= 6 ? 500 : 800);
      case 'mult': {
        if (digits === 1) {
          const vMax = g <= 2 ? 5 : (g === 3 ? 6 : 9);
          return plain(range(2, vMax), 4, g <= 1 ? 10 : vMax * vMax);
        }
        if (digits === 2) return mixed(range(2, 9), range(10, g <= 5 ? 30 : 50), 12, g <= 5 ? 200 : 300);
        return mixed(range(2, 9), range(100, g <= 6 ? 300 : 500, 10), 200, g <= 6 ? 1500 : 2500);
      }
      case 'div': {
        if (digits === 1) {
          const dm = g <= 1 ? 2 : (g === 2 ? 3 : (g === 3 ? 5 : 9));
          const qm = g <= 1 ? 5 : (g === 2 ? 6 : (g === 3 ? 8 : 9));
          return division(dm, 2, qm, 1, 4, dm * qm);
        }
        if (digits === 2) return division(9, 10, g <= 5 ? 30 : 49, 1, 20, 99);
        return division(9, 20, 200, 10, 100, g <= 6 ? 600 : 900);
      }
    }
    return plain(range(1, 9), 3, 10);
  }

  const cache = {};
  function config(op, key) {
    const p = parseKey(key);
    const id = op + '|' + makeKey(p.grade, p.digits);
    return cache[id] || (cache[id] = build(op, p.grade, p.digits));
  }

  /* Segundos entre oleadas: arranca en base y baja hasta min al subir de nivel (más tiempo para números más grandes) */
  const TIMING = {
    '1': { base: 18, min: 12 }, '2': { base: 16, min: 11 }, '3': { base: 15, min: 10 }, '4': { base: 14, min: 10 }, '5': { base: 13, min: 9 },
    '6': { base: 13, min: 9 },  '7': { base: 12, min: 8 },  '8': { base: 12, min: 8 },  '9': { base: 11, min: 8 },  '10': { base: 11, min: 8 }
  };
  function timingFor(key) {
    const p = parseKey(key);
    const t = TIMING[p.grade];
    return { base: t.base + (p.digits - 1) * 2, min: t.min + (p.digits - 1) };
  }

  const ordinal = g => g + '.º grado';
  const digitsLabel = d => d + (d === 1 ? ' dígito' : ' dígitos');

  /* Ejemplo de cada operación según los dígitos (para el menú) */
  const EXAMPLES = {
    suma:  ['7 + 5', '34 + 28', '240 + 130'],
    resta: ['9 − 4', '83 − 47', '460 − 170'],
    mult:  ['6 × 7', '12 × 4', '120 × 4'],
    div:   ['56 ÷ 7', '84 ÷ 4', '360 ÷ 6']
  };
  const exampleFor = (op, digits) => EXAMPLES[op][digits - 1];

  /* Qué practica cada operación con esos dígitos (para mostrarlo en el menú) */
  function describe(op, key) {
    const p = parseKey(key);
    const c = config(op, key);
    const d = p.digits;
    switch (op) {
      case 'suma':  return 'Sumas de ' + digitsLabel(d) + (d === 3 ? ' redondos' : '') + ', resultado hasta ' + c.tMax;
      case 'resta': return 'Restas de ' + digitsLabel(d) + (d === 3 ? ' redondos' : '');
      case 'mult':  return d === 1 ? 'Tablas de multiplicar del 2 al ' + c.vMax : 'Multiplicar ' + d + ' dígitos × 1 dígito';
      case 'div':   return d === 1 ? 'Tablas de dividir entre 2 y ' + c.dMax : 'Dividir ' + d + ' dígitos entre 1 dígito';
    }
    return '';
  }

  /* Progreso: cada nivel pide resolver unos cuantos objetivos; el personaje cambia de rango con el nivel */
  const RANKS = ['Aprendiz', 'Estudiante', 'Valiente', 'Veloz', 'Brillante', 'Imparable', 'Genial', 'Fenomenal', 'Leyenda'];
  const goalFor = level => Math.min(12, 4 + level);
  const rankFor = level => RANKS[Math.min(Math.max(level, 1), RANKS.length) - 1];
  const waveSizeFor = level => (level >= 8 ? 4 : 3);

  /* Resultado de combinar dos burbujas; 0 significa "no sirve" */
  function pairResult(op, a, b) {
    switch (op) {
      case 'suma':  return a + b;
      case 'resta': return a === b ? 0 : Math.abs(a - b);
      case 'mult':  return a * b;
      case 'div': {
        const hi = Math.max(a, b), lo = Math.min(a, b);
        return hi % lo === 0 ? hi / lo : 0;
      }
    }
    return 0;
  }

  const tripleResult = (op, a, b, c) => (op === 'suma' ? a + b + c : a * b * c);

  function randomBall(op, key, rng = Math.random) {
    return config(op, key).draw(rng);
  }

  /* Dos burbujas que dan un objetivo válido: {a, b, t} */
  function randomPair(op, key, rng = Math.random) {
    const c = config(op, key);
    for (let i = 0; i < 300; i++) {
      let a, b, t;
      if (op === 'div') {
        b = pick(c.divisors, rng);
        t = pick(c.quotients, rng);
        a = b * t;
        if (!c.dividendSet.has(a)) continue;
      } else {
        a = c.draw(rng);
        b = c.draw(rng);
        t = pairResult(op, a, b);
      }
      if (t >= c.tMin && t <= c.tMax) return { a, b, t };
    }
    for (let t = c.tMin; t <= c.tMax; t++) {
      const p = pairFor(op, c, t, rng);
      if (p) return { a: p[0], b: p[1], t };
    }
    return { a: c.vals[0], b: c.vals[0], t: pairResult(op, c.vals[0], c.vals[0]) };
  }

  /* Un par de burbujas [a, b] que da exactamente el objetivo t (o null si no existe) */
  function pairFor(op, c, t, rng = Math.random) {
    const opts = [];
    switch (op) {
      case 'suma':
        c.vals.forEach(a => { const b = t - a; if (b >= a && c.has(b)) opts.push([a, b]); });
        break;
      case 'resta':
        c.vals.forEach(b => { const a = b + t; if (c.has(a)) opts.push([a, b]); });
        break;
      case 'mult':
        c.vals.forEach(a => { if (t % a === 0) { const b = t / a; if (b >= a && c.has(b)) opts.push([a, b]); } });
        break;
      case 'div':
        c.divisors.forEach(b => { const a = b * t; if (c.dividendSet.has(a)) opts.push([a, b]); });
        break;
    }
    return opts.length ? pick(opts, rng) : null;
  }

  /* Valores y que, junto a x, dan el objetivo t */
  function completers(op, x, t, c) {
    const out = [];
    const add = y => {
      if (Number.isInteger(y) && c.has(y) && pairResult(op, x, y) === t && out.indexOf(y) < 0) out.push(y);
    };
    switch (op) {
      case 'suma':  add(t - x); break;
      case 'resta': add(x + t); add(x - t); break;
      case 'mult':  add(t / x); break;
      case 'div':   add(x * t); add(x / t); break;
    }
    return out;
  }

  /* Índices de una combinación (2 o 3 burbujas) que da el objetivo, o null */
  function findCombo(op, vals, target, maxN) {
    const n = vals.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (pairResult(op, vals[i], vals[j]) === target) return [i, j];
      }
    }
    if (maxN !== 2 && (op === 'suma' || op === 'mult')) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          for (let k = j + 1; k < n; k++) {
            if (tripleResult(op, vals[i], vals[j], vals[k]) === target) return [i, j, k];
          }
        }
      }
    }
    return null;
  }

  /* Todos los objetivos que se pueden formar con las burbujas actuales (dentro del rango del nivel) */
  function targetsFor(op, vals, c, maxN) {
    const set = new Set();
    const ok = t => t >= c.tMin && t <= c.tMax;
    const n = vals.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const t = pairResult(op, vals[i], vals[j]);
        if (t && ok(t)) set.add(t);
      }
    }
    if (maxN !== 2 && (op === 'suma' || op === 'mult')) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          for (let k = j + 1; k < n; k++) {
            const t = tripleResult(op, vals[i], vals[j], vals[k]);
            if (ok(t)) set.add(t);
          }
        }
      }
    }
    return set;
  }

  /* Si con las burbujas del tablero + la oleada no hay forma de llegar al objetivo, ajusta la oleada */
  function ensureSolvable(op, diff, board, wave, target, rng = Math.random, maxN = 3) {
    const c = config(op, diff);
    if (findCombo(op, board.concat(wave), target, maxN)) return wave;
    const out = wave.slice();
    for (const i of shuffle(board.map((_, k) => k), rng)) {
      const ys = completers(op, board[i], target, c);
      if (ys.length) {
        out[ri(0, out.length - 1, rng)] = pick(ys, rng);
        return out;
      }
    }
    const pair = pairFor(op, c, target, rng);
    if (pair) {
      out[0] = pair[0];
      out[1] = pair[1];
    }
    return out;
  }

  /* Siguiente objetivo: uno que ya se pueda formar con el tablero. Si no hay, crea un par nuevo. */
  function nextTarget(op, diff, board, prev, rng = Math.random, maxN = 3) {
    const c = config(op, diff);
    const options = Array.from(targetsFor(op, board, c, maxN)).filter(t => t !== prev);
    if (options.length) return { target: pick(options, rng), spawn: null };
    let p = randomPair(op, diff, rng);
    for (let i = 0; i < 20 && p.t === prev; i++) p = randomPair(op, diff, rng);
    return { target: p.t, spawn: [p.a, p.b] };
  }

  /* Texto de la operación con las burbujas elegidas.
     En modo multi, resta y división van en el orden en que se tocaron (la primera burbuja es el punto de partida). */
  function expression(op, vals, mode) {
    const sign = OPS[op].sign;
    if (vals.length === 1) return vals[0] + ' ' + sign + ' ?';
    if ((op === 'resta' || op === 'div') && mode !== 'multi') return Math.max(vals[0], vals[1]) + ' ' + sign + ' ' + Math.min(vals[0], vals[1]);
    return vals.join(' ' + sign + ' ');
  }

  /* Evalúa la selección: idle | partial | success | error.
     mode 'pair' = exactamente 2 burbujas · mode 'multi' = 2 o más burbujas. */
  function evaluate(op, vals, target, mode) {
    const n = vals.length;
    const multi = mode === 'multi';
    if (n === 0) return { state: 'idle', expr: '', total: null };
    const expr = expression(op, vals, mode);
    if (!multi && n > 2) return { state: 'error', expr, total: null };
    switch (op) {
      case 'suma': {
        const total = vals.reduce((a, b) => a + b, 0);
        if (total === target && n >= 2) return { state: 'success', expr, total };
        if (total >= target || (!multi && n >= 2)) return { state: 'error', expr, total };
        return { state: 'partial', expr, total: n === 1 ? null : total, remaining: target - total };
      }
      case 'mult': {
        const total = vals.reduce((a, b) => a * b, 1);
        if (total === target && n >= 2) return { state: 'success', expr, total };
        if (total >= target || target % total !== 0 || (!multi && n >= 2)) return { state: 'error', expr, total };
        return { state: 'partial', expr, total: n === 1 ? null : total };
      }
      case 'resta': {
        if (n === 1) return { state: 'partial', expr, total: null };
        if (!multi) {
          const total = Math.abs(vals[0] - vals[1]);
          return { state: total === target ? 'success' : 'error', expr, total };
        }
        const total = vals.slice(1).reduce((a, b) => a - b, vals[0]);
        if (total === target) return { state: 'success', expr, total };
        if (total < target) return { state: 'error', expr, total };
        return { state: 'partial', expr, total };
      }
      case 'div': {
        if (n === 1) return { state: 'partial', expr, total: null };
        if (!multi) {
          const hi = Math.max(vals[0], vals[1]), lo = Math.min(vals[0], vals[1]);
          const exact = hi % lo === 0;
          const total = exact ? hi / lo : Math.round((hi / lo) * 100) / 100;
          return { state: exact && total === target ? 'success' : 'error', expr, total };
        }
        let run = vals[0];
        for (let i = 1; i < n; i++) {
          if (run % vals[i] !== 0) return { state: 'error', expr, total: Math.round((run / vals[i]) * 100) / 100 };
          run /= vals[i];
        }
        if (run === target) return { state: 'success', expr, total: run };
        if (run < target) return { state: 'error', expr, total: run };
        return { state: 'partial', expr, total: run };
      }
    }
    return { state: 'idle', expr: '', total: null };
  }

  const api = {
    OPS, GRADES, DIGITS, TIMING, timingFor, defaultDigits, makeKey, parseKey, ordinal, digitsLabel, exampleFor, describe, RANKS, goalFor, rankFor, waveSizeFor, config, randomBall, randomPair, pairFor, completers,
    findCombo, targetsFor, ensureSolvable, nextTarget, expression, evaluate, pairResult
  };
  root.Rules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
