// Generadores de Excel del módulo de Reportes.
// Trabajan sobre el registro normalizado de `reportesData.js`, por lo que
// sirven igual para Serenazgo, PNP y el reporte comparativo.

import ExcelJS from 'exceljs';
import { fmt, SERENO, PNP } from './reportesData';

const BLUE   = 'FF1D4ED8';
const GREEN  = 'FF16A34A';
const PURPLE = 'FF7C3AED';
const ORANGE = 'FFF97316';
const TEAL   = 'FF059669';
const GREY   = 'FF6B7280';
const ZEBRA  = 'FFF8FAFC';

const TURNO_ORDER = ['Mañana', 'Tarde', 'Noche'];

const _download = async (wb, filename) => {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const headerRow = (ws, values, argb) => {
  const row = ws.addRow(values);
  row.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    c.alignment = { horizontal: 'center' };
  });
  return row;
};

const totalRow = (ws, values, argb) => {
  const row = ws.addRow(values);
  row.font = { bold: true };
  row.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    c.alignment = { horizontal: 'center' };
  });
  return row;
};

const pct = (n, total) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%');

// Bloque genérico "etiqueta / total / %"
const addBreakdown = (ws, titulo, entries, total, argb) => {
  ws.addRow([]);
  headerRow(ws, [titulo, 'Total', '% del Total'], argb);
  entries.forEach(([label, n]) => {
    const row = ws.addRow([label, n, pct(n, total)]);
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
  });
};

const countBy = (registros, fn) => {
  const counts = {};
  registros.forEach(r => { const k = fn(r); if (k) counts[k] = (counts[k] || 0) + 1; });
  return counts;
};

const sortDesc = counts => Object.entries(counts).sort((a, b) => b[1] - a[1]);

const sortTurno = counts => Object.entries(counts).sort((a, b) => {
  const ai = TURNO_ORDER.indexOf(a[0]), bi = TURNO_ORDER.indexOf(b[0]);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return b[1] - a[1];
});

// ── Reporte por incidencia ────────────────────────────────────────────────────
// data: [{ label, key, fuente, registros[] }]
export const generarExcelIncidencias = async (data, meta) => {
  const { fuenteLabel, filtroLabel, rangoLabel, fuentes } = meta;
  const mixto  = fuentes.length > 1;
  const conPnp = fuentes.includes(PNP);

  const todos = data.flatMap(d => d.registros.map(r => ({ ...r, tipo: d.label })));
  const total = todos.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'CECOM - Sistema de Gestión'; wb.created = new Date();

  // ── Resumen ──
  const ws1 = wb.addWorksheet('Resumen');
  ws1.columns = [{ key: 'a', width: 34 }, { key: 'b', width: 12 }, { key: 'c', width: 14 }];
  ws1.addRow([`REPORTE DE INCIDENCIAS — ${fuenteLabel.toUpperCase()}`]).font = { bold: true, size: 14, color: { argb: BLUE } };
  ws1.mergeCells('A1:C1');
  [`Período: ${rangoLabel}`, `Fuente: ${fuenteLabel}`, `Filtro: ${filtroLabel}`, `Generado: ${new Date().toLocaleString('es-PE')}`]
    .forEach(t => { ws1.addRow([t]).font = { italic: true, color: { argb: GREY } }; });

  if (mixto) {
    const porFuente = countBy(todos, r => r.fuente);
    addBreakdown(ws1, 'Fuente', [SERENO, PNP].filter(f => porFuente[f]).map(f => [f, porFuente[f]]), total, TEAL);
    totalRow(ws1, ['TOTAL GENERAL', total, '100%'], 'FFECFDF5');
  }

  addBreakdown(ws1, mixto ? 'Tipo de Incidencia (ambas fuentes)' : 'Tipo de Incidencia',
    sortDesc(countBy(todos, r => r.tipo)), total, BLUE);
  totalRow(ws1, ['TOTAL GENERAL', total, '100%'], 'FFEFF6FF');

  addBreakdown(ws1, 'Jurisdicción', sortDesc(countBy(todos, r => r.jurisdiccion || 'Sin datos')), total, GREEN);
  addBreakdown(ws1, 'Turno', sortTurno(countBy(todos, r => r.turno?.trim() || 'Sin turno')), total, PURPLE);
  totalRow(ws1, ['TOTAL', total, '100%'], 'FFF5F3FF');

  const porHora = sortDesc(countBy(todos, r => (r.hora ? String(r.hora).split(':')[0].padStart(2, '0') : null)));
  addBreakdown(ws1, 'Hora', porHora.map(([h, n]) => [`${h}:00 – ${h}:59`, n]), total, ORANGE);

  if (conPnp) {
    const pnpRows = todos.filter(r => r.fuente === PNP);
    const totalPnp = pnpRows.length;
    addBreakdown(ws1, 'Estado del caso (PNP)', sortDesc(countBy(pnpRows, r => r.estado || 'Sin estado')), totalPnp, TEAL);
    addBreakdown(ws1, 'Comisaría (PNP)', sortDesc(countBy(pnpRows, r => r.comisaria || 'Sin comisaría')), totalPnp, TEAL);
  }

  // ── Comparativo (solo cuando hay ambas fuentes) ──
  if (mixto) {
    const ws3 = wb.addWorksheet('Comparativo');
    ws3.columns = [{ key: 'a', width: 28 }, { key: 'b', width: 14 }, { key: 'c', width: 14 }, { key: 'd', width: 12 }];
    ws3.addRow(['COMPARATIVO SERENAZGO vs PNP']).font = { bold: true, size: 14, color: { argb: PURPLE } };
    ws3.mergeCells('A1:D1');
    ws3.addRow([`Período: ${rangoLabel}`]).font = { italic: true, color: { argb: GREY } };

    const bloque = (titulo, fn, orden) => {
      ws3.addRow([]);
      headerRow(ws3, [titulo, SERENO, PNP, 'Total'], PURPLE);
      const ser = countBy(todos.filter(r => r.fuente === SERENO), fn);
      const pnp = countBy(todos.filter(r => r.fuente === PNP), fn);
      const all = [...new Set([...Object.keys(ser), ...Object.keys(pnp)])];
      const ordenadas = orden ? orden(all, ser, pnp) : all.sort((a, b) => ((ser[b] || 0) + (pnp[b] || 0)) - ((ser[a] || 0) + (pnp[a] || 0)));
      ordenadas.forEach(k => {
        const s = ser[k] || 0, p = pnp[k] || 0;
        const row = ws3.addRow([k, s, p, s + p]);
        [2, 3, 4].forEach(i => { row.getCell(i).alignment = { horizontal: 'center' }; });
      });
      const ts = Object.values(ser).reduce((a, b) => a + b, 0);
      const tp = Object.values(pnp).reduce((a, b) => a + b, 0);
      totalRow(ws3, ['TOTAL', ts, tp, ts + tp], 'FFF5F3FF');
    };

    bloque('Jurisdicción', r => r.jurisdiccion || 'Sin datos');
    bloque('Turno', r => r.turno?.trim() || 'Sin turno',
      all => all.sort((a, b) => {
        const ai = TURNO_ORDER.indexOf(a), bi = TURNO_ORDER.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1; if (bi !== -1) return 1;
        return a.localeCompare(b, 'es');
      }));
    bloque('Fecha', r => r.fecha, all => all.sort());
  }

  // ── Detalle ──
  const ws2 = wb.addWorksheet('Detalle');
  const cols = [];
  if (mixto) cols.push({ header: 'Fuente', key: 'fuente', width: 14 });
  cols.push(
    { header: 'Tipo', key: 'tipo', width: 24 },
    { header: mixto || conPnp ? 'Código / N° Denuncia' : 'Código', key: 'codigo', width: 20 },
    { header: 'Jurisdicción', key: 'jurisdiccion', width: 22 },
  );
  if (conPnp) cols.push(
    { header: 'Comisaría', key: 'comisaria', width: 24 },
    { header: 'Estado', key: 'estado', width: 18 },
  );
  cols.push(
    { header: 'Turno', key: 'turno', width: 14 },
    { header: 'Fecha', key: 'fecha', width: 13 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Latitud', key: 'lat', width: 13 },
    { header: 'Longitud', key: 'lng', width: 13 },
    { header: 'Descripción', key: 'descripcion', width: 46 },
  );
  ws2.columns = cols;
  ws2.getRow(1).eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    c.alignment = { horizontal: 'center' };
  });

  let ri = 2;
  todos.forEach(r => {
    ws2.addRow({
      fuente: r.fuente, tipo: r.tipo, codigo: r.codigo, jurisdiccion: r.jurisdiccion,
      comisaria: r.comisaria, estado: r.estado, turno: r.turno, fecha: r.fecha, hora: r.hora,
      lat: r.Latitud, lng: r.Longitud, descripcion: r.descripcion,
    });
    if (ri % 2 === 0) ws2.getRow(ri).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }; });
    ri++;
  });

  const slug = fuentes.length > 1 ? 'Serenazgo_PNP' : fuentes[0].replace(/\s/g, '_');
  await _download(wb, `Reporte_Incidencias_${slug}_${fmt(new Date())}.xlsx`);
};

// ── Reporte por cluster ───────────────────────────────────────────────────────
export const generarExcelClusters = async (clusters, meta) => {
  const { fuenteLabel, filtroLabel, rangoLabel, radio, fuentes } = meta;
  const mixto  = fuentes.length > 1;
  const conPnp = fuentes.includes(PNP);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'CECOM - Sistema de Gestión'; wb.created = new Date();

  const ws1 = wb.addWorksheet('Resumen Clusters');
  ws1.columns = [
    { key: 'num', width: 10 }, { key: 'jur', width: 22 }, { key: 'cant', width: 14 },
    { key: 'radio', width: 12 }, { key: 'fuentes', width: 26 }, { key: 'tipos', width: 40 },
    { key: 'lat', width: 16 }, { key: 'lng', width: 16 },
  ];
  ws1.addRow([`REPORTE DE CLUSTERS — ${fuenteLabel.toUpperCase()}`]).font = { bold: true, size: 14, color: { argb: BLUE } };
  ws1.mergeCells('A1:H1');
  [`Período: ${rangoLabel}`, `Fuente: ${fuenteLabel}`, `Radio de clustering: ${radio} m`, `Filtro: ${filtroLabel}`, `Generado: ${new Date().toLocaleString('es-PE')}`]
    .forEach(t => { ws1.addRow([t]).font = { italic: true, color: { argb: GREY } }; });
  ws1.addRow([]);
  headerRow(ws1, ['Cluster #', 'Jurisdicción Principal', '# Incidencias', 'Radio (m)', 'Fuentes', 'Tipos', 'Latitud Centroide', 'Longitud Centroide'], BLUE);

  clusters.forEach((cl, i) => {
    const jurPrincipal = sortDesc(countBy(cl.puntos, p => p.jurisdiccion || 'Sin datos'))[0]?.[0] || '—';
    const tiposStr   = sortDesc(countBy(cl.puntos, p => p.Tipo || '—')).map(([t, n]) => `${t}(${n})`).join(', ');
    const fuentesStr = sortDesc(countBy(cl.puntos, p => p.fuente || '—')).map(([f, n]) => `${f}(${n})`).join(', ');
    const row = ws1.addRow([
      i + 1, jurPrincipal, cl.cantidad, Math.round(cl.radio),
      fuentesStr, tiposStr, cl.centroide.lat.toFixed(6), cl.centroide.lng.toFixed(6),
    ]);
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    if ((i + 1) % 2 === 0) row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }; });
  });
  totalRow(ws1, ['', 'TOTAL', clusters.reduce((s, c) => s + c.cantidad, 0), '', '', '', '', ''], 'FFEFF6FF');

  // ── Detalle por cluster ──
  const ws2 = wb.addWorksheet('Detalle por Cluster');
  const cols = [{ header: 'Cluster #', key: 'clNum', width: 12 }];
  if (mixto) cols.push({ header: 'Fuente', key: 'fuente', width: 14 });
  cols.push(
    { header: 'Tipo', key: 'tipo', width: 24 },
    { header: 'Código', key: 'codigo', width: 20 },
    { header: 'Jurisdicción', key: 'jur', width: 22 },
  );
  if (conPnp) cols.push(
    { header: 'Comisaría', key: 'comisaria', width: 24 },
    { header: 'Estado', key: 'estado', width: 18 },
  );
  cols.push(
    { header: 'Turno', key: 'turno', width: 14 },
    { header: 'Fecha', key: 'fecha', width: 13 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Descripción', key: 'desc', width: 46 },
  );
  ws2.columns = cols;
  const nCols = cols.length;
  const lastCol = String.fromCharCode(64 + nCols);
  ws2.getRow(1).eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    c.alignment = { horizontal: 'center' };
  });

  let ri2 = 2;
  clusters.forEach((cl, i) => {
    const clHdr = ws2.addRow([`── Cluster ${i + 1} — ${cl.cantidad} incidencias — Radio ${Math.round(cl.radio)} m`]);
    ws2.mergeCells(`A${ri2}:${lastCol}${ri2}`);
    clHdr.font = { bold: true, italic: true };
    clHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    ri2++;
    cl.puntos.forEach(p => {
      ws2.addRow({
        clNum: i + 1, fuente: p.fuente, tipo: p.Tipo || '—', codigo: p.codigo, jur: p.jurisdiccion,
        comisaria: p.comisaria, estado: p.estado, turno: p.turno, fecha: p.fecha, hora: p.hora, desc: p.descripcion,
      });
      if (ri2 % 2 === 0) ws2.getRow(ri2).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }; });
      ri2++;
    });
  });

  const slug = fuentes.length > 1 ? 'Serenazgo_PNP' : fuentes[0].replace(/\s/g, '_');
  await _download(wb, `Reporte_Clusters_${slug}_${fmt(new Date())}.xlsx`);
};
