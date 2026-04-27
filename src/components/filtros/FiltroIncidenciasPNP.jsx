import { useState, useEffect } from 'react';
import { RotateCcw, Shield, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const TURNO_OPTIONS = [
  { value: 'MORNING',   label: 'Turno Mañana' },
  { value: 'AFTERNOON', label: 'Turno Tarde' },
  { value: 'NIGHT',     label: 'Turno Noche' },
];

const HORARIO_OPTIONS = [
  '00:00 - 01:59', '02:00 - 03:59', '04:00 - 05:59', '06:00 - 07:59',
  '08:00 - 09:59', '10:00 - 11:59', '12:00 - 13:59', '14:00 - 15:59',
  '16:00 - 17:59', '18:00 - 19:59', '20:00 - 21:59', '22:00 - 23:59',
];

const JURISDICCION_OPTIONS = [
  '10 de Octubre', 'Bayóvar', 'Caja de Agua', 'Canto Rey',
  'Huayrona', 'Mariscal Cáceres', 'Santa Elizabeth', 'Zárate',
];

const TIPO_CONFIG = [
  { event: 'pnpRoboAlPasoTotal',        label: 'Robo al paso',  color: '#e74c3c' },
  { event: 'pnpRoboAgravadoTotal',      label: 'Robo agrav.',   color: '#c0392b' },
  { event: 'pnpDrogasTotal',            label: 'Drogas',        color: '#8e44ad' },
  { event: 'pnpViolenciaFamiliarTotal', label: 'V. Familiar',   color: '#e67e22' },
  { event: 'pnpAccidenteTotal',         label: 'Accidente',     color: '#f39c12' },
  { event: 'pnpViolenciaSexualTotal',   label: 'V. Sexual',     color: '#d63031' },
  { event: 'pnpHomicidioTotal',         label: 'Homicidio',     color: '#2d3436' },
  { event: 'pnpLesionesTotal',          label: 'Lesiones',      color: '#e17055' },
  { event: 'pnpHurtoTotal',             label: 'Hurto',         color: '#b8860b' },
  { event: 'pnpOtrosTotal',             label: 'Otros',         color: '#636e72' },
];

const QUICK_OPTIONS = [
  { label: 'Hoy',        days: 0 },
  { label: 'Últ. 7d',   days: 6 },
  { label: 'Últ. 30d',  days: 29 },
  { label: 'Este mes',  days: null, thisMonth: true },
];

const fmt = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDefaultRange = () => {
  const today = new Date();
  const hace30 = new Date();
  hace30.setDate(today.getDate() - 30);
  return { startDate: hace30, endDate: today };
};

const FiltroIncidenciasPNP = ({ onFiltrar, onLimpiar }) => {
  const defaultRange = getDefaultRange();
  const [filtros, setFiltros] = useState({
    shift: '', jurisdiction: '', horario: '',
    start: fmt(defaultRange.startDate),
    end:   fmt(defaultRange.endDate),
  });
  const [contadores, setContadores] = useState(() =>
    Object.fromEntries(TIPO_CONFIG.map(t => [t.event, 0]))
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [dateRange, setDateRange] = useState([{ ...defaultRange, key: 'selection' }]);
  const [tempDateRange, setTempDateRange] = useState([{ ...defaultRange, key: 'selection' }]);

  const total = Object.values(contadores).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const handlers = TIPO_CONFIG.map(t => {
      const handler = e => setContadores(prev => ({ ...prev, [t.event]: e.detail }));
      window.addEventListener(t.event, handler);
      return { event: t.event, handler };
    });
    return () => handlers.forEach(({ event, handler }) => window.removeEventListener(event, handler));
  }, []);

  useEffect(() => {
    const handleClickOutside = e => {
      if (dateRangeOpen && !e.target.closest('.pnp-date-range-container')) {
        setDateRangeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dateRangeOpen]);

  useEffect(() => { onFiltrar(filtros); }, [filtros]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const applyDateFilter = () => {
    const range = tempDateRange[0];
    const start = range.startDate ? fmt(range.startDate) : '';
    const end   = range.endDate   ? fmt(range.endDate)   : '';
    setDateRange([...tempDateRange]);
    setFiltros(prev => ({ ...prev, start, end }));
    setDateRangeOpen(false);
  };

  const handleQuickSelect = opt => {
    const today = new Date();
    let startDate, endDate;
    if (opt.thisMonth) {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else {
      endDate   = today;
      startDate = new Date();
      startDate.setDate(today.getDate() - opt.days);
    }
    setTempDateRange([{ startDate, endDate, key: 'selection' }]);
  };

  const getDateText = () => {
    const r = dateRange[0];
    if (!r.startDate || !r.endDate) return 'Seleccionar fechas';
    const s = r.startDate.toLocaleDateString('es-ES');
    const e = r.endDate.toLocaleDateString('es-ES');
    return s === e ? s : `${s} — ${e}`;
  };

  const limpiar = () => {
    const def = getDefaultRange();
    setFiltros({ shift: '', jurisdiction: '', horario: '', start: fmt(def.startDate), end: fmt(def.endDate) });
    setDateRange([{ ...def, key: 'selection' }]);
    setTempDateRange([{ ...def, key: 'selection' }]);
    onLimpiar();
  };

  const selectStyle = {
    padding: '7px 10px',
    borderRadius: 8,
    border: '1.5px solid #e2e8f0',
    background: 'white',
    fontSize: 13,
    color: '#1f2937',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      width: '33vw', maxWidth: '420px', minWidth: '280px',
      backgroundColor: '#ffffff',
      borderRadius: 14,
      border: '1.5px solid #e2e8f0',
      borderTop: '4px solid #16a34a',
      boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      overflow: 'visible',
    }}>

      {/* Header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', userSelect: 'none',
          padding: '14px 18px',
          borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
        }}
        onClick={() => setIsCollapsed(p => !p)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#1f2937' }}>
          <Shield size={17} color="#16a34a" />
          Filtros Incidencias PNP
        </span>
        <button style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', padding: 6 }}>
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Contadores por tipo */}
          <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
              {TIPO_CONFIG.map(t => (
                <div key={t.event} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: '#ffffff', border: `1.5px solid ${t.color}55`,
                  borderRadius: 8, padding: '7px 4px', minHeight: 52, justifyContent: 'center',
                  borderTop: `3px solid ${t.color}`,
                }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>{contadores[t.event]}</div>
                  <div style={{ fontSize: '8px', textTransform: 'uppercase', marginTop: 3, color: '#6b7280', lineHeight: 1.2, textAlign: 'center' }}>
                    {t.label}
                  </div>
                </div>
              ))}
            </div>
            {/* Total */}
            <div style={{
              background: '#16a34a', borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <Shield size={18} color="white" />
              <span style={{ fontSize: 26, fontWeight: 700, color: 'white', lineHeight: 1 }}>{total}</span>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Total PNP</span>
            </div>
          </div>

          {/* Rango de fechas */}
          <div style={{ position: 'relative' }} className="pnp-date-range-container">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Rango de fechas
            </div>
            <button
              onClick={() => { if (!dateRangeOpen) setTempDateRange([...dateRange]); setDateRangeOpen(p => !p); }}
              style={{
                ...selectStyle,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', textAlign: 'left', padding: '9px 12px',
                border: dateRangeOpen ? '1.5px solid #16a34a' : '1.5px solid #e2e8f0',
                boxShadow: dateRangeOpen ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: '#1f2937' }}>{getDateText()}</span>
              <Calendar size={15} color="#6b7280" />
            </button>

            {dateRangeOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
                zIndex: 1500, backgroundColor: 'white',
                border: '1.5px solid #e2e8f0', borderRadius: 12,
                boxShadow: '0 12px 28px rgba(0,0,0,0.13)',
                width: 340, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Selección rápida
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {QUICK_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => handleQuickSelect(opt)}
                        style={{
                          fontSize: 11, padding: '5px 10px',
                          border: '1.5px solid #86efac', borderRadius: 6,
                          background: '#f0fdf4', cursor: 'pointer', color: '#15803d', fontWeight: 500,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden' }}>
                  <DateRange
                    editableDateInputs
                    onChange={r => setTempDateRange([r.selection])}
                    moveRangeOnFirstSelection={false}
                    ranges={tempDateRange}
                    maxDate={new Date()}
                    rangeColors={['#16a34a']}
                    months={1}
                    direction="horizontal"
                    showDateDisplay={false}
                  />
                </div>

                <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    onClick={() => setDateRangeOpen(false)}
                    style={{ fontSize: 12, padding: '8px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#374151', fontWeight: 500 }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={applyDateFilter}
                    style={{ fontSize: 12, padding: '8px 18px', border: 'none', borderRadius: 8, background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Selectores */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { name: 'shift',        label: 'Turno',        options: TURNO_OPTIONS },
              { name: 'horario',      label: 'Horario',      options: HORARIO_OPTIONS.map(o => ({ value: o, label: o })) },
              { name: 'jurisdiction', label: 'Jurisdicción', options: JURISDICCION_OPTIONS.map(o => ({ value: o, label: o })) },
            ].map(({ name, label, options }) => (
              <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 90, flex: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
                <select name={name} value={filtros[name]} onChange={handleChange} style={selectStyle}>
                  <option value="">Todos</option>
                  {options.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              </label>
            ))}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={limpiar}
              style={{
                background: 'white', color: '#dc2626', border: '1.5px solid #fecaca',
                padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
              }}
            >
              <RotateCcw size={14} /> Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltroIncidenciasPNP;
