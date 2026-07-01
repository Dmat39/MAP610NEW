import React, { useEffect, useRef } from 'react';
import { Marker, Popup, LayerGroup, Circle } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const iconoPunto = new L.DivIcon({
  html: `<div style="width:16px;height:16px;background:#f59e0b;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: '',
});

const crearIconoRadio = (hexacolor) => {
  const color = hexacolor || '#6366f1';
  return new L.DivIcon({
    html: `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
    className: '',
  });
};

const CapaPuntosCercanos = ({ visible, puntoSeleccionado, radiosEncontrados, metros }) => {
  const map = useMap();

  useEffect(() => {
    if (puntoSeleccionado && map) {
      map.flyTo([puntoSeleccionado.lat, puntoSeleccionado.lng], 15, { animate: true, duration: 1 });
    }
  }, [puntoSeleccionado, map]);

  if (!visible || !puntoSeleccionado) return null;

  return (
    <LayerGroup>
      {/* Punto seleccionado */}
      <Marker position={[puntoSeleccionado.lat, puntoSeleccionado.lng]} icon={iconoPunto} zIndexOffset={2000}>
        <Popup>
          <strong style={{ color: '#f59e0b' }}>📍 Punto seleccionado</strong><br />
          Lat: {puntoSeleccionado.lat.toFixed(6)}<br />
          Lng: {puntoSeleccionado.lng.toFixed(6)}
        </Popup>
      </Marker>

      {/* Círculo de radio */}
      <Circle
        center={[puntoSeleccionado.lat, puntoSeleccionado.lng]}
        radius={metros}
        pathOptions={{ color: '#f59e0b', fillColor: '#fef3c7', fillOpacity: 0.2, weight: 2, dashArray: '6 4' }}
      />

      {/* Radios encontrados — solo los que tienen posición GPS actual dentro del radio */}
      {Array.isArray(radiosEncontrados) && radiosEncontrados
        .filter(r => r.latitud != null && r.longitud != null && (r.distancia_metros == null || r.distancia_metros <= metros))
        .map((r) => (
        <Marker
          key={`cercano-${r.issi}`}
          position={[r.latitud, r.longitud]}
          icon={crearIconoRadio(r.hexacolor)}
          zIndexOffset={1800}
        >
          <Popup>
            <div style={{ fontSize: '13px', minWidth: '160px' }}>
              <strong style={{ color: r.hexacolor || '#6366f1' }}>📡 {r.unicocodigo || r.issi}</strong><br />
              <strong>ISSI:</strong> {r.issi}<br />
              <strong>Tipo:</strong> {r.tipo}<br />
              <strong>Estado:</strong> <span style={{ color: r.hexacolor }}>{r.estado}</span><br />
              <strong>Velocidad:</strong> {r.velocidad} km/h<br />
              <strong style={{ color: '#f59e0b' }}>Distancia:</strong> {r.distancia_metros} m
            </div>
          </Popup>
        </Marker>
      ))}
    </LayerGroup>
  );
};

export default React.memo(CapaPuntosCercanos);
