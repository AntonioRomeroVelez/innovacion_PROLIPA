'use strict';
/* =====================================================================
   ESTADO: progreso del estudiante, estrellas, medallas y ajustes.
   Se guarda en localStorage (solo en este dispositivo).
   ===================================================================== */
const Estado = (() => {
  const KEY = 'prolipa.lector.v1';

  const vacio = () => ({
    nombre: '',
    estrellas: 0,
    act: {},            // clave de actividad → { est: mejor (1-3), veces }
    medallas: {},       // id → fecha
    grados: {},         // grados visitados
    mejorRacha: 0,
    ajustes: { voz: null, velocidad: 'normal', efectos: true }
  });

  let d = vacio();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) d = Object.assign(vacio(), JSON.parse(raw));
    d.ajustes = Object.assign(vacio().ajustes, d.ajustes);
  } catch (e) { d = vacio(); }

  const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* nada */ } };

  const clave = (g, s, a) => `${g}.${s}.${a}`;

  /* ---------------- Medallas ---------------- */
  const MEDALLAS_BASE = [
    { id: 'e1', nombre: 'Primera estrella', icono: '⭐', desc: 'Consigue tu primera estrella', ok: s => s.estrellas >= 1 },
    { id: 'e10', nombre: 'Estrellita', icono: '🌟', desc: 'Reúne 10 estrellas', ok: s => s.estrellas >= 10 },
    { id: 'e50', nombre: 'Brillante', icono: '✨', desc: 'Reúne 50 estrellas', ok: s => s.estrellas >= 50 },
    { id: 'e100', nombre: 'Súper estrella', icono: '💫', desc: 'Reúne 100 estrellas', ok: s => s.estrellas >= 100 },
    { id: 'e300', nombre: 'Constelación', icono: '🌌', desc: 'Reúne 300 estrellas', ok: s => s.estrellas >= 300 },
    { id: 'perfecto', nombre: '¡Perfecto!', icono: '💯', desc: 'Termina una actividad con 3 estrellas', ok: s => Object.values(s.act).some(a => a.est >= 3) },
    { id: 'racha5', nombre: 'Racha de fuego', icono: '🔥', desc: 'Acierta 5 seguidas', ok: s => s.mejorRacha >= 5 },
    { id: 'racha10', nombre: 'Rayo veloz', icono: '⚡', desc: 'Acierta 10 seguidas', ok: s => s.mejorRacha >= 10 },
    { id: 'constructor', nombre: 'Constructor', icono: '🧩', desc: 'Termina un juego de formar palabras', ok: s => hecho(s, 'armar') },
    { id: 'lector', nombre: 'Primer cuento', icono: '📖', desc: 'Termina una lectura', ok: s => hecho(s, 'lectura') },
    { id: 'explorador', nombre: 'Explorador', icono: '🧭', desc: 'Juega en los cuatro grados', ok: s => CURRICULO.every(g => s.grados[g.id]) }
  ];

  function hecho(s, tipo) {
    return CURRICULO.some(g => g.subniveles.some(sn => sn.actividades.some(a =>
      a.tipo === tipo && s.act[clave(g.id, sn.id, a.id)])));
  }

  function subCompleto(s, g, sn) {
    return sn.actividades.every(a => s.act[clave(g.id, sn.id, a.id)]);
  }

  function todasLasMedallas() {
    const lista = MEDALLAS_BASE.map(m => ({ ...m, tipo: 'logro' }));
    CURRICULO.forEach(g => {
      g.subniveles.forEach(sn => lista.push({
        id: `sub:${g.id}.${sn.id}`, nombre: sn.medalla.nombre, icono: sn.medalla.icono,
        desc: `Completa «${sn.nombre}» en ${g.nombre}`, tipo: 'nivel', color: g.color,
        ok: s => subCompleto(s, g, sn)
      }));
      lista.push({
        id: `grado:${g.id}`, nombre: g.medalla.nombre, icono: g.medalla.icono,
        desc: `Completa todos los niveles de ${g.nombre}`, tipo: 'grado', color: g.color,
        ok: s => g.subniveles.every(sn => subCompleto(s, g, sn))
      });
    });
    return lista;
  }

  /* Revisa y concede medallas nuevas; devuelve las recién ganadas. */
  function revisarMedallas() {
    const nuevas = [];
    todasLasMedallas().forEach(m => {
      if (!d.medallas[m.id] && m.ok(d)) {
        d.medallas[m.id] = Date.now();
        nuevas.push(m);
      }
    });
    if (nuevas.length) guardar();
    return nuevas;
  }

  /* ---------------- API ---------------- */
  return {
    get d() { return d; },
    guardar,
    clave,
    todasLasMedallas,
    revisarMedallas,

    get nombre() { return d.nombre; },
    set nombre(v) { d.nombre = (v || '').trim().slice(0, 18); guardar(); },
    get estrellas() { return d.estrellas; },
    sumarEstrellas(n = 1) { d.estrellas += n; guardar(); return d.estrellas; },
    get ajustes() { return d.ajustes; },
    visitarGrado(id) { if (!d.grados[id]) { d.grados[id] = 1; guardar(); } },

    estrellasDe(g, s, a) { return (d.act[clave(g, s, a)] || {}).est || 0; },

    /* Guarda el resultado de una actividad (conserva el mejor). */
    registrar(g, s, a, est, racha = 0) {
      const k = clave(g, s, a);
      const prev = d.act[k] || { est: 0, veces: 0 };
      d.act[k] = { est: Math.max(prev.est, est), veces: prev.veces + 1 };
      if (racha > d.mejorRacha) d.mejorRacha = racha;
      guardar();
      return revisarMedallas();
    },

    progresoSub(g, sn) {
      let est = 0, hechas = 0;
      sn.actividades.forEach(a => {
        const e = this.estrellasDe(g.id, sn.id, a.id);
        est += e; if (e) hechas++;
      });
      return { est, max: sn.actividades.length * 3, hechas, total: sn.actividades.length };
    },
    progresoGrado(g) {
      let est = 0, max = 0, hechas = 0, total = 0;
      g.subniveles.forEach(sn => {
        const p = this.progresoSub(g, sn);
        est += p.est; max += p.max; hechas += p.hechas; total += p.total;
      });
      return { est, max, hechas, total };
    },

    reiniciar() {
      const aj = d.ajustes;
      d = vacio();
      d.ajustes = aj;
      guardar();
    }
  };
})();
