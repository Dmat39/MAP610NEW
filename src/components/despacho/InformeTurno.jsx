// Informe del turno (fase 4): indicadores para la Subgerencia, con exportación a Excel y a PDF (imprimir).
import { useEffect, useState } from 'react';
import { PiFileXls, PiPrinter, PiXCircle } from 'react-icons/pi';
import * as api from '../../services/patrullajeService';
import { fmtHora, fmtMin, textoResultado, turnoLabel } from './util';
import { TIPO_ALERTA } from './unidades';
import { ESTADO_TXT, PRIORIDAD_TXT, exportarExcel, filas, fmtFecha } from './informeExcel';

const Tabla = ({ titulo, datos, etiqueta = (k) => k }) => {
  const f = filas(datos);
  if (!f.length) return null;
  return (
    <div className="inf-bloque">
      <h3>{titulo}</h3>
      <table><tbody>{f.map(([k, v]) => <tr key={k}><td>{etiqueta(k)}</td><td className="inf-num">{v}</td></tr>)}</tbody></table>
    </div>
  );
};

/** Vista imprimible del informe. Se abre sobre la pantalla; "PDF" usa el diálogo de impresión del navegador. */
export const InformeTurno = ({ fecha, turno, onCerrar, avisar }) => {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let vivo = true;
    api.obtenerIndicadores(fecha, turno).then((x) => { if (vivo) setD(x); }).catch((e) => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, [fecha, turno]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCerrar]);
  const min = (s) => fmtMin(s);
  return (
    <div className="inf-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="inf" role="dialog" aria-label="Informe del turno">
        <div className="inf-acciones no-print">
          <button className="cdp-btn" disabled={!d} onClick={() => exportarExcel(d).catch((e) => avisar?.(e.message, 'error'))}><PiFileXls size={15} /> Excel</button>
          <button className="cdp-btn" disabled={!d} onClick={() => window.print()}><PiPrinter size={15} /> PDF (imprimir)</button>
          <button className="cdp-icon-btn" aria-label="Cerrar" onClick={onCerrar}><PiXCircle size={16} /></button>
        </div>
        {error && <p className="cdp-empty">{error}</p>}
        {!d && !error && <p className="cdp-empty">Calculando indicadores…</p>}
        {d && (
          <>
            <header className="inf-head">
              <div>
                <small>Municipalidad de San Juan de Lurigancho · CECOM · SIVECAM</small>
                <h2>Informe del turno {turnoLabel(d.turno).toLowerCase()}, {fmtFecha(d.ventana.inicio)}</h2>
                <small>{d.turno_nombre}{d.en_curso ? ' (turno en curso)' : ''}. Generado {new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}.</small>
              </div>
            </header>
            <div className="inf-kpis">
              <div><b>{d.despacho.emergencias}</b><span>Emergencias</span></div>
              <div><b>{d.despacho.unidades_despachadas}</b><span>Unidades despachadas</span></div>
              <div><b>{min(d.despacho.despacho_a_llegada.mediana_s)}</b><span>Mediana de llegada ({d.despacho.despacho_a_llegada.n})</span></div>
              <div><b>{min(d.despacho.recepcion_a_despacho.mediana_s)}</b><span>Mediana recepción a despacho ({d.despacho.recepcion_a_despacho.n})</span></div>
              <div><b>{d.rutas.pct === null ? '-' : `${d.rutas.pct}%`}</b><span>Cumplimiento de rutas ({d.rutas.visitadas}/{d.rutas.verificadas})</span></div>
              <div><b>{d.alertas.total}</b><span>Alertas del turno</span></div>
              <div><b>{d.flota.en_linea}/{d.flota.moviles}</b><span>Móviles con GPS ahora</span></div>
              <div><b>{d.despacho.cancelados}</b><span>Cancelados</span></div>
            </div>
            <div className="inf-grid">
              <Tabla titulo="Despachos por jurisdicción" datos={d.despacho.por_jurisdiccion} />
              <Tabla titulo="Despachos por tipo" datos={d.despacho.por_tipo} />
              <Tabla titulo="Por prioridad" datos={d.despacho.por_prioridad} etiqueta={(k) => PRIORIDAD_TXT[k] ?? k} />
              <Tabla titulo="Resultados" datos={d.despacho.por_resultado} etiqueta={textoResultado} />
              <Tabla titulo="Alertas por tipo" datos={d.alertas.por_tipo} etiqueta={(k) => TIPO_ALERTA[k]?.label ?? k} />
              <Tabla titulo="Despachos por unidad" datos={d.despacho.por_unidad} />
            </div>
            <div className="inf-bloque">
              <h3>Tiempos</h3>
              <table><tbody>
                <tr><td>Recepción a despacho</td><td className="inf-num">promedio {min(d.despacho.recepcion_a_despacho.promedio_s)}, mediana {min(d.despacho.recepcion_a_despacho.mediana_s)}</td></tr>
                <tr><td>Despacho a llegada</td><td className="inf-num">promedio {min(d.despacho.despacho_a_llegada.promedio_s)}, mediana {min(d.despacho.despacho_a_llegada.mediana_s)}</td></tr>
                <tr><td>Tiempo en el lugar</td><td className="inf-num">promedio {min(d.despacho.en_el_lugar.promedio_s)}</td></tr>
                <tr><td>Se eligió la primera sugerencia</td><td className="inf-num">{d.despacho.primera_sugerencia} de {d.despacho.unidades_despachadas}</td></tr>
              </tbody></table>
            </div>
            <div className="inf-bloque">
              <h3>Despachos del turno ({d.despachos.length})</h3>
              {!d.despachos.length && <p className="cdp-empty">No hubo despachos en el turno.</p>}
              {d.despachos.length > 0 && (
                <table className="inf-tabla">
                  <thead><tr><th>Hora</th><th>Unidad</th><th>Incidencia</th><th>Tipo</th><th>Jurisdicción</th><th>Llegada</th><th>Estado</th><th>Resultado</th></tr></thead>
                  <tbody>
                    {d.despachos.map((x, i) => (
                      <tr key={i}><td>{fmtHora(x.hora)}</td><td>{x.unidad}</td><td>{x.incidencia}</td><td>{x.tipo}</td><td>{x.jurisdiccion}</td><td>{min(x.despacho_a_llegada_s)}</td><td>{ESTADO_TXT[x.estado]}</td><td>{textoResultado(x.resultado)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="inf-bloque">
              <h3>Rutas del turno ({d.rutas.planes}{d.rutas.manuales ? `, ${d.rutas.manuales} manuales` : ''})</h3>
              {!d.rutas.por_movil.length && <p className="cdp-empty">No se generaron rutas para este turno.</p>}
              {d.rutas.por_movil.length > 0 && (
                <table className="inf-tabla">
                  <thead><tr><th>Unidad</th><th>Jurisdicción</th><th>Origen</th><th>Paradas</th><th>Visitadas</th><th>Cumplimiento</th></tr></thead>
                  <tbody>
                    {d.rutas.por_movil.map((x) => (
                      <tr key={x.unidad}><td>{x.unidad}</td><td>{x.jurisdiccion}</td><td>{x.fuente === 'MANUAL' ? 'Manual' : 'Inteligente'}</td><td>{x.paradas}</td><td>{x.verificada ? x.visitadas : '-'}</td><td>{x.verificada && x.paradas ? `${Math.round((100 * x.visitadas) / x.paradas)}%` : 'sin verificar'}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="inf-bloque">
              <h3>Flota al generar el informe</h3>
              <p>{d.flota.en_linea} de {d.flota.moviles} móviles con GPS, {d.flota.fuera_servicio} fuera de servicio. Sin reporte: {d.flota.sin_reporte_lista.join(', ') || 'ninguna'}.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InformeTurno;
