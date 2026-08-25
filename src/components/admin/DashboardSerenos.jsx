import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, AlertTriangle, Users,
  Activity, BarChart2, Sun, CalendarDays, RefreshCw,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

// ── Design tokens ─────────────────────────────────────────────────────────────
const PRIMARY    = '#1d4ed8';
const BG         = 'var(--theme-bg)';
const CARD       = 'var(--theme-surface)';
const BORDER     = '1px solid var(--theme-border)';
const SHADOW     = 'var(--theme-shadow)';
const RADIUS     = 14;
const TEXT_DARK  = 'var(--theme-text)';
const TEXT_MID   = 'var(--theme-text-3)';
const TEXT_LIGHT = 'var(--theme-text-4)';

const SHIFT_COLORS = { MORNING: '#f59e0b', AFTERNOON: '#3b82f6', NIGHT: '#7c3aed' };
const SHIFT_LABELS = { MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche' };
const TYPE_PALETTE = ['#1d4ed8','#ef4444','#f59e0b','#22c55e','#8b5cf6','#ec4899','#06b6d4','#f97316'];

const JUR_NAMES = {
  1: 'Caja de Agua', 2: 'Zárate', 3: 'Huayrona', 4: 'Canto Rey',
  5: 'Santa Elizabeth', 6: 'Bayóvar', 7: 'Mariscal Cáceres', 8: '10 de Octubre',
};

const normalizeShift = v => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s === '1' || s === 'MORNING' || s === 'MANANA' || s === 'TURNO MANANA') return 'MORNING';
  if (s === '2' || s === 'AFTERNOON' || s === 'TARDE' || s === 'TURNO TARDE') return 'AFTERNOON';
  if (s === '3' || s === 'NIGHT' || s === 'NOCHE' || s === 'TURNO NOCHE') return 'NIGHT';
  return null;
};

const TIPOS = [
  // ── Robo (tipo 3 — subtipo por subtipo) ───────────────────────────────────
  { tipo: 3, subtype: 10, nombre: 'Robo a Personas',    grupo: 'Robo' },
  { tipo: 3, subtype: 11, nombre: 'Robo Casa Habitada', grupo: 'Robo' },
  { tipo: 3, subtype: 12, nombre: 'Robo de Ganado',     grupo: 'Robo' },
  { tipo: 3, subtype: 13, nombre: 'Robo a Empresas',    grupo: 'Robo' },
  { tipo: 3, subtype: 14, nombre: 'Robo de Vehículos',  grupo: 'Robo' },
  { tipo: 3, subtype: 15, nombre: 'Robo de Autopartes', grupo: 'Robo' },
  { tipo: 3, subtype: 16, nombre: 'Robo a Pasajeros',   grupo: 'Robo' },
  { tipo: 3, subtype: 17, nombre: 'Daños',              grupo: 'Robo' },
  { tipo: 3, subtype: 18, nombre: 'Hurto a Personas',   grupo: 'Robo' },
  { tipo: 3, subtype: 19, nombre: 'Hurto Casa Habitada',grupo: 'Robo' },
  { tipo: 3, subtype: 20, nombre: 'Hurto de Ganado',    grupo: 'Robo' },
  { tipo: 3, subtype: 21, nombre: 'Hurto a Empresas',   grupo: 'Robo' },
  { tipo: 3, subtype: 22, nombre: 'Hurto de Vehículos', grupo: 'Robo' },
  { tipo: 3, subtype: 23, nombre: 'Hurto a Pasajeros',  grupo: 'Robo' },
  // ── Otros tipos ───────────────────────────────────────────────────────────
  { tipo: 3, subtype: 24, nombre: 'Extorsión',   grupo: null },
  { tipo: 1, subtype: 1,  nombre: 'Homicidio',   grupo: null },
  { tipo: 1, subtype: 2,  nombre: 'Feminicidio', grupo: null },
  { tipo: 1, subtype: 3,  nombre: 'Sicariato',   grupo: null },
  { tipo: 2, subtype: 6,  nombre: 'Secuestro',   grupo: null },
  { tipo: 5, subtype: 28, nombre: 'Drogas',      grupo: null },
  { tipo: 7, subtype: 31, nombre: 'Barras',      grupo: null },
];

const ROBO_SUBTIPOS  = TIPOS.filter(t => t.grupo === 'Robo').map(t => t.nombre);
const NON_ROBO_TIPOS = TIPOS.filter(t => !t.grupo);

// Azules para robos, naranja para daños, morados para hurtos
const ROBO_PALETTE = [
  '#1e3a8a','#1d4ed8','#2563eb','#3b82f6','#0ea5e9','#0284c7','#0369a1',
  '#f97316',
  '#7c3aed','#6d28d9','#8b5cf6','#a78bfa','#9333ea','#7e22ce',
];

const fmt = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDefault = () => {
  const end = new Date(); const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: fmt(start), end: fmt(end) };
};

const fillDates = (start, end, map) => {
  const result = [];
  const cur = new Date(`${start}T00:00:00`);
  const endD = new Date(`${end}T00:00:00`);
  while (cur <= endD) {
    const key = fmt(cur);
    result.push({ date: key.slice(5).replace('-', '/'), count: map[key] || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
};

const QUICK = [
  { label: 'Hoy',    fn: () => { const t = fmt(new Date()); return { start: t, end: t }; } },
  { label: 'Semana', fn: () => { const e = new Date(); const s = new Date(e); const day = s.getDay(); s.setDate(s.getDate() - (day === 0 ? 6 : day - 1)); return { start: fmt(s), end: fmt(e) }; } },
  { label: 'Mes',    fn: () => { const n = new Date(); return { start: fmt(new Date(n.getFullYear(), n.getMonth(), 1)), end: fmt(n) }; } },
  { label: '30 días', fn: () => { const e = new Date(); const s = new Date(e); s.setDate(s.getDate() - 29); return { start: fmt(s), end: fmt(e) }; } },
];

const fetchAllSerenos = async (start, end) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const endISO = `${end}T23:59:59`;

  const results = await Promise.allSettled(
    TIPOS.map(async ({ tipo, subtype, nombre }) => {
      const params = new URLSearchParams({ type: tipo, start, end: endISO, page: 0, limit: 5000 });
      if (subtype) params.set('subtype', subtype);
      const res  = await fetch(`${API_URL}incidence?${params}`, { headers });
      const json = await res.json();
      const raw  = json.data?.data || [];
      return raw.map(item => ({
        id:           item.code || item.codigo_incidencia,
        tipo:         nombre,
        date:         (item.date || item.occurred_at || '').split('T')[0],
        shift:        normalizeShift(item.shift ?? item.Turno ?? item.turno ?? item.shift_id),
        jurisdiction: JUR_NAMES[item.jurisdiction] || JUR_NAMES[item.jurisdiction_id]
                      || item.jurisdiction || item.Jurisdiccion || 'Sin datos',
        description:  item.description || item.Descripcion || '',
        lat:          parseFloat(item.latitude  ?? item.Latitud),
        lng:          parseFloat(item.longitude ?? item.Longitud),
      })).filter(i => !isNaN(i.lat) && !isNaN(i.lng));
    })
  );

  const flat = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const seen = new Set();
  return flat.filter(i => {
    const key = i.id != null ? String(i.id) : `${i.lat.toFixed(6)},${i.lng.toFixed(6)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ── UI components ─────────────────────────────────────────────────────────────

const KpiCard = ({ title, value, icon: Icon, color, sub }) => (
  <div style={{
    background: CARD,
    borderRadius: RADIUS,
    border: BORDER,
    boxShadow: SHADOW,
    padding: '20px 22px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
    minWidth: 148,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 11, flexShrink: 0,
      background: `${color}14`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={22} color={color} strokeWidth={1.8} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: TEXT_DARK, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: TEXT_MID, marginTop: 4, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

const SectionCard = ({ title, children, style = {} }) => (
  <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, overflow: 'hidden', ...style }}>
    <div style={{
      padding: '14px 20px 12px',
      borderBottom: '1px solid #f1f5f9',
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, letterSpacing: '0.01em' }}>
        {title}
      </span>
    </div>
    <div style={{ padding: '16px 20px' }}>
      {children}
    </div>
  </div>
);

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: CARD, border: BORDER, borderRadius: 10, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
      <p style={{ margin: 0, fontWeight: 700, color: TEXT_DARK, fontSize: 12 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '3px 0 0', color: p.color || p.fill || PRIMARY, fontSize: 12 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// Tooltip para el gráfico apilado — filtra segmentos con valor 0
const StackedTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter(p => (p.value ?? 0) > 0);
  if (!visible.length) return null;
  const total = visible.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{ background: CARD, border: BORDER, borderRadius: 10, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxWidth: 240 }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, color: TEXT_DARK, fontSize: 12 }}>
        {label} — <strong>{total}</strong> casos
      </p>
      {visible.map((p, i) => (
        <p key={i} style={{ margin: '2px 0 0', color: p.fill || PRIMARY, fontSize: 11 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const pct  = (v, t) => t ? `${((v / t) * 100).toFixed(1)}% del total` : '—';
const fmtN = n => (n ?? 0).toLocaleString('es-PE');

// ── Dashboard ─────────────────────────────────────────────────────────────────
const DashboardSerenos = () => {
  const [incidents, setIncidents]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [range, setRange]           = useState(getDefault());
  const [activeQ, setActiveQ]       = useState('30 días');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showRoboDetail, setShowRoboDetail] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try { setIncidents(await fetchAllSerenos(range.start, range.end)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setLastUpdated(new Date()); }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = useMemo(() => {
    const total     = incidents.length;
    const morning   = incidents.filter(i => i.shift === 'MORNING').length;
    const afternoon = incidents.filter(i => i.shift === 'AFTERNOON').length;
    const night     = incidents.filter(i => i.shift === 'NIGHT').length;
    const today     = incidents.filter(i => i.date === fmt(new Date())).length;
    return { total, morning, afternoon, night, today };
  }, [incidents]);

  const trend = useMemo(() => {
    const map = {};
    incidents.forEach(i => { if (i.date) map[i.date] = (map[i.date] || 0) + 1; });
    return fillDates(range.start, range.end, map);
  }, [incidents, range]);

  const byType = useMemo(() => {
    const map = {};
    incidents.forEach(i => { map[i.tipo] = (map[i.tipo] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [incidents]);

  const byJur = useMemo(() => {
    const map = {};
    incidents.forEach(i => { const j = i.jurisdiction || 'Sin datos'; map[j] = (map[j] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [incidents]);

  const sinTurno = useMemo(() => incidents.filter(i => !i.shift).length, [incidents]);

  const byShift = useMemo(() => {
    const arr = [
      { name: 'Mañana',    value: kpis.morning,   color: '#f59e0b' },
      { name: 'Tarde',     value: kpis.afternoon, color: '#3b82f6' },
      { name: 'Noche',     value: kpis.night,     color: '#7c3aed' },
      { name: 'Sin turno', value: sinTurno,        color: '#d1d5db' },
    ];
    return arr.filter(i => i.value > 0);
  }, [kpis, sinTurno]);

  const byTypeForBar = useMemo(() =>
    byType.map((t, i) => ({ ...t, fill: TYPE_PALETTE[i % TYPE_PALETTE.length] })),
    [byType]);

  // Gráfico principal: Robo como una sola barra (total), resto igual
  const mainChartData = useMemo(() => {
    const counts = {};
    incidents.forEach(i => { counts[i.tipo] = (counts[i.tipo] || 0) + 1; });

    const roboTotal = ROBO_SUBTIPOS.reduce((s, k) => s + (counts[k] || 0), 0);
    const roboEntry = { name: 'Robo', count: roboTotal, fill: PRIMARY, isRobo: true };

    const others = NON_ROBO_TIPOS
      .map((t, i) => ({ name: t.nombre, count: counts[t.nombre] || 0, fill: TYPE_PALETTE[(i + 1) % TYPE_PALETTE.length], isRobo: false }))
      .filter(r => r.count > 0);

    return [roboEntry, ...others].sort((a, b) => b.count - a.count);
  }, [incidents]);

  // Desglose de subtipos de Robo para el panel expandible
  const roboBreakdown = useMemo(() => {
    const counts = {};
    incidents.forEach(i => { counts[i.tipo] = (counts[i.tipo] || 0) + 1; });
    return ROBO_SUBTIPOS
      .map((s, i) => ({ name: s, count: counts[s] || 0, fill: ROBO_PALETTE[i] }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  // Nº de categorías principales activas (Robo cuenta como 1)
  const tiposActivosCount = useMemo(() => {
    const seen = new Set(incidents.map(i => {
      const t = TIPOS.find(t => t.nombre === i.tipo);
      return t?.grupo || i.tipo;
    }));
    return seen.size;
  }, [incidents]);

  const recent = useMemo(() =>
    [...incidents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [incidents]);

  const qBtnStyle = active => ({
    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    transition: 'all 0.15s',
    border: `1px solid ${active ? PRIMARY : '#e2e8f0'}`,
    background: active ? PRIMARY : CARD,
    color: active ? 'white' : TEXT_MID,
    lineHeight: 1,
  });

  const inputStyle = {
    padding: '6px 10px', borderRadius: 8, border: BORDER,
    background: CARD, color: TEXT_DARK, fontSize: 12, outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ background: BG, minHeight: '100vh' }}>

      {/* ── Barra de filtros ── */}
      <div style={{
        background: CARD, borderBottom: BORDER, padding: '10px 28px',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <CalendarDays size={15} color={TEXT_LIGHT} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 500 }}>Desde</span>
        <input type="date" value={range.start} style={inputStyle}
          onChange={e => { setRange(p => ({ ...p, start: e.target.value })); setActiveQ(''); }} />
        <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 500 }}>Hasta</span>
        <input type="date" value={range.end} style={inputStyle}
          onChange={e => { setRange(p => ({ ...p, end: e.target.value })); setActiveQ(''); }} />
        <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
          {QUICK.map(q => (
            <button key={q.label} style={qBtnStyle(activeQ === q.label)}
              onClick={() => { setActiveQ(q.label); setRange(q.fn()); }}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Refresh + timestamp — empujados a la derecha */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 500 }}>
              Actualizado: {lastUpdated.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchData} disabled={loading}
            title="Actualizar datos"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8, border: BORDER,
              background: CARD, cursor: loading ? 'not-allowed' : 'pointer',
              color: TEXT_MID, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = BG; }}
            onMouseLeave={e => { e.currentTarget.style.background = CARD; }}
          >
            <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? 'spin 0.9s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div style={{ padding: '24px 28px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '11px 16px', marginBottom: 20, color: '#991b1b', fontWeight: 500, fontSize: 13 }}>
            Error al cargar datos: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: TEXT_LIGHT }}>
            <div style={{
              width: 40, height: 40, border: `3px solid ${PRIMARY}20`, borderTop: `3px solid ${PRIMARY}`,
              borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px',
            }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_MID }}>Cargando datos de incidencias…</div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <KpiCard title="Total Incidencias"  value={fmtN(kpis.total)}     icon={BarChart2}     color={PRIMARY} />
              <KpiCard title="Turno Mañana"        value={fmtN(kpis.morning)}   icon={Sun}           color="#f59e0b" sub={pct(kpis.morning, kpis.total)} />
              <KpiCard title="Turno Tarde"         value={fmtN(kpis.afternoon)} icon={Activity}      color="#3b82f6" sub={pct(kpis.afternoon, kpis.total)} />
              <KpiCard title="Turno Noche"         value={fmtN(kpis.night)}     icon={Users}         color="#7c3aed" sub={pct(kpis.night, kpis.total)} />
              <KpiCard title="Registradas Hoy"     value={fmtN(kpis.today)}     icon={TrendingUp}    color="#22c55e" />
              <KpiCard title="Tipos Registrados"   value={fmtN(tiposActivosCount)}  icon={AlertTriangle} color="#06b6d4" />
            </div>

            {/* Tendencia — ancho completo */}
            <SectionCard title="Tendencia Diaria de Incidencias" style={{ marginBottom: 16 }}>
              <ResponsiveContainer debounce={50} width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 18, left: -14 }}>
                  <defs>
                    <linearGradient id="gradSer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PRIMARY} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: TEXT_LIGHT }} interval={0} angle={-55} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 10, fill: TEXT_LIGHT }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" name="Incidencias"
                    stroke={PRIMARY} fill="url(#gradSer)" strokeWidth={2}
                    dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: PRIMARY }} />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Turno + Tipo + Jurisdicción — 3 columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <SectionCard title="Distribución por Turno">
                <ResponsiveContainer debounce={50} width="100%" height={280}>
                  <PieChart>
                    <Pie data={byShift} cx="50%" cy="40%" innerRadius={52} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={3}>
                      {byShift.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: BORDER, fontSize: 12 }} />
                    <Legend formatter={v => <span style={{ fontSize: 11, color: TEXT_MID }}>{v}</span>} iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard
                title={
                  showRoboDetail ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setShowRoboDetail(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: `${PRIMARY}12`, border: 'none', borderRadius: 6,
                          cursor: 'pointer', padding: '3px 8px', color: PRIMARY,
                          fontSize: 11, fontWeight: 700,
                        }}
                      >
                        ← Volver
                      </button>
                      <span>Desglose — Robos / Hurtos / Daños</span>
                    </div>
                  ) : 'Incidencias por Tipo de Delito'
                }
              >
                {!showRoboDetail ? (
                  <ResponsiveContainer debounce={50} width="100%" height={280}>
                    <BarChart data={mainChartData} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: TEXT_LIGHT }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 11, fill: TEXT_MID }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div style={{ background: CARD, border: BORDER, borderRadius: 10, padding: '9px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
                              <p style={{ margin: 0, fontWeight: 700, color: TEXT_DARK, fontSize: 12 }}>{label}</p>
                              <p style={{ margin: '3px 0 0', color: payload[0].fill || PRIMARY, fontSize: 12 }}>
                                Casos: <strong>{payload[0].value}</strong>
                              </p>
                              {payload[0]?.payload?.isRobo && (
                                <p style={{ margin: '5px 0 0', color: TEXT_LIGHT, fontSize: 10 }}>Clic para ver desglose</p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" name="Casos" radius={[0, 5, 5, 0]} cursor="pointer"
                        onClick={data => { if (data?.isRobo) setShowRoboDetail(true); }}>
                        {mainChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer debounce={50} width="100%" height={280}>
                    <BarChart
                      data={roboBreakdown}
                      layout="vertical"
                      margin={{ top: 2, right: 48, bottom: 2, left: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: TEXT_LIGHT }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: TEXT_MID }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="count" name="Casos" radius={[0, 5, 5, 0]}
                        label={{ position: 'right', fontSize: 11, fontWeight: 700, fill: TEXT_MID }}>
                        {roboBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              <SectionCard title="Incidencias por Jurisdicción">
                <ResponsiveContainer debounce={50} width="100%" height={280}>
                  <BarChart data={byJur} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: TEXT_LIGHT }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: TEXT_MID }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Casos" fill={PRIMARY} radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {/* Tabla */}
            <SectionCard title="Últimas Incidencias Registradas">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Código', 'Tipo', 'Jurisdicción', 'Turno', 'Descripción', 'Fecha'].map(h => (
                        <th key={h} style={{
                          padding: '9px 14px', textAlign: 'left', fontWeight: 600, fontSize: 10,
                          color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em',
                          whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((inc, i) => (
                      <tr key={`${inc.id}-${i}`}
                        style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 700, color: PRIMARY, fontSize: 11 }}>
                          {inc.id || `#${i + 1}`}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: `${TYPE_PALETTE[TIPOS.findIndex(t => t.nombre === inc.tipo) % TYPE_PALETTE.length]}14`,
                            color: TYPE_PALETTE[TIPOS.findIndex(t => t.nombre === inc.tipo) % TYPE_PALETTE.length],
                          }}>
                            {inc.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', color: TEXT_MID }}>{inc.jurisdiction}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: `${SHIFT_COLORS[inc.shift] || '#9ca3af'}14`,
                            color: SHIFT_COLORS[inc.shift] || TEXT_LIGHT,
                          }}>
                            {SHIFT_LABELS[inc.shift] || inc.shift || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', color: TEXT_LIGHT, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inc.description || '—'}
                        </td>
                        <td style={{ padding: '9px 14px', color: TEXT_MID, fontSize: 11, whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {inc.date || '—'}
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: TEXT_LIGHT, fontSize: 13 }}>
                          No hay incidencias en el período seleccionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Footer */}
            <div style={{ marginTop: 16, textAlign: 'right', fontSize: 11, color: TEXT_LIGHT }}>
              Municipalidad Distrital de San Juan de Lurigancho &nbsp;·&nbsp; CECOM — Sistema de Gestión de Seguridad Ciudadana
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DashboardSerenos;
