import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Shield, CalendarDays, RotateCcw, SlidersHorizontal, BarChart3, Palette } from 'lucide-react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './ControlClusterPNP.css';

const SIBLING_ID  = 'clusters';
const BASE_RIGHT  = 10;
const PANEL_WIDTH = 300;
const GAP         = 10;

const getDefaultFechas = () => {
  const hoy    = new Date();
  const hace30 = new Date(); hace30.setDate(hoy.getDate() - 30);
  const f = d => d.toISOString().split('T')[0];
  return { fechaInicio: f(hace30), fechaFin: f(hoy) };
};

const ControlClusterPNP = ({ visible, radio, setRadio, fechas, setFechas, clusterNormalVisible = false, clusterCombinadoVisible = false }) => {
  const { getBottomOffset, rightOffset } = useMapLayout();
  const [collapsed, setCollapsed] = useState(true);
  const [stats,     setStats]     = useState({ totalClusters: 0, totalPuntos: 0, puntosClusteados: 0 });

  useEffect(() => {
    const handler = e => setStats(e.detail);
    window.addEventListener('clustersPNPGenerados', handler);
    return () => window.removeEventListener('clustersPNPGenerados', handler);
  }, []);

  const resetFechas = () => setFechas(getDefaultFechas());

  const pct = stats.totalPuntos > 0
    ? ((stats.puntosClusteados / stats.totalPuntos) * 100).toFixed(1)
    : 0;

  if (!visible) return null;

  return (
    <div
      className="ctrl-pnp"
      style={{
        bottom: getBottomOffset(SIBLING_ID),
        right: BASE_RIGHT
          + (clusterNormalVisible    ? PANEL_WIDTH + GAP : 0)
          + (clusterCombinadoVisible ? PANEL_WIDTH + GAP : 0)
          + rightOffset,
      }}
    >
      {/* Header */}
      <div className="ctrl-pnp__header" onClick={() => setCollapsed(v => !v)}>
        <div className="ctrl-pnp__header-content">
          <Shield size={17} className="ctrl-pnp__icon" />
          <h3>Cluster PNP</h3>
        </div>
        <button className="ctrl-pnp__toggle">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Body */}
      <div className={`ctrl-pnp__body${collapsed ? ' ctrl-pnp__body--hidden' : ''}`}>

        {/* Período */}
        <div className="ctrl-pnp__periodo">
          <div className="ctrl-pnp__periodo-header">
            <CalendarDays size={14} color="#2563eb" />
            <span className="ctrl-pnp__periodo-label">Período de datos</span>
          </div>
          <div className="ctrl-pnp__dates">
            <div className="ctrl-pnp__date-group">
              <label>Desde</label>
              <input type="date" value={fechas.fechaInicio} max={fechas.fechaFin}
                onChange={e => setFechas(f => ({ ...f, fechaInicio: e.target.value }))} />
            </div>
            <div className="ctrl-pnp__date-group">
              <label>Hasta</label>
              <input type="date" value={fechas.fechaFin} min={fechas.fechaInicio}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setFechas(f => ({ ...f, fechaFin: e.target.value }))} />
            </div>
          </div>
          <button className="ctrl-pnp__reset" onClick={resetFechas}>
            <RotateCcw size={13} /> Últimos 30 días
          </button>
        </div>

        {/* Radio */}
        <div className="ctrl-pnp__radio">
          <label>
            <SlidersHorizontal size={13} color="#2563eb" /> Radio de Clustering
          </label>
          <div className="ctrl-pnp__slider-row">
            <input className="ctrl-pnp__slider" type="range" min="0" max="300" value={radio}
              onChange={e => setRadio(Number(e.target.value))} />
            <span className="ctrl-pnp__slider-val">{radio}m</span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="ctrl-pnp__stats">
          <h4><BarChart3 size={13} color="#2563eb" /> Estadísticas</h4>
          <div className="ctrl-pnp__stat"><span>Total de puntos:</span><span>{stats.totalPuntos.toLocaleString()}</span></div>
          <div className="ctrl-pnp__stat"><span>Clusters generados:</span><span>{stats.totalClusters}</span></div>
          <div className="ctrl-pnp__stat"><span>Puntos clusteados:</span><span>{stats.puntosClusteados.toLocaleString()}</span></div>
          <div className="ctrl-pnp__stat"><span>Porcentaje clusteado:</span><span>{pct}%</span></div>
        </div>

        {/* Leyenda */}
        <div className="ctrl-pnp__leyenda">
          <h4><Palette size={13} color="#2563eb" /> Leyenda</h4>
          <div className="ctrl-pnp__legend-item"><span className="ctrl-pnp__dot ctrl-pnp__dot--low" />2-3 incidencias</div>
          <div className="ctrl-pnp__legend-item"><span className="ctrl-pnp__dot ctrl-pnp__dot--med" />4-6 incidencias</div>
          <div className="ctrl-pnp__legend-item"><span className="ctrl-pnp__dot ctrl-pnp__dot--high" />7+ incidencias</div>
        </div>

      </div>
    </div>
  );
};

export default ControlClusterPNP;
