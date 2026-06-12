import React, { useEffect, useRef } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Ícono para el inicio (Verde)
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Ícono para el fin (Rojo)
const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CapaHistorialBodycams = ({ dataRecorrido }) => {
  const map = useMap();
  const polylineRef = useRef(null);

  useEffect(() => {
    if (dataRecorrido && dataRecorrido.ubicaciones && dataRecorrido.ubicaciones.length > 0) {
      // Las coordenadas vienen en [lat, lng]
      // Nota: el backend lo devuelve ordenado DESC (el index 0 es el más reciente / Fin)
      // Vamos a invertirlo para que el 0 sea el Inicio.
      const ubicaciones = [...dataRecorrido.ubicaciones].reverse();
      
      const latlngs = ubicaciones
        .filter(u => u.latitud && u.longitud)
        .map(u => [parseFloat(u.latitud), parseFloat(u.longitud)]);

      if (latlngs.length > 0) {
        // Hacemos zoom para abarcar toda la línea
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [dataRecorrido, map]);

  if (!dataRecorrido || !dataRecorrido.ubicaciones || dataRecorrido.ubicaciones.length === 0) {
    return null;
  }

  // Recordar que invertimos para tener orden cronológico (Inicio -> Fin)
  const ubicacionesCronologicas = [...dataRecorrido.ubicaciones].reverse();
  const validas = ubicacionesCronologicas.filter(u => u.latitud && u.longitud);

  if (validas.length === 0) return null;

  const latlngs = validas.map(u => [parseFloat(u.latitud), parseFloat(u.longitud)]);
  const inicio = validas[0];
  const fin = validas[validas.length - 1];

  return (
    <>
      <Polyline 
        positions={latlngs} 
        color="#f97316" // Naranja
        weight={5}
        opacity={0.8}
        ref={polylineRef}
      />

      {/* Marcador de Inicio */}
      <Marker position={[inicio.latitud, inicio.longitud]} icon={startIcon}>
        <Popup>
          <div style={{ fontSize: '13px' }}>
            <strong style={{ color: 'green' }}>Punto de Inicio</strong><br/>
            <strong>Bodycam:</strong> {dataRecorrido.bodycam.nombre}<br/>
            <strong>Hora:</strong> {new Date(inicio.registrado_en).toLocaleString()}
          </div>
        </Popup>
      </Marker>

      {/* Marcador de Fin */}
      <Marker position={[fin.latitud, fin.longitud]} icon={endIcon}>
        <Popup>
          <div style={{ fontSize: '13px' }}>
            <strong style={{ color: 'red' }}>Punto Final</strong><br/>
            <strong>Bodycam:</strong> {dataRecorrido.bodycam.nombre}<br/>
            <strong>Hora:</strong> {new Date(fin.registrado_en).toLocaleString()}
          </div>
        </Popup>
      </Marker>
    </>
  );
};

export default CapaHistorialBodycams;
