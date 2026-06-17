import { useEffect, useState, useRef, memo } from "react";

const GoogleCapaResiduos = ({ visible, map, google }) => {
  const [puntos, setPuntos] = useState([]);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  // Crear InfoWindow una sola vez
  useEffect(() => {
    if (!map || !google || infoWindowRef.current) return;

    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [map, google]);

  // Fetch data cuando sea visible
  useEffect(() => {
    if (!visible) {
      setPuntos([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/data/puntos_criticos_residuos.json");
        const data = await response.json();
        setPuntos(data);
      } catch (error) {
        console.error("Error fetching residuos data:", error);
        setPuntos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [visible]);

  // Crear marcadores
  useEffect(() => {
    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current = [];

    if (!map || !google || !visible || puntos.length === 0 || !infoWindowRef.current) {
      return;
    }

    puntos.forEach((punto) => {
      const lat = parseFloat(punto.latitud);
      const lng = parseFloat(punto.longitud);

      if (isNaN(lat) || isNaN(lng)) return;

      // Definir color del marcador según el tipo
      const pinColor = punto.id_tipo === 'verde' ? '34ce57' : 'ffed4e';
      const strokeColor = punto.id_tipo === 'verde' ? '1e7e34' : 'e0a800';

      // Crear icono SVG personalizado
      const svgMarker = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: `#${pinColor}`,
        fillOpacity: 1,
        strokeColor: `#${strokeColor}`,
        strokeWeight: 2,
        scale: 8,
      };

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: svgMarker,
        title: `${punto.nombre} (${punto.id_tipo})`,
      });

      // Contenido del InfoWindow
      const colorTexto = punto.id_tipo === 'verde' ? '#28a745' : '#ffc107';
      const infoContent = `
        <div style="font-size: 13px; max-width: 260px; font-family: Arial, sans-serif;">
          <strong style="color: ${colorTexto};">
            🗑️ Punto Crítico de Residuos
          </strong><br/>
          <strong>Código:</strong> ${punto.nombre}<br/>
          <strong>Tipo:</strong> 
          <span style="color: ${colorTexto}; font-weight: bold; text-transform: capitalize;">
            ${punto.id_tipo}
          </span><br/>
          <strong>Coordenadas:</strong><br/>
          Lat: ${punto.latitud}<br/>
          Lng: ${punto.longitud}
        </div>
      `;

      // Event listener para el click
      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
    });

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, [map, google, visible, puntos]);

  // Cleanup cuando el componente se desmonta o se oculta
  useEffect(() => {
    if (!visible) {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current = [];
      
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    }
  }, [visible]);

  // Este componente no renderiza JSX, solo maneja los marcadores de Google Maps
  return null;
};

export default memo(GoogleCapaResiduos);