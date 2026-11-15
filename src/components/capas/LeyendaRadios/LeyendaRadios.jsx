// LeyendaRadios.jsx
import React, { useEffect, useRef } from 'react';
import { useMapLayout } from '../../../context/MapLayoutContext';
import { COLOR } from '../../mapa/estados';
import { SimboloAPie, SimboloMovil } from '../../mapa/simbolos';
import './LeyendaRadios.css';

const PANEL_ID = 'leyendaRadios';
const PANEL_ORDER = 2;
const PANEL_HEIGHT = 192;
const BASE_RIGHT = 20;

// Forma = qué es (camioneta, moto o sereno a pie); color = estado. Igual que en Despacho.
const FORMAS = [
  { key: 'camioneta', simbolo: <SimboloMovil subtipo="CAMION" size={20} />, label: 'Móvil (camioneta)' },
  { key: 'moto',      simbolo: <SimboloMovil subtipo="MOTO" size={20} />,   label: 'Moto' },
  { key: 'apie',      simbolo: <SimboloAPie tipo="RADIO" size={20} />,      label: 'Sereno a pie con radio' },
];
const ESTADOS = [
  { estado: 'disponible',  label: 'OK',      desc: 'Radio activo con GPS' },
  { estado: 'gps_viejo',   label: 'SIN GPS', desc: 'Encendido sin señal GPS' },
  { estado: 'sin_reporte', label: 'APAGADO', desc: 'Radio desconectado' },
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
        {FORMAS.map(({ key, simbolo, label }) => (
          <div key={key} className="leyenda-radios-item">
            {simbolo}
            <div className="leyenda-radios-info">
              <span className="leyenda-radios-desc">{label}</span>
            </div>
          </div>
        ))}
        {ESTADOS.map(({ estado, label, desc }) => (
          <div key={label} className="leyenda-radios-item">
            <span className="leyenda-estado" style={{ background: COLOR[estado] }} />
            <div className="leyenda-radios-info">
              <span className="leyenda-radios-label" style={{ color: COLOR[estado] }}>{label}</span>
              <span className="leyenda-radios-desc">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeyendaRadios;
