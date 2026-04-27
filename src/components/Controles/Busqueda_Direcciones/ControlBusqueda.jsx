import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search, Trash2, MapPin, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import './ControlBusqueda.css';
import { logger } from '../../../utils/logger.js';

const ControlBusqueda = ({ visible, onBusquedaRealizada, mapType = 'leaflet', topPosition = 10 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [resultadoSeleccionado, setResultadoSeleccionado] = useState(null);

  // Función para realizar geocodificación usando Nominatim
  const buscarDireccion = async direccion => {
    if (!direccion.trim()) {
      setError('Por favor ingresa una dirección válida');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      logger.log('🔍 Buscando dirección en Lima:', direccion);

      // Usar Nominatim API para geocodificación restringida a Lima, Perú
      // Bounding box aproximado para Lima Metropolitana:
      // Oeste: -77.2, Sur: -12.4, Este: -76.7, Norte: -11.7
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion + ', San Juan de Lurigancho, Lima Metropolitana, Perú')}&limit=5&addressdetails=1&countrycodes=pe&bounded=1&viewbox=-77.2,-11.7,-76.7,-12.4`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MapaPrediccion/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Error en la búsqueda: ${response.status}`);
      }

      const data = await response.json();
      logger.log('📍 Resultados encontrados en Lima:', data.length);

      if (data.length === 0) {
        setError('No se encontraron resultados para esta dirección en Lima, Perú');
        setResultados([]);
        return;
      }

      // Filtrar adicional para asegurar que los resultados estén en Lima
      const resultadosLima = data.filter(item => {
        const address = item.address || {};
        const displayName = (item.display_name || '').toLowerCase();

        // Verificar que mencione Lima en la dirección o en los detalles
        return (
          address.city === 'Lima' ||
          address.state === 'Lima' ||
          address.county === 'Lima' ||
          displayName.includes('lima') ||
          displayName.includes('perú') ||
          displayName.includes('peru')
        );
      });

      logger.log('📍 Resultados filtrados para Lima:', resultadosLima.length);

      if (resultadosLima.length === 0) {
        setError('No se encontraron resultados en Lima para esta dirección');
        setResultados([]);
        return;
      }

      // Procesar resultados
      const resultadosProcesados = resultadosLima.map((item, index) => ({
        id: index + 1,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        direccion: item.display_name,
        tipo: item.type || 'lugar',
        categoria: item.class || 'general',
        importancia: item.importance || 0,
        detalles: item.address || {},
      }));

      setResultados(resultadosProcesados);

      // Notificar al componente padre con los resultados
      if (onBusquedaRealizada) {
        onBusquedaRealizada(resultadosProcesados, null); // null = ninguno seleccionado inicialmente
      }
    } catch (err) {
      logger.error('❌ Error en búsqueda:', err);
      setError(`Error: ${err.message}`);
      setResultados([]);
    } finally {
      setCargando(false);
    }
  };

  // Manejar envío del formulario
  const manejarBusqueda = e => {
    e.preventDefault();
    buscarDireccion(busqueda);
  };

  // Limpiar búsqueda
  const limpiarBusqueda = () => {
    setBusqueda('');
    setResultados([]);
    setError(null);
    setResultadoSeleccionado(null);
    if (onBusquedaRealizada) {
      onBusquedaRealizada([], null);
    }
  };

  // Manejar selección de resultado específico
  const seleccionarResultado = resultado => {
    setResultadoSeleccionado(resultado.id);
    if (onBusquedaRealizada) {
      onBusquedaRealizada(resultados, resultado.id);
    }
  };

  // Mostrar todos los resultados
  const mostrarTodos = () => {
    setResultadoSeleccionado(null);
    if (onBusquedaRealizada) {
      onBusquedaRealizada(resultados, null);
    }
  };

  // Alternar colapso
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (!visible) return null;

  return (
    <div
      className={`control-busqueda ${mapType}-mode ${isCollapsed ? 'collapsed' : ''}`}
      style={{ top: `${topPosition}px` }}
    >
      <div className="control-busqueda-header" onClick={toggleCollapse}>
        <div className="header-content">
          <Search size={16} color="#16a34a" style={{ flexShrink: 0 }} />
          <h3>Búsqueda en SJL</h3>
          <button className="collapse-btn">
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      <div className={`control-busqueda-content ${isCollapsed ? 'hidden' : ''}`}>
        <form onSubmit={manejarBusqueda} className="busqueda-form">
          <div className="input-container">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Ej: Av. Gran Chimú, SJL"
              className="busqueda-input"
              disabled={cargando}
              style={{ color: '#1f2937', WebkitTextFillColor: '#1f2937', background: '#ffffff', caretColor: '#16a34a' }}
            />
          </div>

          <div className="botones-container">
            <button type="submit" disabled={cargando || !busqueda.trim()} className="btn-buscar">
              <Search size={16} />
              {cargando ? 'Buscando...' : 'Buscar'}
            </button>

            <button
              type="button"
              onClick={limpiarBusqueda}
              disabled={cargando}
              className="btn-limpiar"
            >
              <Trash2 size={16} />
              Limpiar
            </button>
          </div>
        </form>

        {/* Mostrar error */}
        {error && (
          <div className="error-message">
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* Mostrar estadísticas de resultados */}
        {resultados.length > 0 && (
          <div className="resultados-stats">
            <CheckCircle size={14} style={{ flexShrink: 0 }} />
            {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Mostrar lista de resultados */}
        {resultados.length > 0 && (
          <div className="resultados-lista">
            <div className="resultados-header">
              <h4><MapPin size={12} color="#16a34a" /> Resultados</h4>
              {resultadoSeleccionado && (
                <button
                  onClick={mostrarTodos}
                  className="btn-mostrar-todos"
                  title="Mostrar todos los resultados"
                >
                  <Eye size={12} /> Mostrar todos
                </button>
              )}
            </div>
            {resultados.map((resultado, index) => (
              <div
                key={resultado.id}
                className={`resultado-item ${resultadoSeleccionado === resultado.id ? 'seleccionado' : ''}`}
                onClick={() => seleccionarResultado(resultado)}
                title="Clic para mostrar solo este marcador"
              >
                <div className="resultado-numero">{index + 1}</div>
                <div className="resultado-info">
                  <div className="resultado-direccion">
                    {resultado.direccion.length > 60
                      ? resultado.direccion.substring(0, 60) + '...'
                      : resultado.direccion}
                  </div>
                  <div className="resultado-detalles">
                    <span className="resultado-tipo">{resultado.tipo}</span>
                    <span className="resultado-coords">
                      {resultado.lat.toFixed(4)}, {resultado.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
                {resultadoSeleccionado === resultado.id && (
                  <div className="resultado-seleccionado-icono">
                    <CheckCircle size={14} color="#16a34a" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlBusqueda;
