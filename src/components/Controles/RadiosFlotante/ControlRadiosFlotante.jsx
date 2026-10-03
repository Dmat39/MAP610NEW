import React from 'react';
import './ControlRadiosFlotante.css';

// Estados equivalentes de radios y bodycams. Con ambas capas activas se muestra un
// solo botón por fila (OK = Activas, Sin GPS = Inactivas, Apagado = Desconectadas).
const ESTADOS = [
  { key: 'TODOS',   radio: 'TODOS',   bodycam: ['ACTIVA', 'INACTIVA', 'DESCONECTADA'], radioLabel: 'Todos',   bodycamLabel: 'Todas',         color: '#6366f1' },
  { key: 'OK',      radio: 'OK',      bodycam: ['ACTIVA'],                             radioLabel: 'OK',      bodycamLabel: 'Activas',       color: '#16a34a' },
  { key: 'SIN GPS', radio: 'SIN GPS', bodycam: ['INACTIVA'],                           radioLabel: 'Sin GPS', bodycamLabel: 'Inactivas',     color: '#a16207' },
  { key: 'APAGADO', radio: 'APAGADO', bodycam: ['DESCONECTADA'],                       radioLabel: 'Apagado', bodycamLabel: 'Desconectadas', color: '#dc2626' },
];

const mismosEstados = (a, b) =>
  Array.isArray(a) && a.length === b.length && b.every(x => a.includes(x));

// Control flotante superior: estados + un único límite compartido por radios y
// bodycams (si ambas capas están activas, los mismos valores aplican a las dos).
const ControlRadiosFlotante = ({
  radiosVisible,
  bodycamsVisible,
  maxVisible,
  onMaxVisibleChange,
  filtroEstadoRadios,
  onFiltroEstadoRadiosChange,
  filtroEstadoBodycams,
  onFiltroEstadoBodycamsChange,
}) => {
  if (!radiosVisible && !bodycamsVisible) return null;

  const capasLimite = [radiosVisible && 'radios', bodycamsVisible && 'bodycams'].filter(Boolean).join(' y ');

  // Con ambas capas se usan las etiquetas de radios (OK = Activas, etc.)
  const getLabel = (e) => (radiosVisible ? e.radioLabel : e.bodycamLabel);

  const isActivo = (e) =>
    (!radiosVisible || filtroEstadoRadios === e.radio) &&
    (!bodycamsVisible || mismosEstados(filtroEstadoBodycams, e.bodycam));

  const seleccionar = (e) => {
    if (radiosVisible) onFiltroEstadoRadiosChange(e.radio);
    if (bodycamsVisible) onFiltroEstadoBodycamsChange([...e.bodycam]);
  };

  return (
    <div className="cr-flotante">
      <div className="cr-flotante-estados">
        {ESTADOS.map(e => (
          <button
            key={e.key}
            className={`cr-flotante-btn ${isActivo(e) ? 'activo' : ''}`}
            style={{ '--estado-color': e.color }}
            onClick={() => seleccionar(e)}
            title={`Mostrar solo: ${getLabel(e)}`}
          >
            <span className="cr-flotante-dot" />
            {getLabel(e)}
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
          title={`Máximo de ${capasLimite} visibles en el mapa: ${maxVisible ?? '∞'}`}
        />
        <span className="cr-flotante-valor">
          {maxVisible === null ? '∞' : maxVisible}
        </span>
      </div>
    </div>
  );
};

export default ControlRadiosFlotante;
