import { useEffect, useState, memo } from 'react';

const GoogleCapaBusquedaDirecciones = ({ visible, resultados = [], resultadoSeleccionado = null, map, google }) => {
  const [markers, setMarkers] = useState([]);

  // Función para limpiar marcadores existentes
  const limpiarMarcadores = () => {
    markers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      }
    });
    setMarkers([]);
  };

  // Función para crear marcadores de resultados
  const crearMarcadores = (resultadosData) => {
    if (!map || !google) return;

    limpiarMarcadores();

    if (!resultadosData || resultadosData.length === 0) return;

    // Filtrar resultados según la selección
    const resultadosAMostrar = resultadoSeleccionado 
      ? resultadosData.filter(resultado => resultado.id === resultadoSeleccionado)
      : resultadosData;

    console.log(`📌 Creando ${resultadosAMostrar.length} marcadores en Google Maps${resultadoSeleccionado ? ` (solo resultado seleccionado: ${resultadoSeleccionado})` : ''}`);

    const newMarkers = [];

    resultadosAMostrar.forEach((resultado, index) => {
      console.log(`📌 Creando marcador ${index + 1}:`, resultado.direccion);

      // Crear marcador
      const marker = new google.maps.Marker({
        position: { lat: resultado.lat, lng: resultado.lng },
        map: map,
        title: resultado.direccion,
        icon: {
          url: '/icon/robo.png', // Reutilizando icono existente
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        }
      });

      // Info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-size: 13px; max-width: 260px;">
            <strong>🔍 Resultado de Búsqueda</strong><br />
            <strong>Dirección:</strong> ${resultado.direccion}<br />
            <strong>Distrito:</strong> ${resultado.distrito || 'No especificado'}<br />
            <strong>Tipo:</strong> ${resultado.tipo || 'Dirección'}
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Centrar mapa según la selección
    if (resultadosAMostrar.length > 0) {
      if (resultadoSeleccionado) {
        // Si hay selección específica, centrar en ese resultado con más zoom
        const resultadoSeleccionadoData = resultadosAMostrar[0];
        map.setCenter({ lat: resultadoSeleccionadoData.lat, lng: resultadoSeleccionadoData.lng });
        map.setZoom(18);
      } else {
        // Si no hay selección, centrar en el primer resultado con zoom normal
        const primerResultado = resultadosAMostrar[0];
        map.setCenter({ lat: primerResultado.lat, lng: primerResultado.lng });
        map.setZoom(16);
      }
    }
  };

  // Efecto para crear marcadores cuando cambian los resultados o la selección
  useEffect(() => {
    if (visible && resultados.length > 0) {
      crearMarcadores(resultados);
    } else {
      limpiarMarcadores();
    }
  }, [visible, resultados, resultadoSeleccionado, map, google]);

  // Limpiar marcadores cuando la visibilidad cambie
  useEffect(() => {
    if (!visible) {
      limpiarMarcadores();
    }
  }, [visible]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      limpiarMarcadores();
    };
  }, []);

  return null; // Este componente no renderiza JSX
};

export default memo(GoogleCapaBusquedaDirecciones);