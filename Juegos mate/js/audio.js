/* Sonidos sintetizados con Web Audio (no necesitan archivos). */
const Sound = (function () {
  'use strict';
  let ctx = null, master = null, noiseBuf = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(o) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.15;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(o) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.2;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.from || 3000, t0);
    f.frequency.exponentialRampToValueAtTime(o.to || 200, t0 + dur);
    const g = ctx.createGain();
    const vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const semitone = n => Math.pow(2, n / 12);

  return {
    unlock: ensure,
    setEnabled(v) { enabled = !!v; },
    isEnabled: () => enabled,

    click()      { tone({ f: 520, to: 700, dur: 0.08, type: 'triangle', vol: 0.2 }); },
    select(n)    { tone({ f: 380 * semitone(Math.min(n, 8) * 2), dur: 0.09, type: 'triangle', vol: 0.25 }); },
    unselect()   { tone({ f: 330, to: 220, dur: 0.08, type: 'triangle', vol: 0.18 }); },
    pop(i)       {
      const f = 480 * semitone(Math.min(i, 10));
      tone({ f, to: f * 1.9, dur: 0.13, vol: 0.28 });
      noise({ dur: 0.07, from: 9000, to: 3000, filter: 'highpass', vol: 0.22 });
    },
    combo(n)     { for (let k = 0; k < Math.min(n, 5); k++) tone({ f: 523 * semitone(k * 4), dur: 0.14, type: 'triangle', vol: 0.18, delay: 0.05 + k * 0.07 }); },
    error()      {
      tone({ f: 170, to: 90, dur: 0.28, type: 'square', vol: 0.14 });
      tone({ f: 120, to: 70, dur: 0.3, type: 'triangle', vol: 0.25 });
    },
    star(i)      { tone({ f: 660 * semitone(Math.min(i, 12) * 2), dur: 0.22, type: 'triangle', vol: 0.22, delay: 0.1 }); },
    cheer()      { [0, 4, 7, 12, 16, 19].forEach((s, k) => tone({ f: 392 * semitone(s), dur: 0.18, type: 'triangle', vol: 0.22, delay: k * 0.08 })); },
    wave()      { for (let k = 0; k < 3; k++) tone({ f: 340 - k * 40, to: 190, dur: 0.12, type: 'triangle', vol: 0.18, delay: k * 0.09 }); },
    tick()       { tone({ f: 880, dur: 0.07, type: 'square', vol: 0.1 }); },
    levelUp()    { [0, 4, 7, 12].forEach((s, k) => tone({ f: 440 * semitone(s), dur: 0.16, type: 'triangle', vol: 0.22, delay: k * 0.09 })); },
    gameOver()   { [0, -3, -7, -12].forEach((s, k) => tone({ f: 440 * semitone(s), dur: 0.26, type: 'triangle', vol: 0.25, delay: k * 0.18 })); },
    record()     { [0, 4, 7, 12, 16].forEach((s, k) => tone({ f: 523 * semitone(s), dur: 0.2, type: 'triangle', vol: 0.22, delay: k * 0.1 })); }
  };
})();
