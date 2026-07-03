import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, MapPin, Video, X } from 'lucide-react';
import './ControlBodycams.css';
import { obtenerBodycams } from '../../../services/bodycamService';
import { computeJurisdiccion, pasaFiltroJurisdiccion } from '../../../utils/jurisdicciones';

const ControlBodycams = ({
  visible,
  onBodycamSeleccionada,
  onLimpiarSeleccion,
  mapType = 'leaflet',
  filtroEstado = ['ACTIVA', 'INACTIVA', 'DESCONECTADA'],
  onFiltroEstadoChange = () => {},
  embedded = false,
  jurisdiccionesSeleccionadas = [],
  jurisdiccionesGeoJSON = null,
  onConteoChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const panelRef = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [bodycams, setBodycams] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Jurisdicción de cada bodycam (por referencia, para no colisionar por nombres repetidos).
  const jurisdiccionPorBodycam = useMemo(() => {
    const mapa = new Map();
    if (!jurisdiccionesGeoJSON) return mapa;
    bodycams.forEach(bc => mapa.set(bc, computeJurisdiccion(bc.latitud, bc.longitud, jurisdiccionesGeoJSON)));
    return mapa;
  }, [bodycams, jurisdiccionesGeoJSON]);

  // Bodycams dentro de la jurisdicción global seleccionada.
  const bodycamsEnZona = useMemo(
    () => bodycams.filter(bc => pasaFiltroJurisdiccion(jurisdiccionPorBodycam.get(bc), jurisdiccionesSeleccionadas)),
    [bodycams, jurisdiccionPorBodycam, jurisdiccionesSeleccionadas]
  );

  // Reportar solo las bodycams ACTIVAS en la jurisdicción (fecha inválida => no activa).
  useEffect(() => {
    if (typeof onConteoChange !== 'function') return;
    const activas = bodycamsEnZona.filter(bc => {
      const diffMin = (Date.now() - new Date(bc.ultima_ubicacion).getTime()) / (1000 * 60);
      return Number.isFinite(diffMin) && diffMin <= 30; // ACTIVA
    }).length;
    onConteoChange(activas);
  }, [bodycamsEnZona, onConteoChange]);

  useEffect(() => {
    if (visible) {
      cargarBodycams();
    }
  }, [visible]);

  const cargarBodycams = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerBodycams();
      setBodycams(data.filter(bc => bc.latitud && bc.longitud));
    } catch (err) {
      setError('Error al cargar las bodycams.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const buscarBodycam = () => {
    if (!busqueda.trim()) {
      setError('Ingresa el nombre o código de la bodycam');
      return;
    }

    const term = busqueda.toLowerCase().trim();
    const encontrada = bodycams.find(
      bc => bc.nombre.toLowerCase().includes(term) || bc.codigo.toLowerCase().includes(term)
    );

    if (encontrada) {
      setError(null);
      if (onBodycamSeleccionada) {
        onBodycamSeleccionada(encontrada);
      }
    } else {
      setError(`No se encontró: "${busqueda}"`);
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarBodycam();
    }
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
    setError(null);
    if (onLimpiarSeleccion) onLimpiarSeleccion();
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (!visible) return null;

  const contentCollapsed = isCollapsed && !embedded;

  return (
    <div
      ref={panelRef}
      className={`control-bodycams ${mapType}-mode ${contentCollapsed ? 'collapsed' : ''}`}
    >
      {!embedded && (
        <div className="control-bodycams-header" onClick={toggleCollapse}>
          <div className="header-content">
            <Video size={20} style={{ color: '#f97316', flexShrink: 0 }} />
            <h3>Búsqueda Bodycams</h3>
            <button className="collapse-btn-bc">
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>
      )}

      <div className={`control-bodycams-content ${contentCollapsed ? 'hidden' : ''}`}>
        <div className="busqueda-principal">
          <div className="input-group">
            <div className="input-container">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nombre o código..."
                className="busqueda-input"
                disabled={cargando}
              />
            </div>
            <button
              onClick={buscarBodycam}
              disabled={cargando || !busqueda.trim()}
              className="btn-buscar"
            >
              <MapPin size={16} />
            </button>
          </div>
          <div className="filtro-estados-modern" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {['ACTIVA', 'INACTIVA', 'DESCONECTADA'].map(estado => {
              const isActive = Array.isArray(filtroEstado) && filtroEstado.includes(estado);
              let color = '';
              let bg = '';
              let label = '';
              if (estado === 'ACTIVA') { color = '#16a34a'; bg = '#dcfce7'; label = 'Activas'; }
              if (estado === 'INACTIVA') { color = '#ca8a04'; bg = '#fef08a'; label = 'Inactivas'; }
              if (estado === 'DESCONECTADA') { color = '#4b5563'; bg = '#f3f4f6'; label = 'Desc.'; }

              return (
                <button 
                  key={estado}
                  onClick={() => {
                    let nuevos = Array.isArray(filtroEstado) ? [...filtroEstado] : ['ACTIVA', 'INACTIVA', 'DESCONECTADA'];
                    if (nuevos.includes(estado)) {
                      nuevos = nuevos.filter(f => f !== estado);
                    } else {
                      nuevos.push(estado);
                    }
                    onFiltroEstadoChange(nuevos);
                  }}
                  style={{
                    flex: 1, padding: '4px 2px', fontSize: '11px', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    border: `1px solid ${isActive ? color : '#d1d5db'}`,
                    background: isActive ? bg : '#fff',
                    color: isActive ? color : '#6b7280'
                  }}>
                  {isActive ? '✓ ' : ''}{label}
                </button>
              );
            })}
          </div>
        </div>

        {cargando && (
          <div className="estado-carga">
            <div className="spinner"></div>
            <span>Cargando bodycams...</span>
          </div>
        )}

        {error && (
          <div className="mensaje-error">
            <div className="error-icon">⚠️</div>
            <div className="error-texto">{error}</div>
          </div>
        )}

        {!cargando && !error && (
          <div className="stats-compactas">
            <div className="stat-item activo">
              <span className="stat-numero">
                {bodycamsEnZona.filter(bc => {
                  const diffMinutos = (Date.now() - new Date(bc.ultima_ubicacion).getTime()) / (1000 * 60);
                  let estadoTexto = 'ACTIVA';
                  if (!Number.isFinite(diffMinutos) || diffMinutos > 60) estadoTexto = 'DESCONECTADA';
                  else if (diffMinutos > 30) estadoTexto = 'INACTIVA';
                  return Array.isArray(filtroEstado) ? filtroEstado.includes(estadoTexto) : true;
                }).length}
              </span>
              <span className="stat-label">
                Bodycams Visibles
                {Array.isArray(jurisdiccionesSeleccionadas) && jurisdiccionesSeleccionadas.length > 0
                  ? ` · ${jurisdiccionesSeleccionadas.length === 1 ? jurisdiccionesSeleccionadas[0] : `${jurisdiccionesSeleccionadas.length} zonas`}`
                  : ''}
              </span>
            </div>
          </div>
        )}

        {busqueda && (
          <div className="acciones-container">
            <button onClick={limpiarBusqueda} className="btn-limpiar-todo">
              <X size={14} /> Limpiar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlBodycams;
