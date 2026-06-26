// LeyendaBodycams.jsx
import React, { useEffect, useRef } from 'react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './LeyendaBodycams.css';

const PANEL_ID = 'leyendaBodycams';
const PANEL_ORDER = 3;
const PANEL_HEIGHT = 200;
const BASE_RIGHT = 20;

const PIN_BODYCAM = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36" className="leyenda-bodycams-pin">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke={color} strokeWidth="2.5"/>
    <circle cx="14" cy="13" r="9" fill="white" stroke={color} strokeWidth="1.5"/>
    <rect x="10.5" y="8" width="7" height="10" rx="1.5" fill={color}/>
    <circle cx="14" cy="11.5" r="2" fill="white"/>
  </svg>
);

const ESTADOS = [
  { color: '#16a34a', label: 'ACTIVA',        desc: 'Activa (últimos 30 min)' },
  { color: '#eab308', label: 'INACTIVA',       desc: 'Sin movimiento (30–60 min)' },
  { color: '#9ca3af', label: 'DESCONECTADA',   desc: 'Sin señal (más de 60 min)' },
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
        {ESTADOS.map(({ color, label, desc }) => (
          <div key={label} className="leyenda-bodycams-item">
            <PIN_BODYCAM color={color} />
            <div className="leyenda-bodycams-info">
              <span className="leyenda-bodycams-label" style={{ color }}>{label}</span>
              <span className="leyenda-bodycams-desc">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeyendaBodycams;
