// LeyendaRadios.jsx
import React, { useEffect, useRef } from 'react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './LeyendaRadios.css';

const PANEL_ID = 'leyendaRadios';
const PANEL_ORDER = 2;
const PANEL_HEIGHT = 192;
const BASE_RIGHT = 20;

const PIN_RADIO = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36" className="leyenda-radios-pin">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke={color} strokeWidth="2.5"/>
    <circle cx="14" cy="13" r="9" fill="white" stroke={color} strokeWidth="1.5"/>
    <rect x="15.5" y="4.5" width="1.5" height="3.5" rx="0.75" fill={color}/>
    <rect x="10" y="7.5" width="8" height="11" rx="1.5" fill={color}/>
    <rect x="11.5" y="9" width="5" height="3" rx="0.5" fill="white" opacity="0.9"/>
    <rect x="11.5" y="13.5" width="3" height="1.5" rx="0.5" fill="white" opacity="0.8"/>
    <rect x="11.5" y="16" width="5" height="0.8" rx="0.4" fill="white" opacity="0.5"/>
    <rect x="11.5" y="17.2" width="4" height="0.8" rx="0.4" fill="white" opacity="0.5"/>
  </svg>
);

const ESTADOS = [
  { color: '#22c55e', label: 'OK',       desc: 'Radio activo con GPS' },
  { color: '#eab308', label: 'SIN GPS',  desc: 'Encendido sin señal GPS' },
  { color: '#ef4444', label: 'APAGADO',  desc: 'Radio desconectado' },
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
