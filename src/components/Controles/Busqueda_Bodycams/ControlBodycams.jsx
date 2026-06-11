import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Search, MapPin, Video, X } from 'lucide-react';
import './ControlBodycams.css';
import { obtenerBodycams } from '../../../services/bodycamService';

const ControlBodycams = ({
  visible,
  onBodycamSeleccionada,
  onLimpiarSeleccion,
  mapType = 'leaflet',
  topPosition = 10,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const panelRef = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [bodycams, setBodycams] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

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
      setBodycams(data.filter(bc => bc.activa && bc.latitud && bc.longitud));
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

  return (
    <div
      ref={panelRef}
      className={`control-bodycams ${mapType}-mode ${isCollapsed ? 'collapsed' : ''}`}
      style={{ '--cc-top': `${topPosition}px` }}
    >
      <div className="control-bodycams-header" onClick={toggleCollapse}>
        <div className="header-content">
          <Video size={20} style={{ color: '#f97316', flexShrink: 0 }} />
          <h3>Búsqueda Bodycams</h3>
          <button className="collapse-btn">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      <div className={`control-bodycams-content ${isCollapsed ? 'hidden' : ''}`}>
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
              <span className="stat-numero">{bodycams.length}</span>
              <span className="stat-label">Bodycams Activas</span>
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
