// Mapa de calor de cobertura (fase 4): dónde patrullaron de verdad las móviles en el turno.
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat/dist/leaflet-heat.js';

/** `puntos`: [[lat, lng], ...]. Se dibuja con leaflet.heat (ya usado en el mapa general). */
const CapaCalor = ({ puntos }) => {
  const map = useMap();
  const capa = useRef(null);
  useEffect(() => {
    if (capa.current) { map.removeLayer(capa.current); capa.current = null; }
    if (!puntos?.length || !L.heatLayer) return undefined;
    capa.current = L.heatLayer(puntos.map(([lat, lng]) => [lat, lng, 0.6]), {
      radius: 14, blur: 12, maxZoom: 16, minOpacity: 0.3,
      gradient: { 0.2: '#bfdbfe', 0.5: '#3b82f6', 0.8: '#1d4ed8', 1: '#1e3a8a' },
    }).addTo(map);
    return () => { if (capa.current) { map.removeLayer(capa.current); capa.current = null; } };
  }, [map, puntos]);
  return null;
};

export default CapaCalor;
