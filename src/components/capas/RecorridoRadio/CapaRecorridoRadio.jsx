import React, { useEffect, useRef } from 'react';
import { Polyline, Marker, Popup, LayerGroup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

const iconInicio = new L.DivIcon({
  html: `<div style="background:#22c55e;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 2px 5px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7], className: '',
});
const iconFin = new L.DivIcon({
  html: `<div style="background:#ef4444;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 2px 5px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7], className: '',
});

const CapaRecorridoRadio = ({ visible, puntos, issi }) => {
  if (!visible || !puntos || puntos.length === 0) return null;

  const positions = puntos.map(p => [p.latitud, p.longitud]);
  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];

  return (
    <LayerGroup>
      <Polyline
        positions={positions}
        pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.85 }}
      />
      {/* Puntos intermedios como círculos pequeños */}
      {puntos.slice(1, -1).map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.latitud, p.longitud]}
          radius={3}
          pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.7, weight: 1 }}
        >
          <Popup>
            <div style={{ fontSize: '12px' }}>
              <strong>Punto {i + 2}</strong><br />
              <strong>Velocidad:</strong> {p.velocidad} km/h<br />
              <strong>Hora:</strong> {p.fechaHora}<br />
              <strong>Estado:</strong> {p.estado}
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {/* Marcador de inicio */}
      <Marker position={[inicio.latitud, inicio.longitud]} icon={iconInicio} zIndexOffset={2000}>
        <Popup>
          <div style={{ fontSize: '12px' }}>
            <strong style={{ color: '#22c55e' }}>Inicio</strong><br />
            <strong>ISSI:</strong> {issi}<br />
            <strong>Hora:</strong> {inicio.fechaHora}<br />
            <strong>Velocidad:</strong> {inicio.velocidad} km/h
          </div>
        </Popup>
      </Marker>
      {/* Marcador de fin */}
      <Marker position={[fin.latitud, fin.longitud]} icon={iconFin} zIndexOffset={2000}>
        <Popup>
          <div style={{ fontSize: '12px' }}>
            <strong style={{ color: '#ef4444' }}>Fin</strong><br />
            <strong>ISSI:</strong> {issi}<br />
            <strong>Hora:</strong> {fin.fechaHora}<br />
            <strong>Velocidad:</strong> {fin.velocidad} km/h
          </div>
        </Popup>
      </Marker>
    </LayerGroup>
  );
};

export default React.memo(CapaRecorridoRadio);
