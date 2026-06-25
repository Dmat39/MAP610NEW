import React, { useEffect, useState } from 'react';
import { Marker, InfoWindow, useGoogleMap } from '@react-google-maps/api';
import { obtenerBodycams } from '../../services/bodycamService';

const GoogleCapaBodycams = ({ visible, bodycamSeleccionada, filtroEstado = 'TODAS' }) => {
  const [bodycams, setBodycams] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const [zoomNivel, setZoomNivel] = useState(1);
  const map = useGoogleMap();

  useEffect(() => {
    if (!map) return;
    const updateZoom = () => {
      const zoom = map.getZoom();
      let nivel = 3;
      if (zoom <= 12) nivel = 1;
      else if (zoom <= 15) nivel = 2;
      setZoomNivel(nivel);
    };
    updateZoom();
    const listener = map.addListener('zoom_changed', updateZoom);
    return () => window.google.maps.event.removeListener(listener);
  }, [map]);

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

        let svgStr = '';
        let size = [22, 28];
        let anchor = [11, 28];

        if (zoomNivel >= 3) {
          svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke="${color}" stroke-width="2.5"/><circle cx="14" cy="13" r="9" fill="white" stroke="${color}" stroke-width="1.5"/><rect x="10.5" y="8" width="7" height="10" rx="1.5" fill="${color}"/><circle cx="14" cy="11.5" r="2" fill="white"/></svg>`;
          size = [22, 28];
          anchor = [11, 28];
        } else if (zoomNivel === 2) {
          svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="18" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="${color}"/><circle cx="14" cy="12" r="5" fill="white"/></svg>`;
          size = [14, 18];
          anchor = [7, 18];
        } else {
          svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="${color}" stroke="white" stroke-width="1"/></svg>`;
          size = [8, 8];
          anchor = [4, 4];
        }

        const encodedSvg = svgStr.replace(/#/g, '%23');
        const iconConfig = window.google && window.google.maps ? {
          url: `data:image/svg+xml;charset=UTF-8,${encodedSvg}`,
          scaledSize: new window.google.maps.Size(size[0], size[1]),
          anchor: new window.google.maps.Point(anchor[0], anchor[1])
        } : null;

        return (
        <Marker
          key={`g-bodycam-${bc.nombre}`}
          position={{ lat: parseFloat(bc.latitud), lng: parseFloat(bc.longitud) }}
          icon={iconConfig}
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
