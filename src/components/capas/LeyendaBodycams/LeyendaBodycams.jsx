// LeyendaBodycams.jsx
import React, { useEffect, useRef } from 'react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import { COLOR } from '../../mapa/estados';
import { SimboloAPie } from '../../mapa/simbolos';
import './LeyendaBodycams.css';

const PANEL_ID = 'leyendaBodycams';
const PANEL_ORDER = 3;
const PANEL_HEIGHT = 200;
const BASE_RIGHT = 20;

// Mismo símbolo que en Despacho; el color es el estado.
const ESTADOS = [
  { estado: 'disponible',  label: 'ACTIVA',       desc: 'Activa (últimos 30 min)' },
  { estado: 'gps_viejo',   label: 'INACTIVA',     desc: 'Sin movimiento (30 a 60 min)' },
  { estado: 'sin_reporte', label: 'DESCONECTADA', desc: 'Sin señal (más de 60 min)' },
];

const LeyendaBodycams = ({ visible }) => {
  const { registerPanel, unregisterPanel, getBottomOffset, rightOffset } = useMapLayout();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => registerPanel(PANEL_ID, { order: PANEL_ORDER, height: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { ro.disconnect(); unregisterPanel(PANEL_ID); };
  }, [visible, registerPanel, unregisterPanel]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="leyenda-bodycams"
      style={{
        bottom: getBottomOffset(PANEL_ID),
        right: BASE_RIGHT + rightOffset,
        transition: 'bottom 0.3s ease, right 0.3s ease',
      }}
    >
      <div className="leyenda-bodycams-header">
        <h4>Bodycams</h4>
      </div>

      <div className="leyenda-bodycams-content">
        {ESTADOS.map(({ estado, label, desc }) => (
          <div key={label} className="leyenda-bodycams-item">
            <SimboloAPie tipo="BODYCAM" estado={estado} size={20} />
            <div className="leyenda-bodycams-info">
              <span className="leyenda-bodycams-label" style={{ color: COLOR[estado] }}>{label}</span>
              <span className="leyenda-bodycams-desc">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeyendaBodycams;
