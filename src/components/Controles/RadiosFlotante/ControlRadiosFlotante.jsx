import React from 'react';
import './ControlRadiosFlotante.css';

const ESTADOS = [
  { key: 'TODOS',   label: 'Todos',   color: '#6366f1' },
  { key: 'OK',      label: 'OK',      color: '#16a34a' },
  { key: 'SIN GPS', label: 'Sin GPS', color: '#a16207' },
  { key: 'APAGADO', label: 'Apagado', color: '#dc2626' },
];

const ControlRadiosFlotante = ({ visible, maxVisible, onMaxVisibleChange, filtroEstado, onFiltroEstadoChange }) => {
  if (!visible) return null;

  return (
    <div className="cr-flotante">
      <div className="cr-flotante-estados">
        {ESTADOS.map(e => (
          <button
            key={e.key}
            className={`cr-flotante-btn ${filtroEstado === e.key ? 'activo' : ''}`}
            style={{ '--estado-color': e.color }}
            onClick={() => onFiltroEstadoChange(e.key)}
            title={`Mostrar solo: ${e.label}`}
          >
            <span className="cr-flotante-dot" />
            {e.label}
          </button>
        ))}
      </div>

      <div className="cr-flotante-divider" />

      <div className="cr-flotante-slider">
        <span className="cr-flotante-slider-label">Límite</span>
        <input
          type="range"
          className="cr-flotante-range"
          min={5}
          max={205}
          step={5}
          value={maxVisible === null ? 205 : maxVisible}
          onChange={e => {
            const v = parseInt(e.target.value);
            onMaxVisibleChange(v >= 205 ? null : v);
          }}
          title={`Máximo de radios visibles en el mapa: ${maxVisible ?? '∞'}`}
        />
        <span className="cr-flotante-valor">
          {maxVisible === null ? '∞' : maxVisible}
        </span>
      </div>
    </div>
  );
};

export default ControlRadiosFlotante;
