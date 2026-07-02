// LeyendaRadios.jsx
import React, { useEffect, useRef } from 'react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './LeyendaRadios.css';

const PANEL_ID = 'leyendaRadios';
const PANEL_ORDER = 2;
const PANEL_HEIGHT = 192;
const BASE_RIGHT = 20;

const PIN_RADIO = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 26 26" className="leyenda-radios-pin">
    <rect x="2" y="2" width="22" height="22" rx="6" fill="white" stroke={color} strokeWidth="2.5"/>
    <rect x="14.5" y="5.5" width="1.5" height="4" rx="0.75" fill={color}/>
    <rect x="9" y="8" width="8" height="12" rx="1.5" fill={color}/>
    <rect x="10.5" y="9.5" width="5" height="3.5" rx="0.5" fill="white" opacity="0.9"/>
    <circle cx="13" cy="16" r="1.5" fill="white"/>
    <rect x="11" y="18.5" width="4" height="0.6" rx="0.3" fill="white" opacity="0.6"/>
  </svg>
);

const ESTADOS = [
  { color: '#3b82f6', label: 'OK',       desc: 'Radio activo con GPS' },
  { color: '#f97316', label: 'SIN GPS',  desc: 'Encendido sin señal GPS' },
  { color: '#6b7280', label: 'APAGADO',  desc: 'Radio desconectado' },
];

const LeyendaRadios = ({ visible }) => {
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
      className="leyenda-radios"
      style={{
        bottom: getBottomOffset(PANEL_ID),
        right: BASE_RIGHT + rightOffset,
        transition: 'bottom 0.3s ease, right 0.3s ease',
      }}
    >
      <div className="leyenda-radios-header">
        <h4>Radios GPS</h4>
      </div>

      <div className="leyenda-radios-content">
        {ESTADOS.map(({ color, label, desc }) => (
          <div key={label} className="leyenda-radios-item">
            <PIN_RADIO color={color} />
            <div className="leyenda-radios-info">
              <span className="leyenda-radios-label" style={{ color }}>{label}</span>
              <span className="leyenda-radios-desc">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeyendaRadios;
