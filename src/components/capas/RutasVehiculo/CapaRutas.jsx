import React, { useEffect, useState } from 'react';
import { useMap, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { logger } from '../../../utils/logger.js';

const CapaRutas = ({ visible, onRutaCalculada }) => {
  const map = useMap();
  const [markers, setMarkers] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Iconos personalizados para diferentes tipos de marcadores
  const createCustomIcon = color =>
    new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

  const startIcon = createCustomIcon('green');
  const intermediateIcon = createCustomIcon('green');
  const endIcon = createCustomIcon('red');

  useEffect(() => {
    if (!visible) {
      // Limpiar ruta y marcadores cuando la capa no es visible
      setMarkers([]);
      setRoute(null);
      if (onRutaCalculada) onRutaCalculada(null);
      return;
    }

    // Configurar el evento de clic en el mapa cuando la capa es visible
    const handleMapClick = e => {
      const { lat, lng } = e.latlng;

      setMarkers(prevMarkers => {
        const newMarkers = [
          ...prevMarkers,
          {
            position: [lat, lng],
            id: prevMarkers.length + 1,
          },
        ];

        // Si tenemos al menos dos marcadores, calcular la ruta
        if (newMarkers.length >= 2) {
          calculateRoute(newMarkers);
        }

        return newMarkers;
      });
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, visible, onRutaCalculada]);

  // Escuchar evento de limpiar ruta
  useEffect(() => {
    const handleClearRouteEvent = () => {
      if (visible) {
        setMarkers([]);
        setRoute(null);
        setError(null);
        setLoading(false);
        if (onRutaCalculada) onRutaCalculada(null);
      }
    };

    window.addEventListener('clearRoute', handleClearRouteEvent);

    return () => {
      window.removeEventListener('clearRoute', handleClearRouteEvent);
    };
  }, [visible, onRutaCalculada]);

  const calculateRoute = async markersToRoute => {
    setLoading(true);
    setError(null);

    try {
      // Convertir coordenadas a formato OSRM (longitude,latitude)
      const coordinates = markersToRoute
        .map(marker => `${marker.position[1]},${marker.position[0]}`)
        .join(';');

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`
      );

      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No se pudo encontrar una ruta entre los puntos seleccionados');
      }

      // Extraer la geometría de la ruta
      const routeGeometry = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      const routeInfo = {
        geometry: routeGeometry,
        distance: (data.routes[0].distance / 1000).toFixed(2), // Convertir a km
        duration: Math.round(data.routes[0].duration / 60), // Convertir a minutos
        waypoints: markersToRoute.length,
      };

      setRoute(routeInfo);

      // Notificar al componente padre sobre la ruta calculada
      if (onRutaCalculada) {
        onRutaCalculada(routeInfo);
      }
    } catch (err) {
      logger.error('Error al calcular la ruta:', err);
      setError(err.message);
      if (onRutaCalculada) onRutaCalculada(null);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {markers.map((marker, index) => (
        <Marker
          key={marker.id}
          position={marker.position}
          icon={index === 0 ? startIcon : index === markers.length - 1 ? endIcon : intermediateIcon}
        >
          <Popup>
            {index === 0 ? 'Origen' : index === markers.length - 1 ? 'Destino' : `Parada ${index}`}
          </Popup>
        </Marker>
      ))}

      {route && (
        <>
          <Polyline positions={route.geometry} color="#16a34a" weight={6} opacity={0.8} />
          <Popup position={route.geometry[Math.floor(route.geometry.length / 2)]}>
            <div>
              <strong>Distancia:</strong> {route.distance} km
              <br />
              {/* <strong>Tiempo estimado:</strong> {route.duration} min<br /> */}
              <strong>Paradas:</strong> {route.waypoints}
            </div>
          </Popup>
        </>
      )}

      {loading && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
          }}
        >
          Calculando ruta...
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            color: 'red',
          }}
        >
          Error: {error}
        </div>
      )}
    </>
  );
};

// Optimizar con React.memo para evitar re-renders innecesarios
export default React.memo(CapaRutas);
