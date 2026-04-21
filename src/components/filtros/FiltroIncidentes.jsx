import { useEffect, useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { logger } from '../../utils/logger.js';
import {
  Filter,
  RotateCcw,
  ShieldCheck,
  AlarmClock,
  BadgeCheck,
  ChevronUp,
  ChevronDown,
  Calendar,
} from 'lucide-react';

const FiltroIncidentes = ({ onFiltrar, onLimpiar }) => {
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    Turno: '',
    Horario: '',
    Jurisdiccion: '',
  });

  const [contadores, setContadores] = useState({
    robos: 0,
    extorsion: 0,
    homicidios: 0,
    feminicidios: 0,
    sicariatos: 0,
    secuestros: 0,
    drogas: 0,
    barras: 0,
    total: 0,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  // Estado para el date range
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: 'selection',
    },
  ]);

  const [tempDateRange, setTempDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: 'selection',
    },
  ]);

  const opciones = {
    Turno: ['Turno Mañana', 'Turno Tarde', 'Turno Noche'],
    Horario: [
      '00:00 - 01:59',
      '02:00 - 03:59',
      '04:00 - 05:59',
      '06:00 - 07:59',
      '08:00 - 09:59',
      '10:00 - 11:59',
      '12:00 - 13:59',
      '14:00 - 15:59',
      '16:00 - 17:59',
      '18:00 - 19:59',
      '20:00 - 21:59',
      '22:00 - 23:59',
    ],
    Jurisdiccion: [
      '10 de Octubre',
      'Bayovar',
      'Caja de Agua',
      'Canto Rey',
      'Huayrona',
      'Mariscal Caceres',
      'Santa Elizabeth',
      'Zarate',
    ],
  };

  // Opciones de selección rápida para fechas
  const quickSelectOptions = [
    {
      label: 'Hoy',
      getRange: () => {
        const today = new Date();
        return { startDate: today, endDate: today };
      },
    },
    {
      label: 'Últimos 7 días',
      getRange: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        return { startDate, endDate };
      },
    },
    {
      label: 'Últimos 30 días',
      getRange: () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
        return { startDate, endDate };
      },
    },
    {
      label: 'Este mes',
      getRange: () => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { startDate, endDate };
      },
    },
    {
      label: 'Mes anterior',
      getRange: () => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        return { startDate, endDate };
      },
    },
  ];

  useEffect(() => {
    const calcularTotal = (nuevosContadores) => {
      return nuevosContadores.robos +
             nuevosContadores.extorsion +
             nuevosContadores.homicidios +
             nuevosContadores.feminicidios +
             nuevosContadores.sicariatos +
             nuevosContadores.secuestros +
             nuevosContadores.drogas +
             nuevosContadores.barras;
    };

    const handleRobos = e => {
      logger.log('🔷 Recibido robosTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, robos: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    const handleExtorsion = e => {
      logger.log('🟠 Recibido extorsionTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, extorsion: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    const handleHomicidios = e => {
      logger.log('🔴 Recibido homicidiosTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, homicidios: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    const handleFeminicidios = e => {
      logger.log('💜 Recibido feminicidiosTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, feminicidios: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    const handleSicariatos = e => {
      logger.log('🔫 Recibido sicariatosTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, sicariatos: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    const handleSecuestros = e => {
      logger.log('👤 Recibido secuestrosTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, secuestros: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    const handleDrogas = e => {
      logger.log('💊 Recibido drogasTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, drogas: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    const handleBarras = e => {
      logger.log('⚽ Recibido barrasTotal:', e.detail);
      setContadores(prev => {
        const nuevos = { ...prev, barras: e.detail };
        return { ...nuevos, total: calcularTotal(nuevos) };
      });
    };

    window.addEventListener('robosTotal', handleRobos);
    window.addEventListener('extorsionTotal', handleExtorsion);
    window.addEventListener('homicidiosTotal', handleHomicidios);
    window.addEventListener('feminicidiosTotal', handleFeminicidios);
    window.addEventListener('sicariatosTotal', handleSicariatos);
    window.addEventListener('secuestrosTotal', handleSecuestros);
    window.addEventListener('drogasTotal', handleDrogas);
    window.addEventListener('barrasTotal', handleBarras);

    return () => {
      window.removeEventListener('robosTotal', handleRobos);
      window.removeEventListener('extorsionTotal', handleExtorsion);
      window.removeEventListener('homicidiosTotal', handleHomicidios);
      window.removeEventListener('feminicidiosTotal', handleFeminicidios);
      window.removeEventListener('sicariatosTotal', handleSicariatos);
      window.removeEventListener('secuestrosTotal', handleSecuestros);
      window.removeEventListener('drogasTotal', handleDrogas);
      window.removeEventListener('barrasTotal', handleBarras);
    };
  }, []);

  useEffect(() => {
    onFiltrar(filtros);
  }, [filtros]);

  // Cerrar date range cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = event => {
      if (dateRangeOpen && !event.target.closest('.date-range-container')) {
        setDateRangeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dateRangeOpen]);

  // Funciones para formatear fechas
  const formatDateToString = date => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  // Manejar cambios en el date range temporal
  const handleRangeChange = ranges => {
    setTempDateRange([ranges.selection]);
  };

  // Aplicar filtro de fecha
  const applyDateFilter = () => {
    const range = tempDateRange[0];
    const newFiltros = {
      ...filtros,
      fechaInicio: formatDateToString(range.startDate),
      fechaFin: formatDateToString(range.endDate),
    };

    setFiltros(newFiltros);
    setDateRange([...tempDateRange]);
    setDateRangeOpen(false);
  };

  // Selección rápida de fechas
  const handleQuickSelect = option => {
    const range = option.getRange();
    const newRange = [
      {
        startDate: range.startDate,
        endDate: range.endDate,
        key: 'selection',
      },
    ];
    setTempDateRange(newRange);
  };

  const limpiar = () => {
    const filtrosVacios = {
      fechaInicio: '',
      fechaFin: '',
      Turno: '',
      Horario: '',
      Jurisdiccion: '',
    };
    setFiltros(filtrosVacios);
    setDateRange([
      {
        startDate: null,
        endDate: null,
        key: 'selection',
      },
    ]);
    setTempDateRange([
      {
        startDate: null,
        endDate: null,
        key: 'selection',
      },
    ]);
    onLimpiar();
  };

  // Función para mostrar texto del rango de fechas seleccionado
  const getDateRangeText = () => {
    const range = dateRange[0];
    if (!range.startDate || !range.endDate) {
      return 'Seleccionar fechas';
    }

    const start = range.startDate.toLocaleDateString('es-ES');
    const end = range.endDate.toLocaleDateString('es-ES');

    if (start === end) {
      return start;
    }

    return `${start} - ${end}`;
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const styles = {
    filtroPanel: {
      position: 'fixed',
      bottom: '10px',
      left: 'calc(70px + 15px)',
      width: '33%',
      maxWidth: '420px',
      zIndex: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      padding: '14px 16px',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: isCollapsed ? '0' : '14px',
      backdropFilter: 'blur(6px)',
      transition: 'all 0.3s ease',
      overflow: 'visible',
    },

    filtrosHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      marginBottom: isCollapsed ? '0' : '10px',
    },

    filtrosTitulo: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontWeight: 'bold',
      fontSize: '15px',
      color: '#333',
    },

    collapseBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      color: '#666',
      transition: 'color 0.2s ease',
      display: 'flex',
      alignItems: 'center',
    },

    resetBtn: {
      background: '#ff4757',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },

    contadoresPanel: {
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #4E8EA2 0%, #0A4174 100%)',
      padding: '12px',
      borderRadius: '12px',
      color: 'white',
      gap: '10px',
      opacity: isCollapsed ? 0 : 1,
      height: isCollapsed ? '0' : 'auto',
      transform: isCollapsed ? 'scaleY(0)' : 'scaleY(1)',
      transition: 'all 0.3s ease',
      transformOrigin: 'top',
      boxShadow: '0 4px 12px rgba(78, 142, 162, 0.35)',
    },

    contadoresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      marginBottom: '8px',
    },

    contadorItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '6px 4px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '6px',
      minHeight: '50px',
      justifyContent: 'center',
    },

    contadorNumero: {
      fontSize: '18px',
      fontWeight: 'bold',
      lineHeight: 1,
    },

    contadorLabel: {
      fontSize: '9px',
      textTransform: 'uppercase',
      marginTop: '3px',
      opacity: 0.9,
      lineHeight: 1.2,
    },

    contadorTotal: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.2)',
      padding: '8px',
      borderRadius: '8px',
      gap: '8px',
    },

    contadorNumeroTotal: {
      fontSize: '24px',
      fontWeight: 'bold',
      lineHeight: 1,
    },

    contadorLabelTotal: {
      fontSize: '11px',
      textTransform: 'uppercase',
      opacity: 0.95,
    },

    filtrosContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      opacity: isCollapsed ? 0 : 1,
      height: isCollapsed ? '0' : 'auto',
      transform: isCollapsed ? 'scaleY(0)' : 'scaleY(1)',
      transition: 'all 0.3s ease',
      transformOrigin: 'top',
    },

    filtrosRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
    },

    filtroLabel: {
      display: 'flex',
      flexDirection: 'column',
      fontSize: '13px',
      color: '#333',
      minWidth: '100px',
      flex: 1,
    },

    filtroSelect: {
      padding: '5px 8px',
      borderRadius: '6px',
      border: '1px solid #ccc',
      background: 'white',
      fontSize: '13px',
    },

    // Estilos responsive
    '@media (max-width: 768px)': {
      filtroPanel: {
        width: 'calc(100% - 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
      },
    },
  };

  // Aplicar estilos responsive manualmente
  const isMobile = window.innerWidth <= 768;
  const responsiveStyles = {
    ...styles.filtroPanel,
    ...(isMobile && {
      width: 'calc(100% - 20px)',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: '100%',
      minHeight: dateRangeOpen ? '450px' : 'auto',
    }),
  };

  return (
    <div style={responsiveStyles}>
      <div style={styles.filtrosHeader} onClick={toggleCollapse}>
        <span style={styles.filtrosTitulo}>
          <Filter size={16} /> Filtros de Incidentes
        </span>
        <button style={styles.collapseBtn}>
          {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <div style={styles.contadoresPanel}>
        <div style={styles.contadoresGrid}>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.robos}</div>
            <div style={styles.contadorLabel}>Robos</div>
          </div>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.extorsion}</div>
            <div style={styles.contadorLabel}>Extorsión</div>
          </div>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.homicidios}</div>
            <div style={styles.contadorLabel}>Homicidios</div>
          </div>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.feminicidios}</div>
            <div style={styles.contadorLabel}>Feminicidios</div>
          </div>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.sicariatos}</div>
            <div style={styles.contadorLabel}>Sicariatos</div>
          </div>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.secuestros}</div>
            <div style={styles.contadorLabel}>Secuestros</div>
          </div>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.drogas}</div>
            <div style={styles.contadorLabel}>Drogas</div>
          </div>
          <div style={styles.contadorItem}>
            <div style={styles.contadorNumero}>{contadores.barras}</div>
            <div style={styles.contadorLabel}>Barras</div>
          </div>
        </div>
        <div style={styles.contadorTotal}>
          <BadgeCheck size={18} style={{ marginRight: '6px' }} />
          <div style={styles.contadorNumeroTotal}>{contadores.total}</div>
          <div style={styles.contadorLabelTotal}>Total Incidencias</div>
        </div>
      </div>

      <div style={styles.filtrosContent}>
        {/* Selector de rango de fechas */}
        <div style={styles.filtrosRow}>
          <div
            style={{ ...styles.filtroLabel, position: 'relative' }}
            className="date-range-container"
          >
            <span>Rango de fechas:</span>
            <button
              onClick={() => {
                if (!dateRangeOpen) {
                  // Sincronizar el date range temporal con el actual al abrir
                  setTempDateRange([...dateRange]);
                }
                setDateRangeOpen(!dateRangeOpen);
              }}
              style={{
                ...styles.filtroSelect,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: 'white',
                border: '1px solid #ccc',
                textAlign: 'left',
              }}
            >
              <span>{getDateRangeText()}</span>
              <Calendar size={16} />
            </button>

            {dateRangeOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '8px',
                  zIndex: 1500,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  boxShadow:
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  width: '350px',
                  maxHeight: '450px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px 5px 12px',
                    borderBottom: '1px solid #e5e7eb',
                    flexShrink: 0,
                    backgroundColor: 'white',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '8px',
                      fontWeight: '600',
                    }}
                  >
                    Selección rápida:
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1px',
                    }}
                  >
                    {quickSelectOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickSelect(option)}
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          border: '1px solid rgba(110, 162, 179, 0.3)',
                          borderRadius: '6px',
                          background: 'rgba(110, 162, 179, 0.15)',
                          cursor: 'pointer',
                          color: '#0A4174',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                          e.target.style.borderColor = '#6EA2B3';
                          e.target.style.backgroundColor = 'rgba(110, 162, 179, 0.25)';
                        }}
                        onMouseLeave={e => {
                          e.target.style.borderColor = 'rgba(110, 162, 179, 0.3)';
                          e.target.style.backgroundColor = 'rgba(110, 162, 179, 0.15)';
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    maxHeight: '380px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                  }}
                >
                  <DateRange
                    editableDateInputs={true}
                    onChange={handleRangeChange}
                    moveRangeOnFirstSelection={false}
                    ranges={tempDateRange}
                    maxDate={new Date()}
                    rangeColors={['#4E8EA2']}
                    months={1}
                    direction="horizontal"
                    showDateDisplay={false}
                  />
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexShrink: 0,
                    backgroundColor: 'white',
                  }}
                >
                  <button
                    onClick={() => setDateRangeOpen(false)}
                    style={{
                      fontSize: '12px',
                      padding: '8px 16px',
                      border: '1px solid rgba(110, 162, 179, 0.3)',
                      borderRadius: '8px',
                      background: 'rgba(110, 162, 179, 0.15)',
                      cursor: 'pointer',
                      color: '#0A4174',
                      fontWeight: '500',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={applyDateFilter}
                    style={{
                      fontSize: '12px',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #4E8EA2 0%, #0A4174 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(78, 142, 162, 0.35)',
                    }}
                  >
                    Aplicar Filtro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.filtrosRow}>
          {['Turno', 'Horario', 'Jurisdiccion'].map(campo => (
            <label key={campo} style={styles.filtroLabel}>
              <span>{campo === 'Jurisdiccion' ? 'Jurisdicción' : campo}:</span>
              <select
                name={campo}
                value={filtros[campo]}
                onChange={handleChange}
                style={styles.filtroSelect}
              >
                <option value="">Todos</option>
                {opciones[campo].map(op => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={styles.resetBtn} onClick={limpiar}>
            <RotateCcw size={14} />
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltroIncidentes;
