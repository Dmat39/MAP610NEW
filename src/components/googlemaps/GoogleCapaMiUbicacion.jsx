import { useEffect, useRef } from 'react';
import { ZOOM_MI_UBICACION } from '../../hooks/useMiUbicacion';
import { PIN_MI_UBICACION_SVG, PIN_ANCHO, PIN_ALTO } from '../capas/MiUbicacion/pinMiUbicacion';

const PIN_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PIN_MI_UBICACION_SVG)}`;

// Versión Google Maps de CapaMiUbicacion: centra una vez y luego el mapa queda libre
const GoogleCapaMiUbicacion = ({ map, google, posicion, centrarRef }) => {
  const marcadorRef = useRef(null);
  const centradoRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    centrarRef.current = (p) => {
      map.panTo({ lat: p.lat, lng: p.lng });
      if (map.getZoom() < ZOOM_MI_UBICACION) map.setZoom(ZOOM_MI_UBICACION);
    };
    return () => { centrarRef.current = null; };
  }, [map, centrarRef]);

  useEffect(() => {
    if (!map || !google || !posicion) return;
    const position = { lat: posicion.lat, lng: posicion.lng };
    if (!marcadorRef.current) {
      // No clicable y por debajo del resto: el toque llega a la cámara/punto que esté al lado
      marcadorRef.current = new google.maps.Marker({
        map,
        position,
        clickable: false,
        zIndex: -1,
        icon: {
          url: PIN_URL,
          scaledSize: new google.maps.Size(PIN_ANCHO, PIN_ALTO),
          anchor: new google.maps.Point(PIN_ANCHO / 2, PIN_ALTO),
        },
      });
    } else {
      marcadorRef.current.setPosition(position);
    }
    if (!centradoRef.current) {
      centradoRef.current = true;
      map.setCenter(position);
      if (map.getZoom() < ZOOM_MI_UBICACION) map.setZoom(ZOOM_MI_UBICACION);
    }
  }, [map, google, posicion]);

  useEffect(() => () => marcadorRef.current?.setMap(null), []);

  return null;
};

export default GoogleCapaMiUbicacion;
