import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useMapContext } from '../../../context/MapContext';
import './ControlClusters.css';

const ControlClusters = ({ visible, mapType = 'leaflet' }) => {
  const {
    radioCluster,
    setRadioCluster,
    tiposIncidenciasCluster,
    handleToggleTipoIncidenciaCluster,
    fechasClusters,
    handleFechasClustersChange
  } = useMapContext();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    totalClusters: 0,
    totalPuntos: 0,
    puntosClusteados: 0
  });

  // Formatear fechas para mostrar (dd/mm/yyyy)
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Resetear a últimos 30 días
  const resetearFechas = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    handleFechasClustersChange({
      fechaInicio: formatDate(thirtyDaysAgo),
      fechaFin: formatDate(today)
    });
  };

  useEffect(() => {
    const handleClusterStats = (event) => {
      setEstadisticas(event.detail);
    };

    window.addEventListener('clustersGenerados', handleClusterStats);
    return () => {
      window.removeEventListener('clustersGenerados', handleClusterStats);
    };
  }, []);

  if (!visible) return null;

  const porcentajeClusteado = estadisticas.totalPuntos > 0 
    ? ((estadisticas.puntosClusteados / estadisticas.totalPuntos) * 100).toFixed(1)
    : 0;

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`control-clusters ${mapType}-mode ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="control-clusters-header" onClick={toggleCollapse}>
        <div className="header-content">
          <h3>🎯 Control de Clusters</h3>
          <button className="collapse-btn">
            {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      <div className={`control-clusters-content ${isCollapsed ? 'hidden' : ''}`}>
        <div className="periodo-info">
          <div className="periodo-header">
            <span className="periodo-icon">📅</span>
            <span className="periodo-label">Período de datos</span>
          </div>

          <div className="fechas-inputs">
            <div className="fecha-input-group">
              <label htmlFor="fecha-inicio">Desde</label>
              <input
                type="date"
                id="fecha-inicio"
                value={fechasClusters.fechaInicio}
                onChange={(e) => handleFechasClustersChange({
                  ...fechasClusters,
                  fechaInicio: e.target.value
                })}
                className="fecha-input"
                max={fechasClusters.fechaFin}
              />
            </div>

            <div className="fecha-input-group">
              <label htmlFor="fecha-fin">Hasta</label>
              <input
                type="date"
                id="fecha-fin"
                value={fechasClusters.fechaFin}
                onChange={(e) => handleFechasClustersChange({
                  ...fechasClusters,
                  fechaFin: e.target.value
                })}
                className="fecha-input"
                min={fechasClusters.fechaInicio}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <button className="btn-resetear-fechas" onClick={resetearFechas}>
            🔄 Últimos 30 días
          </button>
        </div>

        <div className="radio-control">
          <label htmlFor="radio-slider">
            <strong>Radio de Clustering:</strong>
          </label>
          <div className="slider-container">
            <input
              id="radio-slider"
              type="range"
              min="10"
              max="100"
              value={radioCluster}
              onChange={(e) => setRadioCluster(Number(e.target.value))}
              className="radio-slider"
            />
            <span className="radio-value">{radioCluster}m</span>
          </div>
        </div>

        <div className="filtros-incidencias">
          <h4>🔍 Tipos de Incidencias</h4>
          <div className="filtros-grid">
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.robos}
                onChange={() => handleToggleTipoIncidenciaCluster('robos')}
              />
              <span>Robos</span>
            </label>
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.extorsiones}
                onChange={() => handleToggleTipoIncidenciaCluster('extorsiones')}
              />
              <span>Extorsiones</span>
            </label>
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.homicidios}
                onChange={() => handleToggleTipoIncidenciaCluster('homicidios')}
              />
              <span>Homicidios</span>
            </label>
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.feminicidios}
                onChange={() => handleToggleTipoIncidenciaCluster('feminicidios')}
              />
              <span>Feminicidios</span>
            </label>
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.sicariatos}
                onChange={() => handleToggleTipoIncidenciaCluster('sicariatos')}
              />
              <span>Sicariatos</span>
            </label>
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.secuestros}
                onChange={() => handleToggleTipoIncidenciaCluster('secuestros')}
              />
              <span>Secuestros</span>
            </label>
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.drogas}
                onChange={() => handleToggleTipoIncidenciaCluster('drogas')}
              />
              <span>Drogas</span>
            </label>
            <label className="filtro-checkbox">
              <input
                type="checkbox"
                checked={tiposIncidenciasCluster.barras}
                onChange={() => handleToggleTipoIncidenciaCluster('barras')}
              />
              <span>Barras</span>
            </label>
          </div>
        </div>

        <div className="estadisticas">
          <h4>📊 Estadísticas</h4>
          <div className="stat-item">
            <span className="stat-label">Total de puntos:</span>
            <span className="stat-value">{estadisticas.totalPuntos.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Clusters generados:</span>
            <span className="stat-value">{estadisticas.totalClusters}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Puntos clusteados:</span>
            <span className="stat-value">{estadisticas.puntosClusteados.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Porcentaje clusteado:</span>
            <span className="stat-value">{porcentajeClusteado}%</span>
          </div>
        </div>

        <div className="leyenda">
          <h4>🎨 Leyenda</h4>
          <div className="leyenda-item">
            <div className="color-box amarillo"></div>
            <span>2-3 incidencias</span>
          </div>
          <div className="leyenda-item">
            <div className="color-box naranja"></div>
            <span>4-6 incidencias</span>
          </div>
          <div className="leyenda-item">
            <div className="color-box rojo"></div>
            <span>7+ incidencias</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlClusters; 