// Exportación a Excel del informe del turno (fase 4). La vista está en InformeTurno.jsx.
import ExcelJS from 'exceljs';
import { fmtHora, fmtMin, textoResultado } from './util';
import { TIPO_ALERTA } from './unidades';

export const fmtFecha = (iso) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima' });
export const PRIORIDAD_TXT = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };
export const ESTADO_TXT = { ASIGNADO: 'En camino', EN_LUGAR: 'En el lugar', CERRADO: 'Cerrado', CANCELADO: 'Cancelado' };
export const filas = (obj) => Object.entries(obj ?? {}).sort((a, b) => b[1] - a[1]);

const descargar = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** Excel con tres hojas: resumen, despachos del turno y rutas por móvil. */
export const exportarExcel = async (d) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIVECAM';
  const r = wb.addWorksheet('Resumen');
  r.columns = [{ header: 'Indicador', key: 'k', width: 46 }, { header: 'Valor', key: 'v', width: 28 }];
  const min = (s) => ((s ?? null) === null ? '-' : fmtMin(s));
  const resumen = [
    ['Fecha', fmtFecha(d.ventana.inicio)], ['Turno', d.turno_nombre], ['Informe generado', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })],
    ['Emergencias atendidas', d.despacho.emergencias], ['Unidades despachadas', d.despacho.unidades_despachadas],
    ['Con llegada detectada', d.despacho.con_llegada], ['Cerrados', d.despacho.cerrados], ['Cancelados', d.despacho.cancelados],
    ['Recepción a despacho (promedio)', min(d.despacho.recepcion_a_despacho.promedio_s)], ['Recepción a despacho (mediana)', min(d.despacho.recepcion_a_despacho.mediana_s)],
    ['Despacho a llegada (promedio)', min(d.despacho.despacho_a_llegada.promedio_s)], ['Despacho a llegada (mediana)', min(d.despacho.despacho_a_llegada.mediana_s)],
    ['Tiempo en el lugar (promedio)', min(d.despacho.en_el_lugar.promedio_s)], ['Se eligió la primera sugerencia', d.despacho.primera_sugerencia],
    ['Rutas del turno', d.rutas.planes], ['Rutas manuales', d.rutas.manuales], ['Paradas verificadas', d.rutas.verificadas], ['Paradas visitadas', d.rutas.visitadas], ['Cumplimiento de ruta', d.rutas.pct === null ? 'sin verificar' : `${d.rutas.pct}%`],
    ['Alertas del turno', d.alertas.total], ['Alertas atendidas', d.alertas.atendidas],
    ['Móviles', d.flota.moviles], ['Móviles con GPS ahora', d.flota.en_linea], ['Móviles sin reporte ahora', d.flota.sin_reporte], ['Fuera de servicio', d.flota.fuera_servicio],
    ...filas(d.despacho.por_jurisdiccion).map(([k, v]) => [`Despachos en ${k}`, v]),
    ...filas(d.despacho.por_tipo).map(([k, v]) => [`Despachos por tipo: ${k}`, v]),
    ...filas(d.despacho.por_prioridad).map(([k, v]) => [`Despachos de prioridad ${PRIORIDAD_TXT[k] ?? k}`, v]),
    ...filas(d.despacho.por_resultado).map(([k, v]) => [`Resultado: ${textoResultado(k)}`, v]),
    ...filas(d.alertas.por_tipo).map(([k, v]) => [`Alertas: ${TIPO_ALERTA[k]?.label ?? k}`, v]),
    ['Móviles sin reporte', d.flota.sin_reporte_lista.join(', ') || '-'],
  ];
  resumen.forEach(([k, v]) => r.addRow({ k, v }));
  r.getRow(1).font = { bold: true };

  const h = wb.addWorksheet('Despachos');
  h.columns = [
    { header: 'Hora', key: 'hora', width: 10 }, { header: 'Unidad', key: 'unidad', width: 16 }, { header: 'Incidencia', key: 'inc', width: 16 },
    { header: 'Tipo', key: 'tipo', width: 26 }, { header: 'Prioridad', key: 'pri', width: 10 }, { header: 'Jurisdicción', key: 'jur', width: 18 },
    { header: 'Recepción a despacho', key: 'rd', width: 20 }, { header: 'Despacho a llegada', key: 'dl', width: 18 }, { header: 'Estado', key: 'est', width: 12 },
    { header: 'Resultado', key: 'res', width: 22 }, { header: 'Despachó', key: 'por', width: 14 },
  ];
  d.despachos.forEach((x) => h.addRow({
    hora: fmtHora(x.hora), unidad: x.unidad, inc: x.incidencia, tipo: x.tipo, pri: PRIORIDAD_TXT[x.prioridad] ?? '', jur: x.jurisdiccion,
    rd: min(x.recepcion_a_despacho_s), dl: min(x.despacho_a_llegada_s), est: ESTADO_TXT[x.estado] ?? x.estado, res: textoResultado(x.resultado), por: x.por ?? '',
  }));
  h.getRow(1).font = { bold: true };

  const p = wb.addWorksheet('Rutas');
  p.columns = [
    { header: 'Unidad', key: 'u', width: 16 }, { header: 'Jurisdicción', key: 'j', width: 18 }, { header: 'Origen', key: 'f', width: 12 },
    { header: 'Paradas', key: 'p', width: 10 }, { header: 'Visitadas', key: 'v', width: 10 }, { header: 'Cumplimiento', key: 'c', width: 14 },
  ];
  d.rutas.por_movil.forEach((x) => p.addRow({
    u: x.unidad, j: x.jurisdiccion, f: x.fuente === 'MANUAL' ? 'Manual' : 'Inteligente', p: x.paradas, v: x.verificada ? x.visitadas : '-',
    c: x.verificada && x.paradas ? `${Math.round((100 * x.visitadas) / x.paradas)}%` : 'sin verificar',
  }));
  p.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  descargar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `informe_turno_${d.fecha}_${d.turno.toLowerCase()}.xlsx`);
};

