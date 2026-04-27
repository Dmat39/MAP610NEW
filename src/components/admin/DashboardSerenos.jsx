import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ShieldCheck, TrendingUp, AlertTriangle, Users,
  Activity, RefreshCw, BarChart2, Sun, Sunset, Moon,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

// ── Tokens de diseño ──────────────────────────────────────────────────────────
const PRIMARY    = '#1d4ed8';   // azul municipal
const PRIMARY_LT = '#eff6ff';   // fondo suave del acento
const BG         = '#f1f5f9';   // fondo de página
const CARD       = 'white';
const BORDER     = '1px solid #e2e8f0';
const SHADOW     = '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)';
const RADIUS     = 12;
const TEXT_DARK  = '#0f172a';
const TEXT_MID   = '#475569';
const TEXT_LIGHT = '#94a3b8';

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
  { tipo: 3, subtype: 24,   nombre: 'Extorsión' },
  { tipo: 3, subtype: null, nombre: 'Robo' },
  { tipo: 1, subtype: 1,    nombre: 'Homicidio' },
  { tipo: 1, subtype: 2,    nombre: 'Feminicidio' },
  { tipo: 1, subtype: 3,    nombre: 'Sicariato' },
  { tipo: 2, subtype: 6,    nombre: 'Secuestro' },
  { tipo: 5, subtype: 28,   nombre: 'Drogas' },
  { tipo: 7, subtype: 31,   nombre: 'Barras' },
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

// ── Componentes de UI ─────────────────────────────────────────────────────────

const KpiCard = ({ title, value, icon: Icon, color, sub }) => (
  <div style={{
    background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW,
    padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16,
    flex: 1, minWidth: 155, borderLeft: `4px solid ${color}`,
  }}>
    <div style={{
      background: `${color}14`, padding: 12, borderRadius: 10, flexShrink: 0,
      border: `1px solid ${color}22`,
    }}>
      <Icon size={24} color={color} strokeWidth={2} />
    </div>
    <div>
      <div style={{ fontSize: 36, fontWeight: 800, color: TEXT_DARK, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: TEXT_MID, marginTop: 5, fontWeight: 500 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 3, fontWeight: 700 }}>{sub}</div>}
    </div>
  </div>
);

const Section = ({ title, children, style = {} }) => (
  <div style={{ background: CARD, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, overflow: 'hidden', ...style }}>
    <div style={{
      padding: '14px 20px', borderBottom: `1px solid ${BG}`,
      fontSize: 14, fontWeight: 700, color: TEXT_DARK,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {title}
    </div>
    <div style={{ padding: '18px 20px' }}>
      {children}
    </div>
  </div>
);

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: CARD, border: BORDER, borderRadius: 10, padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
      <p style={{ margin: 0, fontWeight: 700, color: TEXT_DARK, fontSize: 13 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '4px 0 0', color: p.color || p.fill || PRIMARY, fontSize: 13 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const pct = (v, t) => t ? `${((v / t) * 100).toFixed(1)}% del total` : '—';

// ── Dashboard ─────────────────────────────────────────────────────────────────
const DashboardSerenos = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [range, setRange]         = useState(getDefault);
  const [activeQ, setActiveQ]     = useState('30 días');

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try { setIncidents(await fetchAllSerenos(range.start, range.end)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
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
      { name: 'Sin turno', value: sinTurno,        color: '#94a3b8' },
    ];
    return arr.filter(i => i.value > 0);
  }, [kpis, sinTurno]);

  const byTypeForBar = useMemo(() =>
    byType.map((t, i) => ({ ...t, fill: TYPE_PALETTE[i % TYPE_PALETTE.length] })),
    [byType]);

  const recent = useMemo(() =>
    [...incidents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [incidents]);

  const qBtnStyle = active => ({
    padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    transition: 'all 0.15s',
    border: `1px solid ${active ? PRIMARY : '#e2e8f0'}`,
    background: active ? PRIMARY : CARD,
    color: active ? 'white' : TEXT_MID,
  });

  const inputStyle = {
    padding: '7px 11px', borderRadius: 7, border: BORDER,
    background: CARD, color: TEXT_DARK, fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: CARD, borderBottom: BORDER, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* Franja de color superior */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${PRIMARY} 0%, #3b82f6 100%)` }} />

        <div style={{ padding: '20px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {/* Logo + Título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: PRIMARY_LT, border: `2px solid ${PRIMARY}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ShieldCheck size={28} color={PRIMARY} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, letterSpacing: '-0.4px' }}>
                Panel de Control — Incidencias Serenazgo
              </div>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 3, fontWeight: 500 }}>
                Municipalidad de San Juan de Lurigancho &nbsp;·&nbsp; CECOM &nbsp;·&nbsp; Sistema de Gestión de Seguridad
              </div>
            </div>
          </div>

          {/* Filtros — una sola fila */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 500 }}>Desde</span>
            <input type="date" value={range.start} style={inputStyle}
              onChange={e => { setRange(p => ({ ...p, start: e.target.value })); setActiveQ(''); }} />
            <span style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: 500 }}>Hasta</span>
            <input type="date" value={range.end} style={inputStyle}
              onChange={e => { setRange(p => ({ ...p, end: e.target.value })); setActiveQ(''); }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {QUICK.map(q => (
                <button key={q.label} style={qBtnStyle(activeQ === q.label)}
                  onClick={() => { setActiveQ(q.label); setRange(q.fn()); }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div style={{ padding: '28px 36px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '13px 18px', marginBottom: 22, color: '#991b1b', fontWeight: 500 }}>
            ⚠ Error al cargar datos: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: TEXT_LIGHT }}>
            <div style={{ width: 44, height: 44, border: `3px solid ${PRIMARY}`, borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: TEXT_MID }}>Cargando datos de incidencias...</div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard title="Total Incidencias"  value={kpis.total}     icon={BarChart2}   color={PRIMARY} />
              <KpiCard title="Turno Mañana"        value={kpis.morning}   icon={Sun}         color="#f59e0b" sub={pct(kpis.morning, kpis.total)} />
              <KpiCard title="Turno Tarde"         value={kpis.afternoon} icon={Activity}    color="#3b82f6" sub={pct(kpis.afternoon, kpis.total)} />
              <KpiCard title="Turno Noche"         value={kpis.night}     icon={Users}       color="#7c3aed" sub={pct(kpis.night, kpis.total)} />
              <KpiCard title="Registradas Hoy"     value={kpis.today}     icon={TrendingUp}  color="#22c55e" />
              <KpiCard title="Tipos Registrados"   value={byType.length}  icon={AlertTriangle} color="#06b6d4" />
            </div>

            {/* Tendencia + Turno */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <Section title="📈 Tendencia Diaria de Incidencias">
                <ResponsiveContainer debounce={50} width="100%" height={240}>
                  <AreaChart data={trend} margin={{ top: 5, right: 10, bottom: 20, left: -10 }}>
                    <defs>
                      <linearGradient id="gradSer" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PRIMARY} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: TEXT_LIGHT }} interval={0} angle={-55} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: TEXT_LIGHT }} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="count" name="Incidencias"
                      stroke={PRIMARY} fill="url(#gradSer)" strokeWidth={2.5}
                      dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: PRIMARY }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>

              <Section title="🌅 Distribución por Turno">
                <ResponsiveContainer debounce={50} width="100%" height={240}>
                  <PieChart>
                    <Pie data={byShift} cx="50%" cy="45%" innerRadius={56} outerRadius={84}
                      dataKey="value" nameKey="name" paddingAngle={4}>
                      {byShift.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: BORDER }} />
                    <Legend formatter={v => <span style={{ fontSize: 12, color: TEXT_MID }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Tipo + Jurisdicción */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Section title="🔍 Incidencias por Tipo de Delito">
                <ResponsiveContainer debounce={50} width="100%" height={300}>
                  <BarChart data={byTypeForBar} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: TEXT_LIGHT }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: TEXT_MID }} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Casos" radius={[0, 6, 6, 0]}>
                      {byTypeForBar.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="📍 Incidencias por Jurisdicción">
                <ResponsiveContainer debounce={50} width="100%" height={300}>
                  <BarChart data={byJur} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: TEXT_LIGHT }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: TEXT_MID }} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Casos" fill={PRIMARY} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Tabla */}
            <Section title="📋 Últimas Incidencias Registradas">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: BG }}>
                      {['Código', 'Tipo de Incidencia', 'Jurisdicción', 'Turno', 'Descripción', 'Fecha'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: TEXT_MID, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', borderBottom: `2px solid #e2e8f0`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((inc, i) => (
                      <tr key={`${inc.id}-${i}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: PRIMARY, fontSize: 12 }}>
                          {inc.id || `#${i + 1}`}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: `${TYPE_PALETTE[TIPOS.findIndex(t => t.nombre === inc.tipo) % TYPE_PALETTE.length]}18`,
                            color: TYPE_PALETTE[TIPOS.findIndex(t => t.nombre === inc.tipo) % TYPE_PALETTE.length],
                            border: `1px solid ${TYPE_PALETTE[TIPOS.findIndex(t => t.nombre === inc.tipo) % TYPE_PALETTE.length]}30`,
                          }}>
                            {inc.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: TEXT_MID }}>{inc.jurisdiction}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: `${SHIFT_COLORS[inc.shift] || '#94a3b8'}18`,
                            color: SHIFT_COLORS[inc.shift] || TEXT_LIGHT,
                            border: `1px solid ${SHIFT_COLORS[inc.shift] || '#94a3b8'}30`,
                          }}>
                            {SHIFT_LABELS[inc.shift] || inc.shift || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: TEXT_LIGHT, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inc.description || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: TEXT_MID, fontSize: 12, whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {inc.date || '—'}
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: TEXT_LIGHT, fontSize: 15 }}>
                          No hay incidencias en el período seleccionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Footer */}
            <div style={{ marginTop: 20, textAlign: 'right', fontSize: 11, color: TEXT_LIGHT }}>
              Municipalidad Distrital de San Juan de Lurigancho &nbsp;·&nbsp; CECOM — Sistema de Gestión de Seguridad Ciudadana
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DashboardSerenos;
