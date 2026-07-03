// TotalesSeguridad.jsx
// Fila compacta de totales por capa de seguridad (respetando la jurisdicción).
// Se muestra al fondo del panel de filtros para ver rápido "cuántos hay".
import React from 'react';
import { useMapContext } from '../../../context/MapContext';
import './TotalesSeguridad.css';

const fmt = (n) => (typeof n === 'number' ? n : '—');

const TotalesSeguridad = ({
  municipalesVisible = false,
  vecinalesVisible = false,
  bodycamsVisible = false,
  radiosVisible = false,
  conteos = {},
  jurisdiccionesSeleccionadas = [],
}) => {
  const { conteoCamarasVecinales } = useMapContext();

  const items = [];
  if (municipalesVisible) items.push({ key: 'mun', label: 'Cámaras', color: '#3B82F6', value: conteos.municipales });
  if (vecinalesVisible) {
    const totalVec = (conteoCamarasVecinales?.HIKVISION ?? 0) + (conteoCamarasVecinales?.DAHUA ?? 0);
    items.push({ key: 'vec', label: 'Vecinales', color: '#ef4444', value: totalVec });
  }
  if (bodycamsVisible) items.push({ key: 'bod', label: 'Bodycams', color: '#16a34a', value: conteos.bodycams });
  if (radiosVisible) items.push({ key: 'rad', label: 'Radios', color: '#6366f1', value: conteos.radios });

  if (items.length === 0) return null;

  const zonas = Array.isArray(jurisdiccionesSeleccionadas) ? jurisdiccionesSeleccionadas : [];
  const zonaLabel =
    zonas.length === 0 ? 'Todas las zonas' : zonas.length === 1 ? zonas[0] : `${zonas.length} zonas`;

  return (
    <div className="ts-block">
      <div className="ts-head">
        <span className="ts-title">Totales</span>
        <span className="ts-zona">{zonaLabel}</span>
      </div>
      <div className="ts-grid">
        {items.map(({ key, label, color, value }) => (
          <div key={key} className="ts-tile" style={{ borderTopColor: color }}>
            <span className="ts-num" style={{ color }}>{fmt(value)}</span>
            <span className="ts-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TotalesSeguridad;
