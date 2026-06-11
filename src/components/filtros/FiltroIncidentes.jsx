import React, { useEffect, useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { logger } from '../../utils/logger.js';
import { Filter, RotateCcw, BadgeCheck, ChevronUp, ChevronDown, Calendar } from 'lucide-react';

const TIPO_CONFIG = [
  { key: 'robos',       label: 'Robos',       color: '#e74c3c' },
  { key: 'hurtos',      label: 'Hurtos',      color: '#7c3aed' },
  { key: 'danos',       label: 'Daños',       color: '#f97316' },
  { key: 'extorsion',   label: 'Extorsión',   color: '#e67e22' },
  { key: 'homicidios',  label: 'Homicidios',  color: '#2d3436' },
  { key: 'feminicidios',label: 'Feminicidios',color: '#d63031' },
  { key: 'sicariatos',  label: 'Sicariatos',  color: '#8e44ad' },
  { key: 'secuestros',  label: 'Secuestros',  color: '#1a5276' },
  { key: 'drogas',      label: 'Drogas',      color: '#117a65' },
  { key: 'barras',      label: 'Barras',      color: '#b8860b' },
];

const getDefaultRange = () => {
  const today = new Date();
  const hace30 = new Date();
  hace30.setDate(today.getDate() - 30);
  return { startDate: hace30, endDate: today };
};

const fmtDate = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const QUICK_OPTIONS = [
  { label: 'Hoy',          getRange: () => { const t = new Date(); return { startDate: t, endDate: t }; } },
  { label: 'Últ. 7 días',  getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate()-6);  return { startDate: s, endDate: e }; } },
  { label: 'Últ. 30 días', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate()-29); return { startDate: s, endDate: e }; } },
  { label: 'Este mes',     getRange: () => { const n = new Date(); return { startDate: new Date(n.getFullYear(),n.getMonth(),1), endDate: new Date(n.getFullYear(),n.getMonth()+1,0) }; } },
  { label: 'Mes anterior', getRange: () => { const n = new Date(); return { startDate: new Date(n.getFullYear(),n.getMonth()-1,1), endDate: new Date(n.getFullYear(),n.getMonth(),0) }; } },
];

const FiltroIncidentes = ({ onFiltrar, onLimpiar }) => {
  const defaultRange = getDefaultRange();

  const [filtros, setFiltros] = useState({
    fechaInicio: fmtDate(defaultRange.startDate),
    fechaFin:    fmtDate(defaultRange.endDate),
    Turno: '', Horario: '', Jurisdiccion: '',
  });

  const [contadores, setContadores] = useState({
    robos: 0, hurtos: 0, danos: 0, extorsion: 0, homicidios: 0,
    feminicidios: 0, sicariatos: 0, secuestros: 0, drogas: 0, barras: 0, total: 0,
  });
  // Refs para agregar subtotales (múltiples eventos → un contador)
  const roboTotals  = React.useRef({});
  const hurtoTotals = React.useRef({});
  const danosTotals = React.useRef({});

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [dateRange, setDateRange] = useState([{ ...defaultRange, key: 'selection' }]);
  const [tempDateRange, setTempDateRange] = useState([{ ...defaultRange, key: 'selection' }]);

  const opciones = {
    Turno: ['Turno Mañana', 'Turno Tarde', 'Turno Noche'],
    Horario: ['00:00 - 01:59','02:00 - 03:59','04:00 - 05:59','06:00 - 07:59','08:00 - 09:59','10:00 - 11:59','12:00 - 13:59','14:00 - 15:59','16:00 - 17:59','18:00 - 19:59','20:00 - 21:59','22:00 - 23:59'],
    Jurisdiccion: ['10 de Octubre','Bayovar','Caja de Agua','Canto Rey','Huayrona','Mariscal Caceres','Santa Elizabeth','Zarate'],
  };

  useEffect(() => {
    const calcularTotal = c =>
      Math.max(0, c.robos - c.extorsion) + c.hurtos + c.danos +
      c.extorsion + c.homicidios + c.feminicidios + c.sicariatos +
      c.secuestros + c.drogas + c.barras;

    const mk = field => e => {
      logger.log(`Recibido ${field}:`, e.detail);
      setContadores(prev => { const n = { ...prev, [field]: e.detail }; return { ...n, total: calcularTotal(n) }; });
    };

    // Robos: agrega 7 subtypes + capa combinada legacy
    const ROBO_EVS = ['robosTotal','roboPersonasTotal','roboCasaTotal','roboGanadoTotal','roboEmpresasTotal','roboVehiculosTotal','roboAutopartesTotal','roboPasajerosTotal'];
    const mkRobo = ev => e => {
      roboTotals.current[ev] = e.detail;
      const total = Object.values(roboTotals.current).reduce((a,b) => a+b, 0);
      setContadores(prev => { const n = { ...prev, robos: total }; return { ...n, total: calcularTotal(n) }; });
    };

    // Hurtos: agrega 6 subtypes en un solo contador
    const HURTO_EVS = ['hurtoPersonasTotal','hurtoCasaTotal','hurtoGanadoTotal','hurtoEmpresasTotal','hurtoVehiculosTotal','hurtoPasajerosTotal'];
    const mkHurto = ev => e => {
      hurtoTotals.current[ev] = e.detail;
      const total = Object.values(hurtoTotals.current).reduce((a,b) => a+b, 0);
      setContadores(prev => { const n = { ...prev, hurtos: total }; return { ...n, total: calcularTotal(n) }; });
    };

    // Daños: 1 evento
    const mkDanos = e => {
      danosTotals.current.danosTotal = e.detail;
      setContadores(prev => { const n = { ...prev, danos: e.detail }; return { ...n, total: calcularTotal(n) }; });
    };

    const handlers = [
      ...ROBO_EVS.map(ev => [ev, mkRobo(ev)]),
      ['extorsionTotal',   mk('extorsion')],
      ['homicidiosTotal',  mk('homicidios')],
      ['feminicidiosTotal',mk('feminicidios')],
      ['sicariatosTotal',  mk('sicariatos')],
      ['secuestrosTotal',  mk('secuestros')],
      ['drogasTotal',      mk('drogas')],
      ['barrasTotal',      mk('barras')],
      ...HURTO_EVS.map(ev => [ev, mkHurto(ev)]),
      ['danosTotal', mkDanos],
    ];

    handlers.forEach(([ev, h]) => window.addEventListener(ev, h));
    return () => handlers.forEach(([ev, h]) => window.removeEventListener(ev, h));
  }, []);

  useEffect(() => { onFiltrar(filtros); }, [filtros]);

  useEffect(() => {
    const handleClickOutside = e => {
      if (dateRangeOpen && !e.target.closest('.date-range-container')) setDateRangeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dateRangeOpen]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const applyDateFilter = () => {
    const range = tempDateRange[0];
    setFiltros(prev => ({ ...prev, fechaInicio: fmtDate(range.startDate), fechaFin: fmtDate(range.endDate) }));
    setDateRange([...tempDateRange]);
    setDateRangeOpen(false);
  };

  const limpiar = () => {
    const def = getDefaultRange();
    setFiltros({ fechaInicio: fmtDate(def.startDate), fechaFin: fmtDate(def.endDate), Turno: '', Horario: '', Jurisdiccion: '' });
    setDateRange([{ ...def, key: 'selection' }]);
    setTempDateRange([{ ...def, key: 'selection' }]);
    onLimpiar();
  };

  const getDateRangeText = () => {
    const r = dateRange[0];
    if (!r.startDate || !r.endDate) return 'Seleccionar fechas';
    const s = r.startDate.toLocaleDateString('es-ES');
    const e = r.endDate.toLocaleDateString('es-ES');
    return s === e ? s : `${s} — ${e}`;
  };

  const selectStyle = {
    padding: '7px 10px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', background: 'white',
    fontSize: 13, color: '#1f2937', outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
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
          <Filter size={17} color="#16a34a" />
          Filtros de Incidentes
        </span>
        <button style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', padding: 6 }}>
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Contadores */}
          <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
              {TIPO_CONFIG.map(t => (
                <div key={t.key} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: '#ffffff', border: `1.5px solid ${t.color}44`,
                  borderTop: `3px solid ${t.color}`,
                  borderRadius: 8, padding: '7px 4px', minHeight: 52, justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>
                    {t.key === 'robos' ? Math.max(0, contadores.robos - contadores.extorsion) : contadores[t.key]}
                  </div>
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
              <BadgeCheck size={18} color="white" />
              <span style={{ fontSize: 26, fontWeight: 700, color: 'white', lineHeight: 1 }}>{contadores.total}</span>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Total Incidencias</span>
            </div>
          </div>

          {/* Rango de fechas */}
          <div style={{ position: 'relative' }} className="date-range-container">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Rango de fechas
            </div>
            <button
              onClick={() => { if (!dateRangeOpen) setTempDateRange([...dateRange]); setDateRangeOpen(p => !p); }}
              style={{
                ...selectStyle,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', padding: '9px 12px',
                border: dateRangeOpen ? '1.5px solid #16a34a' : '1.5px solid #e2e8f0',
                boxShadow: dateRangeOpen ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: '#1f2937' }}>{getDateRangeText()}</span>
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
                    {QUICK_OPTIONS.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setTempDateRange([{ ...opt.getRange(), key: 'selection' }])}
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
            {['Turno', 'Horario', 'Jurisdiccion'].map(campo => (
              <label key={campo} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 90, flex: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {campo === 'Jurisdiccion' ? 'Jurisdicción' : campo}
                <select name={campo} value={filtros[campo]} onChange={handleChange} style={selectStyle}>
                  <option value="">Todos</option>
                  {opciones[campo].map(op => <option key={op} value={op}>{op}</option>)}
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

export default FiltroIncidentes;
