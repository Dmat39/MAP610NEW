import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ZOOM_MI_UBICACION } from '../../../hooks/useMiUbicacion';
import { PIN_MI_UBICACION_SVG, PIN_ANCHO, PIN_ALTO } from './pinMiUbicacion';
import './CapaMiUbicacion.css';

// No interactivo y por debajo de los demás marcadores: si coincide con una cámara u otro
// punto, el toque llega a ese punto y no al pin
const iconoMiUbicacion = L.divIcon({
  className: 'mi-ubicacion-icon',
  html: PIN_MI_UBICACION_SVG,
  iconSize: [PIN_ANCHO, PIN_ALTO],
  iconAnchor: [PIN_ANCHO / 2, PIN_ALTO],
});

// Pin de "mi ubicación": centra el mapa una sola vez al obtener la posición; después el
// mapa queda libre. `centrarRef` lo usa el botón BotonMiUbicacion para volver a centrar.
const CapaMiUbicacion = ({ posicion, centrarRef }) => {
  const map = useMap();
  const marcadorRef = useRef(null);
  const centradoRef = useRef(false);

  useEffect(() => {
    centrarRef.current = (p) => map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), ZOOM_MI_UBICACION));
    return () => { centrarRef.current = null; };
  }, [map, centrarRef]);

  useEffect(() => {
    if (!posicion) return;
    const latlng = [posicion.lat, posicion.lng];
    if (!marcadorRef.current) {
      marcadorRef.current = L.marker(latlng, {
        icon: iconoMiUbicacion,
        interactive: false,
        keyboard: false,
        zIndexOffset: -1000,
      }).addTo(map);
    } else {
      marcadorRef.current.setLatLng(latlng);
    }
    if (!centradoRef.current) {
      centradoRef.current = true;
      map.setView(latlng, Math.max(map.getZoom(), ZOOM_MI_UBICACION));
    }
  }, [map, posicion]);

  useEffect(() => () => marcadorRef.current?.remove(), []);

  return null;
};

export default CapaMiUbicacion;
