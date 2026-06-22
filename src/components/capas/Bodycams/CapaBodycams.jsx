import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup, LayerGroup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { obtenerBodycams } from '../../../services/bodycamService';

// SVG Icono Bodycam dinámico
const svgBodycam = (color) => `
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
  <circle cx="12" cy="14" r="4"></circle>
  <path d="M12 6h.01"></path>
</svg>
`;

const getIconoBodycam = (color) => new L.DivIcon({
  html: `<div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">${svgBodycam(color)}</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
  className: ''
});

const CapaBodycams = ({ visible, bodycamSeleccionada }) => {
  const [bodycams, setBodycams] = useState([]);
  const map = useMap();
  const markersRef = useRef({});

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
    const interval = setInterval(fetchBodycams, 30000); // Refrescar cada 30 segundos

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

  if (!visible) return null;

  return (
    <LayerGroup>
      {bodycams.map((bc, idx) => {
        const markerId = `bodycam-${bc.nombre}`;
        
        // Calcular estado por tiempo
        const ahora = new Date();
        const ultima = new Date(bc.ultima_ubicacion);
        const diffMinutos = (ahora - ultima) / (1000 * 60);

        let color = '#16a34a'; // Verde por defecto (Activa)
        let estadoTexto = 'ACTIVA';
        if (diffMinutos > 60) {
          color = '#9ca3af'; // Gris (Desconectada)
          estadoTexto = 'DESCONECTADA';
        } else if (diffMinutos > 30) {
          color = '#eab308'; // Amarillo (Inactiva)
          estadoTexto = 'INACTIVA';
        }

        return (
          <Marker
            key={markerId}
            position={[bc.latitud, bc.longitud]}
            icon={getIconoBodycam(color)}
            zIndexOffset={1500}
            ref={ref => {
              if (ref) markersRef.current[markerId] = ref;
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
