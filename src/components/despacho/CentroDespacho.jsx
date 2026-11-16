import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  PiChartBar, PiPath, PiSiren, PiPencilSimpleLine, PiArrowClockwise, PiNavigationArrow, PiWhatsappLogo,
  PiCheckCircle, PiXCircle, PiStack, PiCrosshair, PiTrash, PiFloppyDisk, PiShieldCheck, PiWarning,
  PiFootprints, PiSecurityCamera, PiEye, PiMegaphone, PiSpeakerHigh, PiSpeakerSlash, PiCopy, PiUsersThree,
  PiBellRinging, PiCaretDown, PiCaretUp, PiCheck, PiListBullets, PiBellSimple, PiKeyboard,
} from 'react-icons/pi';
import { Buscador, TarjetaUnidad, TableroUnidades, PanelAlertas, AyudaAtajos } from './Operador';
import { claveUnidad } from './unidades';
import { COLOR, ESTADOS } from '../mapa/estados';
import {
  IconoAPie, IconoCamara, IconoCategoria, IconoVehiculo, IconoSirena,
  SimboloAPie, SimboloCamara, SimboloMovil, SimboloZona,
} from '../mapa/simbolos';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import MapaDespacho from './MapaDespacho';
import * as api from '../../services/patrullajeService';
import {
  TURNOS, fmtKm, fmtMin, fmtHora, hoyLima, textoWhatsApp, ESTADO_DESPACHO, PRIORIDAD, ESTADO_INCIDENCIA,
  RESULTADOS_CIERRE, RESULTADOS_CANCELACION, textoResultado, fmtCrono, segDesde,
} from './util';
import { leerConfigSonido, guardarConfigSonido, sonar } from './sonido';
import './CentroDespacho.css';

const POLL_MS = 15000;
// Avisos: una incidencia urgente cuenta como "sin despachar" solo durante sus primeros minutos (las más viejas
// ya las atendió el flujo normal aunque no pasaran por SIVECAM) y se muestran como máximo estas.
const URGENTE_MIN = 30;
const MAX_AVISOS_URGENTES = 5;
const nuevoGrupo = () => (crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
// Límite de atraso de un despacho: lo que configuró el operador (minutos) o 1.5 veces el tiempo estimado, lo que sea mayor
const limiteAtraso = (d, cfg) => Math.max((cfg.limite_min || 10) * 60, Math.round((d.eta_s ?? 0) * 1.5));

// Capas que se muestran al entrar a cada pestaña. Luego el operador puede prender o apagar las que quiera.
const CAPAS_POR_TAB = {
  resumen:  { jurisdicciones: true,  moviles: true, offline: false, zonas: true,  rutas: false, incidencias: false },
  rutas:    { jurisdicciones: true,  moviles: true, offline: false, zonas: false, rutas: true,  incidencias: false },
  despacho: { jurisdicciones: true,  moviles: true, offline: false, zonas: false, rutas: false, incidencias: false },
  unidades: { jurisdicciones: true,  moviles: true, offline: true,  zonas: false, rutas: false, incidencias: false },
  alertas:  { jurisdicciones: true,  moviles: true, offline: false, zonas: false, rutas: true,  incidencias: false },
  manual:   { jurisdicciones: true,  moviles: true, offline: false, zonas: true,  rutas: false, incidencias: false },
};
const ALERTAS_POLL_MS = 30000;
const TAB_POR_TECLA = { 1: 'resumen', 2: 'rutas', 3: 'despacho', 4: 'unidades', 5: 'alertas', 6: 'manual' };

const CentroDespacho = () => {
  const { user, hasModuleAccess, hasModuleOp } = useAuth();
  const { dark } = useTheme();
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
  const [planHover, setPlanHover] = useState(null); // ruta bajo el cursor (en el mapa o en la lista)
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
  const [ahora, setAhora] = useState(Date.now());            // reloj de los cronómetros (1 s)
  const [sonido, setSonido] = useState(leerConfigSonido);    // { activo, limite_min }
  const [cierre, setCierre] = useState(null);                // { id, cancelar, resultado, notas }
  const [tipos, setTipos] = useState(null);                  // prioridad por tipo (se carga al abrir el panel)
  const [verTipos, setVerTipos] = useState(false);
  // Fase 3: vista de operador
  const [aPie, setAPie] = useState([]);                      // radios portátiles y bodycams (se carga cuando hace falta)
  const [cargandoAPie, setCargandoAPie] = useState(false);
  const [unidadSel, setUnidadSel] = useState(null);          // 'MOVIL:issi' | 'RADIO:issi' | 'BODYCAM:codigo'
  const [recorrido, setRecorrido] = useState(null);          // { key, codigo, puntos }
  const [alertas, setAlertas] = useState({ activas: [], historial: [] });
  const [puntoBusqueda, setPuntoBusqueda] = useState(null);  // { lat, lng, nombre } (dirección encontrada)
  const [verAtajos, setVerAtajos] = useState(false);
  const buscadorRef = useRef(null);
  const avisoTimer = useRef(null);
  const incVistas = useRef(null);      // ids de incidencias ya vistas (para sonar solo con las nuevas)
  const atrasoAvisado = useRef(new Set());

  const avisar = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 6000);
  }, []);

  const cambiarSonido = (parte) => {
    setSonido((s) => { const n = { ...s, ...parte }; guardarConfigSonido(n); return n; });
  };

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
    const t = setInterval(() => { cargarMoviles(); cargarDespachos(); cargarIncidencias(); }, POLL_MS);
    return () => clearInterval(t);
  }, [cargarMoviles, cargarDespachos, cargarIncidencias]);

  // A pie (cientos de radios y bodycams): solo cuando el tablero o el buscador lo piden; luego cada minuto
  const aPieCargado = useRef(false);
  const cargandoAPieRef = useRef(false);
  const cargarAPie = useCallback(async () => {
    if (cargandoAPieRef.current) return;
    cargandoAPieRef.current = true;
    setCargandoAPie(true);
    try { setAPie(await api.obtenerAPie()); aPieCargado.current = true; } catch { /* siguiente ciclo */ } finally { cargandoAPieRef.current = false; setCargandoAPie(false); }
  }, []);
  useEffect(() => {
    const t = setInterval(() => { if (aPieCargado.current) cargarAPie(); }, 60000);
    return () => clearInterval(t);
  }, [cargarAPie]);

  const cargarAlertas = useCallback(async () => {
    try { setAlertas(await api.obtenerAlertas(24)); } catch { /* siguiente ciclo */ }
  }, []);
  useEffect(() => {
    cargarAlertas();
    const t = setInterval(cargarAlertas, ALERTAS_POLL_MS);
    return () => clearInterval(t);
  }, [cargarAlertas]);

  // Reloj de los cronómetros: solo corre mientras hay despachos abiertos
  const hayAbiertos = despachos.some((d) => d.status === 'ASIGNADO' || d.status === 'EN_LUGAR');
  useEffect(() => {
    if (!hayAbiertos) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hayAbiertos]);

  // Incidencias urgentes sin despachar (recientes) para el panel de avisos
  const urgentes = incidencias.filter((i) => i.prioridad === 'ALTA' && i.estado === 'PENDIENTE' && segDesde(i.registrado, ahora) <= URGENTE_MIN * 60);

  // Sonido: incidencia nueva de prioridad alta. No suena con las que ya estaban al abrir la pantalla
  // (la primera carga solo las registra) ni con las viejas que aparecen al ampliar "Últimas".
  useEffect(() => {
    if (!incVistas.current) {
      if (!incidencias.length) return; // todavía no cargó
      incVistas.current = new Set(incidencias.map((i) => i.id));
      return;
    }
    const nuevas = incidencias.filter((i) =>
      i.prioridad === 'ALTA' && i.estado === 'PENDIENTE' && !incVistas.current.has(i.id) && segDesde(i.registrado) <= URGENTE_MIN * 60);
    incVistas.current = new Set(incidencias.map((i) => i.id));
    if (!nuevas.length) return;
    sonar('alta');
    avisar(`Incidencia urgente: ${nuevas[0].corto} (${nuevas[0].codigo}${nuevas[0].jurisdiccion ? `, ${nuevas[0].jurisdiccion}` : ''})${nuevas.length > 1 ? ` y ${nuevas.length - 1} más` : ''}.`, 'alerta');
  }, [incidencias, avisar]);

  // Sonido: despacho que pasó el límite sin llegar (una sola vez por despacho)
  const atrasados = despachos.filter((d) => d.status === 'ASIGNADO' && segDesde(d.assigned_at, ahora) > limiteAtraso(d, sonido));
  useEffect(() => {
    const nuevos = atrasados.filter((d) => !atrasoAvisado.current.has(d.id));
    if (!nuevos.length) return;
    nuevos.forEach((d) => atrasoAvisado.current.add(d.id));
    sonar('atraso');
  }, [atrasados]);

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

  // p: { lat, lng, incidencia?, group_id?, referencia?, enviados? }. Todas las unidades enviadas desde esta
  // tarjeta comparten group_id (refuerzos incluidos).
  const elegirPunto = async (p) => {
    const inc = p.incidencia;
    const punto0 = { ...p, group_id: p.group_id ?? (inc ? `inc-${inc.id}` : nuevoGrupo()), enviados: p.enviados ?? [] };
    setPunto(punto0);
    setSugerencia(null);
    setCierre(null);
    setVerMas({ moviles: false, aPie: false, camaras: false });
    cambiarTab('despacho');
    setEncuadre([[p.lat, p.lng]]);
    setOcupado('sugerir');
    try { setSugerencia(await api.sugerirMoviles(p.lat, p.lng)); } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  // Pedir refuerzo: misma emergencia (mismo grupo), vuelve a sugerir con las unidades que quedan libres
  const pedirRefuerzo = (d, unidades) => elegirPunto({
    lat: d.lat, lng: d.lng, group_id: d.group_id, referencia: d.reference ?? '',
    incidencia: d.incident_id
      ? { id: d.incident_id, codigo: d.incident_code, tipo: d.incident_type, corto: d.incident_corto, prioridad: d.priority, registrado: d.incident_registered_at }
      : null,
    enviados: unidades.map((u) => ({ codigo: u.unit_code, tipo: u.resource_type, id: u.unit_issi })),
  });

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
        incident_registered_at: inc?.registrado || undefined,
        prioridad: inc?.prioridad || undefined,
        group_id: punto.group_id,
        referencia: punto.referencia || undefined,
        rank: r.rank, eta_s: r.duration_s, distance_m: r.distance_m,
        forzar: r.ocupada || undefined,
      });
      const primero = !punto.enviados.length;
      avisar(`${r.codigo} enviado${inc ? ` a ${inc.codigo}` : ''}${primero ? '. Puedes enviar más unidades o pulsar Listo.' : ' como refuerzo.'}`);
      // La tarjeta sigue abierta para enviar más unidades a la misma emergencia
      setPunto((p) => (p ? { ...p, enviados: [...p.enviados, { codigo: r.codigo, tipo: tipoRecurso, id: rid }] } : p));
      await Promise.all([cargarDespachos(), cargarMoviles(), cargarIncidencias()]);
    } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const accionDespacho = async (fn, id, body) => {
    try { await fn(id, body); await Promise.all([cargarDespachos(), cargarMoviles(), cargarIncidencias()]); } catch (e) { avisar(e.message, 'error'); }
  };

  const confirmarCierre = async () => {
    if (!cierre) return;
    setOcupado(`c-${cierre.id}`);
    const body = { resultado: cierre.resultado, notas: cierre.notas?.trim() || undefined };
    await accionDespacho(cierre.cancelar ? api.cancelarDespacho : api.cerrarDespacho, cierre.id, body);
    setCierre(null);
    setOcupado('');
  };

  const cargarTipos = async () => {
    try { setTipos((await api.obtenerTiposIncidencia()).map((t) => ({ ...t, corto_guardado: t.corto }))); } catch (e) { avisar(e.message, 'error'); }
  };
  const guardarTipo = async (t, cambios) => {
    try {
      await api.guardarTipoIncidencia({ tipo: t.tipo, corto: t.corto, prioridad: t.prioridad, categoria: t.categoria, ...cambios });
      setTipos((lista) => lista.map((x) => (x.tipo === t.tipo ? { ...x, ...cambios, corto_guardado: cambios.corto ?? x.corto_guardado, configurado: true } : x)));
      cargarIncidencias();
    } catch (e) { avisar(e.message, 'error'); }
  };

  const copiar = async (texto) => {
    try { await navigator.clipboard.writeText(texto); avisar(`Copiado: ${texto}`); } catch { avisar('No se pudo copiar', 'error'); }
  };

  // ─── Fase 3: unidades, recorrido, fuera de servicio, alertas, atajos ─────
  const seleccionarUnidad = (u, centrar = true) => {
    const key = claveUnidad(u);
    setUnidadSel(key);
    if (recorrido && recorrido.key !== key) setRecorrido(null);
    if (centrar && (u.lat ?? null) !== null) setEncuadre([[u.lat, u.lng]]);
  };

  const verRecorrido = async (u) => {
    const key = claveUnidad(u);
    if (recorrido?.key === key) { setRecorrido(null); return; }
    setOcupado(`rec-${key}`);
    try {
      const puntos = await api.obtenerRecorrido(u.tipo, u.id, 2);
      if (!puntos.length) avisar(`${u.codigo} no tiene posiciones en las últimas 2 h.`, 'alerta');
      else {
        setRecorrido({ key, codigo: u.codigo, puntos });
        setEncuadre(puntos.map((p) => [p.lat, p.lng]));
      }
    } catch (e) { avisar(e.message, 'error'); } finally { setOcupado(''); }
  };

  const cambiarServicio = async (u, fuera, motivo) => {
    try {
      await api.marcarServicio(u.tipo, u.id, { fuera_servicio: fuera, motivo: motivo || undefined });
      avisar(fuera ? `${u.codigo} marcada fuera de servicio${motivo ? ` (${motivo})` : ''}. No se sugerirá ni recibirá ruta.` : `${u.codigo} vuelve al servicio.`);
      await Promise.all([cargarMoviles(), aPieCargado.current ? cargarAPie() : null]);
    } catch (e) { avisar(e.message, 'error'); }
  };

  const enviarUnidadSel = (u) => {
    if (!punto) { avisar('Primero elige una incidencia o marca el punto de la emergencia; luego "Enviar" desde la tarjeta.', 'alerta'); cambiarTab('despacho'); setModoMapa('punto'); return; }
    asignar({ issi: u.id, id: u.id, codigo: u.codigo, ocupada: !!u.despacho_abierto }, u.tipo);
  };

  const atenderAlerta = async (a) => {
    try { await api.atenderAlerta(a.id); await cargarAlertas(); } catch (e) { avisar(e.message, 'error'); }
  };
  const verAlerta = (a) => {
    const u = a.unit_issi ? [...moviles, ...aPie].find((x) => x.tipo === (a.resource_type ?? 'MOVIL') && x.id === a.unit_issi) : null;
    if (u) seleccionarUnidad(u);
    else if ((a.lat ?? null) !== null) setEncuadre([[a.lat, a.lng]]);
    else if (a.jurisdiction) {
      const f = (jurGeo?.features ?? []).find((x) => x.properties?.nombre === a.jurisdiction);
      const coords = f?.geometry?.coordinates?.flat(f.geometry.type === 'MultiPolygon' ? 2 : 1) ?? [];
      if (coords.length) setEncuadre(coords.map(([lng, lat]) => [lat, lng]));
    }
  };

  const elegirDireccion = (d) => {
    setPuntoBusqueda(d);
    setEncuadre([[d.lat, d.lng]]);
  };

  // Atajos de teclado (no actúan mientras se escribe en un campo). Leen el estado actual por una ref.
  const atajosRef = useRef(null);
  atajosRef.current = { punto, sugerencia, despachos, incidencias, puede, modoMapa, unidadSel, verAtajos, cierre };
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = atajosRef.current;
      const k = e.key;
      if (k === '?') { setVerAtajos((v) => !v); e.preventDefault(); return; }
      if (k === 'Escape') {
        if (s.verAtajos) setVerAtajos(false);
        else if (s.cierre) setCierre(null);
        else if (s.modoMapa !== 'ninguno') setModoMapa('ninguno');
        else if (s.unidadSel) { setUnidadSel(null); setRecorrido(null); }
        else if (s.punto) { setPunto(null); setSugerencia(null); }
        else setPuntoBusqueda(null);
        return;
      }
      if (k === '/') { e.preventDefault(); buscadorRef.current?.focus(); return; }
      if (TAB_POR_TECLA[k]) { cambiarTab(TAB_POR_TECLA[k]); return; }
      const key = k.toLowerCase();
      if (key === 'n') { cambiarTab('despacho'); setModoMapa('punto'); return; }
      if (key === 'e') {
        const r = s.sugerencia?.ranking?.find((x) => !x.ocupada);
        if (s.punto && r && s.puede.asignar) asignar(r, 'MOVIL');
        else avisar('Para "E" primero debe haber una emergencia con móviles sugeridas.', 'alerta');
        return;
      }
      if (key === 'l' || key === 'c') {
        const activos = s.despachos
          .filter((d) => (key === 'l' ? d.status === 'ASIGNADO' : d.status === 'ASIGNADO' || d.status === 'EN_LUGAR'))
          .sort((a, b) => new Date(a.assigned_at) - new Date(b.assigned_at));
        const d = activos[0];
        if (!d || !s.puede.cerrar) { avisar(key === 'l' ? 'No hay despachos en camino.' : 'No hay despachos abiertos.', 'alerta'); return; }
        cambiarTab('despacho');
        if (key === 'l') accionDespacho(api.marcarLlegada, d.id);
        else setCierre({ id: d.id, cancelar: false, resultado: 'ATENDIDO', notas: '' });
        return;
      }
      if (k === 'ArrowDown' || k === 'ArrowUp' || key === 'j' || key === 'k') {
        const pendientes = s.incidencias.filter((i) => !i.estado || i.estado === 'PENDIENTE');
        if (!pendientes.length) return;
        e.preventDefault();
        const actual = pendientes.findIndex((i) => s.punto?.incidencia && String(i.id) === String(s.punto.incidencia.id));
        const paso = k === 'ArrowDown' || key === 'j' ? 1 : -1;
        const sig = pendientes[(actual + paso + pendientes.length) % pendientes.length];
        elegirPunto({ lat: sig.lat, lng: sig.lon, incidencia: sig });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // Las funciones leen el estado por atajosRef; se registra una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <button className="cdp-plan-head" onClick={() => seleccionarPlan(p.id)}
          onMouseEnter={() => setPlanHover(p.id)} onMouseLeave={() => setPlanHover(null)}>
          <span className="cdp-veh"><IconoVehiculo subtipo={p.unit_type} size={14} /></span>
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
                  <span className="cdp-stop-n">{s.order}</span>
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
  // Despachos agrupados por emergencia (group_id): los grupos con alguna unidad activa van primero
  const gruposDespacho = Object.values(
    despachos.reduce((acc, d) => {
      const k = d.group_id ?? d.id;
      (acc[k] ??= { id: k, unidades: [], activo: false }).unidades.push(d);
      if (d.status === 'ASIGNADO' || d.status === 'EN_LUGAR') acc[k].activo = true;
      return acc;
    }, {}),
  )
    .map((g) => ({ ...g, unidades: g.unidades.sort((a, b) => new Date(a.assigned_at) - new Date(b.assigned_at)) }))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || new Date(b.unidades.at(-1).assigned_at) - new Date(a.unidades.at(-1).assigned_at));
  const tabs = [
    { key: 'resumen', label: 'Resumen', icon: PiChartBar, show: true },
    { key: 'rutas', label: 'Rutas', icon: PiPath, show: puede.patrullaje || puede.manual || puede.despacho },
    { key: 'despacho', label: 'Despacho', icon: PiSiren, show: puede.despacho, contador: abiertos.length },
    { key: 'unidades', label: 'Unidades', icon: PiListBullets, show: true },
    { key: 'alertas', label: 'Alertas', icon: PiBellSimple, show: true, contador: alertas.activas.length },
    { key: 'manual', label: 'Ruta manual', icon: PiPencilSimpleLine, show: puede.manual },
  ].filter((t) => t.show);
  const camaras = sugerencia?.camaras?.rows ?? [];
  const despachoPorRecurso = new Map(abiertos.map((d) => [`${d.resource_type}:${d.unit_issi}`, d]));
  const unidadSelObj = unidadSel ? [...moviles, ...aPie].find((u) => claveUnidad(u) === unidadSel) ?? null : null;

  return (
    <div className="cdp-page">
      <div className="cdp-mapwrap">
        <MapaDespacho
          moviles={moviles} zonas={zonas} planes={planes} incidencias={incidencias}
          despachos={despachos} sugerencia={sugerencia} punto={punto} borrador={borrador} capas={capas} jurisdicciones={jurGeo}
          planSeleccionado={planSel} planResaltado={planHover} onResaltarPlan={setPlanHover}
          onMapClick={onMapClick} onSelectPlan={seleccionarPlan}
          onSelectIncidencia={(i) => elegirPunto({ lat: i.lat, lng: i.lon, incidencia: i })}
          cursorCruz={modoMapa !== 'ninguno'} encuadre={encuadre} oscuro={dark}
          unidadSel={unidadSel} unidadSelObj={unidadSelObj} onSelectUnidad={(u) => seleccionarUnidad(u, false)}
          recorrido={recorrido} puntoBusqueda={puntoBusqueda}
        />
        <BarraMapa capas={capas} setCapas={setCapas} />
        {modoMapa !== 'ninguno' && (
          <div className="cdp-banner">
            <PiCrosshair size={16} />
            {modoMapa === 'punto' ? 'Haz clic donde está la emergencia' : 'Haz clic en el mapa para agregar paradas'}
            <button onClick={() => setModoMapa('ninguno')}>Terminar</button>
          </div>
        )}
        {puntoBusqueda && modoMapa === 'ninguno' && (
          <div className="cdp-banner">
            <PiCrosshair size={16} />
            {puntoBusqueda.nombre.split(',').slice(0, 2).join(',')}
            {puede.asignar && <button onClick={() => { const p = puntoBusqueda; setPuntoBusqueda(null); elegirPunto({ lat: p.lat, lng: p.lng, referencia: p.nombre.split(',').slice(0, 3).join(',') }); }}>Despachar aquí</button>}
            <button onClick={() => setPuntoBusqueda(null)}>Quitar</button>
          </div>
        )}
        {aviso && <div className={`cdp-aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}
        {unidadSelObj && (
          <TarjetaUnidad
            u={unidadSelObj} despacho={despachoPorRecurso.get(unidadSel)} plan={unidadSelObj.tipo === 'MOVIL' ? planes.find((p) => p.unit_issi === unidadSelObj.issi) : null}
            puede={puede} hayPunto={!!punto} recorridoActivo={recorrido?.key === unidadSel} cargandoRecorrido={ocupado === `rec-${unidadSel}`}
            onEnviar={() => enviarUnidadSel(unidadSelObj)} onRecorrido={() => verRecorrido(unidadSelObj)}
            onServicio={(fuera, motivo) => cambiarServicio(unidadSelObj, fuera, motivo)}
            onCentrar={() => setEncuadre([[unidadSelObj.lat, unidadSelObj.lng]])}
            onCerrar={() => { setUnidadSel(null); setRecorrido(null); }}
            onVerDespacho={(d) => { cambiarTab('despacho'); setEncuadre([[d.lat, d.lng]]); }}
          />
        )}
        {verAtajos && <AyudaAtajos onCerrar={() => setVerAtajos(false)} />}
      </div>

      <aside className="cdp-panel">
        <header className="cdp-head">
          <div>
            <h2>Despacho y Patrullaje</h2>
            <span className="cdp-sub">GPS de radios, bodycams y motor predictivo</span>
          </div>
          <div className="cdp-head-acc">
            <button className="cdp-icon-btn" title="Atajos de teclado (?)" aria-label="Atajos de teclado" onClick={() => setVerAtajos((v) => !v)}>
              <PiKeyboard size={17} />
            </button>
            <button className="cdp-icon-btn" title="Actualizar todo" aria-label="Actualizar todo"
              onClick={() => { cargarEstado(); cargarMoviles(); cargarPlanes(); cargarZonas(); cargarIncidencias(); cargarDespachos(); cargarAlertas(); if (aPieCargado.current) cargarAPie(); }}>
              <PiArrowClockwise size={17} />
            </button>
          </div>
        </header>

        <div className="cdp-turno">
          <select aria-label="Turno" value={turno ?? ''} onChange={(e) => { setTurno(e.target.value); setPlanSel(null); setCobertura(null); }}>
            {TURNOS.map((t) => <option key={t.value} value={t.value}>Turno {t.label.toLowerCase()} ({t.horas})</option>)}
          </select>
          <input aria-label="Fecha" type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setPlanSel(null); setCobertura(null); }} />
        </div>

        <Buscador
          moviles={moviles} aPie={aPie} incidencias={incidencias} inputRef={buscadorRef} buscarDireccion={api.buscarDireccion}
          onUnidad={(u) => seleccionarUnidad(u)}
          onIncidencia={(i) => elegirPunto({ lat: i.lat, lng: i.lon, incidencia: i })}
          onDireccion={elegirDireccion} onNecesitaAPie={cargarAPie}
        />

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
                      <b title={punto.incidencia?.tipo}>
                        {punto.incidencia ? (punto.incidencia.corto || punto.incidencia.tipo) : 'Punto marcado en el mapa'}
                        {punto.incidencia?.prioridad && <ChipPrioridad p={punto.incidencia.prioridad} />}
                      </b>
                      <small>
                        {punto.incidencia
                          ? [punto.incidencia.codigo, punto.incidencia.jurisdiccion, punto.incidencia.registrado ? `registrada ${fmtHora(punto.incidencia.registrado)}` : null].filter(Boolean).join(', ')
                          : `${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}${sugerencia?.jurisdiccion ? `, ${sugerencia.jurisdiccion.nombre}` : ''}`}
                      </small>
                    </div>
                    <button className="cdp-icon-btn" aria-label="Cerrar" onClick={() => { setPunto(null); setSugerencia(null); }}><PiXCircle size={17} /></button>
                  </div>
                  <label className="cdp-field">Referencia para quien va (opcional)
                    <input value={punto.referencia ?? ''} onChange={(e) => setPunto((p) => ({ ...p, referencia: e.target.value }))} />
                  </label>
                  {punto.enviados.length > 0 && (
                    <div className="cdp-enviados">
                      {punto.enviados.map((u) => <b key={`${u.tipo}-${u.id}`}><PiCheck size={12} /> {u.codigo}</b>)}
                      <span>{punto.enviados.length === 1 ? 'en camino' : 'en camino'}. ¿Hace falta otra unidad?</span>
                      <button className="cdp-btn mini primario" onClick={() => { setPunto(null); setSugerencia(null); }}>Listo</button>
                    </div>
                  )}

                  {ocupado === 'sugerir' && <Cargando />}
                  {sugerencia && (
                    <>
                      <Bloque titulo="Móviles" icono={<IconoVehiculo subtipo="AUTOMOVIL" size={16} />} nota="tiempo en vehículo"
                        total={sugerencia.ranking.length} abierto={verMas.moviles} onToggle={() => setVerMas((v) => ({ ...v, moviles: !v.moviles }))}
                        vacio="No hay móviles con GPS en línea.">
                        {sugerencia.ranking.slice(0, verMas.moviles ? 8 : 3).map((r) => (
                          <FilaRecurso key={`m-${r.issi}`} r={r} destacado={r.rank === 1 && !punto.enviados.length}
                            enviada={punto.enviados.some((u) => u.tipo === 'MOVIL' && u.id === r.issi)}
                            icono={<SimboloMovil subtipo={r.tipo} estado={r.ocupada ? 'ocupada' : r.gps_viejo ? 'gps_viejo' : 'disponible'} />}
                            sub={r.razon || r.jurisdiccion} puede={puede.asignar} ocupado={ocupado}
                            ocupadoKey={`a-MOVIL-${r.issi}`} onAsignar={() => asignar(r, 'MOVIL')} />
                        ))}
                      </Bloque>

                      <Bloque titulo="A pie cerca" icono={<PiFootprints size={16} />} nota={`a menos de ${sugerencia.radio_a_pie_m} m`}
                        total={sugerencia.a_pie?.length ?? 0} abierto={verMas.aPie} onToggle={() => setVerMas((v) => ({ ...v, aPie: !v.aPie }))}
                        vacio="Nadie a pie cerca con GPS en línea.">
                        {(sugerencia.a_pie ?? []).slice(0, verMas.aPie ? 8 : 3).map((r) => (
                          <FilaRecurso key={`p-${r.tipo}-${r.id}`} r={r}
                            enviada={punto.enviados.some((u) => u.tipo === r.tipo && u.id === r.id)}
                            icono={<SimboloAPie tipo={r.tipo} estado={r.ocupada ? 'ocupada' : 'disponible'} size={24} />}
                            sub={r.acompanante ? `Radio y bodycam` : (r.tipo === 'BODYCAM' ? 'Bodycam' : 'Sereno con radio')}
                            puede={puede.asignar} ocupado={ocupado} ocupadoKey={`a-${r.tipo}-${r.id}`} onAsignar={() => asignar(r, r.tipo)} />
                        ))}
                      </Bloque>

                      <Bloque titulo="Cámaras" icono={<PiSecurityCamera size={16} />} nota={`a menos de ${sugerencia.camaras?.radio_m ?? 300} m`}
                        total={camaras.length} abierto={verMas.camaras} onToggle={() => setVerMas((v) => ({ ...v, camaras: !v.camaras }))}
                        vacio={sugerencia.camaras?.sin_permiso ? 'Tu rol no tiene acceso a las capas de cámaras.' : 'No hay cámaras cerca.'}>
                        {camaras.slice(0, verMas.camaras ? 8 : 3).map((c) => (
                          <div key={c.id} className="cdp-fila">
                            <SimboloCamara ve={!!c.ve_el_punto} size={24} />
                            <div className="cdp-fila-txt">
                              <b>{c.codigo}</b>
                              <small>{c.direccion}</small>
                            </div>
                            <div className="cdp-fila-eta">
                              {c.ve_el_punto ? <b className="ok-txt"><PiEye size={13} /> Ve el punto</b> : <b>{fmtKm(c.distancia_m)}</b>}
                              <small>{c.tipo === 'VECINAL' ? 'Vecinal' : c.modelo}{c.megafono ? ', megáfono' : ''}</small>
                            </div>
                            {c.megafono && <PiMegaphone size={14} className="cdp-muted" title="Tiene megáfono" />}
                            <button className="cdp-icon-btn" title="Copiar el código para buscarla en el visor de cámaras" aria-label="Copiar código" onClick={() => copiar(c.codigo)}>
                              <PiCopy size={14} />
                            </button>
                          </div>
                        ))}
                      </Bloque>
                      {sugerencia.ranking.some((r) => r.fuente === 'estimado') && <p className="cdp-muted">* Tiempo estimado, sin ruteo por calles.</p>}
                    </>
                  )}
                </div>
              )}

              <PanelAvisos
                atrasados={atrasados} ahora={ahora} sonido={sonido} cambiarSonido={cambiarSonido} urgentes={urgentes}
                onIncidencia={(i) => elegirPunto({ lat: i.lat, lng: i.lon, incidencia: i })}
                onDespacho={(d) => setEncuadre([[d.lat, d.lng]])}
              />

              <div className="cdp-list-head"><span>Despachos de las últimas 24 h ({gruposDespacho.length} {gruposDespacho.length === 1 ? 'emergencia' : 'emergencias'})</span></div>
              {!despachos.length && <Vacio texto="Todavía no hay despachos." />}
              {gruposDespacho.map(({ id, unidades, activo }) => {
                const d0 = unidades[0];
                const grupoAtrasado = unidades.some((u) => atrasados.includes(u));
                return (
                  <div key={id} className={`cdp-desp${activo ? '' : ' cerrado'}${grupoAtrasado ? ' atrasado' : ''}`}>
                    <div className="cdp-desp-head">
                      <span className="cdp-desp-ico sirena"><IconoSirena size={13} /></span>
                      <b title={d0.incident_type}>{d0.incident_code ?? 'Punto marcado'}</b>
                      {d0.incident_corto && <span className="cdp-muted">{d0.incident_corto}</span>}
                      {d0.priority && <ChipPrioridad p={d0.priority} />}
                      {activo && puede.asignar && (
                        <button className="cdp-btn mini" title="Enviar otra unidad a esta misma emergencia" onClick={() => pedirRefuerzo(d0, unidades)}>
                          <PiUsersThree size={13} /> Refuerzo
                        </button>
                      )}
                      <small>
                        {d0.incident_registered_at ? `Registrada ${fmtHora(d0.incident_registered_at)}, ` : ''}
                        despachada {fmtHora(d0.assigned_at)} por {d0.assigned_by ?? 'sin usuario'}{d0.reference ? `. Ref.: ${d0.reference}` : ''}
                      </small>
                    </div>
                    {unidades.map((d) => <Unidad key={d.id} d={d} ahora={ahora} sonido={sonido} puede={puede} cierre={cierre} setCierre={setCierre}
                      confirmarCierre={confirmarCierre} ocupado={ocupado} onLlegada={() => accionDespacho(api.marcarLlegada, d.id)} />)}
                  </div>
                );
              })}

              <div className="cdp-list-head"><span>Incidencias recientes ({incidencias.length})</span></div>
              {!incidencias.length && <Vacio texto={`Sin incidencias en las últimas ${horasInc} h.`} />}
              <div className="cdp-incs">
                {incidencias.slice(0, 60).map((i) => {
                  const pendiente = !i.estado || i.estado === 'PENDIENTE';
                  const est = ESTADO_INCIDENCIA[i.estado];
                  return (
                    <button key={i.id} className={`cdp-inc${i.prioridad === 'ALTA' && pendiente ? ' alta' : ''}${pendiente ? '' : ' atendida'}`}
                      title={`${i.tipo}${pendiente ? '' : `. ${est?.label}${i.unidades?.length ? `: ${i.unidades.join(', ')}` : ''}`}`}
                      onClick={() => elegirPunto({ lat: i.lat, lng: i.lon, incidencia: i, group_id: i.group_id ?? undefined })}>
                      <IconoCategoria categoria={i.categoria} size={15} className="cdp-inc-ico" />
                      <span>
                        <b>{i.corto || i.tipo}</b>
                        <small>
                          {i.codigo}{i.jurisdiccion ? `, ${i.jurisdiccion}` : ''}
                          {!pendiente && est && <span className="cdp-chip" style={{ '--c': est.color }}>{est.label}{i.unidades?.length ? `: ${i.unidades.join(', ')}` : ''}</span>}
                        </small>
                      </span>
                      <span className="cdp-inc-der">
                        <small className="cdp-inc-hora">{fmtHora(i.registrado)}</small>
                        {i.prioridad && <ChipPrioridad p={i.prioridad} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="cdp-card">
                <button className="cdp-toggle" onClick={() => { setVerTipos((v) => !v); if (!tipos) cargarTipos(); }} aria-expanded={verTipos}>
                  <h3>Prioridad por tipo de incidencia</h3>
                  {verTipos ? <PiCaretUp size={15} /> : <PiCaretDown size={15} />}
                </button>
                {verTipos && (
                  <>
                    <p className="cdp-muted">
                      La prioridad ordena las incidencias pendientes y decide cuáles suenan. El nombre corto es el que se ve en la lista y el mapa.
                      {!puede.cerrar && ' Tu rol solo puede verlas.'}
                    </p>
                    {!tipos && <Cargando />}
                    {tipos && (
                      <table className="cdp-tipos">
                        <tbody>
                          {tipos.map((t) => (
                            <tr key={t.tipo} className={t.configurado ? 'configurado' : ''}>
                              <td>
                                <input value={t.corto} maxLength={40} disabled={!puede.cerrar} aria-label={`Nombre corto de ${t.tipo}`}
                                  onChange={(e) => setTipos((l) => l.map((x) => (x.tipo === t.tipo ? { ...x, corto: e.target.value } : x)))}
                                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.corto_guardado) guardarTipo(t, { corto: v }); }} />
                                <p className="cdp-muted" title={t.tipo}>{t.tipo}</p>
                              </td>
                              <td>
                                <select value={t.prioridad} disabled={!puede.cerrar} aria-label={`Prioridad de ${t.tipo}`} style={{ '--c': PRIORIDAD[t.prioridad]?.color, color: 'var(--c)', fontWeight: 600 }}
                                  onChange={(e) => guardarTipo(t, { prioridad: e.target.value })}>
                                  {Object.entries(PRIORIDAD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                              </td>
                              <td className="cdp-muted" title="Vistas en los últimos 3 días">{t.vistos || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {tab === 'unidades' && (
            <TableroUnidades
              moviles={moviles} aPie={aPie} despachoPorRecurso={despachoPorRecurso} planes={planes} unidadSel={unidadSel}
              onSelect={(u) => seleccionarUnidad(u)} onNecesitaAPie={cargarAPie} cargandoAPie={cargandoAPie}
            />
          )}

          {tab === 'alertas' && (
            <PanelAlertas alertas={alertas} ahora={ahora} puede={puede.cerrar || puede.anular} onAtender={atenderAlerta} onVer={verAlerta} />
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
                  <span className="cdp-stop-n">{i + 1}</span>
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

// Fila de un recurso sugerido: quién, en cuánto llega y por qué se sugiere. `enviada`: ya se mandó a esta emergencia.
const FilaRecurso = ({ r, icono, sub, puede, ocupado, ocupadoKey, onAsignar, destacado, enviada }) => (
  <div className={`cdp-fila${r.ocupada && !enviada ? ' ocupada' : ''}${destacado ? ' destacado' : ''}${enviada ? ' enviada' : ''}`}>
    {icono}
    <div className="cdp-fila-txt">
      <b>{r.codigo}</b>
      <small className="cdp-fila-razon">{enviada ? 'Ya va a esta emergencia' : r.ocupada ? `Ya atiende otro despacho${r.gps_viejo ? ', posición vieja' : ''}` : sub}</small>
    </div>
    <div className="cdp-fila-eta">
      <b>{fmtMin(r.duration_s)}{r.fuente === 'estimado' ? '*' : ''}</b>
      <small>{fmtKm(r.distance_m)}</small>
    </div>
    {puede && (enviada
      ? <span className="ok-txt"><PiCheck size={14} /> Enviada</span>
      : (
        <button className={`cdp-btn mini${destacado ? ' primario' : ''}`} disabled={!!ocupado} onClick={onAsignar}>
          {ocupado === ocupadoKey ? 'Enviando' : 'Enviar'}
        </button>
      ))}
  </div>
);

const ChipPrioridad = ({ p }) => {
  const v = PRIORIDAD[p];
  return v ? <span className="cdp-chip" style={{ '--c': v.color }}>{v.label}</span> : null;
};

// Una unidad dentro de un grupo de despacho: estado, cronómetros por tramo, acciones y cierre con motivo.
const Unidad = ({ d, ahora, sonido, puede, cierre, setCierre, confirmarCierre, ocupado, onLlegada }) => {
  const st = ESTADO_DESPACHO[d.status];
  const activo = d.status === 'ASIGNADO' || d.status === 'EN_LUGAR';
  const enCamino = d.status === 'ASIGNADO' ? segDesde(d.assigned_at, ahora) : d.tramos?.despacho_a_llegada_s ?? d.respuesta_s;
  const enLugar = d.status === 'EN_LUGAR' ? segDesde(d.arrived_at, ahora) : d.tramos?.llegada_a_cierre_s;
  const atrasado = d.status === 'ASIGNADO' && enCamino > limiteAtraso(d, sonido);
  const abriendoCierre = cierre?.id === d.id;
  return (
    <div className="cdp-unidad">
      <div className="cdp-unidad-head">
        <span className="cdp-desp-ico">
          {d.resource_type === 'MOVIL' ? <IconoVehiculo subtipo="AUTOMOVIL" size={14} /> : <IconoAPie tipo={d.resource_type} size={14} />}
        </span>
        <b>{d.unit_code}</b>
        <span className="cdp-chip" style={{ '--c': st.color }}>{st.label}</span>
        {d.status === 'ASIGNADO' && (
          <span className={`cdp-crono${atrasado ? ' atrasado' : ''}`} title={atrasado ? 'Pasó el límite sin llegar' : 'Tiempo desde que se despachó'}>
            {fmtCrono(enCamino)}{atrasado ? ' !' : ''}
          </span>
        )}
        {d.status === 'EN_LUGAR' && <span className="cdp-crono" title="Tiempo en el lugar">{fmtCrono(enLugar)}</span>}
      </div>
      <div className="cdp-tramos">
        {(d.tramos?.recepcion_a_despacho_s ?? null) !== null && <span>Recepción a despacho <b>{fmtCrono(d.tramos.recepcion_a_despacho_s)}</b></span>}
        <span className={d.arrived_at ? 'ok-txt' : ''}>Despacho a llegada <b>{d.arrived_at ? fmtCrono(enCamino) : d.status === 'ASIGNADO' ? 'en curso' : '-'}</b></span>
        {(d.arrived_at || d.status === 'EN_LUGAR') && <span>En el lugar <b>{fmtCrono(enLugar)}</b></span>}
        {d.status === 'ASIGNADO' && d.ruta && <span>Le faltan <b>{fmtMin(d.ruta.duration_s)}</b> ({fmtKm(d.ruta.distance_m)} por calles)</span>}
        {d.status === 'ASIGNADO' && !d.ruta && (d.distancia_actual_m ?? null) !== null && <span>Está a <b>{fmtKm(d.distancia_actual_m)}</b></span>}
      </div>
      {!activo && (
        <div className="cdp-resultado">
          {st.label} {fmtHora(d.closed_at)}{d.result ? `: ${textoResultado(d.result)}` : ''}{d.notes ? `. ${d.notes}` : ''}
        </div>
      )}
      {activo && !abriendoCierre && (
        <div className="cdp-row">
          <a className="cdp-btn mini" href={d.enlaces.waze} target="_blank" rel="noreferrer"><PiNavigationArrow size={13} /> Waze</a>
          <a className="cdp-btn mini" href={textoWhatsApp(d)} target="_blank" rel="noreferrer"><PiWhatsappLogo size={13} /> WhatsApp</a>
          {puede.cerrar && d.status === 'ASIGNADO' && <button className="cdp-btn mini" onClick={onLlegada}>Llegó</button>}
          {puede.cerrar && <button className="cdp-btn mini" onClick={() => setCierre({ id: d.id, cancelar: false, resultado: 'ATENDIDO', notas: '' })}>Cerrar</button>}
          {puede.cerrar && <button className="cdp-btn mini peligro" onClick={() => setCierre({ id: d.id, cancelar: true, resultado: 'REASIGNADO', notas: '' })}>Cancelar</button>}
        </div>
      )}
      {abriendoCierre && (
        <div className="cdp-cierre">
          <select aria-label="Resultado" value={cierre.resultado} onChange={(e) => setCierre((c) => ({ ...c, resultado: e.target.value }))}>
            {(cierre.cancelar ? RESULTADOS_CANCELACION : RESULTADOS_CIERRE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input aria-label="Nota" placeholder="Nota corta (opcional)" maxLength={300} value={cierre.notas} onChange={(e) => setCierre((c) => ({ ...c, notas: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmarCierre(); }} />
          <div className="cdp-row">
            <button className={`cdp-btn mini ${cierre.cancelar ? 'peligro' : 'primario'}`} disabled={ocupado === `c-${d.id}`} onClick={confirmarCierre}>
              {ocupado === `c-${d.id}` ? 'Guardando' : cierre.cancelar ? 'Confirmar cancelación' : 'Confirmar cierre'}
            </button>
            <button className="cdp-btn mini" onClick={() => setCierre(null)}>Volver</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Avisos que no desaparecen: incidencias urgentes sin despachar y despachos que pasaron el límite sin llegar.
// El sonido (y el límite en minutos) se configura aquí y se recuerda por operador.
const PanelAvisos = ({ urgentes, atrasados, ahora, sonido, cambiarSonido, onIncidencia, onDespacho }) => {
  const n = urgentes.length + atrasados.length;
  return (
    <div className={`cdp-avisos${n ? ' con-avisos' : ''}`}>
      <div className="cdp-avisos-head">
        <PiBellRinging size={15} /> Avisos {n > 0 && <span className="cdp-contador">{n}</span>}
        <label className="cdp-inline" title="Avisar cuando una unidad en camino pase este tiempo sin llegar (o 1.5 veces lo estimado, lo que sea mayor)">Atraso a los
          <select value={sonido.limite_min} onChange={(e) => cambiarSonido({ limite_min: Number(e.target.value) })}>
            {[5, 8, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <button className={`cdp-icon-btn${sonido.activo ? '' : ' apagado'}`} onClick={() => { cambiarSonido({ activo: !sonido.activo }); if (!sonido.activo) setTimeout(() => sonar('alta'), 50); }}
          title={sonido.activo ? 'Sonido activado: clic para silenciar' : 'Sonido silenciado: clic para activar'} aria-label="Sonido de avisos">
          {sonido.activo ? <PiSpeakerHigh size={15} /> : <PiSpeakerSlash size={15} />}
        </button>
      </div>
      {urgentes.slice(0, MAX_AVISOS_URGENTES).map((i) => (
        <button key={`u-${i.id}`} className="cdp-aviso-item alta" onClick={() => onIncidencia(i)}>
          <PiSiren size={15} />
          <span>
            Urgente sin despachar: {i.corto || i.tipo}
            <small>{i.codigo}{i.jurisdiccion ? `, ${i.jurisdiccion}` : ''}, hace {fmtCrono(segDesde(i.registrado, ahora))}. Clic para despachar.</small>
          </span>
        </button>
      ))}
      {atrasados.map((d) => (
        <button key={`a-${d.id}`} className="cdp-aviso-item atraso" onClick={() => onDespacho(d)}>
          <PiWarning size={15} />
          <span>
            {d.unit_code} no ha llegado a {d.incident_code ?? 'punto marcado'}
            <small>Lleva {fmtCrono(segDesde(d.assigned_at, ahora))} en camino{d.ruta ? `, le faltan ${fmtMin(d.ruta.duration_s)}` : ''}. Clic para ver en el mapa.</small>
          </span>
        </button>
      ))}
      {urgentes.length > MAX_AVISOS_URGENTES && <div className="cdp-avisos-vacio">Y {urgentes.length - MAX_AVISOS_URGENTES} urgentes más en la lista de incidencias.</div>}
      {!n && <div className="cdp-avisos-vacio">Sin avisos: no hay urgentes de los últimos {URGENTE_MIN} min sin despachar ni unidades atrasadas.</div>}
    </div>
  );
};

const Vacio = ({ texto }) => <p className="cdp-empty">{texto}</p>;

const Cargando = () => (
  <div className="cdp-cargando" aria-label="Calculando">
    {[0, 1, 2].map((i) => <div key={i} className="cdp-skel" />)}
  </div>
);

const CAPAS_MAPA = [
  ['jurisdicciones', 'Jurisdicciones'], ['moviles', 'Móviles'], ['offline', 'Sin reporte'],
  ['zonas', 'Zonas de riesgo'], ['rutas', 'Rutas'], ['incidencias', 'Incidencias'],
];
const leerLeyenda = () => { try { return localStorage.getItem('cdp.leyenda') === '1'; } catch { return false; } };

// Barra inferior del mapa: capas y leyenda (colapsable). La leyenda explica al personal la regla
// forma = qué es, color = estado.
const BarraMapa = ({ capas, setCapas }) => {
  const [verLeyenda, setVerLeyenda] = useState(leerLeyenda);
  const alternar = () => {
    setVerLeyenda((v) => { try { localStorage.setItem('cdp.leyenda', v ? '0' : '1'); } catch { /* sin almacenamiento */ } return !v; });
  };
  return (
    <div className="cdp-barra">
      {verLeyenda && (
        <div className="cdp-leyenda" role="region" aria-label="Leyenda del mapa">
          <div className="cdp-leyenda-col">
            <b>Qué es</b>
            <div><SimboloMovil subtipo="CAMION" size={20} /> Camioneta</div>
            <div><SimboloMovil subtipo="MOTO" size={20} /> Moto</div>
            <div><SimboloAPie tipo="RADIO" size={20} /> Sereno a pie con radio</div>
            <div><SimboloAPie tipo="BODYCAM" size={20} /> Bodycam</div>
            <div><SimboloCamara size={20} /> Cámara fija</div>
            <div><span className="lg-inc" /> Incidencia reciente</div>
            <div><SimboloZona nivel="alto" /> Zona de riesgo (más rojo, más riesgo)</div>
          </div>
          <div className="cdp-leyenda-col">
            <b>Estado (color)</b>
            {ESTADOS.map((e) => (
              <div key={e.key}><span className="lg-estado" style={{ background: COLOR[e.key] }} /> {e.label}<small>{e.desc}</small></div>
            ))}
            <div><span className="lg-estado" style={{ background: COLOR.emergencia }} /> Emergencia</div>
            <div><span className="lg-linea" /> Ruta de patrullaje<small>Punteada: ruta manual</small></div>
          </div>
        </div>
      )}
      <div className="cdp-capas">
        <PiStack size={15} />
        {CAPAS_MAPA.map(([k, l]) => (
          <label key={k}>
            <input type="checkbox" checked={capas[k]} onChange={(e) => setCapas((c) => ({ ...c, [k]: e.target.checked }))} /> {l}
          </label>
        ))}
        <button className={`cdp-leyenda-btn${verLeyenda ? ' activo' : ''}`} onClick={alternar} aria-expanded={verLeyenda}>
          <PiEye size={14} /> Leyenda
        </button>
      </div>
    </div>
  );
};

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
              <tr><td>Emergencias atendidas</td><td><b>{metricas.emergencias ?? metricas.despachos}</b></td></tr>
              <tr><td>Unidades despachadas</td><td><b>{metricas.despachos}</b></td></tr>
              <tr><td>Con llegada detectada</td><td><b>{metricas.con_llegada}</b></td></tr>
              {(metricas.recepcion_a_despacho_mediana_s ?? null) !== null && <tr><td>De recibida a despachada (mediana)</td><td><b>{fmtMin(metricas.recepcion_a_despacho_mediana_s)}</b></td></tr>}
              <tr><td>Tiempo de respuesta mediano</td><td><b>{fmtMin(metricas.respuesta_mediana_s)}</b></td></tr>
              <tr><td>Tiempo de respuesta p90</td><td><b>{fmtMin(metricas.respuesta_p90_s)}</b></td></tr>
              <tr><td>Se eligió la primera sugerencia</td><td><b>{metricas.eligieron_primera_sugerencia}</b></td></tr>
              {metricas.por_prioridad?.ALTA > 0 && <tr><td>De prioridad alta</td><td><b>{metricas.por_prioridad.ALTA}</b></td></tr>}
              {metricas.por_resultado?.FALSA_ALARMA > 0 && <tr><td>Falsas alarmas</td><td><b>{metricas.por_resultado.FALSA_ALARMA}</b></td></tr>}
              {metricas.por_resultado?.DERIVADO_PNP > 0 && <tr><td>Derivados a PNP</td><td><b>{metricas.por_resultado.DERIVADO_PNP}</b></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CentroDespacho;
