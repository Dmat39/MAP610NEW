import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useClusterWorker } from '../../hooks/useClusterWorker';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  FileDown, Filter, RefreshCw, CalendarDays,
  ChevronDown, ChevronRight, BarChart2, AlertTriangle, ScatterChart, SlidersHorizontal,
  Clock, MapPin, TrendingUp, Flame, Sunrise, Activity, Shield, Building2, GitCompare,
} from 'lucide-react';
import {
  FUENTES, FUENTE_COLOR, SERENO, PNP, SIN_TIPIFICAR,
  GRUPOS, SIMPLES, ALL_ITEMS, JURISDICCIONES, TIPO_COLORS,
  STATUS_COLORS,
  fmt, getDefault,
  fetchSereno, fetchPnp, fetchPnpTipologia, fetchPnpJurisdicciones,
  resolvePnpJurisdiction, agruparPnp, normalizarModalidades,
} from './reportes/reportesData';
import { generarExcelIncidencias, generarExcelClusters } from './reportes/reportesExcel';

// ── Diseño ────────────────────────────────────────────────────────────────────
const PRIMARY    = '#1d4ed8';
const BG         = 'var(--theme-bg)';
const CARD       = 'var(--theme-surface)';
const BORDER     = '1px solid var(--theme-border)';
const SHADOW     = 'var(--theme-shadow)';
const RADIUS     = 12;
const TEXT_DARK  = 'var(--theme-text)';
const TEXT_MID   = 'var(--theme-text-3)';
const TEXT_LIGHT = 'var(--theme-text-4)';

const TURNO_COLOR = t => t === 'Mañana' ? '#f59e0b' : t === 'Tarde' ? '#f97316' : t === 'Noche' ? '#4f46e5' : '#94a3b8';

// ── Componente ────────────────────────────────────────────────────────────────
const ReporteIncidencias = () => {
  const [fuente, setFuente]       = useState('sereno'); // 'sereno' | 'pnp' | 'ambas'
  const [modo, setModo]           = useState('incidencias'); // 'incidencias' | 'clusters'
  const [range, setRange]         = useState(getDefault());
  const [jurisdiction, setJur]    = useState('');
  const [radio, setRadio]         = useState(100);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [rawData, setRawData]     = useState(null); // [{ key, label, fuente, registros[] }]

  // ── Filtros Serenazgo ──
  const [selected, setSelected] = useState(() => Object.fromEntries(ALL_ITEMS.map(i => [i.key, true])));
  const [expanded, setExpanded] = useState({ robos: false, hurtos: false });

  // ── Filtros PNP ──
  const [pnpTree, setPnpTree]         = useState([]);
  const [pnpLabels, setPnpLabels]     = useState({});
  const [pnpJurs, setPnpJurs]         = useState([]);
  const [pnpSel, setPnpSel]           = useState({});
  const [pnpExpanded, setPnpExpanded] = useState({});
  const [catalogo, setCatalogo]       = useState('idle'); // idle | loading | ready | error
  const [catalogoError, setCatError]  = useState('');
  const [reintento, setReintento]     = useState(0);
  const catalogoListo = useRef(false);

  const usaSereno = fuente === 'sereno' || fuente === 'ambas';
  const usaPnp    = fuente === 'pnp'    || fuente === 'ambas';
  const mixto     = fuente === 'ambas';
  const fuentesSel = mixto ? [SERENO, PNP] : fuente === 'pnp' ? [PNP] : [SERENO];

  // ── Carga del catálogo PNP (una sola vez, al entrar a una vista que lo use) ──
  // Ojo: `catalogo` NO puede ir en las dependencias — setCatalogo('loading')
  // volvería a ejecutar el efecto y su cleanup cancelaría la petición en vuelo.
  useEffect(() => {
    if (!usaPnp || catalogoListo.current) return;
    let cancelled = false;
    setCatalogo('loading'); setCatError('');
    Promise.all([fetchPnpTipologia(), fetchPnpJurisdicciones()])
      .then(([{ tree, labelByModality }, jurs]) => {
        if (cancelled) return;
        setPnpTree(tree);
        setPnpLabels(labelByModality);
        setPnpJurs(jurs);
        const keys = [...tree.flatMap(t => t.subtypes.flatMap(s => s.modalities.map(m => m.id))), SIN_TIPIFICAR];
        setPnpSel(Object.fromEntries(keys.map(k => [k, true])));
        catalogoListo.current = true;
        setCatalogo('ready');
      })
      .catch(e => {
        if (cancelled) return;
        setCatError(e.message || 'No se pudo cargar la tipología PNP');
        setCatalogo('error');
      });
    return () => { cancelled = true; };
  }, [usaPnp, reintento]);

  // ── Selecciones ──
  const toggleItem  = key  => setSelected(p => ({ ...p, [key]: !p[key] }));
  const toggleGrupo = gkey => {
    const keys = GRUPOS.find(g => g.key === gkey)?.items.map(i => i.key) ?? [];
    const allOn = keys.every(k => selected[k]);
    setSelected(p => ({ ...p, ...Object.fromEntries(keys.map(k => [k, !allOn])) }));
  };
  const toggleAll = () => {
    const allOn = ALL_ITEMS.every(i => selected[i.key]);
    setSelected(Object.fromEntries(ALL_ITEMS.map(i => [i.key, !allOn])));
  };
  const activeItems = ALL_ITEMS.filter(i => selected[i.key]);

  const pnpAllKeys = useMemo(
    () => [...pnpTree.flatMap(t => t.subtypes.flatMap(s => s.modalities.map(m => m.id))), SIN_TIPIFICAR],
    [pnpTree],
  );
  const pnpActiveCount = pnpAllKeys.filter(k => pnpSel[k]).length;
  const pnpTodoOn = pnpAllKeys.length > 0 && pnpActiveCount === pnpAllKeys.length;

  const togglePnpKey = k => setPnpSel(p => ({ ...p, [k]: !p[k] }));
  const togglePnpKeys = keys => {
    const allOn = keys.every(k => pnpSel[k]);
    setPnpSel(p => ({ ...p, ...Object.fromEntries(keys.map(k => [k, !allOn])) }));
  };
  const togglePnpAll = () => setPnpSel(Object.fromEntries(pnpAllKeys.map(k => [k, !pnpTodoOn])));

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true); setRawData(null); setError('');
    try {
      const bloques = [];

      if (usaSereno && activeItems.length) {
        const results = await Promise.allSettled(
          activeItems.map(async item => {
            const registros = await fetchSereno({
              tipo: item.tipo, subtype: item.subtype,
              start: range.start, end: range.end, jurisdiction,
            });
            return { key: `sereno:${item.key}`, label: item.label, fuente: SERENO, registros };
          }),
        );
        bloques.push(...results.flatMap(r => (r.status === 'fulfilled' ? [r.value] : [])));
      }

      if (usaPnp && catalogo === 'ready' && pnpActiveCount > 0) {
        const nombreJur = JURISDICCIONES.find(j => j.id === jurisdiction)?.nombre || '';
        const rows = await fetchPnp({
          start: range.start, end: range.end,
          jurisdiction: resolvePnpJurisdiction(nombreJur, pnpJurs),
        });
        const normalizados = normalizarModalidades(rows, pnpLabels);
        const filtrados = pnpTodoOn ? normalizados : normalizados.filter(r => pnpSel[r.modalityId]);
        bloques.push(...agruparPnp(filtrados, pnpLabels));
      }

      setRawData(bloques);
    } catch (e) {
      setError(e.message || 'Error al consultar las incidencias');
      setRawData([]);
    } finally { setLoading(false); }
  }, [usaSereno, usaPnp, activeItems, range, jurisdiction, catalogo, pnpActiveCount,
      pnpTodoOn, pnpSel, pnpLabels, pnpJurs]);

  // ── Clusters (Web Worker) ───────────────────────────────────────────────────
  const clusterAsync = useClusterWorker();
  const [clusters, setClusters] = useState([]);
  useEffect(() => {
    if (!rawData || modo !== 'clusters') { setClusters([]); return; }
    const allPuntos = rawData.flatMap(({ label, registros }) => registros.map(r => ({ ...r, Tipo: label })));
    const seen = new Set();
    const uniq = allPuntos.filter(p => {
      const k = `${p.fuente}|${p.codigo || `${p.Latitud.toFixed(5)},${p.Longitud.toFixed(5)}`}`;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    let cancelled = false;
    clusterAsync(uniq, radio).then(result => {
      if (cancelled) return;
      setClusters(result.sort((a, b) => b.cantidad - a.cantidad));
    }).catch(err => {
      if (cancelled || err?.name === 'AbortError') return;
      setClusters([]);
    });
    return () => { cancelled = true; };
  }, [rawData, radio, modo, clusterAsync]);

  // ── Agregados ───────────────────────────────────────────────────────────────
  const todos = useMemo(
    () => (rawData || []).flatMap(({ label, registros }) => registros.map(r => ({ ...r, tipo: label }))),
    [rawData],
  );
  const totalIncidencias = todos.length;

  const countBy = (rows, fn) => {
    const counts = {};
    rows.forEach(r => { const k = fn(r); if (k) counts[k] = (counts[k] || 0) + 1; });
    return counts;
  };
  const sortDesc = counts => Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const totalSereno = useMemo(() => todos.filter(r => r.fuente === SERENO).length, [todos]);
  const totalPnp    = useMemo(() => todos.filter(r => r.fuente === PNP).length, [todos]);

  const byTurno = useMemo(() => {
    const ORDER = ['Mañana', 'Tarde', 'Noche'];
    return Object.entries(countBy(todos, r => r.turno?.trim() || 'Sin turno')).sort((a, b) => {
      const ai = ORDER.indexOf(a[0]), bi = ORDER.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1] - a[1];
    });
  }, [todos]);

  const byHora = useMemo(
    () => sortDesc(countBy(todos, r => (r.hora ? String(r.hora).split(':')[0].padStart(2, '0') : null))),
    [todos],
  );

  const tipoChartData = useMemo(
    () => (rawData || []).filter(r => r.registros.length > 0)
      .sort((a, b) => b.registros.length - a.registros.length)
      .map(r => ({ name: mixto ? `${r.label} (${r.fuente === PNP ? 'PNP' : 'Ser.'})` : r.label, value: r.registros.length, fuente: r.fuente })),
    [rawData, mixto],
  );

  const byJur = useMemo(() => sortDesc(countBy(todos, r => r.jurisdiccion?.trim() || 'Sin datos')), [todos]);

  const byFecha = useMemo(() => {
    const counts = countBy(todos, r => r.fecha);
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, value]) => ({ fecha, value, label: fecha.slice(5).split('-').reverse().join('/') }));
  }, [todos]);

  const horaProfile = useMemo(() => {
    const map = Object.fromEntries(byHora.map(([h, v]) => [h, v]));
    const peak = byHora[0]?.[0];
    return Array.from({ length: 24 }, (_, i) => {
      const h = String(i).padStart(2, '0');
      return { name: h, value: map[h] || 0, peak: h === peak };
    });
  }, [byHora]);

  // ── Agregados PNP ──
  const byEstado = useMemo(
    () => sortDesc(countBy(todos.filter(r => r.fuente === PNP), r => r.estado || 'Sin estado')),
    [todos],
  );
  const byComisaria = useMemo(
    () => sortDesc(countBy(todos.filter(r => r.fuente === PNP), r => r.comisaria || 'Sin comisaría')).slice(0, 12),
    [todos],
  );

  // ── Agregados comparativos (fuente Ambas) ──
  const jurComparado = useMemo(() => {
    if (!mixto) return [];
    const ser = countBy(todos.filter(r => r.fuente === SERENO), r => r.jurisdiccion?.trim() || 'Sin datos');
    const pnp = countBy(todos.filter(r => r.fuente === PNP),    r => r.jurisdiccion?.trim() || 'Sin datos');
    return [...new Set([...Object.keys(ser), ...Object.keys(pnp)])]
      .map(name => ({ name, Serenazgo: ser[name] || 0, PNP: pnp[name] || 0 }))
      .sort((a, b) => (b.Serenazgo + b.PNP) - (a.Serenazgo + a.PNP));
  }, [todos, mixto]);

  const fechaComparada = useMemo(() => {
    if (!mixto) return [];
    const ser = countBy(todos.filter(r => r.fuente === SERENO), r => r.fecha);
    const pnp = countBy(todos.filter(r => r.fuente === PNP),    r => r.fecha);
    return [...new Set([...Object.keys(ser), ...Object.keys(pnp)])].sort()
      .map(fecha => ({
        fecha, label: fecha.slice(5).split('-').reverse().join('/'),
        Serenazgo: ser[fecha] || 0, PNP: pnp[fecha] || 0,
      }));
  }, [todos, mixto]);

  const turnoComparado = useMemo(() => {
    if (!mixto) return [];
    const ORDER = ['Mañana', 'Tarde', 'Noche', 'Sin turno'];
    const ser = countBy(todos.filter(r => r.fuente === SERENO), r => r.turno?.trim() || 'Sin turno');
    const pnp = countBy(todos.filter(r => r.fuente === PNP),    r => r.turno?.trim() || 'Sin turno');
    return [...new Set([...Object.keys(ser), ...Object.keys(pnp)])]
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
      .map(name => ({ name, Serenazgo: ser[name] || 0, PNP: pnp[name] || 0 }));
  }, [todos, mixto]);

  const insights = useMemo(() => {
    const horaPico = byHora[0] ? { hora: byHora[0][0], count: byHora[0][1] } : null;
    const turnoTop = [...byTurno].sort((a, b) => b[1] - a[1])[0] || null;
    const jurTop   = byJur[0] || null;
    const tipoTop  = tipoChartData[0] || null;
    const numDias  = byFecha.length || 1;
    return { horaPico, turnoTop, jurTop, tipoTop, numDias, promedioDiario: totalIncidencias / numDias };
  }, [byHora, byTurno, byJur, tipoChartData, byFecha, totalIncidencias]);

  // ── Etiquetas para el Excel / encabezados ───────────────────────────────────
  const fuenteLabel = mixto ? 'Serenazgo + PNP' : fuente === 'pnp' ? 'PNP' : 'Serenazgo';
  const jurLabel    = JURISDICCIONES.find(j => j.id === jurisdiction)?.label ?? 'Todas';
  const rangoLabel  = `${range.start} al ${range.end}`;
  const filtroLabel = useMemo(() => {
    const partes = [];
    if (usaSereno) {
      partes.push(`Serenazgo: ${activeItems.length === ALL_ITEMS.length ? 'todos los tipos' : activeItems.map(i => i.label).join(', ') || 'ninguno'}`);
    }
    if (usaPnp) {
      partes.push(`PNP: ${pnpTodoOn ? 'toda la tipología' : `${pnpActiveCount} modalidad(es)`}`);
    }
    partes.push(`Jurisdicción: ${jurLabel}`);
    return partes.join(' — ');
  }, [usaSereno, usaPnp, activeItems, pnpTodoOn, pnpActiveCount, jurLabel]);

  const excelMeta = { fuenteLabel, filtroLabel, rangoLabel, fuentes: fuentesSel };

  const puedeCargar = (usaSereno && activeItems.length > 0) || (usaPnp && catalogo === 'ready' && pnpActiveCount > 0);

  // ── Estilos ─────────────────────────────────────────────────────────────────
  const inputSt = {
    padding: '7px 10px', borderRadius: 8, border: BORDER,
    background: CARD, color: TEXT_DARK, fontSize: 13, outline: 'none',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  };
  const btnSt = (bg = PRIMARY) => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
    borderRadius: 9, border: 'none', background: bg, color: 'white',
    cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'opacity 0.15s',
  });
  const tooltipStyle = { background: CARD, border: BORDER, borderRadius: 8, fontSize: 12, boxShadow: SHADOW, color: TEXT_DARK };
  const panelSt = { background: 'var(--theme-surface-2)', borderRadius: 10, border: BORDER, padding: '16px 18px' };
  const labelSt = { fontSize: 11, fontWeight: 600, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 };
  const seccionSt = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 };
  const thSt = (align = 'left') => ({
    padding: '9px 16px', textAlign: align, fontWeight: 600, fontSize: 11, color: TEXT_LIGHT,
    textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9',
  });
  const hoverRow = {
    onMouseEnter: e => { e.currentTarget.style.background = '#f9fafb'; },
    onMouseLeave: e => { e.currentTarget.style.background = 'transparent'; },
  };
  const fuenteChip = f => (
    <span style={{
      background: `${FUENTE_COLOR[f]}14`, color: FUENTE_COLOR[f], borderRadius: 4,
      padding: '2px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{f}</span>
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '28px 32px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* Título + selector de fuente + vista */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 800, color: TEXT_DARK }}>Reportes de Incidencias</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>
          <div>
            <div style={labelSt}>Fuente</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {FUENTES.map(f => {
                const on = fuente === f.key;
                const icon = f.key === 'sereno' ? <Shield size={14} /> : f.key === 'pnp' ? <Building2 size={14} /> : <GitCompare size={14} />;
                return (
                  <button key={f.key} onClick={() => { setFuente(f.key); setRawData(null); setError(''); }} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                    borderRadius: 9, border: `1.5px solid ${on ? f.color : '#e2e8f0'}`,
                    background: on ? f.color : CARD, color: on ? 'white' : TEXT_MID,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}>
                    {icon} {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={labelSt}>Vista</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'incidencias', label: 'Por Incidencia', icon: <BarChart2 size={14} /> },
                { key: 'clusters',    label: 'Por Cluster',    icon: <ScatterChart size={14} /> },
              ].map(t => (
                <button key={t.key} onClick={() => setModo(t.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                  borderRadius: 9, border: `1.5px solid ${modo === t.key ? PRIMARY : '#e2e8f0'}`,
                  background: modo === t.key ? PRIMARY : CARD,
                  color: modo === t.key ? 'white' : TEXT_MID,
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Panel filtros ── */}
        <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={15} color={PRIMARY} /> Filtros
          </div>

          {/* Fechas */}
          <div>
            <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CalendarDays size={13} /> Período
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 3 }}>Desde</div>
                <input type="date" value={range.start} max={range.end} style={inputSt}
                  onChange={e => setRange(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, marginBottom: 3 }}>Hasta</div>
                <input type="date" value={range.end} min={range.start} max={fmt(new Date())} style={inputSt}
                  onChange={e => setRange(p => ({ ...p, end: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Jurisdicción */}
          <div>
            <label style={labelSt}>Jurisdicción</label>
            <select value={jurisdiction} onChange={e => setJur(e.target.value)} style={inputSt}>
              {JURISDICCIONES.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
            </select>
            {mixto && (
              <div style={{ fontSize: 10, color: TEXT_LIGHT, marginTop: 4 }}>
                Se aplica a ambas fuentes (Serenazgo por código, PNP por nombre de comisaría).
              </div>
            )}
          </div>

          {/* Radio — solo en modo clusters */}
          {modo === 'clusters' && (
            <div>
              <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 5 }}>
                <SlidersHorizontal size={13} /> Radio de clustering
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="range" min={10} max={500} value={radio} onChange={e => setRadio(Number(e.target.value))}
                  style={{ flex: 1, accentColor: PRIMARY }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY, minWidth: 56 }}>{radio} m</span>
              </div>
              <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 3 }}>
                Incidencias dentro de {radio}m se agrupan en un cluster
              </div>
            </div>
          )}

          {/* ── Tipos Serenazgo ── */}
          {usaSereno && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ ...seccionSt, marginBottom: 0, color: FUENTE_COLOR[SERENO] }}>
                  <Shield size={13} /> {mixto ? 'Tipos — Serenazgo' : 'Tipos'}
                </span>
                <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: PRIMARY, fontWeight: 600 }}>
                  {ALL_ITEMS.every(i => selected[i.key]) ? 'Quitar todos' : 'Selec. todos'}
                </button>
              </div>
              {GRUPOS.map(g => {
                const keys = g.items.map(i => i.key), activeC = keys.filter(k => selected[k]).length;
                const allOn = activeC === keys.length, isExp = expanded[g.key];
                return (
                  <div key={g.key} style={{ marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: 'var(--theme-surface-2)', border: BORDER, marginBottom: isExp ? 3 : 0 }}>
                      <input type="checkbox" checked={allOn}
                        ref={el => { if (el) el.indeterminate = activeC > 0 && !allOn; }}
                        onChange={() => toggleGrupo(g.key)}
                        style={{ width: 14, height: 14, accentColor: g.color, cursor: 'pointer', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: g.color, cursor: 'pointer' }}
                        onClick={() => setExpanded(p => ({ ...p, [g.key]: !p[g.key] }))}>
                        {g.label}
                      </span>
                      <span style={{ fontSize: 10, color: TEXT_LIGHT }}>({activeC}/{keys.length})</span>
                      <span style={{ color: TEXT_LIGHT, cursor: 'pointer' }} onClick={() => setExpanded(p => ({ ...p, [g.key]: !p[g.key] }))}>
                        {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                    </div>
                    {isExp && (
                      <div style={{ paddingLeft: 14 }}>
                        {g.items.map(item => (
                          <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', cursor: 'pointer', fontSize: 12, color: TEXT_MID }}>
                            <input type="checkbox" checked={!!selected[item.key]} onChange={() => toggleItem(item.key)}
                              style={{ width: 13, height: 13, accentColor: g.color, cursor: 'pointer' }} />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 4 }}>
                {SIMPLES.map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, background: 'var(--theme-surface-2)', border: BORDER, cursor: 'pointer', fontSize: 12, color: TEXT_MID }}>
                    <input type="checkbox" checked={!!selected[item.key]} onChange={() => toggleItem(item.key)}
                      style={{ width: 13, height: 13, accentColor: item.color, cursor: 'pointer' }} />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Filtros PNP ── */}
          {usaPnp && (
            <div style={mixto ? { borderTop: BORDER, paddingTop: 14 } : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ ...seccionSt, marginBottom: 0, color: FUENTE_COLOR[PNP] }}>
                  <Building2 size={13} /> {mixto ? 'Tipos — PNP' : 'Tipos'}
                </span>
                {catalogo === 'ready' && (
                  <button onClick={togglePnpAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: FUENTE_COLOR[PNP], fontWeight: 600 }}>
                    {pnpTodoOn ? 'Quitar todos' : 'Selec. todos'}
                  </button>
                )}
              </div>

              {catalogo === 'loading' && (
                <div style={{ fontSize: 12, color: TEXT_LIGHT, padding: '8px 0' }}>Cargando tipología PNP…</div>
              )}
              {catalogo === 'error' && (
                <div style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' }}>
                  {catalogoError}
                  <button onClick={() => setReintento(n => n + 1)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#b91c1c', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
                    Reintentar
                  </button>
                </div>
              )}

              {catalogo === 'ready' && (
                <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 2 }}>
                  {pnpTree.map(t => {
                    const tKeys = t.subtypes.flatMap(s => s.modalities.map(m => m.id));
                    const tActive = tKeys.filter(k => pnpSel[k]).length;
                    const tAllOn = tKeys.length > 0 && tActive === tKeys.length;
                    const tExp = !!pnpExpanded[t.id];
                    return (
                      <div key={t.id} style={{ marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 8px', borderRadius: 7, background: 'var(--theme-surface-2)', border: BORDER, marginBottom: tExp ? 3 : 0 }}>
                          <input type="checkbox" checked={tAllOn}
                            ref={el => { if (el) el.indeterminate = tActive > 0 && !tAllOn; }}
                            onChange={() => togglePnpKeys(tKeys)}
                            style={{ width: 14, height: 14, marginTop: 1, accentColor: FUENTE_COLOR[PNP], cursor: 'pointer', flexShrink: 0 }} />
                          <span title={t.name} style={{ flex: 1, fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: FUENTE_COLOR[PNP], cursor: 'pointer' }}
                            onClick={() => setPnpExpanded(p => ({ ...p, [t.id]: !p[t.id] }))}>
                            {t.name}
                          </span>
                          <span style={{ fontSize: 10, color: TEXT_LIGHT, flexShrink: 0, marginTop: 2 }}>({tActive}/{tKeys.length})</span>
                          <span style={{ color: TEXT_LIGHT, cursor: 'pointer', flexShrink: 0, marginTop: 1 }} onClick={() => setPnpExpanded(p => ({ ...p, [t.id]: !p[t.id] }))}>
                            {tExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>
                        </div>
                        {tExp && (
                          <div style={{ paddingLeft: 12 }}>
                            {t.subtypes.map(s => {
                              const sKeys = s.modalities.map(m => m.id);
                              const sActive = sKeys.filter(k => pnpSel[k]).length;
                              const sAllOn = sKeys.length > 0 && sActive === sKeys.length;
                              const sExp = !!pnpExpanded[s.id];
                              return (
                                <div key={s.id} style={{ marginBottom: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 4px 4px 8px', borderLeft: '2px solid var(--theme-border)' }}>
                                    <input type="checkbox" checked={sAllOn}
                                      ref={el => { if (el) el.indeterminate = sActive > 0 && !sAllOn; }}
                                      onChange={() => togglePnpKeys(sKeys)}
                                      style={{ width: 13, height: 13, marginTop: 1, accentColor: FUENTE_COLOR[PNP], cursor: 'pointer', flexShrink: 0 }} />
                                    <span title={s.name} style={{ flex: 1, fontSize: 12, fontWeight: 500, lineHeight: 1.35, color: TEXT_MID, cursor: 'pointer' }}
                                      onClick={() => setPnpExpanded(p => ({ ...p, [s.id]: !p[s.id] }))}>
                                      {s.name}
                                    </span>
                                    <span style={{ fontSize: 10, color: TEXT_LIGHT, flexShrink: 0, marginTop: 2 }}>({sActive}/{sKeys.length})</span>
                                    <span style={{ color: TEXT_LIGHT, cursor: 'pointer', flexShrink: 0, marginTop: 1 }} onClick={() => setPnpExpanded(p => ({ ...p, [s.id]: !p[s.id] }))}>
                                      {sExp ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    </span>
                                  </div>
                                  {sExp && (
                                    <div style={{ marginLeft: 8, paddingLeft: 16, borderLeft: '2px solid var(--theme-border)' }}>
                                      {s.modalities.map(m => (
                                        <label key={m.id} title={m.name}
                                          style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '3px 0', cursor: 'pointer', fontSize: 12, lineHeight: 1.35, color: TEXT_LIGHT }}>
                                          <input type="checkbox" checked={!!pnpSel[m.id]} onChange={() => togglePnpKey(m.id)}
                                            style={{ width: 12, height: 12, marginTop: 2, accentColor: FUENTE_COLOR[PNP], cursor: 'pointer', flexShrink: 0 }} />
                                          <span style={{ flex: 1 }}>{m.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', marginTop: 4, borderRadius: 7, background: 'var(--theme-surface-2)', border: BORDER, cursor: 'pointer', fontSize: 12, color: TEXT_MID }}>
                    <input type="checkbox" checked={!!pnpSel[SIN_TIPIFICAR]} onChange={() => togglePnpKey(SIN_TIPIFICAR)}
                      style={{ width: 13, height: 13, accentColor: '#94a3b8', cursor: 'pointer' }} />
                    Sin tipificar
                  </label>
                </div>
              )}
            </div>
          )}

          <button onClick={cargar} disabled={loading || !puedeCargar}
            style={{ ...btnSt('#16a34a'), justifyContent: 'center', opacity: loading || !puedeCargar ? 0.6 : 1 }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.9s linear infinite' : 'none' }} />
            {loading ? 'Cargando...' : 'Cargar datos'}
          </button>
        </div>

        {/* ── Resultados ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {!rawData && !loading && (
            <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, padding: 60, textAlign: 'center', color: TEXT_LIGHT }}>
              {modo === 'clusters' ? <ScatterChart size={40} style={{ marginBottom: 12, opacity: 0.4 }} /> : <BarChart2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />}
              <div style={{ fontSize: 14, fontWeight: 500 }}>Configura los filtros y presiona "Cargar datos"</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Fuente actual: <b>{fuenteLabel}</b></div>
            </div>
          )}

          {loading && (
            <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, padding: 60, textAlign: 'center', color: TEXT_LIGHT }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${PRIMARY}20`, borderTop: `3px solid ${PRIMARY}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14 }}>Consultando incidencias de {fuenteLabel}...</div>
            </div>
          )}

          {/* ════ MODO INCIDENCIAS ════ */}
          {rawData && !loading && modo === 'incidencias' && (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: mixto ? 'repeat(4,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Total incidencias', value: totalIncidencias.toLocaleString('es-PE'), color: PRIMARY },
                  ...(mixto ? [
                    { label: 'Serenazgo', value: totalSereno.toLocaleString('es-PE'), color: FUENTE_COLOR[SERENO] },
                    { label: 'PNP',       value: totalPnp.toLocaleString('es-PE'),    color: FUENTE_COLOR[PNP] },
                  ] : [
                    { label: 'Tipos con datos', value: rawData.filter(r => r.registros.length > 0).length, color: '#16a34a' },
                  ]),
                  { label: 'Jurisdicción', value: jurLabel, color: '#7c3aed', small: true },
                ].map((k, i) => (
                  <div key={i} style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: k.small ? 16 : 28, fontWeight: 700, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* ── Comparativo Serenazgo vs PNP ── */}
              {mixto && totalIncidencias > 0 && (
                <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <GitCompare size={16} color="#7c3aed" />
                    <span style={{ fontSize: 15, fontWeight: 800, color: TEXT_DARK }}>Comparativo Serenazgo vs PNP</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 1.4fr', gap: 18, marginBottom: 18, alignItems: 'stretch' }}>
                    {/* Reparto por fuente */}
                    <div style={panelSt}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reparto por fuente</div>
                      <div style={{ position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={230}>
                          <PieChart>
                            <Pie data={[{ name: SERENO, value: totalSereno }, { name: PNP, value: totalPnp }]}
                              cx="50%" cy="44%" outerRadius={80} innerRadius={50} paddingAngle={2} dataKey="value"
                              labelLine={false}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                if (percent < 0.05) return null;
                                const RADIAN = Math.PI / 180;
                                const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + r * Math.cos(-midAngle * RADIAN);
                                const y = cy + r * Math.sin(-midAngle * RADIAN);
                                return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700 }}>{`${(percent * 100).toFixed(0)}%`}</text>;
                              }}>
                              <Cell fill={FUENTE_COLOR[SERENO]} />
                              <Cell fill={FUENTE_COLOR[PNP]} />
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Incidencias']} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '44%', left: 0, right: 0, transform: 'translateY(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color: TEXT_DARK, lineHeight: 1 }}>{totalIncidencias.toLocaleString('es-PE')}</div>
                          <div style={{ fontSize: 9, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Total</div>
                        </div>
                      </div>
                    </div>

                    {/* Jurisdicción por fuente */}
                    <div style={panelSt}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Jurisdicción por fuente</div>
                      <ResponsiveContainer width="100%" height={Math.max(180, jurComparado.length * 32)}>
                        <BarChart layout="vertical" data={jurComparado} margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border-2)" />
                          <XAxis type="number" tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: TEXT_DARK }} tickLine={false} axisLine={false} width={108} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--theme-surface-2)' }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Serenazgo" stackId="f" fill={FUENTE_COLOR[SERENO]} radius={[0, 0, 0, 0]} />
                          <Bar dataKey="PNP"       stackId="f" fill={FUENTE_COLOR[PNP]}    radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tendencia comparada */}
                  {fechaComparada.length > 1 && (
                    <div style={{ ...panelSt, marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tendencia comparada</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={fechaComparada} margin={{ top: 5, right: 12, bottom: 0, left: -12 }}>
                          <defs>
                            <linearGradient id="gradSer" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={FUENTE_COLOR[SERENO]} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={FUENTE_COLOR[SERENO]} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradPnp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={FUENTE_COLOR[PNP]} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={FUENTE_COLOR[PNP]} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-2)" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} minTickGap={24} />
                          <YAxis tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                          <Tooltip contentStyle={tooltipStyle} labelFormatter={l => `Día ${l}`} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="Serenazgo" stroke={FUENTE_COLOR[SERENO]} strokeWidth={2.2} fill="url(#gradSer)" dot={false} activeDot={{ r: 4 }} />
                          <Area type="monotone" dataKey="PNP"       stroke={FUENTE_COLOR[PNP]}    strokeWidth={2.2} fill="url(#gradPnp)" dot={false} activeDot={{ r: 4 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Turno por fuente */}
                  <div style={panelSt}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Turno por fuente</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={turnoComparado} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-2)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: TEXT_MID }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--theme-surface-2)' }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Serenazgo" fill={FUENTE_COLOR[SERENO]} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="PNP"       fill={FUENTE_COLOR[PNP]}    radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Dashboard de estadísticas visuales ── */}
              <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <Activity size={16} color={PRIMARY} />
                  <span style={{ fontSize: 15, fontWeight: 800, color: TEXT_DARK }}>
                    Estadísticas visuales {mixto && <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_LIGHT }}>(ambas fuentes consolidadas)</span>}
                  </span>
                </div>

                {/* Insight cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { icon: <Clock size={15} />,      label: 'Hora pico',           value: insights.horaPico ? `${insights.horaPico.hora}:00 h` : '—', sub: insights.horaPico ? `${insights.horaPico.count.toLocaleString('es-PE')} incidencias` : 'Sin datos', color: '#dc2626' },
                    { icon: <Sunrise size={15} />,    label: 'Turno crítico',       value: insights.turnoTop ? insights.turnoTop[0] : '—',             sub: insights.turnoTop ? `${insights.turnoTop[1].toLocaleString('es-PE')} incidencias` : 'Sin datos', color: '#f59e0b' },
                    { icon: <MapPin size={15} />,     label: 'Jurisdicción crítica', value: insights.jurTop ? insights.jurTop[0] : '—',                sub: insights.jurTop ? `${insights.jurTop[1].toLocaleString('es-PE')} incidencias` : 'Sin datos', color: '#7c3aed', small: true },
                    { icon: <Flame size={15} />,      label: 'Tipo más frecuente',  value: insights.tipoTop ? insights.tipoTop.name : '—',             sub: insights.tipoTop ? `${insights.tipoTop.value.toLocaleString('es-PE')} incidencias` : 'Sin datos', color: '#ea580c', small: true },
                    { icon: <TrendingUp size={15} />, label: 'Promedio diario',     value: insights.promedioDiario.toFixed(1),                          sub: `en ${insights.numDias} día(s)`, color: '#16a34a' },
                  ].map((c, i) => (
                    <div key={i} style={{ position: 'relative', background: 'var(--theme-surface-2)', borderRadius: 10, border: BORDER, padding: '12px 14px 12px 16px', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: c.color }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.color, marginBottom: 6 }}>
                        {c.icon}
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</span>
                      </div>
                      <div style={{ fontSize: c.small ? 15 : 21, fontWeight: 800, color: TEXT_DARK, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</div>
                      <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 3 }}>{c.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Tendencia temporal */}
                {byFecha.length > 1 && (
                  <div style={{ ...panelSt, marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tendencia en el tiempo</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={byFecha} margin={{ top: 5, right: 12, bottom: 0, left: -12 }}>
                        <defs>
                          <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-2)" />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Incidencias']} labelFormatter={l => `Día ${l}`} />
                        <Area type="monotone" dataKey="value" stroke={PRIMARY} strokeWidth={2.5} fill="url(#gradTrend)" dot={false} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Turno (donut) + Jurisdicción (barras) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 1.4fr', gap: 18, marginBottom: 18, alignItems: 'stretch' }}>
                  <div style={panelSt}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Por turno</div>
                    <div style={{ position: 'relative' }}>
                      <ResponsiveContainer width="100%" height={230}>
                        <PieChart>
                          <Pie
                            data={byTurno.map(([name, value]) => ({ name, value }))}
                            cx="50%" cy="44%" outerRadius={80} innerRadius={50}
                            paddingAngle={2} dataKey="value" labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                              if (percent < 0.05) return null;
                              const RADIAN = Math.PI / 180;
                              const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + r * Math.cos(-midAngle * RADIAN);
                              const y = cy + r * Math.sin(-midAngle * RADIAN);
                              return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700 }}>{`${(percent * 100).toFixed(0)}%`}</text>;
                            }}
                          >
                            {byTurno.map(([name], i) => <Cell key={i} fill={TURNO_COLOR(name)} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Incidencias']} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '44%', left: 0, right: 0, transform: 'translateY(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: TEXT_DARK, lineHeight: 1 }}>{byTurno.reduce((s, [, v]) => s + v, 0).toLocaleString('es-PE')}</div>
                        <div style={{ fontSize: 9, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Total</div>
                      </div>
                    </div>
                  </div>

                  <div style={panelSt}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Por jurisdicción</div>
                    {byJur.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(180, byJur.length * 30)}>
                        <BarChart layout="vertical" data={byJur.map(([name, value]) => ({ name, value }))} margin={{ top: 0, right: 40, bottom: 0, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border-2)" />
                          <XAxis type="number" tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: TEXT_DARK }} tickLine={false} axisLine={false} width={108} />
                          <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Incidencias']} cursor={{ fill: 'var(--theme-surface-2)' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fontWeight: 600, fill: TEXT_MID }}>
                            {byJur.map((_, i) => <Cell key={i} fill={i === 0 ? '#7c3aed' : '#a78bfa'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ padding: 30, textAlign: 'center', color: TEXT_LIGHT, fontSize: 12 }}>Sin datos de jurisdicción</div>
                    )}
                  </div>
                </div>

                {/* ── Específicos PNP: estado del caso + comisaría ── */}
                {usaPnp && totalPnp > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 1.4fr', gap: 18, marginBottom: 18, alignItems: 'stretch' }}>
                    <div style={panelSt}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estado del caso (PNP)</div>
                      <ResponsiveContainer width="100%" height={230}>
                        <PieChart>
                          <Pie data={byEstado.map(([name, value]) => ({ name, value }))}
                            cx="50%" cy="44%" outerRadius={80} innerRadius={50} paddingAngle={2} dataKey="value" labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                              if (percent < 0.05) return null;
                              const RADIAN = Math.PI / 180;
                              const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + r * Math.cos(-midAngle * RADIAN);
                              const y = cy + r * Math.sin(-midAngle * RADIAN);
                              return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700 }}>{`${(percent * 100).toFixed(0)}%`}</text>;
                            }}>
                            {byEstado.map(([name], i) => (
                              <Cell key={i} fill={
                                name === 'En investigación' ? STATUS_COLORS.INVESTIGATING
                                  : name === 'Derivado' ? STATUS_COLORS.REFERRED
                                    : name === 'Cerrado' ? STATUS_COLORS.CLOSED : '#94a3b8'
                              } />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Casos']} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={panelSt}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Por comisaría (PNP) — top 12</div>
                      <ResponsiveContainer width="100%" height={Math.max(180, byComisaria.length * 30)}>
                        <BarChart layout="vertical" data={byComisaria.map(([name, value]) => ({ name, value }))} margin={{ top: 0, right: 40, bottom: 0, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border-2)" />
                          <XAxis type="number" tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: TEXT_DARK }} tickLine={false} axisLine={false} width={130} />
                          <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Casos']} cursor={{ fill: 'var(--theme-surface-2)' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={FUENTE_COLOR[PNP]} label={{ position: 'right', fontSize: 10, fontWeight: 600, fill: TEXT_MID }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Perfil por hora */}
                <div style={{ ...panelSt, marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Perfil horario (24 h)</span>
                    {insights.horaPico && (
                      <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Flame size={12} /> Pico: {insights.horaPico.hora}:00 h
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={horaProfile} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-2)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Incidencias']} labelFormatter={l => `${l}:00 – ${l}:59`} cursor={{ fill: 'var(--theme-surface-2)' }} />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {horaProfile.map((d, i) => <Cell key={i} fill={d.peak ? '#dc2626' : PRIMARY} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Por tipo */}
                {tipoChartData.length > 0 && (
                  <div style={panelSt}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MID, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Por tipo de incidencia</div>
                    <ResponsiveContainer width="100%" height={Math.max(160, tipoChartData.length * 30)}>
                      <BarChart layout="vertical" data={tipoChartData} margin={{ top: 0, right: 48, bottom: 0, left: 130 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border-2)" />
                        <XAxis type="number" tick={{ fontSize: 9, fill: TEXT_LIGHT }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: TEXT_DARK }} tickLine={false} axisLine={false} width={130} />
                        <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toLocaleString('es-PE'), 'Incidencias']} cursor={{ fill: 'var(--theme-surface-2)' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fontWeight: 600, fill: TEXT_MID }}>
                          {tipoChartData.map((d, i) => (
                            <Cell key={i} fill={mixto ? FUENTE_COLOR[d.fuente] : TIPO_COLORS[i % TIPO_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Resumen por tipo + Excel */}
              <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Resumen por tipo</span>
                  <button onClick={() => generarExcelIncidencias(rawData, excelMeta)} style={{ ...btnSt('#16a34a'), padding: '7px 16px' }}>
                    <FileDown size={15} /> Descargar Excel
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>
                    {(mixto ? ['Fuente', 'Tipo de Incidencia', 'Registros', '% del Total'] : ['Tipo de Incidencia', 'Registros', '% del Total']).map(h => (
                      <th key={h} style={thSt(h === 'Registros' || h === '% del Total' ? 'center' : 'left')}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[...rawData].sort((a, b) => b.registros.length - a.registros.length).map((row, i) => (
                      <tr key={row.key || i} style={{ borderBottom: '1px solid var(--theme-border-2)' }} {...hoverRow}>
                        {mixto && <td style={{ padding: '9px 16px' }}>{fuenteChip(row.fuente)}</td>}
                        <td style={{ padding: '9px 16px', color: TEXT_DARK, fontWeight: 500 }}>{row.label}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'center', fontWeight: 700, color: PRIMARY }}>{row.registros.length.toLocaleString('es-PE')}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'center', color: TEXT_MID }}>{totalIncidencias > 0 ? `${((row.registros.length / totalIncidencias) * 100).toFixed(1)}%` : '0%'}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#eff6ff', fontWeight: 700 }}>
                      <td style={{ padding: '10px 16px', color: TEXT_DARK }} colSpan={mixto ? 2 : 1}>TOTAL</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: PRIMARY }}>{totalIncidencias.toLocaleString('es-PE')}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: TEXT_MID }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Resumen por Turno + Incidencias por Hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Resumen por turno</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                      {['Turno', 'Total', '% del Total'].map(h => <th key={h} style={thSt(h === 'Turno' ? 'left' : 'center')}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {byTurno.map(([turno, count], i) => {
                        const badge = turno === 'Mañana' ? { bg: '#fef9c3', tc: '#92400e' } : turno === 'Tarde' ? { bg: '#ffedd5', tc: '#9a3412' } : turno === 'Noche' ? { bg: '#e0e7ff', tc: '#3730a3' } : { bg: '#f1f5f9', tc: TEXT_MID };
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--theme-border-2)' }} {...hoverRow}>
                            <td style={{ padding: '9px 16px' }}>
                              <span style={{ background: badge.bg, color: badge.tc, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{turno}</span>
                            </td>
                            <td style={{ padding: '9px 16px', textAlign: 'center', fontWeight: 700, color: PRIMARY }}>{count.toLocaleString('es-PE')}</td>
                            <td style={{ padding: '9px 16px', textAlign: 'center', color: TEXT_MID }}>{totalIncidencias > 0 ? `${((count / totalIncidencias) * 100).toFixed(1)}%` : '0%'}</td>
                          </tr>
                        );
                      })}
                      {byTurno.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: TEXT_LIGHT }}>Sin datos de turno</td></tr>
                      )}
                      <tr style={{ background: '#eff6ff', fontWeight: 700 }}>
                        <td style={{ padding: '10px 16px', color: TEXT_DARK }}>TOTAL</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: PRIMARY }}>{totalIncidencias.toLocaleString('es-PE')}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: TEXT_MID }}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Incidencias por hora</span>
                    <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 400, marginLeft: 8 }}>(mayor a menor)</span>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr>
                        {['Hora', 'Total', '% del Total'].map(h => (
                          <th key={h} style={{ ...thSt(h === 'Hora' ? 'left' : 'center'), position: 'sticky', top: 0, background: CARD, zIndex: 1 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {byHora.map(([hora, count], i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--theme-border-2)' }} {...hoverRow}>
                            <td style={{ padding: '9px 16px', color: TEXT_DARK, fontWeight: 600 }}>{hora}:00 – {hora}:59</td>
                            <td style={{ padding: '9px 16px', textAlign: 'center', fontWeight: 700, color: i === 0 ? '#dc2626' : PRIMARY }}>{count.toLocaleString('es-PE')}</td>
                            <td style={{ padding: '9px 16px', textAlign: 'center', color: TEXT_MID }}>{totalIncidencias > 0 ? `${((count / totalIncidencias) * 100).toFixed(1)}%` : '0%'}</td>
                          </tr>
                        ))}
                        {byHora.length === 0 && (
                          <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: TEXT_LIGHT }}>Sin datos de hora</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Vista previa detalle */}
              <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Vista previa <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 400 }}>(primeras 20 filas — el Excel incluye todo)</span></span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr>
                      {[
                        ...(mixto ? ['Fuente'] : []),
                        'Tipo', usaPnp ? 'Código / Denuncia' : 'Código', 'Jurisdicción',
                        ...(usaPnp ? ['Comisaría', 'Estado'] : []),
                        'Turno', 'Fecha', 'Descripción',
                      ].map(h => (
                        <th key={h} style={{ ...thSt('left'), padding: '8px 14px', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {todos.slice(0, 20).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--theme-border-2)' }} {...hoverRow}>
                          {mixto && <td style={{ padding: '7px 14px' }}>{fuenteChip(r.fuente)}</td>}
                          <td style={{ padding: '7px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ background: `${PRIMARY}12`, color: PRIMARY, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{r.tipo}</span>
                          </td>
                          <td style={{ padding: '7px 14px', fontFamily: 'monospace', color: PRIMARY, fontSize: 11 }}>{r.codigo || '—'}</td>
                          <td style={{ padding: '7px 14px', color: TEXT_MID }}>{r.jurisdiccion || '—'}</td>
                          {usaPnp && <td style={{ padding: '7px 14px', color: TEXT_MID }}>{r.comisaria || '—'}</td>}
                          {usaPnp && <td style={{ padding: '7px 14px', color: TEXT_MID }}>{r.estado || '—'}</td>}
                          <td style={{ padding: '7px 14px', color: TEXT_MID }}>{r.turno || '—'}</td>
                          <td style={{ padding: '7px 14px', color: TEXT_MID, whiteSpace: 'nowrap' }}>{r.fecha || '—'}</td>
                          <td style={{ padding: '7px 14px', color: TEXT_LIGHT, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion || '—'}</td>
                        </tr>
                      ))}
                      {totalIncidencias === 0 && (
                        <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: TEXT_LIGHT }}>
                          <AlertTriangle size={20} style={{ marginBottom: 6, opacity: 0.5 }} />
                          <div>Sin incidencias para los filtros seleccionados</div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ════ MODO CLUSTERS ════ */}
          {rawData && !loading && modo === 'clusters' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Total clusters',    value: clusters.length, color: PRIMARY },
                  { label: 'Total incidencias', value: clusters.reduce((s, c) => s + c.cantidad, 0).toLocaleString('es-PE'), color: '#16a34a' },
                  { label: 'Radio usado',       value: `${radio} m`, color: '#f97316' },
                  { label: 'Fuente',            value: fuenteLabel, color: '#7c3aed', small: true },
                ].map((k, i) => (
                  <div key={i} style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: k.small ? 14 : 26, fontWeight: 700, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>Clusters detectados — radio {radio} m</span>
                  <button
                    onClick={() => generarExcelClusters(clusters, { ...excelMeta, radio })}
                    disabled={clusters.length === 0}
                    style={{ ...btnSt('#16a34a'), padding: '7px 16px', opacity: clusters.length === 0 ? 0.5 : 1 }}>
                    <FileDown size={15} /> Descargar Excel
                  </button>
                </div>

                {clusters.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: TEXT_LIGHT }}>
                    <ScatterChart size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <div style={{ fontSize: 13 }}>No se formaron clusters con el radio seleccionado.<br />Intenta aumentar el radio.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr>
                        {['#', 'Jurisdicción principal', 'Incidencias', ...(mixto ? ['Fuentes'] : []), 'Radio real (m)', 'Tipos de incidencia'].map(h => (
                          <th key={h} style={{ ...thSt(h === 'Incidencias' || h === 'Radio real (m)' ? 'center' : 'left'), padding: '9px 14px', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {clusters.map((cl, i) => {
                          const jurP  = sortDesc(countBy(cl.puntos, p => p.jurisdiccion || 'Sin datos'))[0]?.[0] || '—';
                          const tipos = sortDesc(countBy(cl.puntos, p => p.Tipo || '—'));
                          const fnts  = sortDesc(countBy(cl.puntos, p => p.fuente || '—'));
                          const intensidad = cl.cantidad <= 3 ? { bg: '#fef3c7', color: '#92400e' } : cl.cantidad <= 6 ? { bg: '#fee2e2', color: '#991b1b' } : { bg: '#fde8d8', color: '#9a3412' };
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--theme-border-2)' }} {...hoverRow}>
                              <td style={{ padding: '9px 14px', fontWeight: 700, color: TEXT_DARK }}>{i + 1}</td>
                              <td style={{ padding: '9px 14px', color: TEXT_MID }}>{jurP}</td>
                              <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                                <span style={{ background: intensidad.bg, color: intensidad.color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{cl.cantidad}</span>
                              </td>
                              {mixto && (
                                <td style={{ padding: '9px 14px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {fnts.map(([f, n]) => (
                                      <span key={f} style={{ background: `${FUENTE_COLOR[f] || '#94a3b8'}14`, color: FUENTE_COLOR[f] || '#64748b', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {f} ×{n}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              )}
                              <td style={{ padding: '9px 14px', textAlign: 'center', color: TEXT_MID, fontFamily: 'monospace' }}>{Math.round(cl.radio)}</td>
                              <td style={{ padding: '9px 14px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {tipos.map(([t, n]) => (
                                    <span key={t} style={{ background: `${PRIMARY}12`, color: PRIMARY, borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {t} ×{n}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {clusters.length > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: TEXT_MID }}>
                  💡 <b>Tip:</b> Ajusta el slider de radio en los filtros para ver cómo cambian los clusters en tiempo real.
                  {mixto && ' Con la fuente «Ambas», un cluster puede mezclar incidencias de Serenazgo y PNP en el mismo punto.'}
                  {' '}El Excel se descarga con el radio y configuración actuales.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default ReporteIncidencias;
