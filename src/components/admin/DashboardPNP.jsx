import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Shield, TrendingUp, AlertTriangle, CheckCircle, Clock,
  FileText, RefreshCw, BarChart2,
} from 'lucide-react';
import pnpIncidenceService from '../../services/pnpIncidenceService';

// ── Tokens de diseño ──────────────────────────────────────────────────────────
const PRIMARY    = '#1e3a5f';   // azul marino PNP
const PRIMARY_LT = '#eff6ff';
const ACCENT     = '#2563eb';
const BG         = '#f1f5f9';
const CARD       = 'white';
const BORDER     = '1px solid #e2e8f0';
const SHADOW     = '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)';
const RADIUS     = 12;
const TEXT_DARK  = '#0f172a';
const TEXT_MID   = '#475569';
const TEXT_LIGHT = '#94a3b8';

const STATUS_COLORS = { INVESTIGATING: '#ef4444', REFERRED: '#f59e0b', CLOSED: '#22c55e' };
const STATUS_LABELS = { INVESTIGATING: 'Investigando', REFERRED: 'Derivado', CLOSED: 'Cerrado' };
const SHIFT_COLORS  = { MORNING: '#f59e0b', AFTERNOON: '#3b82f6', NIGHT: '#7c3aed' };
const SHIFT_LABELS  = { MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche' };
const TYPE_PALETTE  = ['#1e3a5f','#ef4444','#f59e0b','#22c55e','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#14b8a6'];

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
        <p key={i} style={{ margin: '4px 0 0', color: p.color || p.fill || ACCENT, fontSize: 13 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const pct = (v, t) => t ? `${((v / t) * 100).toFixed(1)}% del total` : '—';

// ── Dashboard ─────────────────────────────────────────────────────────────────
const DashboardPNP = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [range, setRange]         = useState(getDefault);
  const [activeQ, setActiveQ]     = useState('30 días');

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await pnpIncidenceService.getAll({ ...range, page: 0, limit: 5000 });
      setIncidents(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = useMemo(() => {
    const total         = incidents.length;
    const investigating = incidents.filter(i => i.case_status === 'INVESTIGATING').length;
    const referred      = incidents.filter(i => i.case_status === 'REFERRED').length;
    const closed        = incidents.filter(i => i.case_status === 'CLOSED').length;
    const withComplaint = incidents.filter(i => i.complaint_number).length;
    const today         = incidents.filter(i => i.occurred_at?.startsWith(fmt(new Date()))).length;
    return { total, investigating, referred, closed, withComplaint, today };
  }, [incidents]);

  const trend = useMemo(() => {
    const map = {};
    incidents.forEach(i => { const d = i.occurred_at?.split('T')[0]; if (d) map[d] = (map[d] || 0) + 1; });
    return fillDates(range.start, range.end, map);
  }, [incidents, range]);

  const byType = useMemo(() => {
    const map = {};
    incidents.forEach(i => { const t = i.incidence_type || 'Otros'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [incidents]);

  const byJur = useMemo(() => {
    const map = {};
    incidents.forEach(i => { const j = i.jurisdiction || 'Sin datos'; map[j] = (map[j] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [incidents]);

  const byShift = useMemo(() =>
    ['MORNING', 'AFTERNOON', 'NIGHT']
      .map(k => ({ name: SHIFT_LABELS[k], value: incidents.filter(i => i.shift === k).length, color: SHIFT_COLORS[k] }))
      .filter(i => i.value > 0),
    [incidents]);

  const byStatus = useMemo(() =>
    ['INVESTIGATING', 'REFERRED', 'CLOSED']
      .map(k => ({ name: STATUS_LABELS[k], value: incidents.filter(i => i.case_status === k).length, color: STATUS_COLORS[k] }))
      .filter(i => i.value > 0),
    [incidents]);

  const recent = useMemo(() =>
    [...incidents].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0, 10),
    [incidents]);

  const fmtDt = iso => iso ? new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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
        <div style={{ height: 5, background: `linear-gradient(90deg, ${PRIMARY} 0%, ${ACCENT} 100%)` }} />

        <div style={{ padding: '20px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {/* Logo + Título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: PRIMARY_LT, border: `2px solid ${PRIMARY}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={28} color={PRIMARY} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, letterSpacing: '-0.4px' }}>
                Panel de Control — Incidencias PNP
              </div>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 3, fontWeight: 500 }}>
                Policía Nacional del Perú &nbsp;·&nbsp; San Juan de Lurigancho &nbsp;·&nbsp; Sistema de Gestión de Seguridad
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
            <div style={{ fontSize: 15, fontWeight: 500, color: TEXT_MID }}>Cargando datos de incidencias PNP...</div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard title="Total Incidencias"  value={kpis.total}         icon={BarChart2}     color={PRIMARY} />
              <KpiCard title="Investigando"        value={kpis.investigating} icon={AlertTriangle}  color="#ef4444" sub={pct(kpis.investigating, kpis.total)} />
              <KpiCard title="Derivado"            value={kpis.referred}      icon={Clock}          color="#f59e0b" sub={pct(kpis.referred, kpis.total)} />
              <KpiCard title="Cerrado"             value={kpis.closed}        icon={CheckCircle}    color="#22c55e" sub={pct(kpis.closed, kpis.total)} />
              <KpiCard title="Con N° Denuncia"     value={kpis.withComplaint} icon={FileText}       color="#8b5cf6" />
              <KpiCard title="Registradas Hoy"     value={kpis.today}         icon={TrendingUp}     color="#06b6d4" />
            </div>

            {/* Tendencia + Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <Section title="📈 Tendencia Diaria de Incidencias">
                <ResponsiveContainer debounce={50} width="100%" height={240}>
                  <AreaChart data={trend} margin={{ top: 5, right: 10, bottom: 20, left: -10 }}>
                    <defs>
                      <linearGradient id="gradPNP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: TEXT_LIGHT }} interval={0} angle={-55} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: TEXT_LIGHT }} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="count" name="Incidencias"
                      stroke={ACCENT} fill="url(#gradPNP)" strokeWidth={2.5}
                      dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: ACCENT }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>

              <Section title="⚖️ Estado de Casos">
                <ResponsiveContainer debounce={50} width="100%" height={240}>
                  <PieChart>
                    <Pie data={byStatus} cx="50%" cy="45%" innerRadius={56} outerRadius={84}
                      dataKey="value" nameKey="name" paddingAngle={4}>
                      {byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: BORDER }} />
                    <Legend formatter={v => <span style={{ fontSize: 12, color: TEXT_MID }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Tipo + Jurisdicción + Turno */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Section title="🔍 Por Tipo de Incidencia">
                <ResponsiveContainer debounce={50} width="100%" height={280}>
                  <BarChart data={byType} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: TEXT_LIGHT }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={86} tick={{ fontSize: 11, fill: TEXT_MID }} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Casos" radius={[0, 6, 6, 0]}>
                      {byType.map((_, i) => <Cell key={i} fill={TYPE_PALETTE[i % TYPE_PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="📍 Por Jurisdicción">
                <ResponsiveContainer debounce={50} width="100%" height={280}>
                  <BarChart data={byJur} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: TEXT_LIGHT }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={86} tick={{ fontSize: 11, fill: TEXT_MID }} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Casos" fill={ACCENT} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="🌅 Distribución por Turno">
                <ResponsiveContainer debounce={50} width="100%" height={280}>
                  <PieChart>
                    <Pie data={byShift} cx="50%" cy="42%" innerRadius={54} outerRadius={82}
                      dataKey="value" nameKey="name" paddingAngle={4}
                      label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}>
                      {byShift.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 10, border: BORDER }} />
                    <Legend formatter={v => <span style={{ fontSize: 12, color: TEXT_MID }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Tabla */}
            <Section title="📋 Últimas Incidencias Registradas">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: BG }}>
                      {['N° Denuncia', 'Tipo', 'Jurisdicción', 'Comisaría', 'Turno', 'Estado', 'Fecha / Hora'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: TEXT_MID, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', borderBottom: `2px solid #e2e8f0`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((inc, i) => (
                      <tr key={inc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: PRIMARY, fontSize: 12 }}>
                          {inc.complaint_number || `#${inc.id}`}
                        </td>
                        <td style={{ padding: '10px 14px', color: TEXT_DARK, fontWeight: 500 }}>{inc.incidence_type}</td>
                        <td style={{ padding: '10px 14px', color: TEXT_MID }}>{inc.jurisdiction}</td>
                        <td style={{ padding: '10px 14px', color: TEXT_LIGHT, fontSize: 12 }}>{inc.police_station}</td>
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
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: `${STATUS_COLORS[inc.case_status] || '#94a3b8'}18`,
                            color: STATUS_COLORS[inc.case_status] || TEXT_LIGHT,
                            border: `1px solid ${STATUS_COLORS[inc.case_status] || '#94a3b8'}30`,
                          }}>
                            {STATUS_LABELS[inc.case_status] || inc.case_status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: TEXT_MID, fontSize: 12, whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {fmtDt(inc.occurred_at)}
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: TEXT_LIGHT, fontSize: 15 }}>
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
              Policía Nacional del Perú &nbsp;·&nbsp; San Juan de Lurigancho &nbsp;·&nbsp; Sistema de Gestión de Seguridad Ciudadana
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DashboardPNP;
