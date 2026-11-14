import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  PiChartBar, PiPath, PiSiren, PiPencilSimpleLine, PiArrowClockwise, PiNavigationArrow, PiWhatsappLogo,
  PiCheckCircle, PiXCircle, PiStack, PiCrosshair, PiTrash, PiFloppyDisk, PiShieldCheck, PiWarning,
  PiFootprints, PiSecurityCamera, PiEye, PiMegaphone,
} from 'react-icons/pi';
import { IconoAPie, IconoCamara, IconoIncidencia, IconoVehiculo, IconoSirena } from './iconos';
import { useAuth } from '../../context/AuthContext';
import MapaDespacho from './MapaDespacho';
import * as api from '../../services/patrullajeService';
import {
  TURNOS, colorPorIssi, fmtKm, fmtMin, fmtHora, hoyLima, textoWhatsApp, ESTADO_DESPACHO,
} from './util';
import './CentroDespacho.css';

const POLL_MS = 15000;

// Capas que se muestran al entrar a cada pestaña. Luego el operador puede prender o apagar las que quiera.
const CAPAS_POR_TAB = {
  resumen:  { jurisdicciones: true,  moviles: true, offline: false, zonas: true,  rutas: false, incidencias: false },
  rutas:    { jurisdicciones: true,  moviles: true, offline: false, zonas: false, rutas: true,  incidencias: false },
  despacho: { jurisdicciones: true,  moviles: true, offline: false, zonas: false, rutas: false, incidencias: false },
  manual:   { jurisdicciones: true,  moviles: true, offline: false, zonas: true,  rutas: false, incidencias: false },
};

const CentroDespacho = () => {
  const { user, hasModuleAccess, hasModuleOp } = useAuth();
  const isSuper = user?.role?.toUpperCase() === 'SUPERADMIN';
  const puede = useMemo(() => ({
    patrullaje: isSuper || hasModuleAccess('patrullaje'),
    despacho: isSuper || hasModuleAccess('despacho'),
    manual: isSuper || hasModuleAccess('rutas-manuales'),
    generar: isSuper || hasModuleOp('patrullaje', 'create'),
    anular: isSuper || hasModuleOp('patrullaje', 'edit'),
    asignar: isSuper || hasModuleOp('despacho', 'create'),
    cerrar: isSuper || hasModuleOp('despacho', 'edit'),
    crearManual: isSuper || hasModuleOp('rutas-manuales', 'create'),
  }), [isSuper, hasModuleAccess, hasModuleOp]);

  const [tab, setTab] = useState('resumen');
  const [estado, setEstado] = useState(null);
  const [moviles, setMoviles] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [horasInc, setHorasInc] = useState(3);
  const [despachos, setDespachos] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [cobertura, setCobertura] = useState(null);
  const [turno, setTurno] = useState(null);
  const [fecha, setFecha] = useState(hoyLima());
  const [paradas, setParadas] = useState(6);
  const [planSel, setPlanSel] = useState(null);
  const [punto, setPunto] = useState(null);           // { lat, lng, incidencia? }
  const [sugerencia, setSugerencia] = useState(null);
  const [modoMapa, setModoMapa] = useState('ninguno');  // ninguno | punto | manual
  const [borrador, setBorrador] = useState([]);
  const [manual, setManual] = useState({ issi: '', titulo: '', ordenado_por: '', documento: '', notas: '', optimizar_orden: true });
  const [capas, setCapas] = useState(CAPAS_POR_TAB.resumen);
  const [jurGeo, setJurGeo] = useState(null);
  const [verMas, setVerMas] = useState({ moviles: false, aPie: false, camaras: false });
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState(null);
  const [encuadre, setEncuadre] = useState(null);
  const avisoTimer = useRef(null);

  const avisar = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 6000);
  }, []);

  // Colores estables por móvil
  const colores = useMemo(() => {
    const out = {};
    moviles.forEach((m) => { out[m.issi] = colorPorIssi(m.issi); });
    return out;
  }, [moviles]);

  // ─── Carga de datos ───────────────────────────────────────────────────────
  const cargarEstado = useCallback(async () => {
    try {
      const e = await api.obtenerEstado();
      setEstado(e);
      setTurno((t) => t ?? e.turno_actual.shift);
      setFecha((f) => f ?? e.turno_actual.fecha);
    } catch (e) { avisar(e.message, 'error'); }
  }, [avisar]);

  const cargarMoviles = useCallback(async () => {
    try { setMoviles(await api.obtenerMoviles()); } catch { /* reintenta en el siguiente ciclo */ }
  }, []);

  const cargarDespachos = useCallback(async () => {
    if (!puede.despacho) return;
    try {
      const [d, m] = await Promise.all([api.obtenerDespachos(24), api.obtenerMetricasDespacho(168)]);
      setDespachos(d);
      setMetricas(m);
    } catch { /* idem */ }
  }, [puede.despacho]);

  const cargarPlanes = useCallback(async () => {
    if (!turno) return;
    try { setPlanes(await api.obtenerPlanes(fecha, turno)); } catch (e) { avisar(e.message, 'error'); }
  }, [fecha, turno, avisar]);

  const cargarZonas = useCallback(async () => {
    if (!turno) return;
    try { setZonas((await api.obtenerZonasRiesgo(turno, 5)).rows ?? []); } catch (e) { avisar(e.message, 'error'); }
  }, [turno, avisar]);

  const cargarIncidencias = useCallback(async () => {
    if (!puede.despacho) return;
    try { setIncidencias((await api.obtenerIncidencias(horasInc)).rows ?? []); } catch (e) { avisar(e.message, 'error'); }
  }, [horasInc, puede.despacho, avisar]);

  useEffect(() => { cargarEstado(); cargarMoviles(); cargarDespachos(); }, [cargarEstado, cargarMoviles, cargarDespachos]);
  useEffect(() => { api.obtenerJurisdicciones().then(setJurGeo).catch(() => {}); }, []);
  useEffect(() => { cargarPlanes(); cargarZonas(); }, [cargarPlanes, cargarZonas]);
  useEffect(() => { cargarIncidencias(); }, [cargarIncidencias]);
  useEffect(() => {
    const t = setInterval(() => { cargarMoviles(); cargarDespachos(); }, POLL_MS);
    return () => clearInterval(t);
  }, [cargarMoviles, cargarDespachos]);

  // ─── Acciones ─────────────────────────────────────────────────────────────
  const generar = async () => {
    setOcupado('generar');
    try {
      const r = await api.generarRutas({ turno, fecha, paradas_por_movil: paradas });
      const sin = r.jurisdicciones_sin_movil?.length ? ` Sin móvil con GPS: ${r.jurisdicciones_sin_movil.join(', ')}.` : '';
      avisar(`Rutas generadas para ${r.planes.length} móviles, cada una en su jurisdicción${r.moviles_con_ruta_manual ? ` (${r.moviles_con_ruta_manual} conservan su ruta manual)` : ''}.${sin}`, sin ? 'alerta' : 'ok');
      setCobertura(null);
      await cargarPlanes();
    } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const verificarTodo = async (desdeTurno) => {
    setOcupado('verificar');
    try {
      const r = await api.verificarTurno(fecha, turno, desdeTurno);
      setCobertura({ ...r, desdeTurno });
      await cargarPlanes();
    } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const verificarUno = async (id) => {
    setOcupado(`v-${id}`);
    try {
      const r = await api.verificarRuta(id, false);
      avisar(`${r.plan.unit_code}: ${r.visitadas}/${r.paradas} paradas visitadas (${r.puntos_gps} reportes GPS desde que se creó la ruta).`);
      await cargarPlanes();
    } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const anular = async (id) => {
    if (!window.confirm('¿Anular esta ruta?')) return;
    try { await api.anularRuta(id); setPlanSel(null); await cargarPlanes(); } catch (e) { avisar(e.message, 'error'); }
  };

  // Cambiar de pestaña aplica sus capas por defecto (solo al cambiar, no si ya estaba en ella)
  const cambiarTab = (key) => {
    if (key === tab) return;
    setTab(key);
    if (CAPAS_POR_TAB[key]) setCapas(CAPAS_POR_TAB[key]);
  };

  const elegirPunto = async (p) => {
    setPunto(p);
    setSugerencia(null);
    setVerMas({ moviles: false, aPie: false, camaras: false });
    cambiarTab('despacho');
    setEncuadre([[p.lat, p.lng]]);
    setOcupado('sugerir');
    try { setSugerencia(await api.sugerirMoviles(p.lat, p.lng)); } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  // tipoRecurso: 'MOVIL' (radio fija del vehículo), 'RADIO' (portátil) o 'BODYCAM'
  const asignar = async (r, tipoRecurso = 'MOVIL') => {
    if (!punto) return;
    const inc = punto.incidencia;
    const rid = tipoRecurso === 'MOVIL' ? r.issi : r.id;
    setOcupado(`a-${tipoRecurso}-${rid}`);
    try {
      await api.asignarMovil({
        tipo: tipoRecurso, issi: rid, lat: punto.lat, lng: punto.lng,
        incident_id: inc ? String(inc.id) : undefined,
        incident_code: inc?.codigo, incident_type: inc?.tipo,
        referencia: punto.referencia || undefined,
        rank: r.rank, eta_s: r.duration_s, distance_m: r.distance_m,
        forzar: r.ocupada || undefined,
      });
      avisar(`${r.codigo} enviado${inc ? ` a ${inc.codigo}` : ''}. La llegada se marcará sola cuando su GPS reporte a menos de 75 m.`);
      setPunto(null);
      setSugerencia(null);
      await Promise.all([cargarDespachos(), cargarMoviles()]);
    } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const accionDespacho = async (fn, id) => {
    try { await fn(id); await Promise.all([cargarDespachos(), cargarMoviles()]); } catch (e) { avisar(e.message, 'error'); }
  };

  const guardarManual = async () => {
    if (!manual.issi || !manual.titulo.trim() || !manual.ordenado_por.trim() || !borrador.length) {
      avisar('Completa móvil, título, quién ordena y al menos una parada en el mapa.', 'error');
      return;
    }
    setOcupado('manual');
    try {
      const r = await api.crearRutaManual({
        ...manual, turno, fecha,
        documento: manual.documento || undefined, notas: manual.notas || undefined,
        paradas: borrador.map((b) => ({ lat: b.lat, lng: b.lng, motivo: b.motivo || undefined, permanencia_min: Number(b.permanencia_min) || 10 })),
      });
      avisar(`Ruta manual creada para ${r.unit_code}. Reemplaza su ruta del turno.`);
      setBorrador([]);
      setModoMapa('ninguno');
      setManual((m) => ({ ...m, titulo: '', documento: '', notas: '' }));
      await cargarPlanes();
    } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const onMapClick = (ll) => {
    if (modoMapa === 'punto') {
      setModoMapa('ninguno');
      elegirPunto({ lat: ll.lat, lng: ll.lng });
    } else if (modoMapa === 'manual') {
      setBorrador((b) => [...b, { lat: ll.lat, lng: ll.lng, motivo: '', permanencia_min: 10 }]);
    }
  };

  const seleccionarPlan = (id) => {
    setPlanSel((s) => (s === id ? null : id));
    const p = planes.find((x) => x.id === id);
    if (p && planSel !== id) setEncuadre([...(p.route ?? []), ...p.stops.map((s) => [s.lat, s.lng])]);
  };

  if (!puede.patrullaje && !puede.despacho && !puede.manual) return <Navigate to="/" replace />;

  const enLinea = moviles.filter((m) => m.en_linea);
  // Jurisdicciones (polígonos) donde no hay ninguna móvil con GPS en línea
  const jurConMovil = new Set(enLinea.map((m) => m.jurisdiccion?.id));
  const sinMovil = (jurGeo?.features ?? [])
    .filter((f) => !jurConMovil.has(f.properties?.jurisdiccion_id))
    .map((f) => f.properties?.nombre);
  // Rutas agrupadas por jurisdicción
  const gruposPlanes = Object.entries(
    planes.reduce((acc, p) => {
      const k = p.jurisdiction ?? 'Sin jurisdicción';
      (acc[k] ??= []).push(p);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  const renderPlan = (p) => {
    const visitadas = p.stops.filter((s) => s.visited_at).length;
    const verificada = p.stops.some((s) => s.checked_at);
    const abierto = planSel === p.id;
    return (
      <div key={p.id} className={`cdp-plan${abierto ? ' abierto' : ''}`}>
        <button className="cdp-plan-head" onClick={() => seleccionarPlan(p.id)}>
          <span className="cdp-veh" style={{ '--c': colores[p.unit_issi] }}><IconoVehiculo subtipo={p.unit_type} size={14} /></span>
          <span className="cdp-plan-nombre">
            <b>{p.unit_code}</b>
            <small>{p.source === 'MANUAL' ? `Manual, ordenada por ${p.ordered_by}` : 'Ruta inteligente'}</small>
          </span>
          <span className="cdp-plan-meta">
            {verificada ? <b className={visitadas ? 'ok-txt' : ''}>{visitadas}/{p.stops.length}</b> : `${p.stops.length} paradas`}
            <small>{fmtKm(p.distance_m)}</small>
          </span>
        </button>
        {abierto && (
          <div className="cdp-plan-body">
            {p.source === 'MANUAL' && (
              <p className="cdp-orden"><PiShieldCheck size={14} /> {p.ordered_by}{p.order_ref ? `, ${p.order_ref}` : ''}{p.notes ? `. ${p.notes}` : ''}</p>
            )}
            <ol className="cdp-stops">
              {p.stops.map((s) => (
                <li key={s.id} className={s.visited_at ? 'visitada' : ''}>
                  <span className="cdp-stop-n" style={{ '--c': colores[p.unit_issi] }}>{s.order}</span>
                  <div>
                    <div>{s.reason || 'Parada'}</div>
                    <small>
                      {s.dwell_min} min de permanencia
                      {s.checked_at && (s.visited_at
                        ? `. Visitada a las ${fmtHora(s.visited_at)} (${Math.round((s.dwell_s ?? 0) / 60)} min)`
                        : `. No visitada, pasó a ${fmtKm(s.min_dist_m)}`)}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            <div className="cdp-row">
              <button className="cdp-btn" disabled={!!ocupado} onClick={() => verificarUno(p.id)}>
                <PiCheckCircle size={15} /> {ocupado === `v-${p.id}` ? 'Verificando' : 'Verificar cumplimiento'}
              </button>
              {(p.source === 'AUTO' ? puede.anular : puede.crearManual || puede.anular) && (
                <button className="cdp-btn peligro" onClick={() => anular(p.id)}><PiXCircle size={15} /> Anular</button>
              )}
            </div>
            {p.model_version && <small className="cdp-muted">{p.model_version}</small>}
          </div>
        )}
      </div>
    );
  };

  const abiertos = despachos.filter((d) => d.status === 'ASIGNADO' || d.status === 'EN_LUGAR');
  const tabs = [
    { key: 'resumen', label: 'Resumen', icon: PiChartBar, show: true },
    { key: 'rutas', label: 'Rutas', icon: PiPath, show: puede.patrullaje || puede.manual || puede.despacho },
    { key: 'despacho', label: 'Despacho', icon: PiSiren, show: puede.despacho, contador: abiertos.length },
    { key: 'manual', label: 'Ruta manual', icon: PiPencilSimpleLine, show: puede.manual },
  ].filter((t) => t.show);
  const camaras = sugerencia?.camaras?.rows ?? [];

  return (
    <div className="cdp-page">
      <div className="cdp-mapwrap">
        <MapaDespacho
          moviles={moviles} zonas={zonas} planes={planes} colores={colores} incidencias={incidencias}
          despachos={despachos} sugerencia={sugerencia} punto={punto} borrador={borrador} capas={capas} jurisdicciones={jurGeo}
          planSeleccionado={planSel} onMapClick={onMapClick} onSelectPlan={seleccionarPlan}
          onSelectIncidencia={(i) => elegirPunto({ lat: i.lat, lng: i.lon, incidencia: i })}
          cursorCruz={modoMapa !== 'ninguno'} encuadre={encuadre}
        />
        <div className="cdp-capas">
          <PiStack size={15} />
          {[
            ['jurisdicciones', 'Jurisdicciones'], ['moviles', 'Móviles'], ['offline', 'Sin reporte'],
            ['zonas', 'Zonas de riesgo'], ['rutas', 'Rutas'], ['incidencias', 'Incidencias'],
          ].map(([k, l]) => (
            <label key={k}>
              <input type="checkbox" checked={capas[k]} onChange={(e) => setCapas((c) => ({ ...c, [k]: e.target.checked }))} /> {l}
            </label>
          ))}
        </div>
        <Leyenda />
        {modoMapa !== 'ninguno' && (
          <div className="cdp-banner">
            <PiCrosshair size={16} />
            {modoMapa === 'punto' ? 'Haz clic donde está la emergencia' : 'Haz clic en el mapa para agregar paradas'}
            <button onClick={() => setModoMapa('ninguno')}>Terminar</button>
          </div>
        )}
        {aviso && <div className={`cdp-aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}
      </div>

      <aside className="cdp-panel">
        <header className="cdp-head">
          <div>
            <h2>Despacho y Patrullaje</h2>
            <span className="cdp-sub">GPS de radios, bodycams y motor predictivo</span>
          </div>
          <button className="cdp-icon-btn" title="Actualizar todo" aria-label="Actualizar todo"
            onClick={() => { cargarEstado(); cargarMoviles(); cargarPlanes(); cargarZonas(); cargarIncidencias(); cargarDespachos(); }}>
            <PiArrowClockwise size={17} />
          </button>
        </header>

        <div className="cdp-turno">
          <select aria-label="Turno" value={turno ?? ''} onChange={(e) => { setTurno(e.target.value); setPlanSel(null); setCobertura(null); }}>
            {TURNOS.map((t) => <option key={t.value} value={t.value}>Turno {t.label.toLowerCase()} ({t.horas})</option>)}
          </select>
          <input aria-label="Fecha" type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setPlanSel(null); setCobertura(null); }} />
        </div>

        <nav className="cdp-tabs">
          {tabs.map(({ key, label, icon: TabIcon, contador }) => (
            <button key={key} className={tab === key ? 'activo' : ''} onClick={() => cambiarTab(key)}>
              <TabIcon size={15} /> {label}
              {contador > 0 && <span className="cdp-contador">{contador}</span>}
            </button>
          ))}
        </nav>

        <div className="cdp-body">
          {tab === 'resumen' && (
            <Resumen
              estado={estado} enLinea={enLinea.length} metricas={metricas} planes={planes} zonas={zonas}
              cobertura={cobertura} turno={turno} ocupado={ocupado} onVerificar={verificarTodo} sinMovil={sinMovil}
            />
          )}

          {tab === 'rutas' && (
            <section>
              {puede.generar && (
                <div className="cdp-card">
                  <h3>Rutas inteligentes del turno</h3>
                  <p className="cdp-muted">
                    Cada móvil con GPS recibe las zonas de mayor riesgo de <b>su jurisdicción</b>, en el orden más corto por calles.
                  </p>
                  <div className="cdp-row">
                    <label className="cdp-inline">Paradas por móvil
                      <select value={paradas} onChange={(e) => setParadas(Number(e.target.value))}>
                        {[4, 5, 6, 7, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                    <button className="cdp-btn primario" disabled={!!ocupado || !enLinea.length} onClick={generar}>
                      <PiPath size={15} /> {ocupado === 'generar' ? 'Generando' : 'Generar rutas'}
                    </button>
                  </div>
                </div>
              )}
              {sinMovil.length > 0 && (
                <div className="cdp-alerta">
                  <PiWarning size={16} />
                  <div>
                    <b>Sin móvil con GPS:</b> {sinMovil.join(', ')}.
                    <small>Sus zonas de riesgo quedan sin ruta.</small>
                  </div>
                </div>
              )}
              <div className="cdp-list-head">
                <span>{planes.length} rutas en {gruposPlanes.length} jurisdicciones</span>
                {planSel && <button className="cdp-link" onClick={() => setPlanSel(null)}>Ver todas</button>}
              </div>
              {!planes.length && <Vacio texto="Aún no hay rutas para este turno." />}
              {gruposPlanes.map(([jur, ps]) => (
                <div key={jur} className="cdp-grupo">
                  <div className="cdp-grupo-head">
                    <span>{jur}</span>
                    <small>{ps.length} {ps.length === 1 ? 'móvil' : 'móviles'}, {ps.reduce((n, p) => n + p.stops.length, 0)} paradas</small>
                  </div>
                  {ps.map(renderPlan)}
                </div>
              ))}
            </section>
          )}

          {tab === 'despacho' && (
            <section>
              {!punto && (
                <div className="cdp-card">
                  <h3>Nueva emergencia</h3>
                  <p className="cdp-muted">Elige una incidencia de la lista o del mapa, o marca el punto. El sistema sugiere y la torre decide.</p>
                  <div className="cdp-row">
                    <button className="cdp-btn" onClick={() => setModoMapa('punto')}><PiCrosshair size={15} /> Marcar en el mapa</button>
                    <label className="cdp-inline">Últimas
                      <select value={horasInc} onChange={(e) => setHorasInc(Number(e.target.value))}>
                        {[1, 3, 6, 12, 24].map((h) => <option key={h} value={h}>{h} h</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {punto && (
                <div className="cdp-emergencia">
                  <div className="cdp-emergencia-head">
                    <span className="cdp-emergencia-ico"><IconoSirena size={18} /></span>
                    <div>
                      <b>{punto.incidencia ? punto.incidencia.tipo : 'Punto marcado en el mapa'}</b>
                      <small>{punto.incidencia ? `${punto.incidencia.codigo}, ${punto.incidencia.jurisdiccion}, ${fmtHora(punto.incidencia.registrado)}` : `${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}`}</small>
                    </div>
                    <button className="cdp-icon-btn" aria-label="Cerrar" onClick={() => { setPunto(null); setSugerencia(null); }}><PiXCircle size={17} /></button>
                  </div>
                  <label className="cdp-field">Referencia para quien va (opcional)
                    <input value={punto.referencia ?? ''} onChange={(e) => setPunto((p) => ({ ...p, referencia: e.target.value }))} />
                  </label>

                  {ocupado === 'sugerir' && <Cargando />}
                  {sugerencia && (
                    <>
                      <Bloque titulo="Móviles" icono={<IconoVehiculo subtipo="AUTOMOVIL" size={16} />} nota="tiempo en vehículo"
                        total={sugerencia.ranking.length} abierto={verMas.moviles} onToggle={() => setVerMas((v) => ({ ...v, moviles: !v.moviles }))}
                        vacio="No hay móviles con GPS en línea.">
                        {sugerencia.ranking.slice(0, verMas.moviles ? 8 : 3).map((r) => (
                          <FilaRecurso key={`m-${r.issi}`} r={r} destacado={r.rank === 1}
                            icono={<span className="cdp-veh" style={{ '--c': colores[r.issi] }}><IconoVehiculo subtipo={r.tipo} size={14} /></span>}
                            sub={r.jurisdiccion} puede={puede.asignar} ocupado={ocupado}
                            ocupadoKey={`a-MOVIL-${r.issi}`} onAsignar={() => asignar(r, 'MOVIL')} />
                        ))}
                      </Bloque>

                      <Bloque titulo="A pie cerca" icono={<PiFootprints size={16} />} nota={`a menos de ${sugerencia.radio_a_pie_m} m`}
                        total={sugerencia.a_pie?.length ?? 0} abierto={verMas.aPie} onToggle={() => setVerMas((v) => ({ ...v, aPie: !v.aPie }))}
                        vacio="Nadie a pie cerca con GPS en línea.">
                        {(sugerencia.a_pie ?? []).slice(0, verMas.aPie ? 8 : 3).map((r) => (
                          <FilaRecurso key={`p-${r.tipo}-${r.id}`} r={r}
                            icono={<span className={`cdp-apie-ico ${r.tipo === 'BODYCAM' ? 'bodycam' : 'radio'}`}><IconoAPie tipo={r.tipo} size={13} /></span>}
                            sub={r.acompanante ? `Radio y bodycam` : (r.tipo === 'BODYCAM' ? 'Bodycam' : 'Sereno con radio')}
                            puede={puede.asignar} ocupado={ocupado} ocupadoKey={`a-${r.tipo}-${r.id}`} onAsignar={() => asignar(r, r.tipo)} />
                        ))}
                      </Bloque>

                      <Bloque titulo="Cámaras" icono={<PiSecurityCamera size={16} />} nota={`a menos de ${sugerencia.camaras?.radio_m ?? 300} m`}
                        total={camaras.length} abierto={verMas.camaras} onToggle={() => setVerMas((v) => ({ ...v, camaras: !v.camaras }))}
                        vacio={sugerencia.camaras?.sin_permiso ? 'Tu rol no tiene acceso a las capas de cámaras.' : 'No hay cámaras cerca.'}>
                        {camaras.slice(0, verMas.camaras ? 8 : 3).map((c) => (
                          <div key={c.id} className="cdp-fila">
                            <span className={`cdp-cam-ico${c.ve_el_punto ? ' ve' : ''}`}><IconoCamara size={13} /></span>
                            <div className="cdp-fila-txt">
                              <b>{c.codigo}</b>
                              <small>{c.direccion}</small>
                            </div>
                            <div className="cdp-fila-eta">
                              {c.ve_el_punto ? <b className="ok-txt"><PiEye size={13} /> Ve el punto</b> : <b>{fmtKm(c.distancia_m)}</b>}
                              <small>{c.tipo === 'VECINAL' ? 'Vecinal' : c.modelo}{c.megafono ? ', megáfono' : ''}</small>
                            </div>
                            {c.megafono && <PiMegaphone size={14} className="cdp-muted" title="Tiene megáfono" />}
                          </div>
                        ))}
                      </Bloque>
                      {sugerencia.ranking.some((r) => r.fuente === 'estimado') && <p className="cdp-muted">* Tiempo estimado, sin ruteo por calles.</p>}
                    </>
                  )}
                </div>
              )}

              <div className="cdp-list-head"><span>Despachos de las últimas 24 h</span></div>
              {!despachos.length && <Vacio texto="Todavía no hay despachos." />}
              {despachos.map((d) => {
                const st = ESTADO_DESPACHO[d.status];
                const activo = d.status === 'ASIGNADO' || d.status === 'EN_LUGAR';
                return (
                  <div key={d.id} className={`cdp-desp${activo ? '' : ' cerrado'}`}>
                    <div className="cdp-desp-head">
                      <span className="cdp-desp-ico">
                        {d.resource_type === 'MOVIL' ? <IconoVehiculo subtipo="AUTOMOVIL" size={14} /> : <IconoAPie tipo={d.resource_type} size={14} />}
                      </span>
                      <b>{d.unit_code}</b>
                      <span className="cdp-muted">hacia {d.incident_code ?? 'punto marcado'}</span>
                      <span className="cdp-estado" style={{ '--c': st.color }}>{st.label}</span>
                    </div>
                    <small className="cdp-muted">
                      {fmtHora(d.assigned_at)}, {d.assigned_by ?? 'sin usuario'}.{' '}
                      {(d.respuesta_s ?? null) !== null
                        ? <b>Llegó en {fmtMin(d.respuesta_s)}.</b>
                        : activo && <>Lleva {fmtMin(d.transcurrido_s)}, está a {fmtKm(d.distancia_actual_m)}.</>}
                    </small>
                    {activo && (
                      <div className="cdp-row">
                        <a className="cdp-btn mini" href={d.enlaces.waze} target="_blank" rel="noreferrer"><PiNavigationArrow size={13} /> Waze</a>
                        <a className="cdp-btn mini" href={textoWhatsApp(d)} target="_blank" rel="noreferrer"><PiWhatsappLogo size={13} /> WhatsApp</a>
                        {puede.cerrar && d.status === 'ASIGNADO' && <button className="cdp-btn mini" onClick={() => accionDespacho(api.marcarLlegada, d.id)}>Llegó</button>}
                        {puede.cerrar && <button className="cdp-btn mini" onClick={() => accionDespacho(api.cerrarDespacho, d.id)}>Cerrar</button>}
                        {puede.cerrar && <button className="cdp-btn mini peligro" onClick={() => accionDespacho(api.cancelarDespacho, d.id)}>Cancelar</button>}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="cdp-list-head"><span>Incidencias recientes ({incidencias.length})</span></div>
              {!incidencias.length && <Vacio texto={`Sin incidencias en las últimas ${horasInc} h.`} />}
              <div className="cdp-incs">
                {incidencias.slice(0, 40).map((i) => (
                  <button key={i.id} className="cdp-inc" onClick={() => elegirPunto({ lat: i.lat, lng: i.lon, incidencia: i })}>
                    <IconoIncidencia size={14} className="cdp-inc-ico" />
                    <span>
                      <b>{i.tipo}</b>
                      <small>{i.codigo}, {i.jurisdiccion}</small>
                    </span>
                    <small className="cdp-inc-hora">{fmtHora(i.registrado)}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === 'manual' && (
            <section>
              <div className="cdp-card">
                <h3>Ruta por orden de autoridad</h3>
                <p className="cdp-muted">Reemplaza la ruta del turno de esa móvil. Queda registrado quién la ordenó.</p>
                <label className="cdp-field">Móvil
                  <select value={manual.issi} onChange={(e) => setManual((m) => ({ ...m, issi: e.target.value }))}>
                    <option value="">Elegir móvil</option>
                    {moviles.map((m) => (
                      <option key={m.issi} value={m.issi}>{m.codigo} ({m.subtipo}){m.en_linea ? '' : ', sin GPS'}</option>
                    ))}
                  </select>
                </label>
                <label className="cdp-field">Título
                  <input value={manual.titulo} maxLength={150} onChange={(e) => setManual((m) => ({ ...m, titulo: e.target.value }))} />
                  <small>Ej.: Operativo mercado Caja de Agua</small>
                </label>
                <label className="cdp-field">Ordenado por (cargo y nombre)
                  <input value={manual.ordenado_por} maxLength={150} onChange={(e) => setManual((m) => ({ ...m, ordenado_por: e.target.value }))} />
                  <small>Obligatorio. Ej.: Subgerente de Serenazgo</small>
                </label>
                <label className="cdp-field">Documento de sustento
                  <input value={manual.documento} maxLength={150} onChange={(e) => setManual((m) => ({ ...m, documento: e.target.value }))} />
                  <small>Ej.: Memorando N.° 123-2026</small>
                </label>
                <label className="cdp-field">Notas
                  <textarea rows={2} value={manual.notas} maxLength={1000} onChange={(e) => setManual((m) => ({ ...m, notas: e.target.value }))} />
                </label>
                <label className="cdp-check">
                  <input type="checkbox" checked={manual.optimizar_orden} onChange={(e) => setManual((m) => ({ ...m, optimizar_orden: e.target.checked }))} />
                  Optimizar el orden de visita
                </label>
              </div>

              <div className="cdp-list-head">
                <span>Paradas ({borrador.length})</span>
                <button className="cdp-link" onClick={() => setModoMapa(modoMapa === 'manual' ? 'ninguno' : 'manual')}>
                  {modoMapa === 'manual' ? 'Dejar de agregar' : 'Agregar en el mapa'}
                </button>
              </div>
              {!borrador.length && <Vacio texto='Pulsa "Agregar en el mapa" y haz clic en cada punto.' />}
              {borrador.map((b, i) => (
                <div key={i} className="cdp-parada">
                  <span className="cdp-stop-n" style={{ '--c': '#1e293b' }}>{i + 1}</span>
                  <input aria-label={`Motivo de la parada ${i + 1}`} placeholder="Motivo" value={b.motivo} onChange={(e) => setBorrador((arr) => arr.map((x, k) => (k === i ? { ...x, motivo: e.target.value } : x)))} />
                  <input aria-label="Minutos de permanencia" type="number" min={1} max={240} value={b.permanencia_min} onChange={(e) => setBorrador((arr) => arr.map((x, k) => (k === i ? { ...x, permanencia_min: e.target.value } : x)))} />
                  <button className="cdp-icon-btn" aria-label="Quitar parada" onClick={() => setBorrador((arr) => arr.filter((_, k) => k !== i))}><PiTrash size={15} /></button>
                </div>
              ))}
              {puede.crearManual && (
                <button className="cdp-btn primario ancho" disabled={ocupado === 'manual'} onClick={guardarManual}>
                  <PiFloppyDisk size={16} /> {ocupado === 'manual' ? 'Guardando' : 'Guardar ruta'}
                </button>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
};

// Bloque de recursos sugeridos: título, nota, 3 filas y "ver más".
const Bloque = ({ titulo, icono, nota, total, abierto, onToggle, vacio, children }) => (
  <div className="cdp-bloque">
    <div className="cdp-bloque-head">
      {icono}<b>{titulo}</b><small>{nota}</small>
    </div>
    {total ? children : <p className="cdp-empty">{vacio}</p>}
    {total > 3 && (
      <button className="cdp-link" onClick={onToggle}>{abierto ? 'Ver menos' : `Ver ${Math.min(total, 8) - 3} más`}</button>
    )}
  </div>
);

// Fila de un recurso sugerido: quién y en cuánto llega.
const FilaRecurso = ({ r, icono, sub, puede, ocupado, ocupadoKey, onAsignar, destacado }) => (
  <div className={`cdp-fila${r.ocupada ? ' ocupada' : ''}${destacado ? ' destacado' : ''}`}>
    {icono}
    <div className="cdp-fila-txt">
      <b>{r.codigo}</b>
      <small>{r.ocupada ? 'Ya tiene un despacho' : sub}</small>
    </div>
    <div className="cdp-fila-eta">
      <b>{fmtMin(r.duration_s)}{r.fuente === 'estimado' ? '*' : ''}</b>
      <small>{fmtKm(r.distance_m)}</small>
    </div>
    {puede && (
      <button className={`cdp-btn mini${destacado ? ' primario' : ''}`} disabled={!!ocupado} onClick={onAsignar}>
        {ocupado === ocupadoKey ? 'Enviando' : 'Enviar'}
      </button>
    )}
  </div>
);

const Vacio = ({ texto }) => <p className="cdp-empty">{texto}</p>;

const Cargando = () => (
  <div className="cdp-cargando" aria-label="Calculando">
    {[0, 1, 2].map((i) => <div key={i} className="cdp-skel" />)}
  </div>
);

// Leyenda fija del mapa: sirve para explicar al personal qué es cada símbolo.
const Leyenda = () => (
  <div className="cdp-leyenda">
    <div><span className="cdp-veh" style={{ '--c': '#2563eb' }}><IconoVehiculo subtipo="CAMION" size={11} /></span> Camioneta</div>
    <div><span className="cdp-veh" style={{ '--c': '#2563eb' }}><IconoVehiculo subtipo="MOTO" size={11} /></span> Moto</div>
    <div><span className="cdp-apie-ico radio"><IconoAPie tipo="RADIO" size={11} /></span> A pie con radio</div>
    <div><span className="cdp-apie-ico bodycam"><IconoAPie tipo="BODYCAM" size={11} /></span> Bodycam</div>
    <div><span className="cdp-cam-ico"><IconoCamara size={11} /></span> Cámara</div>
    <div><span className="lg-zona" /> Zona de riesgo</div>
    <div><span className="lg-inc" /> Incidencia</div>
  </div>
);

const Kpi = ({ valor, label, sub, tono }) => (
  <div className={`cdp-kpi ${tono ?? ''}`}>
    <div className="cdp-kpi-num">{valor}</div>
    <div className="cdp-kpi-label">{label}</div>
    {sub && <div className="cdp-kpi-sub">{sub}</div>}
  </div>
);

const Resumen = ({ estado, enLinea, metricas, planes, zonas, cobertura, turno, ocupado, onVerificar, sinMovil }) => {
  const m = estado?.moviles;
  const motor = estado?.motor_predictivo;
  const inicio = TURNOS.find((t) => t.value === turno)?.horas.split('-')[0];
  return (
    <section>
      <div className="cdp-kpis">
        <Kpi valor={m ? `${enLinea} de ${m.total}` : '-'} label="Móviles con GPS" sub={m ? `${m.sin_reporte_mas_de_un_dia} radios sin reportar hace más de 1 día` : null} tono={m && enLinea / m.total < 0.5 ? 'alerta' : ''} />
        <Kpi valor={m ? m.a_pie.radios.en_linea : '-'} label="Serenos a pie con radio" sub={m ? `de ${m.a_pie.radios.total} radios portátiles` : null} />
        <Kpi valor={m ? m.a_pie.bodycams.en_linea : '-'} label="Bodycams en línea" sub={m ? `de ${m.a_pie.bodycams.total} activas` : null} />
        <Kpi valor={zonas.length} label="Zonas de riesgo en el mapa" sub={motor ? `Modelo con datos al ${motor.ultima_fecha}` : 'Motor predictivo sin conexión'} tono={motor ? '' : 'alerta'} />
      </div>

      {sinMovil.length > 0 && (
        <div className="cdp-alerta">
          <PiWarning size={16} />
          <div><b>Jurisdicciones sin móvil con GPS:</b> {sinMovil.join(', ')}.</div>
        </div>
      )}

      {m && (
        <div className="cdp-card">
          <h3>Radios de vehículo</h3>
          <table className="cdp-tabla">
            <thead><tr><th>Tipo</th><th>Con GPS</th><th>Total</th></tr></thead>
            <tbody>
              {Object.entries(m.por_tipo).map(([t, v]) => (
                <tr key={t}>
                  <td><span className="cdp-tipo"><IconoVehiculo subtipo={t} size={14} /> {{ MOTO: 'Motos', CAMION: 'Camionetas', AUTOMOVIL: 'Autos' }[t] ?? t}</span></td>
                  <td><b>{v.en_linea}</b></td><td>{v.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cdp-muted">Con GPS significa que reportó en los últimos {m.minutos_en_linea} min.</p>
        </div>
      )}

      <div className="cdp-card">
        <h3>Cobertura de zonas de riesgo</h3>
        <p className="cdp-muted">Cuántas paradas visitaron las móviles, según su recorrido GPS real.</p>
        <div className="cdp-row">
          <button className="cdp-btn" disabled={!!ocupado || !planes.length} onClick={() => onVerificar(true)}>
            {ocupado === 'verificar' ? 'Verificando' : `Desde las ${inicio}`}
          </button>
          <button className="cdp-btn" disabled={!!ocupado || !planes.length} onClick={() => onVerificar(false)}>
            Desde que se crearon las rutas
          </button>
        </div>
        {cobertura && (
          <div className="cdp-cobertura">
            <div className="cdp-kpi-num">{cobertura.pct ?? 0}%</div>
            <div>{cobertura.visitadas} de {cobertura.paradas} paradas visitadas</div>
          </div>
        )}
      </div>

      {metricas && (
        <div className="cdp-card">
          <h3>Despacho en los últimos 7 días</h3>
          <table className="cdp-tabla">
            <tbody>
              <tr><td>Despachos</td><td><b>{metricas.despachos}</b></td></tr>
              <tr><td>Con llegada detectada</td><td><b>{metricas.con_llegada}</b></td></tr>
              <tr><td>Tiempo de respuesta mediano</td><td><b>{fmtMin(metricas.respuesta_mediana_s)}</b></td></tr>
              <tr><td>Tiempo de respuesta p90</td><td><b>{fmtMin(metricas.respuesta_p90_s)}</b></td></tr>
              <tr><td>Se eligió la primera sugerencia</td><td><b>{metricas.eligieron_primera_sugerencia}</b></td></tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CentroDespacho;
