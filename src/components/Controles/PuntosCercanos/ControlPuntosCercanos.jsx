import React, { useState } from 'react';
import { ChevronUp, ChevronDown, MapPin, Search, X, Navigation } from 'lucide-react';
import './ControlPuntosCercanos.css';
import { obtenerRadiosCercanos } from '../../../services/radiosService';

const OPCIONES_METROS = [100, 250, 500, 1000, 2000, 5000];

const ControlPuntosCercanos = ({
  visible,
  puntoSeleccionado,
  onActivarSeleccion,
  seleccionandoPunto,
  topPosition = 10,
  mapType = 'leaflet',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [metros, setMetros] = useState(500);
  const [radios, setRadios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState(null);

  const buscar = async () => {
    if (!puntoSeleccionado) return;
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerRadiosCercanos(puntoSeleccionado.lat, puntoSeleccionado.lng, metros);
      setRadios(data);
      setBuscado(true);
    } catch {
      setError('Error al buscar radios cercanos');
    } finally {
      setCargando(false);
    }
  };

  const limpiar = () => {
    setRadios([]);
    setBuscado(false);
    setError(null);
  };

  if (!visible) return null;

  return (
    <div
      className={`ctrl-pc ${mapType}-mode ${isCollapsed ? 'collapsed' : ''}`}
      style={{ '--pc-top': `${topPosition}px` }}
    >
      <div className="ctrl-pc-header" onClick={() => setIsCollapsed(p => !p)}>
        <div className="header-content">
          <Navigation size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <h3>Puntos Cercanos</h3>
          <button className="pc-collapse-btn">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      <div className={`ctrl-pc-content ${isCollapsed ? 'hidden' : ''}`}>
        {/* Selección de punto */}
        <button
          className={`pc-btn-seleccionar ${seleccionandoPunto ? 'activo' : ''}`}
          onClick={onActivarSeleccion}
        >
          <MapPin size={15} />
          {seleccionandoPunto ? 'Haz clic en el mapa...' : 'Seleccionar punto en mapa'}
        </button>

        {puntoSeleccionado && (
          <div className="pc-punto-info">
            <span>📍</span>
            <span>{puntoSeleccionado.lat.toFixed(5)}, {puntoSeleccionado.lng.toFixed(5)}</span>
          </div>
        )}

        {/* Radio de búsqueda */}
        <div className="pc-radio-group">
          <label className="pc-label">Radio de búsqueda</label>
          <select
            className="pc-select"
            value={metros}
            onChange={e => { setMetros(Number(e.target.value)); limpiar(); }}
          >
            {OPCIONES_METROS.map(m => (
              <option key={m} value={m}>
                {m >= 1000 ? `${m / 1000} km` : `${m} m`}
              </option>
            ))}
          </select>
        </div>

        {/* Botón buscar */}
        <button
          className="pc-btn-buscar"
          onClick={buscar}
          disabled={!puntoSeleccionado || cargando}
        >
          {cargando ? <div className="pc-spinner" /> : <Search size={15} />}
          {cargando ? 'Buscando...' : 'Buscar radios cercanas'}
        </button>

        {error && <div className="pc-error">⚠️ {error}</div>}

        {/* Resultados */}
        {buscado && !cargando && (
          <>
            <div className="pc-stats">
              <span className="pc-stat-num" style={{ color: '#f59e0b' }}>{radios.length}</span>
              <span className="pc-stat-label">radios encontradas en {metros >= 1000 ? `${metros/1000}km` : `${metros}m`}</span>
            </div>

            {radios.length > 0 && (
              <div className="pc-lista">
                {radios.map(r => {
                  const esNormal = r.estado?.toUpperCase().includes('NORMAL');
                  return (
                    <div key={r.issi} className="pc-item">
                      <div className="pc-item-dot" style={{ background: r.hexacolor || '#6366f1' }} />
                      <div className="pc-item-info">
                        <div className="pc-item-nombre">{r.unicocodigo || `ISSI: ${r.issi}`}</div>
                        <div className="pc-item-detalle">{r.tipo} · {r.velocidad} km/h</div>
                      </div>
                      <div className="pc-item-dist">
                        <span>{r.distancia_metros}m</span>
                        <span className="pc-estado" style={{ color: esNormal ? '#16a34a' : '#dc2626' }}>
                          {esNormal ? '●' : '●'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {radios.length === 0 && (
              <div className="pc-vacio">No hay radios en ese radio de búsqueda</div>
            )}

            <button className="pc-btn-limpiar" onClick={limpiar}>
              <X size={13} /> Limpiar resultados
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ControlPuntosCercanos;
