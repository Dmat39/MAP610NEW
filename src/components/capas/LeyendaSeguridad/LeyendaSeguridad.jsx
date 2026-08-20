// LeyendaSeguridad.jsx
// Leyenda unificada y colapsable para todas las capas de seguridad.
// Colapsada: muestra un ícono flotante (FAB) con el número de capas activas.
// Expandida: muestra una sección por cada capa activa (vecinales, municipales, radios, bodycams).
import React, { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { useMapContext } from '../../../context/MapContext';
import { useMapLayout } from '../../../context/MapLayoutContext';
import './LeyendaSeguridad.css';

const BASE_RIGHT = 20;
const BASE_BOTTOM = 20;

// ---- Pines reutilizados de las leyendas originales ----
const PinVecinal = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="23" viewBox="0 0 28 36" className="ls-pin">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke={color} strokeWidth="2.5"/>
    <circle cx="14" cy="13" r="9" fill="white" stroke={color} strokeWidth="1.5"/>
    <rect x="7" y="10" width="14" height="9" rx="1.5" fill={color}/>
    <circle cx="14" cy="14.5" r="3.5" fill="white"/>
    <circle cx="14" cy="14.5" r="1.8" fill={color}/>
    <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill={color}/>
  </svg>
);

const PinMunicipal = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36" className="ls-pin">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill={color}/>
    <circle cx="14" cy="13" r="9" fill="white" opacity="0.93"/>
    <rect x="7" y="10" width="14" height="9" rx="1.5" fill={color}/>
    <circle cx="14" cy="14.5" r="3.5" fill="white"/>
    <circle cx="14" cy="14.5" r="1.8" fill={color}/>
    <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill={color}/>
  </svg>
);

const PinRadio = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 26 26" className="ls-pin">
    <rect x="2" y="2" width="22" height="22" rx="6" fill="white" stroke={color} strokeWidth="2.5"/>
    <rect x="14.5" y="5.5" width="1.5" height="4" rx="0.75" fill={color}/>
    <rect x="9" y="8" width="8" height="12" rx="1.5" fill={color}/>
    <rect x="10.5" y="9.5" width="5" height="3.5" rx="0.5" fill="white" opacity="0.9"/>
    <circle cx="13" cy="16" r="1.5" fill="white"/>
    <rect x="11" y="18.5" width="4" height="0.6" rx="0.3" fill="white" opacity="0.6"/>
  </svg>
);

const PinBodycam = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36" className="ls-pin">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke={color} strokeWidth="2.5"/>
    <circle cx="14" cy="13" r="9" fill="white" stroke={color} strokeWidth="1.5"/>
    <rect x="10.5" y="8" width="7" height="10" rx="1.5" fill={color}/>
    <circle cx="14" cy="11.5" r="2" fill="white"/>
  </svg>
);

const ESTADOS_RADIOS = [
  { color: '#3b82f6', label: 'OK', desc: 'Radio activo con GPS' },
  { color: '#f97316', label: 'SIN GPS', desc: 'Encendido sin señal GPS' },
  { color: '#6b7280', label: 'APAGADO', desc: 'Radio desconectado' },
];

const ESTADOS_BODYCAMS = [
  { color: '#16a34a', label: 'ACTIVA', desc: 'Activa (últimos 30 min)' },
  { color: '#eab308', label: 'INACTIVA', desc: 'Sin movimiento (30–60 min)' },
  { color: '#9ca3af', label: 'DESCONECTADA', desc: 'Sin señal (más de 60 min)' },
];

const TIPOS_MUNICIPALES = [
  { color: '#3B82F6', tipo: 'TIPO I', desc: 'Cámara 180°' },
  { color: '#22C55E', tipo: 'TIPO II', desc: 'Cámara 360°' },
  { color: '#8B5CF6', tipo: 'TIPO III', desc: 'LPR (Placas)' },
];

const LeyendaSeguridad = ({
  vecinalesVisible = false,
  municipalesVisible = false,
  radiosVisible = false,
  bodycamsVisible = false,
  panelFiltersVisible = false,
}) => {
  const { marcasCamarasVisibles, handleToggleMarcaCamara, conteoCamarasVecinales } = useMapContext();
  const { rightOffset } = useMapLayout();
  const [expanded, setExpanded] = useState(false);

  const activeCount =
    (vecinalesVisible ? 1 : 0) +
    (municipalesVisible ? 1 : 0) +
    (radiosVisible ? 1 : 0) +
    (bodycamsVisible ? 1 : 0);

  // Sin capas activas: no renderizar nada.
  if (activeCount === 0) return null;

  const posStyle = {
    right: BASE_RIGHT + rightOffset,
    bottom: BASE_BOTTOM,
    transition: 'right 0.3s ease',
  };

  // Colapsada: ícono flotante.
  if (!expanded) {
    return (
      <button
        className="ls-fab"
        style={{ ...posStyle, display: panelFiltersVisible ? 'none' : 'flex' }}
        onClick={() => setExpanded(true)}
        title="Mostrar leyenda de cámaras"
        aria-label="Mostrar leyenda de cámaras"
      >
        <Camera size={22} />
        <span className="ls-fab-badge">{activeCount}</span>
      </button>
    );
  }

  // Expandida: panel con secciones.
  return (
    <div className="ls-panel" style={{ ...posStyle, display: panelFiltersVisible ? 'none' : 'block' }}>
      <div className="ls-panel-header">
        <div className="ls-panel-title">
          <Camera size={16} />
          <span>Leyenda de Seguridad</span>
        </div>
        <button
          className="ls-close-btn"
          onClick={() => setExpanded(false)}
          title="Ocultar leyenda"
          aria-label="Ocultar leyenda"
        >
          <X size={16} />
        </button>
      </div>

      <div className="ls-panel-body">
        {vecinalesVisible && (
          <div className="ls-section">
            <h5 className="ls-section-title" style={{ color: '#ef4444' }}>Cámaras Vecinales</h5>
            <div className="ls-items">
              <label className="ls-item ls-item-check">
                <input
                  type="checkbox"
                  checked={!!marcasCamarasVisibles?.HIKVISION}
                  onChange={() => handleToggleMarcaCamara('HIKVISION')}
                  className="ls-checkbox"
                />
                <PinVecinal color="#ef4444" />
                <span className="ls-label">HIKVISION ({conteoCamarasVecinales?.HIKVISION ?? 0})</span>
              </label>
              <label className="ls-item ls-item-check">
                <input
                  type="checkbox"
                  checked={!!marcasCamarasVisibles?.DAHUA}
                  onChange={() => handleToggleMarcaCamara('DAHUA')}
                  className="ls-checkbox"
                />
                <PinVecinal color="#3b82f6" />
                <span className="ls-label">DAHUA ({conteoCamarasVecinales?.DAHUA ?? 0})</span>
              </label>
            </div>
          </div>
        )}

        {municipalesVisible && (
          <div className="ls-section">
            <h5 className="ls-section-title" style={{ color: '#3B82F6' }}>Cámaras Municipales</h5>
            <div className="ls-items">
              {TIPOS_MUNICIPALES.map(({ color, tipo, desc }) => (
                <div key={tipo} className="ls-item">
                  <PinMunicipal color={color} />
                  <div className="ls-info">
                    <span className="ls-info-label" style={{ color }}>{tipo}</span>
                    <span className="ls-info-desc">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {radiosVisible && (
          <div className="ls-section">
            <h5 className="ls-section-title" style={{ color: '#3b82f6' }}>Radios GPS</h5>
            <div className="ls-items">
              {ESTADOS_RADIOS.map(({ color, label, desc }) => (
                <div key={label} className="ls-item">
                  <PinRadio color={color} />
                  <div className="ls-info">
                    <span className="ls-info-label" style={{ color }}>{label}</span>
                    <span className="ls-info-desc">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bodycamsVisible && (
          <div className="ls-section">
            <h5 className="ls-section-title" style={{ color: '#16a34a' }}>Bodycams</h5>
            <div className="ls-items">
              {ESTADOS_BODYCAMS.map(({ color, label, desc }) => (
                <div key={label} className="ls-item">
                  <PinBodycam color={color} />
                  <div className="ls-info">
                    <span className="ls-info-label" style={{ color }}>{label}</span>
                    <span className="ls-info-desc">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeyendaSeguridad;
