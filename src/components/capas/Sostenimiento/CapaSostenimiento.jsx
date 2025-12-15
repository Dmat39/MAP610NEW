import { useEffect, useState } from 'react';
import { Marker, Popup, LayerGroup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils/logger.js';

const API_URL = import.meta.env.VITE_API_URL;

const iconoSostenimiento = new L.Icon({
  iconUrl: '/icon/recuperacion.png',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const CapaSostenimiento = ({ visible }) => {
  const [puntos, setPuntos] = useState([]);

  useEffect(() => {
    if (!visible) return;

    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    fetch(`${API_URL}sustenance?page=0`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('Respuesta no válida');
        return res.json();
      })
      .then(responseData => {
        logger.info('📦 Respuesta del backend sostenimiento:', responseData);
        let datos = [];

        if (Array.isArray(responseData)) {
          datos = responseData;
        } else if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
          datos = responseData.data.data;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          datos = responseData.data;
        } else if (responseData?.content && Array.isArray(responseData.content)) {
          datos = responseData.content;
        } else {
          logger.warn('⚠️ Estructura de respuesta no reconocida:', responseData);
        }

        setPuntos(datos);
      })
      .catch(err => {
        logger.error('❌ Error cargando puntos de sostenimiento:', err);
        setPuntos([]);
      });
  }, [visible]);

  if (!visible) return null;

  return (
    <LayerGroup>
      {Array.isArray(puntos) && puntos.map((item, idx) => {
        const lat = parseFloat(item.latitude || item.lat);
        const lng = parseFloat(item.longitude || item.lng);

        if (isNaN(lat) || isNaN(lng)) {
          logger.warn(`⚠️ Coordenadas inválidas en índice ${idx}:`, item);
          return null;
        }

        return (
          <Marker
            key={item.id || `sostenimiento-${lat}-${lng}-${idx}`}
            position={[lat, lng]}
            icon={iconoSostenimiento}
          >
            <Popup>
              <div style={{ fontSize: '13px', maxWidth: '260px' }}>
                <strong>🏪 Lugar Recuperado - Sostenimiento</strong>
                <br />
                <em style={{ fontSize: '11px', color: '#666' }}>
                  Zona recuperada por comercio ambulatorio
                </em>
                <br /><br />
                <strong>Código:</strong> {item.name || 'Sin nombre'}
                <br />
                {item.description && (
                  <>
                    <strong>Descripción:</strong> {item.description}
                    <br />
                  </>
                )}
                {item.address && (
                  <>
                    <strong>Dirección:</strong> {item.address}
                  </>
                )}
              </div>
            </Popup>
            <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
              🏪 {item.name || 'Sostenimiento'}
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaSostenimiento;
