import { useState, useEffect } from 'react';
import { RotateCcw, Shield, ChevronUp, ChevronDown, Calendar, Filter } from 'lucide-react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import incidenceTypeService     from '../../services/incidenceTypeService';
import incidenceSubtypeService  from '../../services/incidenceSubtypeService';
import incidenceModalityService from '../../services/incidenceModalityService';

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
  { event: 'pnpPatrimonioTotal',       label: 'Patrimonio',      color: '#dc2626' },
  { event: 'pnpSeguridadPublicaTotal', label: 'Seg. Pública',    color: '#ea580c' },
  { event: 'pnpVidaSaludTotal',        label: 'Vida y Salud',    color: '#9333ea' },
  { event: 'pnpLibertadTotal',         label: 'Libertad',        color: '#a21caf' },
  { event: 'pnpAdminPublicaTotal',     label: 'Adm. Pública',    color: '#1d4ed8' },
  { event: 'pnpTraficoTotal',          label: 'Tráfico Drogas',  color: '#15803d' },
  { event: 'pnpFamiliaTotal',          label: 'Familia',         color: '#7c3aed' },
  { event: 'pnpMenorInfractorTotal',   label: 'Menor Infractor', color: '#a16207' },
  { event: 'pnpFePublicaTotal',        label: 'Fe Pública',      color: '#0369a1' },
  { event: 'pnpTranquilidadTotal',     label: 'Tranquilidad',    color: '#475569' },
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

const DATE_PRESETS = [
  {
    label: 'Hoy',
    get: () => { const t = new Date(); return { start: fmt(t), end: fmt(t), startDate: t, endDate: t }; },
  },
  {
    label: '7 días',
    get: () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 6); return { start: fmt(s), end: fmt(t), startDate: s, endDate: t }; },
  },
  {
    label: '1 mes',
    get: () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 29); return { start: fmt(s), end: fmt(t), startDate: s, endDate: t }; },
  },
  {
    label: 'Este mes',
    get: () => { const t = new Date(); const s = new Date(t.getFullYear(), t.getMonth(), 1); const e = new Date(t.getFullYear(), t.getMonth() + 1, 0); return { start: fmt(s), end: fmt(e), startDate: s, endDate: e }; },
  },
];

const FiltroIncidenciasPNP = ({ onFiltrar, onLimpiar }) => {
  const defaultRange = getDefaultRange();
  const [filtros, setFiltros] = useState({
    shift: '', jurisdiction: '', horario: '',
    start: fmt(defaultRange.startDate),
    end:   fmt(defaultRange.endDate),
    subtype_id: '', modality_id: '',
  });
  const [contadores, setContadores] = useState(() =>
    Object.fromEntries(TIPO_CONFIG.map(t => [t.event, 0]))
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState([{ ...defaultRange, key: 'selection' }]);

  const [tipos, setTipos]         = useState([]);
  const [subtipos, setSubtipos]   = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [selectedTipoId, setSelectedTipoId] = useState('');
  const [clasificacionExpanded, setClasificacionExpanded] = useState(false);

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

  useEffect(() => {
    incidenceTypeService.getAll({ limit: 100 }).then(res => setTipos(res.data)).catch(() => {});
  }, []);

  useEffect(() => { onFiltrar(filtros); }, [filtros]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleTipoChange = async e => {
    const tipoId = e.target.value;
    setSelectedTipoId(tipoId);
    setSubtipos([]);
    setModalidades([]);
    setFiltros(prev => ({ ...prev, subtype_id: '', modality_id: '' }));
    if (tipoId) {
      try {
        const res = await incidenceSubtypeService.getAll({ type_id: tipoId, limit: 100 });
        setSubtipos(res.data);
      } catch {}
    }
  };

  const handleSubtipoChange = async e => {
    const subtypeId = e.target.value;
    setModalidades([]);
    setFiltros(prev => ({ ...prev, subtype_id: subtypeId, modality_id: '' }));
    if (subtypeId) {
      try {
        const res = await incidenceModalityService.getAll({ subtype_id: subtypeId, limit: 200 });
        setModalidades(res.data);
      } catch {}
    }
  };

  const handleModalidadChange = e => {
    setFiltros(prev => ({ ...prev, modality_id: e.target.value }));
  };

  const applyPreset = preset => {
    const { start, end, startDate, endDate } = preset.get();
    setFiltros(prev => ({ ...prev, start, end }));
    setTempDateRange([{ startDate, endDate, key: 'selection' }]);
  };

  const applyCustomDates = () => {
    const range = tempDateRange[0];
    const start = range.startDate ? fmt(range.startDate) : '';
    const end   = range.endDate   ? fmt(range.endDate)   : '';
    setFiltros(prev => ({ ...prev, start, end }));
    setDateRangeOpen(false);
  };

  const getActivePreset = () =>
    DATE_PRESETS.find(p => p.get().start === filtros.start && p.get().end === filtros.end);

  const getDateText = () => {
    const preset = getActivePreset();
    if (preset) return preset.label;
    if (!filtros.start && !filtros.end) return 'Sin filtro';
    const s = filtros.start ? new Date(filtros.start + 'T00:00:00').toLocaleDateString('es-ES') : '';
    const e = filtros.end   ? new Date(filtros.end   + 'T00:00:00').toLocaleDateString('es-ES') : '';
    return s === e ? s : `${s} — ${e}`;
  };

  const limpiar = () => {
    const def = getDefaultRange();
    setFiltros({ shift: '', jurisdiction: '', horario: '', start: fmt(def.startDate), end: fmt(def.endDate), subtype_id: '', modality_id: '' });
    setSelectedTipoId('');
    setSubtipos([]);
    setModalidades([]);
    setTempDateRange([{ ...def, key: 'selection' }]);
    setShowCustomDates(false);
    onLimpiar();
  };

  const selectStyle = {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 13,
    color: '#1f2937',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.18s',
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
          <div className="pnp-date-range-container" style={{ position: 'relative' }}>
            {/* Label + toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={12} color="#64748b" /> Rango de fechas
              </span>
              <button
                onClick={() => { setShowCustomDates(p => !p); setDateRangeOpen(false); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 12,
                  border: `1.5px solid ${showCustomDates ? '#86efac' : '#e2e8f0'}`,
                  background: showCustomDates ? '#f0fdf4' : '#f8fafc',
                  color: showCustomDates ? '#15803d' : '#64748b',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'inherit',
                }}
              >
                <Calendar size={11} />
                {showCustomDates ? 'Presets' : 'Personalizado'}
              </button>
            </div>

            {!showCustomDates ? (
              /* Chips de preset */
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DATE_PRESETS.map(preset => {
                  const isActive = getActivePreset()?.label === preset.label;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      style={{
                        padding: '5px 14px', borderRadius: 20,
                        border: `1.5px solid ${isActive ? '#16a34a' : '#e2e8f0'}`,
                        background: isActive ? '#16a34a' : '#f8fafc',
                        color: isActive ? 'white' : '#475569',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.18s', fontFamily: 'inherit',
                        boxShadow: isActive ? '0 2px 6px rgba(22,163,74,0.3)' : 'none',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                {/* Indicador si hay rango personalizado activo */}
                {!getActivePreset() && (filtros.start || filtros.end) && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: '#15803d', fontWeight: 600,
                    padding: '4px 10px', background: '#f0fdf4',
                    border: '1px dashed #86efac', borderRadius: 12,
                  }}>
                    <Calendar size={10} /> {getDateText()}
                  </span>
                )}
              </div>
            ) : (
              /* Picker personalizado */
              <div>
                <button
                  onClick={() => setDateRangeOpen(p => !p)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${dateRangeOpen ? '#16a34a' : '#e2e8f0'}`,
                    background: dateRangeOpen ? 'white' : '#f8fafc',
                    boxShadow: dateRangeOpen ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
                    fontFamily: 'inherit',
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
                        style={{ fontSize: 12, padding: '8px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#374151', fontWeight: 500, fontFamily: 'inherit' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={applyCustomDates}
                        style={{ fontSize: 12, padding: '8px 18px', border: 'none', borderRadius: 8, background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px rgba(22,163,74,0.25)', fontFamily: 'inherit' }}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clasificación PNP: Tipo → Subtipo → Modalidad */}
          <div style={{ background: '#f0f9ff', borderRadius: 10, border: '1.5px solid #bae6fd', overflow: 'hidden' }}>
            {/* Header colapsable */}
            <div
              onClick={() => setClasificacionExpanded(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
            >
              <Filter size={12} color="#0369a1" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                Clasificación
              </span>
              {(selectedTipoId || filtros.subtype_id || filtros.modality_id) && (
                <span style={{ background: '#0369a1', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 8px' }}>
                  Activo
                </span>
              )}
              <ChevronDown
                size={14}
                color="#0369a1"
                style={{ transform: clasificacionExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              />
            </div>

            {clasificacionExpanded && (
              <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #bae6fd' }}>
                <div style={{ height: 8 }} />
                {/* Tipo */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tipo
                  <select
                    value={selectedTipoId}
                    onChange={handleTipoChange}
                    style={{ ...selectStyle, borderColor: selectedTipoId ? '#7dd3fc' : '#e2e8f0', background: selectedTipoId ? '#f0f9ff' : '#f8fafc' }}
                  >
                    <option value="">Todos los tipos</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>

                {/* Subtipo */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: subtipos.length === 0 ? 0.45 : 1 }}>
                  Subtipo
                  <select
                    value={filtros.subtype_id}
                    onChange={handleSubtipoChange}
                    disabled={subtipos.length === 0}
                    style={{ ...selectStyle, borderColor: filtros.subtype_id ? '#7dd3fc' : '#e2e8f0', background: filtros.subtype_id ? '#f0f9ff' : '#f8fafc', cursor: subtipos.length === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    <option value="">Todos los subtipos</option>
                    {subtipos.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>

                {/* Modalidad */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: modalidades.length === 0 ? 0.45 : 1 }}>
                  Modalidad
                  <select
                    value={filtros.modality_id}
                    onChange={handleModalidadChange}
                    disabled={modalidades.length === 0}
                    style={{ ...selectStyle, borderColor: filtros.modality_id ? '#7dd3fc' : '#e2e8f0', background: filtros.modality_id ? '#f0f9ff' : '#f8fafc', cursor: modalidades.length === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    <option value="">Todas las modalidades</option>
                    {modalidades.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Selectores */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              {
                name: 'shift', label: 'Turno',
                options: [...TURNO_OPTIONS, { value: 'NO_SHIFT', label: 'Sin turno' }],
              },
              { name: 'horario',      label: 'Horario',      options: HORARIO_OPTIONS.map(o => ({ value: o, label: o })) },
              { name: 'jurisdiction', label: 'Jurisdicción', options: JURISDICCION_OPTIONS.map(o => ({ value: o, label: o })) },
            ].map(({ name, label, options }) => (
              <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#64748b', minWidth: 90, flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontFamily: 'inherit',
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
