/* Reporte de actividad en PDF (jsPDF): tiempo jugado, nivel alcanzado, desempeño y detalle por nivel. */
const Report = (function () {
  'use strict';

  const NAVY = [0, 63, 125], BLUE = [10, 99, 173], ICE = [232, 242, 253], SKY = [91, 126, 180];
  const INK = [11, 27, 51], GRAY = [120, 126, 136], WHITE = [255, 255, 255];
  const GOLD = [255, 201, 51], GREEN = [34, 179, 94], ORANGE = [255, 138, 31], RED = [239, 68, 68];
  const M = 15, PW = 210, CW = 180;   // margen, ancho de página, ancho útil (mm)

  const pad2 = n => String(n).padStart(2, '0');

  function mmss(sec) {
    sec = Math.max(0, Math.round(sec));
    return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
  }

  function human(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m ? m + ' min ' + s + ' s' : s + ' s';
  }

  function fmtDate(d) {
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function slug(s) {
    return (s || 'estudiante').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'estudiante';
  }

  function fileName(data) {
    const d = data.finishedAt;
    return 'Reporte-Prolipa-' + slug(data.name) + '-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + '.pdf';
  }

  function star(doc, cx, cy, r, filled) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * 0.45;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    const segs = [];
    for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    doc.setFillColor.apply(doc, filled ? GOLD : [221, 229, 239]);
    doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true);
  }

  function text(doc, str, x, y, size, color, bold, align) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor.apply(doc, color);
    doc.text(String(str), x, y, align ? { align } : undefined);
  }

  function sectionTitle(doc, str, y) {
    text(doc, str, M, y, 13, NAVY, true);
    doc.setDrawColor.apply(doc, BLUE);
    doc.setLineWidth(0.6);
    doc.line(M, y + 2, M + CW, y + 2);
  }

  function observations(data) {
    const s = data.stats;
    const total = s.hits + s.errors;
    const acc = total ? s.hits / total : 0;
    const op = data.opName.toLowerCase();
    const out = [];
    if (!total) {
      out.push('El estudiante no llegó a resolver ningún objetivo en esta sesión.');
    } else {
      if (acc >= 0.9) out.push('Excelente dominio de la ' + op + ': más del 90 % de los intentos fueron correctos.');
      else if (acc >= 0.7) out.push('Buen desempeño en la ' + op + '. Conviene repasar los casos donde hubo errores.');
      else out.push('Se recomienda seguir practicando la ' + op + (data.diffKey === '1' ? '.' : ' (puede reforzar con un grado anterior para ganar seguridad).'));
      if (s.hits) out.push('Tiempo promedio por objetivo resuelto: ' + human(s.time / s.hits) + '.');
    }
    out.push('Alcanzó el nivel ' + s.level + ' (' + s.levelsDone + (s.levelsDone === 1 ? ' nivel completado' : ' niveles completados') + ').');
    out.push(s.endedBy === 'full' ? 'La partida terminó porque el tablero se llenó de burbujas.' : 'La actividad fue finalizada por el estudiante.');
    return out;
  }

  function footer(doc) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(210, 218, 228);
      doc.setLineWidth(0.3);
      doc.line(M, 284, M + CW, 284);
      text(doc, 'Prolipa  |  Vanguardia en Educación  -  Reporte generado con Burbujas Matemáticas', M, 289, 8, GRAY, false);
      text(doc, 'Página ' + i + ' de ' + n, M + CW, 289, 8, GRAY, false, 'right');
    }
  }

  async function build(data) {
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) throw new Error('jsPDF no esta disponible');
    const s = data.stats;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setProperties({ title: 'Reporte de actividad - Burbujas Matemáticas', author: 'Prolipa' });

    /* Encabezado */
    try { doc.addImage(REPORT_ASSETS.logo, 'PNG', M, 11, 52, 52 * 245 / 720); } catch (e) { /* sin logo */ }
    text(doc, 'Reporte de actividad', M + CW, 20, 19, NAVY, true, 'right');
    text(doc, 'Burbujas Matemáticas', M + CW, 27, 11, SKY, false, 'right');
    doc.setDrawColor.apply(doc, BLUE);
    doc.setLineWidth(0.9);
    doc.line(M, 34, M + CW, 34);

    /* Datos de la sesión */
    doc.setFillColor.apply(doc, ICE);
    doc.roundedRect(M, 39, CW, 22, 3, 3, 'F');
    const first = (data.name || '').split(/\s+/)[0] || 'El estudiante';
    const cols = [[M + 5, 'ESTUDIANTE', doc.splitTextToSize(data.name || 'Sin nombre', 58)[0]],
      [M + 70, 'FECHA', fmtDate(data.finishedAt)],
      [M + 112, 'OPERACIÓN', data.opName],
      [M + 146, 'GRADO', data.diffName]];
    cols.forEach(c => {
      text(doc, c[1], c[0], 46, 7.5, GRAY, true);
      text(doc, c[2], c[0], 53, 11.5, INK, true);
    });
    if (data.modeName) text(doc, 'Modalidad: ' + data.modeName, M + 112, 58.5, 9, SKY, false);
    if (data.digitsName) text(doc, data.digitsName, M + 146, 58.5, 9, SKY, false);

    /* Tarjetas principales */
    const cards = [
      ['NIVEL ALCANZADO', String(s.level), 'Rango: ' + data.rank],
      ['TIEMPO JUGADO', mmss(s.time), human(s.time)],
      ['PUNTAJE', String(s.score), data.isRecord ? 'Nuevo récord personal' : 'Récord: ' + data.best]
    ];
    cards.forEach((c, i) => {
      const x = M + i * 62;
      doc.setFillColor.apply(doc, WHITE);
      doc.setDrawColor.apply(doc, BLUE);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, 67, 56, 32, 3, 3, 'FD');
      text(doc, c[0], x + 28, 74, 7.5, GRAY, true, 'center');
      text(doc, c[1], x + 28, 88, 25, NAVY, true, 'center');
      text(doc, c[2], x + 28, 95, 8.5, SKY, false, 'center');
    });

    /* Personaje del estudiante */
    doc.setFillColor.apply(doc, ICE);
    doc.roundedRect(M, 104, CW, 34, 3, 3, 'F');
    const png = await Avatar.toPng(data.profile, s.level, s.endedBy === 'full' ? 'oops' : 'happy', 240);
    let tx = M + 6;
    if (png) { doc.addImage(png, 'PNG', M + 5, 106, 25, 25 * 170 / 140); tx = M + 38; }
    text(doc, doc.splitTextToSize(first + ' llegó al rango "' + data.rank + '"', CW - 46)[0], tx, 116.5, 14, NAVY, true);
    const msg = s.levelsDone >= 5 ? 'Un desempeño sobresaliente. ¡Felicitaciones, ' + first + '!'
      : (s.levelsDone >= 2 ? 'Muy buen avance. Cada nivel superado le hace ganar premios y subir de rango.' : 'Un buen comienzo. Con práctica seguirá subiendo de rango.');
    text(doc, msg, tx, 124.5, 10, SKY, false);
    text(doc, 'Meta del nivel ' + s.level + ': ' + s.levelHits + ' de ' + s.goal + ' objetivos', tx, 131, 9, GRAY, false);

    /* Desempeño */
    sectionTitle(doc, 'Desempeño', 148);
    const total = s.hits + s.errors;
    const acc = total ? Math.round((s.hits / total) * 100) : 0;
    text(doc, 'Precisión', M, 157.5, 10, INK, true);
    text(doc, acc + ' %', M + 100, 157.5, 10, INK, true, 'right');
    doc.setFillColor.apply(doc, ICE);
    doc.roundedRect(M, 160.5, 100, 5, 2.5, 2.5, 'F');
    if (acc > 0) {
      doc.setFillColor.apply(doc, acc >= 80 ? GREEN : (acc >= 50 ? ORANGE : RED));
      doc.roundedRect(M, 160.5, Math.max(5, acc), 5, 2.5, 2.5, 'F');
    }
    const stats = [
      ['Aciertos', s.hits], ['Errores', s.errors], ['Mejor racha', s.bestStreak],
      ['Niveles completados', s.levelsDone], ['Burbujas resueltas', s.ballsSolved],
      ['Tiempo por acierto', s.hits ? human(s.time / s.hits) : '-']
    ];
    stats.forEach((st, i) => {
      const x = M + (i % 3) * 62, y = 174 + Math.floor(i / 3) * 13;
      text(doc, st[0].toUpperCase(), x, y, 7.5, GRAY, true);
      text(doc, st[1], x, y + 6.5, 13, NAVY, true);
    });

    /* Detalle por nivel */
    let y = 203;
    sectionTitle(doc, 'Detalle por nivel', y);
    y += 8;
    const head = () => {
      doc.setFillColor.apply(doc, NAVY);
      doc.roundedRect(M, y, CW, 7, 1.5, 1.5, 'F');
      [['Nivel', M + 4], ['Meta', M + 28], ['Aciertos', M + 52], ['Errores', M + 80], ['Tiempo', M + 108], ['Resultado', M + 136]].forEach(h => text(doc, h[0], h[1], y + 4.9, 9, WHITE, true));
      y += 8;
    };
    head();
    (s.levelLog.length ? s.levelLog : []).forEach((l, i) => {
      if (y > 268) { doc.addPage(); y = 20; head(); }
      if (i % 2 === 0) { doc.setFillColor.apply(doc, [246, 249, 253]); doc.rect(M, y - 1.2, CW, 7.2, 'F'); }
      text(doc, l.level, M + 4, y + 4, 9.5, INK, true);
      text(doc, l.goal + ' objetivos', M + 28, y + 4, 9.5, INK, false);
      text(doc, l.hits, M + 52, y + 4, 9.5, INK, false);
      text(doc, l.errors, M + 80, y + 4, 9.5, INK, false);
      text(doc, mmss(l.time), M + 108, y + 4, 9.5, INK, false);
      if (l.completed) { for (let k = 0; k < 3; k++) star(doc, M + 139 + k * 6, y + 2.6, 2.3, k < l.stars); }
      else text(doc, 'En curso (incompleto)', M + 136, y + 4, 8.5, GRAY, false);
      y += 7.2;
    });

    /* Observaciones */
    y += 7;
    if (y + 38 > 282) { doc.addPage(); y = 22; }
    sectionTitle(doc, 'Observaciones', y);
    y += 9;
    observations(data).forEach(line => {
      const parts = doc.splitTextToSize(line, CW - 6);
      doc.setFillColor.apply(doc, BLUE);
      doc.circle(M + 1.5, y - 1.2, 0.9, 'F');
      parts.forEach((p, i) => { text(doc, p, M + 5, y, 10, INK, false); y += 5.2; });
      y += 1.2;
    });

    footer(doc);
    return doc;
  }

  async function download(data) {
    const doc = await build(data);
    doc.save(fileName(data));
  }

  return { build, download, mmss, human };
})();
