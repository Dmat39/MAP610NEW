import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup, LayerGroup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { obtenerBodycams } from '../../../services/bodycamService';

const _iconCacheBodycam = new Map();

const crearIconoBodycamModerno = (color) => {
  const cacheKey = color;
  if (_iconCacheBodycam.has(cacheKey)) return _iconCacheBodycam.get(cacheKey);

  const icon = new L.DivIcon({
    html: `<div>
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 28 36" style="display:block; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.3));">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="white" stroke="${color}" stroke-width="2.5"/>
        <circle cx="14" cy="13" r="9" fill="white" stroke="${color}" stroke-width="1.5"/>
        <rect x="10.5" y="8" width="7" height="10" rx="1.5" fill="${color}"/>
        <circle cx="14" cy="11.5" r="2" fill="white"/>
      </svg>
    </div>`,
    iconSize: [22, 28],
    iconAnchor: [11, 28],
    popupAnchor: [0, -28],
    className: '',
  });

  _iconCacheBodycam.set(cacheKey, icon);
  return icon;
};

const CapaBodycams = ({ visible, bodycamSeleccionada, filtroEstado = ['ACTIVA', 'INACTIVA', 'DESCONECTADA'] }) => {
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

        if (Array.isArray(filtroEstado)) {
          if (!filtroEstado.includes(estadoTexto)) return null;
        } else {
          // Retrocompatibilidad temporal por si acaso
          if (filtroEstado !== 'TODAS' && estadoTexto !== filtroEstado) return null;
        }

        return (
          <Marker
            key={markerId}
            position={[bc.latitud, bc.longitud]}
            icon={crearIconoBodycamModerno(color)}
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
