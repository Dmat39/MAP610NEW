import React, { useEffect, useState } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { obtenerBodycams } from '../../services/bodycamService';

const GoogleCapaBodycams = ({ visible, bodycamSeleccionada }) => {
  const [bodycams, setBodycams] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);

  useEffect(() => {
    if (!visible) return;

    const fetchBodycams = async () => {
      try {
        const data = await obtenerBodycams();
        const activas = data.filter(bc => bc.activa && bc.latitud && bc.longitud);
        setBodycams(activas);
      } catch (error) {
        console.error("Error fetching bodycams (Google):", error);
      }
    };

    fetchBodycams();
    const interval = setInterval(fetchBodycams, 30000);

    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (bodycamSeleccionada) {
      setActiveMarker(bodycamSeleccionada.nombre);
    }
  }, [bodycamSeleccionada]);

  if (!visible) return null;

  const svgIcon = {
    path: "M5 2 h14 a2 2 0 0 1 2 2 v16 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 V4 a2 2 0 0 1 2 -2 z M12 10 a4 4 0 1 0 0 8 a4 4 0 0 0 0 -8 z M12 6 h.01",
    fillColor: "#ffffff",
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: "#f97316",
    scale: 1.2,
    anchor: { x: 12, y: 12 },
  };

  return (
    <>
      {bodycams.map((bc) => (
        <Marker
          key={`g-bodycam-${bc.nombre}`}
          position={{ lat: parseFloat(bc.latitud), lng: parseFloat(bc.longitud) }}
          icon={svgIcon}
          onClick={() => setActiveMarker(bc.nombre)}
          zIndex={1500}
        >
          {activeMarker === bc.nombre && (
            <InfoWindow onCloseClick={() => setActiveMarker(null)}>
              <div style={{ fontSize: '13px', color: '#333' }}>
                <strong style={{ color: '#f97316' }}>📹 Bodycam: {bc.nombre}</strong><br />
                <strong>Código:</strong> {bc.codigo}<br />
                <strong>Última act.:</strong> {new Date(bc.ultima_ubicacion).toLocaleString()}<br />
              </div>
            </InfoWindow>
          )}
        </Marker>
      ))}
    </>
  );
};

export default React.memo(GoogleCapaBodycams);
