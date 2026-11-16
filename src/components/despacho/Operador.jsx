// Vista de operador (fase 3): buscador global, tarjeta de unidad, tablero de unidades, alertas y atajos.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PiMagnifyingGlass, PiXCircle, PiMapPin, PiPath, PiWhatsappLogo, PiWrench, PiCheckCircle, PiCaretUp, PiCaretDown,
  PiCheck, PiEye, PiSiren,
} from 'react-icons/pi';
import { COLOR, ESTADOS } from '../mapa/estados';
import { IconoCategoria, SimboloAPie, SimboloMovil } from '../mapa/simbolos';
import { fmtCrono, fmtHora, segDesde } from './util';
import { ATAJOS, TIPO_ALERTA, claveUnidad, estadoUnidad, nombreEstado, nombreTipoUnidad as nombreTipo } from './unidades';

const Simbolo = ({ u, estado, size = 22 }) =>
  u.tipo === 'MOVIL' ? <SimboloMovil subtipo={u.subtipo} estado={estado} size={size} /> : <SimboloAPie tipo={u.tipo} estado={estado} size={size} />;

const Chip = ({ color, children }) => <span className="cdp-chip" style={{ '--c': color }}>{children}</span>;

// ─── Buscador global ──────────────────────────────────────────────────────────
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Busca por indicativo (ORION 52), ISSI, código de bodycam, código o tipo de incidencia; con Enter busca
 * también la dirección en OpenStreetMap. `inputRef` lo usa el atajo "/".
 */
export const Buscador = ({ moviles, aPie, incidencias, onUnidad, onIncidencia, onDireccion, buscarDireccion, inputRef, onNecesitaAPie }) => {
  const [texto, setTexto] = useState('');
  const [direcciones, setDirecciones] = useState(null); // null = no se buscó
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef(null);
  const q = norm(texto.trim());

  // Se cierra al hacer clic fuera del buscador
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  useEffect(() => { if (q.length >= 2 && !aPie.length) onNecesitaAPie?.(); }, [q, aPie.length, onNecesitaAPie]);
  useEffect(() => { setDirecciones(null); }, [q]);

  const resultados = useMemo(() => {
    if (q.length < 2) return [];
    const u = [...moviles, ...aPie]
      .filter((x) => norm(x.codigo).includes(q) || norm(x.id ?? x.issi).includes(q))
      .slice(0, 6)
      .map((x) => ({ tipo: 'unidad', key: claveUnidad(x), u: x }));
    const i = incidencias
      .filter((x) => norm(x.codigo).includes(q) || norm(x.corto).includes(q) || norm(x.tipo).includes(q))
      .slice(0, 5)
      .map((x) => ({ tipo: 'incidencia', key: `inc-${x.id}`, i: x }));
    return [...u, ...i];
  }, [q, moviles, aPie, incidencias]);

  const buscarDir = async () => {
    if (q.length < 3) return;
    setBuscando(true);
    try { setDirecciones(await buscarDireccion(texto.trim())); } catch { setDirecciones([]); } finally { setBuscando(false); }
  };
  const limpiar = () => { setTexto(''); setDirecciones(null); setAbierto(false); };
  const elegir = (fn) => { fn(); limpiar(); inputRef.current?.blur(); };
  const mostrar = abierto && (resultados.length > 0 || direcciones !== null || buscando || q.length >= 2);

  return (
    <div className="cdp-buscador" ref={cajaRef}>
      <div className="cdp-buscador-caja">
        <PiMagnifyingGlass size={15} />
        <input ref={inputRef} value={texto} placeholder="Buscar unidad, bodycam, incidencia o dirección  ( / )" aria-label="Buscar"
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { limpiar(); e.target.blur(); }
            if (e.key === 'Enter') {
              if (resultados.length === 1 && direcciones === null) {
                const r = resultados[0];
                elegir(() => (r.tipo === 'unidad' ? onUnidad(r.u) : onIncidencia(r.i)));
              } else buscarDir();
            }
          }} />
        {texto && <button className="cdp-icon-btn" aria-label="Limpiar" onClick={limpiar}><PiXCircle size={14} /></button>}
      </div>
      {mostrar && (
        <div className="cdp-buscador-res" role="listbox">
          {resultados.map((r) => r.tipo === 'unidad' ? (
            <button key={r.key} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(() => onUnidad(r.u))}>
              <Simbolo u={r.u} estado={estadoUnidad(r.u)} size={20} />
              <span><b>{r.u.codigo}</b><small>{nombreTipo(r.u)}{r.u.tipo === 'MOVIL' ? `, ISSI ${r.u.issi}` : ''}{r.u.en_linea ? '' : ', sin reporte'}</small></span>
            </button>
          ) : (
            <button key={r.key} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(() => onIncidencia(r.i))}>
              <IconoCategoria categoria={r.i.categoria} size={16} style={{ color: COLOR.incidencia }} />
              <span><b>{r.i.corto || r.i.tipo}</b><small>{r.i.codigo}{r.i.jurisdiccion ? `, ${r.i.jurisdiccion}` : ''}, {fmtHora(r.i.registrado)}</small></span>
            </button>
          ))}
          {direcciones?.map((d, k) => (
            <button key={`d-${k}`} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(() => onDireccion(d))}>
              <PiMapPin size={16} style={{ color: COLOR.ruta }} />
              <span><b>{d.nombre.split(',')[0]}</b><small>{d.nombre.split(',').slice(1, 4).join(',').trim()}</small></span>
            </button>
          ))}
          {buscando && <div className="cdp-buscador-nota">Buscando la dirección…</div>}
          {!buscando && direcciones?.length === 0 && <div className="cdp-buscador-nota">No se encontró esa dirección en San Juan de Lurigancho.</div>}
          {!buscando && direcciones === null && q.length >= 3 && (
            <button className="cdp-buscador-dir" onMouseDown={(e) => e.preventDefault()} onClick={buscarDir}>
              <PiMapPin size={14} /> Buscar "{texto.trim()}" como dirección (Enter)
            </button>
          )}
          {!buscando && direcciones === null && !resultados.length && q.length === 2 && <div className="cdp-buscador-nota">Sigue escribiendo…</div>}
        </div>
      )}
    </div>
  );
};

// ─── Tarjeta de unidad ────────────────────────────────────────────────────────
const textoWhatsAppUnidad = (u) => {
  const lineas = [
    `*CECOM SJL: ${u.codigo}*`,
    (u.lat ?? null) !== null ? `Posición: https://maps.google.com/?q=${u.lat},${u.lng}` : 'Sin posición GPS',
    u.ultimo_reporte ? `Último reporte: ${fmtHora(u.ultimo_reporte)}` : null,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`;
};

/** Flota sobre el mapa al hacer clic en una unidad (marcador, tablero o buscador). */
export const TarjetaUnidad = ({ u, despacho, plan, puede, hayPunto, recorridoActivo, cargandoRecorrido, onEnviar, onRecorrido, onServicio, onCentrar, onCerrar, onVerDespacho }) => {
  const [motivo, setMotivo] = useState('');
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  useEffect(() => { setPidiendoMotivo(false); setMotivo(''); }, [u.tipo, u.id]);
  const estado = estadoUnidad(u, despacho);
  const visitadas = plan?.stops.filter((s) => s.visited_at).length ?? 0;
  return (
    <div className="cdp-tarjeta" role="dialog" aria-label={`Unidad ${u.codigo}`}>
      <div className="cdp-tarjeta-head">
        <Simbolo u={u} estado={estado} size={30} />
        <div>
          <b>{u.codigo}</b>
          <small>{nombreTipo(u)}{u.tipo === 'MOVIL' ? `, ISSI ${u.issi}` : ''}{u.jurisdiccion?.nombre ? `, ${u.jurisdiccion.nombre}` : ''}</small>
        </div>
        <Chip color={COLOR[estado]}>{nombreEstado(estado)}</Chip>
        <button className="cdp-icon-btn" aria-label="Cerrar" onClick={onCerrar}><PiXCircle size={16} /></button>
      </div>
      <div className="cdp-tarjeta-datos">
        <span>Última señal <b>{u.ultimo_reporte ? `${fmtHora(u.ultimo_reporte)} (hace ${u.minutos_sin_reporte} min)` : 'nunca'}</b></span>
        {u.tipo === 'MOVIL' && <span>Velocidad <b>{u.velocidad ?? 0} km/h</b></span>}
        {u.estado_radio && <span>Radio <b>{u.estado_radio}</b></span>}
        {despacho && (
          <span>Despacho <b><button className="cdp-link" onClick={() => onVerDespacho?.(despacho)}>{despacho.incident_code ?? 'punto marcado'}</button>, {despacho.status === 'EN_LUGAR' ? 'en el lugar' : `en camino${despacho.ruta ? `, faltan ${Math.round(despacho.ruta.duration_s / 60)} min` : ''}`}</b></span>
        )}
        {plan && <span>Ruta del turno <b>{visitadas} de {plan.stops.length} paradas{plan.source === 'MANUAL' ? ' (manual)' : ''}</b></span>}
        {u.fuera_servicio && <span>Fuera de servicio <b>{u.fuera_servicio_motivo || 'sin motivo'}</b></span>}
      </div>
      <div className="cdp-row">
        {puede.asignar && !u.fuera_servicio && u.en_linea && (
          <button className={`cdp-btn mini${hayPunto ? ' primario' : ''}`} onClick={onEnviar} title={hayPunto ? 'Enviar esta unidad a la emergencia abierta' : 'Primero elige o marca una emergencia'}>
            <PiSiren size={13} /> {hayPunto ? 'Enviar a la emergencia' : 'Enviar…'}
          </button>
        )}
        {(u.lat ?? null) !== null && <button className="cdp-btn mini" onClick={onCentrar}><PiMapPin size={13} /> Centrar</button>}
        <button className={`cdp-btn mini${recorridoActivo ? ' activo' : ''}`} onClick={onRecorrido} disabled={cargandoRecorrido}>
          <PiPath size={13} /> {cargandoRecorrido ? 'Cargando' : recorridoActivo ? 'Ocultar recorrido' : 'Recorrido 2 h'}
        </button>
        <a className="cdp-btn mini" href={textoWhatsAppUnidad(u)} target="_blank" rel="noreferrer"><PiWhatsappLogo size={13} /> WhatsApp</a>
        {puede.cerrar && !pidiendoMotivo && (
          u.fuera_servicio
            ? <button className="cdp-btn mini" onClick={() => onServicio(false)}><PiCheckCircle size={13} /> Volver al servicio</button>
            : <button className="cdp-btn mini peligro" onClick={() => setPidiendoMotivo(true)}><PiWrench size={13} /> Fuera de servicio</button>
        )}
      </div>
      {pidiendoMotivo && (
        <div className="cdp-cierre">
          <input autoFocus placeholder="Motivo: taller, sin combustible, sin personal…" maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { onServicio(true, motivo); setPidiendoMotivo(false); } if (e.key === 'Escape') setPidiendoMotivo(false); }} />
          <div className="cdp-row">
            <button className="cdp-btn mini peligro" onClick={() => { onServicio(true, motivo); setPidiendoMotivo(false); }}>Confirmar fuera de servicio</button>
            <button className="cdp-btn mini" onClick={() => setPidiendoMotivo(false)}>Volver</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tablero de unidades ──────────────────────────────────────────────────────
const COLUMNAS = [
  ['codigo', 'Unidad'], ['estado', 'Estado'], ['jurisdiccion', 'Jurisdicción'], ['minutos', 'Última señal'], ['asignacion', 'Asignación'],
];
const ORDEN_ESTADO = { ocupada: 0, en_lugar: 1, disponible: 2, gps_viejo: 3, fuera_servicio: 4, sin_reporte: 5 };

/** Lista ordenable y filtrable de todas las unidades. Clic en la fila centra el mapa y abre la tarjeta. */
export const TableroUnidades = ({ moviles, aPie, despachoPorRecurso, planes, unidadSel, onSelect, onNecesitaAPie, cargandoAPie }) => {
  const [filtro, setFiltro] = useState({ texto: '', estado: '', jur: '', grupo: 'MOVIL' });
  const [orden, setOrden] = useState({ col: 'estado', dir: 1 });
  useEffect(() => { if (filtro.grupo === 'APIE') onNecesitaAPie?.(); }, [filtro.grupo, onNecesitaAPie]);

  const filas = useMemo(() => {
    const base = filtro.grupo === 'MOVIL' ? moviles : aPie;
    const q = norm(filtro.texto.trim());
    return base
      .map((u) => {
        const d = despachoPorRecurso.get(claveUnidad(u));
        const plan = u.tipo === 'MOVIL' ? planes.find((p) => p.unit_issi === u.issi) : null;
        return {
          u, d, plan, estado: estadoUnidad(u, d),
          jurisdiccion: u.jurisdiccion?.nombre ?? '',
          minutos: u.minutos_sin_reporte ?? Infinity,
          asignacion: d ? `Despacho ${d.incident_code ?? 'punto marcado'}` : plan ? `Ruta ${plan.stops.filter((s) => s.visited_at).length}/${plan.stops.length}` : '',
        };
      })
      .filter((f) => (!q || norm(f.u.codigo).includes(q) || norm(f.u.id).includes(q))
        && (!filtro.estado || f.estado === filtro.estado)
        && (!filtro.jur || f.jurisdiccion === filtro.jur))
      .sort((a, b) => {
        const k = orden.col;
        const va = k === 'codigo' ? a.u.codigo : k === 'estado' ? ORDEN_ESTADO[a.estado] : a[k];
        const vb = k === 'codigo' ? b.u.codigo : k === 'estado' ? ORDEN_ESTADO[b.estado] : b[k];
        const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return (c || a.u.codigo.localeCompare(b.u.codigo)) * orden.dir;
      });
  }, [moviles, aPie, despachoPorRecurso, planes, filtro, orden]);

  const jurs = useMemo(() => [...new Set(moviles.map((m) => m.jurisdiccion?.nombre).filter(Boolean))].sort(), [moviles]);
  const cambiarOrden = (col) => setOrden((o) => ({ col, dir: o.col === col ? -o.dir : 1 }));
  const resumen = filas.reduce((acc, f) => { acc[f.estado] = (acc[f.estado] ?? 0) + 1; return acc; }, {});

  return (
    <section>
      <div className="cdp-filtros">
        <div className="cdp-segm" role="tablist">
          <button className={filtro.grupo === 'MOVIL' ? 'activo' : ''} onClick={() => setFiltro((f) => ({ ...f, grupo: 'MOVIL', jur: '' }))}>Móviles ({moviles.length})</button>
          <button className={filtro.grupo === 'APIE' ? 'activo' : ''} onClick={() => setFiltro((f) => ({ ...f, grupo: 'APIE', jur: '' }))}>A pie {aPie.length ? `(${aPie.length})` : ''}</button>
        </div>
        <input placeholder="Filtrar por indicativo o código" value={filtro.texto} aria-label="Filtrar" onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value }))} />
        <select aria-label="Estado" value={filtro.estado} onChange={(e) => setFiltro((f) => ({ ...f, estado: e.target.value }))}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.key} value={e.key}>{e.label}{resumen[e.key] ? ` (${resumen[e.key]})` : ''}</option>)}
        </select>
        {filtro.grupo === 'MOVIL' && (
          <select aria-label="Jurisdicción" value={filtro.jur} onChange={(e) => setFiltro((f) => ({ ...f, jur: e.target.value }))}>
            <option value="">Todas las jurisdicciones</option>
            {jurs.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        )}
      </div>
      <div className="cdp-list-head"><span>{filas.length} unidades</span></div>
      {cargandoAPie && filtro.grupo === 'APIE' && !aPie.length && <p className="cdp-empty">Cargando radios portátiles y bodycams…</p>}
      <table className="cdp-tabla cdp-tablero">
        <thead>
          <tr>
            {COLUMNAS.filter(([k]) => filtro.grupo === 'MOVIL' || k !== 'jurisdiccion').map(([k, l]) => (
              <th key={k}><button onClick={() => cambiarOrden(k)}>{l} {orden.col === k ? (orden.dir === 1 ? <PiCaretUp size={11} /> : <PiCaretDown size={11} />) : null}</button></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={claveUnidad(f.u)} className={unidadSel && claveUnidad(f.u) === unidadSel ? 'sel' : ''} onClick={() => onSelect(f.u)} tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(f.u); }}>
              <td><span className="cdp-tipo"><Simbolo u={f.u} estado={f.estado} size={20} /> <b>{f.u.codigo}</b></span></td>
              <td><Chip color={COLOR[f.estado]}>{nombreEstado(f.estado)}</Chip></td>
              {filtro.grupo === 'MOVIL' && <td>{f.jurisdiccion || '-'}</td>}
              <td className="cdp-num">{f.minutos === Infinity ? 'nunca' : f.minutos < 60 ? `${f.minutos} min` : f.minutos < 1440 ? `${Math.round(f.minutos / 60)} h` : `${Math.round(f.minutos / 1440)} d`}</td>
              <td>{f.asignacion || (f.u.fuera_servicio ? f.u.fuera_servicio_motivo || 'Fuera de servicio' : '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filas.length && !cargandoAPie && <p className="cdp-empty">Ninguna unidad coincide con el filtro.</p>}
    </section>
  );
};

// ─── Alertas automáticas ──────────────────────────────────────────────────────

export const PanelAlertas = ({ alertas, ahora, puede, onAtender, onVer }) => {
  const [verHistorial, setVerHistorial] = useState(false);
  const activas = alertas?.activas ?? [];
  const historial = alertas?.historial ?? [];
  const Item = ({ a }) => {
    const T = TIPO_ALERTA[a.type] ?? { label: a.type, icon: PiSiren };
    const I = T.icon;
    return (
      <div className={`cdp-alerta-item${a.activa ? '' : ' cerrada'}${a.acknowledged_at ? ' atendida' : ''}`}>
        <I size={17} className="cdp-alerta-ico" />
        <div className="cdp-alerta-txt">
          <b>{T.label}{a.unit_code ? `: ${a.unit_code}` : a.jurisdiction ? `: ${a.jurisdiction}` : ''}</b>
          <small>{a.message}. {a.activa ? `Desde ${fmtHora(a.started_at)} (${fmtCrono(segDesde(a.started_at, ahora))})` : `${fmtHora(a.started_at)} a ${fmtHora(a.ended_at)}`}{a.acknowledged_by ? `. Atendida por ${a.acknowledged_by}` : ''}</small>
        </div>
        <div className="cdp-alerta-acc">
          {((a.lat ?? null) !== null || a.unit_issi) && <button className="cdp-icon-btn" title="Ver en el mapa" aria-label="Ver en el mapa" onClick={() => onVer(a)}><PiEye size={14} /></button>}
          {a.activa && !a.acknowledged_at && puede && <button className="cdp-icon-btn" title="Marcar como atendida" aria-label="Atendida" onClick={() => onAtender(a)}><PiCheck size={14} /></button>}
        </div>
      </div>
    );
  };
  return (
    <section>
      <p className="cdp-muted">
        Se revisan cada minuto y se cierran solas cuando la situación cambia. "Atendida" deja constancia de quién la vio.
      </p>
      <div className="cdp-list-head"><span>Activas ({activas.length})</span></div>
      {!activas.length && <p className="cdp-empty">Sin alertas activas.</p>}
      {activas.map((a) => <Item key={a.id} a={a} />)}
      <div className="cdp-list-head">
        <span>Historial de 24 h ({historial.length})</span>
        {historial.length > 0 && <button className="cdp-link" onClick={() => setVerHistorial((v) => !v)}>{verHistorial ? 'Ocultar' : 'Ver'}</button>}
      </div>
      {verHistorial && historial.slice(0, 100).map((a) => <Item key={a.id} a={a} />)}
      <div className="cdp-card">
        <h3>Qué vigila</h3>
        <ul className="cdp-lista">
          {Object.values(TIPO_ALERTA).map((t) => <li key={t.label}><b>{t.label}:</b> {t.desc}.</li>)}
        </ul>
      </div>
    </section>
  );
};

// ─── Atajos de teclado ────────────────────────────────────────────────────────

export const AyudaAtajos = ({ onCerrar }) => {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="cdp-atajos" ref={ref} tabIndex={-1} role="dialog" aria-label="Atajos de teclado" onKeyDown={(e) => { if (e.key === 'Escape') onCerrar(); }}>
      <div className="cdp-atajos-head"><b>Atajos de teclado</b><button className="cdp-icon-btn" aria-label="Cerrar" onClick={onCerrar}><PiXCircle size={15} /></button></div>
      <dl>
        {ATAJOS.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}
      </dl>
      <small className="cdp-muted">No actúan mientras escribes en un campo.</small>
    </div>
  );
};
