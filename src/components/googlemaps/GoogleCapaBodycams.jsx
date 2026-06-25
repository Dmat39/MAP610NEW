import React, { useEffect, useState } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';
import { obtenerBodycams } from '../../services/bodycamService';

const GoogleCapaBodycams = ({ visible, bodycamSeleccionada, filtroEstado = 'TODAS' }) => {
  const [bodycams, setBodycams] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);

  useEffect(() => {
    if (!visible) return;

    const fetchBodycams = async () => {
      try {
        const data = await obtenerBodycams();
        const conUbicacion = data.filter(bc => bc.latitud && bc.longitud);
        setBodycams(conUbicacion);
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

      {bodycams.map((bc) => {
        const ahora = new Date();
        const ultima = new Date(bc.ultima_ubicacion);
        const diffMinutos = (ahora - ultima) / (1000 * 60);

        let color = '#16a34a';
        let estadoTexto = 'ACTIVA';
        if (diffMinutos > 60) {
          color = '#9ca3af';
          estadoTexto = 'DESCONECTADA';
        } else if (diffMinutos > 30) {
          color = '#eab308';
          estadoTexto = 'INACTIVA';
        }

        if (filtroEstado !== 'TODAS' && estadoTexto !== filtroEstado) {
          return null;
        }

        const svgIcon = {
          path: "M5 2 h14 a2 2 0 0 1 2 2 v16 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 V4 a2 2 0 0 1 2 -2 z M12 10 a4 4 0 1 0 0 8 a4 4 0 0 0 0 -8 z M12 6 h.01",
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: color,
          scale: 1.2,
          anchor: { x: 12, y: 12 },
        };

        return (
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
                <strong style={{ color }}>📹 Bodycam: {bc.nombre}</strong><br />
                <strong>Estado:</strong> <span style={{ color, fontWeight: 'bold' }}>{estadoTexto}</span><br />
                <strong>Código:</strong> {bc.codigo}<br />
                <strong>Última act.:</strong> {new Date(bc.ultima_ubicacion).toLocaleString()}<br />
              </div>
            </InfoWindow>
          )}
        </Marker>
        );
      })}
    </>
  );
};

export default React.memo(GoogleCapaBodycams);
