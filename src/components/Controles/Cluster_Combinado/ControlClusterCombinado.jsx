import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Link2, CalendarDays, RotateCcw, SlidersHorizontal, BarChart3, Palette } from 'lucide-react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './ControlClusterCombinado.css';

const SIBLING_ID = 'clusters';
const CLUSTERS_WIDTH = 300;
const GAP = 10;
const BASE_RIGHT = 10;

const ControlClusterCombinado = ({
  visible,
  clusterNormalVisible = false,
  radio,
  setRadio,
  fechas,
  setFechas,
  mapType = 'leaflet',
}) => {
  const { getBottomOffset, rightOffset } = useMapLayout();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [stats, setStats] = useState({
    totalClusters: 0,
    totalPuntos: 0,
    puntosClusteados: 0,
    totalSerenos: 0,
    totalPnp: 0,
  });

  useEffect(() => {
    const handler = e => setStats(e.detail);
    window.addEventListener('clusterCombinadoGenerado', handler);
    return () => window.removeEventListener('clusterCombinadoGenerado', handler);
  }, []);

  if (!visible) return null;

  const pct = stats.totalPuntos > 0
    ? ((stats.puntosClusteados / stats.totalPuntos) * 100).toFixed(1)
    : 0;

  const resetearFechas = () => {
    const today = new Date();
    const hace30 = new Date();
    hace30.setDate(today.getDate() - 30);
    const fmt = d => d.toISOString().split('T')[0];
    setFechas({ fechaInicio: fmt(hace30), fechaFin: fmt(today) });
  };

  return (
    <div
      className="ctrl-combinado"
      style={{
        bottom: getBottomOffset(SIBLING_ID),
        right: clusterNormalVisible
          ? BASE_RIGHT + CLUSTERS_WIDTH + GAP + rightOffset
          : BASE_RIGHT + rightOffset,
        transition: 'bottom 0.3s ease, right 0.3s ease',
      }}
    >
      <div className="ctrl-combinado-header" onClick={() => setIsCollapsed(p => !p)}>
        <div className="ctrl-combinado-header-content">
          <Link2 size={17} color="#16a34a" style={{ flexShrink: 0 }} />
          <h3>Cluster Combinado</h3>
        </div>
        <button>
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      <div className={`ctrl-combinado-body${isCollapsed ? ' hidden' : ''}`}>

        {/* Período de datos */}
        <div className="ctrl-combinado-periodo">
          <div className="ctrl-combinado-periodo-header">
            <CalendarDays size={14} color="#16a34a" />
            <span className="ctrl-combinado-periodo-label">Período de datos</span>
          </div>
          <div className="ctrl-combinado-fechas">
            <div className="ctrl-combinado-fecha-group">
              <label>Desde</label>
              <input
                type="date"
                value={fechas.fechaInicio}
                max={fechas.fechaFin}
                onChange={e => setFechas(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className="ctrl-combinado-fecha-input"
              />
            </div>
            <div className="ctrl-combinado-fecha-group">
              <label>Hasta</label>
              <input
                type="date"
                value={fechas.fechaFin}
                min={fechas.fechaInicio}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setFechas(prev => ({ ...prev, fechaFin: e.target.value }))}
                className="ctrl-combinado-fecha-input"
              />
            </div>
          </div>
          <button className="ctrl-combinado-btn-reset-fecha" onClick={resetearFechas}>
            <RotateCcw size={13} /> Últimos 30 días
          </button>
        </div>

        {/* Radio de clustering */}
        <div className="ctrl-combinado-radio">
          <label>
            <SlidersHorizontal size={13} color="#16a34a" /> Radio de Clustering
          </label>
          <div className="ctrl-combinado-slider-row">
            <input
              type="range"
              min="10"
              max="100"
              value={radio}
              onChange={e => setRadio(Number(e.target.value))}
              className="ctrl-combinado-slider"
            />
            <span className="ctrl-combinado-radio-value">{radio}m</span>
          </div>
        </div>

        {/* Fuentes */}
        <div className="ctrl-combinado-fuentes">
          <div className="fuente-badge serenos">
            <span className="fuente-num">{stats.totalSerenos.toLocaleString()}</span>
            <span className="fuente-label">Serenos</span>
          </div>
          <div className="fuente-badge pnp">
            <span className="fuente-num">{stats.totalPnp.toLocaleString()}</span>
            <span className="fuente-label">PNP</span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="ctrl-combinado-stats">
          <h4><BarChart3 size={13} color="#16a34a" /> Estadísticas</h4>
          <div className="ctrl-combinado-stat">
            <span>Total de puntos:</span>
            <span>{stats.totalPuntos.toLocaleString()}</span>
          </div>
          <div className="ctrl-combinado-stat">
            <span>Clusters generados:</span>
            <span>{stats.totalClusters}</span>
          </div>
          <div className="ctrl-combinado-stat">
            <span>Puntos clusteados:</span>
            <span>{stats.puntosClusteados.toLocaleString()}</span>
          </div>
          <div className="ctrl-combinado-stat">
            <span>Porcentaje clusteado:</span>
            <span>{pct}%</span>
          </div>
        </div>

        {/* Leyenda */}
        <div className="ctrl-combinado-leyenda">
          <h4><Palette size={13} color="#16a34a" /> Leyenda</h4>
          <div className="ctrl-combinado-leyenda-item">
            <div className="ctrl-combinado-color" style={{ background: '#FFD700' }} />
            <span>2–3 incidencias</span>
          </div>
          <div className="ctrl-combinado-leyenda-item">
            <div className="ctrl-combinado-color" style={{ background: '#FF8C00' }} />
            <span>4–6 incidencias</span>
          </div>
          <div className="ctrl-combinado-leyenda-item">
            <div className="ctrl-combinado-color" style={{ background: '#FF4500' }} />
            <span>7+ incidencias</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlClusterCombinado;
