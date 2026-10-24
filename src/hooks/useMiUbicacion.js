import { useEffect, useState } from 'react';

export const ZOOM_MI_UBICACION = 16;

const MENSAJES_ERROR = {
  1: 'Permiso de ubicación denegado',
  2: 'No se pudo obtener la ubicación',
  3: 'La ubicación tardó demasiado',
};

// Sigue la posición del dispositivo mientras `activo` sea true
const useMiUbicacion = (activo = true) => {
  const [posicion, setPosicion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activo) {
      setPosicion(null);
      return;
    }
    if (!navigator.geolocation) {
      setError('El navegador no permite obtener la ubicación');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setError(null);
        setPosicion({ lat: coords.latitude, lng: coords.longitude });
      },
      (err) => setError(MENSAJES_ERROR[err.code] || 'No se pudo obtener la ubicación'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [activo]);

  return { posicion, error };
};

export default useMiUbicacion;
