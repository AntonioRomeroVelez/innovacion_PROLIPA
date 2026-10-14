/* Recursos gráficos y efectos de explosión (partículas, ondas, rayos) dibujados sobre el canvas. */

const Color = (function () {
  const toRgb = hex => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  /* p > 0 aclara (mezcla con blanco), p < 0 oscurece (mezcla con negro) */
  function shade(hex, p) {
    const [r, g, b] = toRgb(hex);
    const t = p < 0 ? 0 : 255, k = Math.abs(p);
    const m = c => Math.round(c + (t - c) * k);
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function rgba(hex, a) {
    const [r, g, b] = toRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  return { shade, rgba };
})();

const Assets = (function () {
  const load = src => new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => resolve(img);
    img.src = src;
  });
  const a = { icon: null, iconWhite: null };
  a.ready = Promise.all([
    load('assets/prolipa-icon.png').then(i => (a.icon = i)),
    load('assets/prolipa-icon-white.png').then(i => (a.iconWhite = i))
  ]);
  return a;
})();

const FX = (function () {
  'use strict';
  const MAX_PARTS = 700;
  let parts = [], rings = [], flashes = [];

  const rnd = (a, b) => a + Math.random() * (b - a);

  function pop(x, y, color, o) {
    o = o || {};
    const big = !!o.big;
    rings.push({ x, y, r: 18, vr: big ? 340 : 260, life: 0, max: 0.45, color, w: 7 });
    flashes.push({ x, y, r: big ? 110 : 80, life: 0, max: 0.2, color: '#ffffff' });

    const shards = big ? 18 : 12;
    for (let i = 0; i < shards; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(140, 380);
      parts.push({
        kind: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90,
        rot: rnd(0, 6.28), vr: rnd(-12, 12), size: rnd(5, 11), life: 0, max: rnd(0.5, 0.9),
        color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? Color.shade(color, 0.25) : color)
      });
    }
    /* Mini iconos de Prolipa que salen volando */
    const books = big ? 7 : 5;
    for (let i = 0; i < books; i++) {
      const a = -Math.PI / 2 + rnd(-1.5, 1.5), s = rnd(160, 340);
      parts.push({
        kind: 'book', img: i % 2 ? 'icon' : 'iconWhite', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        rot: rnd(-0.6, 0.6), vr: rnd(-7, 7), size: rnd(18, 30), life: 0, max: rnd(0.9, 1.4)
      });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(200, 480);
      parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rnd(2, 4.5), life: 0, max: rnd(0.25, 0.5), rot: 0, vr: 0 });
    }
    if (parts.length > MAX_PARTS) parts.splice(0, parts.length - MAX_PARTS);
  }

  function ring(x, y, color) {
    rings.push({ x, y, r: 20, vr: 220, life: 0, max: 0.4, color, w: 6 });
  }

  function update(dt) {
    for (const p of parts) {
      p.life += dt;
      if (p.kind !== 'spark') p.vy += 760 * dt;
      p.vx *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    parts = parts.filter(p => p.life < p.max);
    for (const r of rings) { r.life += dt; r.r += r.vr * dt; r.vr *= 1 - 3.2 * dt; }
    rings = rings.filter(r => r.life < r.max);
    for (const f of flashes) f.life += dt;
    flashes = flashes.filter(f => f.life < f.max);
  }

  function draw(ctx) {
    for (const f of flashes) {
      const k = 1 - f.life / f.max;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, Color.rgba('#ffffff', 0.85 * k));
      g.addColorStop(0.35, Color.rgba(f.color.length === 7 ? f.color : '#ffffff', 0.5 * k));
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    for (const r of rings) {
      const k = 1 - r.life / r.max;
      ctx.lineWidth = Math.max(1, r.w * k);
      ctx.strokeStyle = Color.rgba(r.color, 0.9 * k);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of parts) {
      const k = p.life / p.max;
      const alpha = 1 - k * k;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff6c8';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'book') {
        const img = Assets[p.img];
        if (img && img.naturalWidth) {
          ctx.rotate(p.rot);
          ctx.globalAlpha = alpha;
          const w = p.size * (1 - k * 0.35), h = w * 1.1;
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
      } else {
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        const s = p.size * (1 - k * 0.4);
        ctx.fillRect(-s / 2, -s / 3, s, s * 0.66);
      }
      ctx.restore();
    }
  }

  function clear() { parts = []; rings = []; flashes = []; }

  return { pop, ring, update, draw, clear };
})();
