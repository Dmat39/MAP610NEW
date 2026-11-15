import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Marker, Popup, LayerGroup, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import { COLOR, estadoBodycamPorTiempo } from '../../mapa/estados';
import { pinAPie } from '../../mapa/pines';
import { obtenerBodycams } from '../../../services/bodycamService';
import { computeJurisdiccion, pasaFiltroJurisdiccion } from '../../../utils/jurisdicciones';
import { haversineM } from '../../../utils/geoUtils';

// Mismo símbolo que en Despacho (bodycam = cámara en círculo; el color es el estado).
// Estado por tiempo desde la última ubicación (fecha inválida/ausente => DESCONECTADA)
const TEXTO_ESTADO = { disponible: 'ACTIVA', gps_viejo: 'INACTIVA', sin_reporte: 'DESCONECTADA' };
const estadoBodycam = (bc) => {
  const estado = estadoBodycamPorTiempo(bc.ultima_ubicacion);
  return { estado, color: COLOR[estado], estadoTexto: TEXTO_ESTADO[estado] };
};

const CapaBodycams = ({
  visible,
  bodycamSeleccionada,
  maxVisible,
  filtroEstado = ['ACTIVA', 'INACTIVA', 'DESCONECTADA'],
  filtroJurisdicciones = [],
  jurisdiccionesGeoJSON = null,
}) => {
  const [bodycams, setBodycams] = useState([]);
  const [mapView, setMapView] = useState(null);
  const map = useMap();
  const markersRef = useRef({});

  useMapEvents({
    moveend: () => setMapView({ bounds: map.getBounds(), center: map.getCenter() }),
    zoomend: () => setMapView({ bounds: map.getBounds(), center: map.getCenter() }),
  });

  useEffect(() => {
    if (map) setMapView({ bounds: map.getBounds(), center: map.getCenter() });
  }, [map]);

  // Precalcular la jurisdicción de cada bodycam una sola vez (por referencia, para
  // no colisionar cuando hay nombres repetidos o vacíos).
  const jurisdiccionPorBodycam = useMemo(() => {
    const mapa = new Map();
    if (!jurisdiccionesGeoJSON) return mapa;
    bodycams.forEach(bc => mapa.set(bc, computeJurisdiccion(bc.latitud, bc.longitud, jurisdiccionesGeoJSON)));
    return mapa;
  }, [bodycams, jurisdiccionesGeoJSON]);

  // Fetch initial data and set interval
  useEffect(() => {
    if (!visible) return;

    const fetchBodycams = async () => {
      try {
        const data = await obtenerBodycams();
        // Filtramos para asegurar que tengan lat y lng válidos, sin importar si están activas o no
        const conUbicacion = data.filter(bc => bc.latitud && bc.longitud);
        setBodycams(conUbicacion);
      } catch (error) {
        console.error("Error fetching bodycams:", error);
      }
    };

    fetchBodycams();
    const interval = setInterval(fetchBodycams, 15000); // Refrescar cada 15 segundos

    return () => clearInterval(interval);
  }, [visible]);

  // Center on selected bodycam
  useEffect(() => {
    if (bodycamSeleccionada && map) {
      const { latitud, longitud, nombre } = bodycamSeleccionada;
      if (latitud && longitud) {
        map.flyTo([latitud, longitud], 18, { animate: true, duration: 1.5 });
        setTimeout(() => {
          const marker = markersRef.current[`bodycam-${nombre}`];
          if (marker) marker.openPopup();
        }, 1600);
      }
    }
  }, [bodycamSeleccionada, map]);

  // Filtros de estado y jurisdicción; con límite, solo las N más cercanas al centro
  // dentro de la vista actual (mismo criterio que la capa de radios).
  const visibleBodycams = useMemo(() => {
    const filtradas = bodycams
      // La API envía latitud/longitud como texto: Leaflet necesita números (con strings,
      // LatLngBounds.contains entra en recursión infinita)
      .map((bc, idx) => ({ bc, idx, lat: Number(bc.latitud), lng: Number(bc.longitud), ...estadoBodycam(bc) }))
      .filter(({ bc, estadoTexto }) => {
        if (Array.isArray(filtroEstado)) {
          if (!filtroEstado.includes(estadoTexto)) return false;
        } else if (filtroEstado !== 'TODAS' && estadoTexto !== filtroEstado) {
          // Retrocompatibilidad temporal por si acaso
          return false;
        }
        // Filtro por jurisdicción global (selección vacía = todas)
        return pasaFiltroJurisdiccion(jurisdiccionPorBodycam.get(bc), filtroJurisdicciones);
      });

    if (!maxVisible || !mapView) return filtradas;

    const inBounds = filtradas.filter(({ lat, lng }) =>
      Number.isFinite(lat) && Number.isFinite(lng) && mapView.bounds.contains([lat, lng])
    );
    if (inBounds.length <= maxVisible) return inBounds;

    const { lat, lng } = mapView.center;
    return inBounds
      .sort((a, b) => haversineM(lat, lng, a.lat, a.lng) - haversineM(lat, lng, b.lat, b.lng))
      .slice(0, maxVisible);
  }, [bodycams, mapView, maxVisible, filtroEstado, filtroJurisdicciones, jurisdiccionPorBodycam]);

  if (!visible) return null;

  return (
    <LayerGroup>
      {visibleBodycams.map(({ bc, idx, color, estado, estadoTexto }) => {
        const refKey = `bodycam-${bc.nombre}`;        // para abrir popup de la buscada
        const markerId = `${refKey}-${idx}`;          // key única de React (evita colisión)

        return (
          <Marker
            key={markerId}
            position={[bc.latitud, bc.longitud]}
            icon={pinAPie({ tipo: 'BODYCAM', estado })}
            zIndexOffset={1500}
            ref={ref => {
              if (ref) markersRef.current[refKey] = ref;
            }}
          >
            <Popup>
              <div style={{ fontSize: '13px', minWidth: '150px' }}>
                <strong style={{ color }}>📹 Bodycam: {bc.nombre}</strong><br />
                <strong>Estado:</strong> <span style={{ color, fontWeight: 'bold' }}>{estadoTexto}</span><br />
                <strong>Código:</strong> {bc.codigo}<br />
                <strong>Última act.:</strong> {new Date(bc.ultima_ubicacion).toLocaleString()}<br />
                <strong>Lat:</strong> {bc.latitud}<br />
                <strong>Lng:</strong> {bc.longitud}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default React.memo(CapaBodycams);
