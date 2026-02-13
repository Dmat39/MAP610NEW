import { useEffect, useState } from 'react';
import { Marker, Popup, LayerGroup, Tooltip } from 'react-leaflet';
import { logger } from '../../../utils/logger.js';
import { createActividadesIcon } from '../../../utils/adaptiveIcons';

const API_URL = import.meta.env.VITE_API_URL;

const ICON_SIZE = 36;
const iconoActividad = createActividadesIcon(ICON_SIZE);

const CapaActividades = ({ visible }) => {
  const [puntos, setPuntos] = useState([]);

  useEffect(() => {
    if (!visible) return;

    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    fetch(`${API_URL}activity?page=0`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('Respuesta no válida');
        return res.json();
      })
      .then(responseData => {
        logger.info('Respuesta del backend actividades:', responseData);
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
          logger.warn('Estructura de respuesta no reconocida:', responseData);
        }

        const datosProcesados = datos
          .map((item, idx) => {
            const lat = parseFloat(item.latitude || item.lat);
            const lng = parseFloat(item.longitude || item.lng);

            if (isNaN(lat) || isNaN(lng)) {
              logger.warn(`Coordenadas inválidas en índice ${idx}:`, item);
              return null;
            }

            return {
              ...item,
              _lat: lat,
              _lng: lng,
              _id: item.id || `actividad-${lat}-${lng}-${idx}`
            };
          })
          .filter(Boolean);

        setPuntos(datosProcesados);
      })
      .catch(err => {
        logger.error('Error cargando actividades:', err);
        setPuntos([]);
      });
  }, [visible]);

  if (!visible) return null;

  return (
    <LayerGroup>
      {puntos.map((item) => (
        <Marker
          key={item._id}
          position={[item._lat, item._lng]}
          icon={iconoActividad}
        >
          <Popup>
            <div style={{ fontSize: '14px', maxWidth: '300px' }}>
              <div style={{
                borderBottom: "2px solid #d97706",
                paddingBottom: "8px",
                marginBottom: "10px",
                fontWeight: "bold",
                color: "#d97706"
              }}>
                Actividad
              </div>
              {item.act_type && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>Tipo:</strong>
                  <span style={{ marginLeft: "6px", color: "#d97706", fontWeight: "600" }}>
                    {item.act_type}
                  </span>
                </div>
              )}
              {item.description && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>Descripción:</strong>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                    {item.description}
                  </div>
                </div>
              )}
              {item.address && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>Dirección:</strong>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                    {item.address}
                  </div>
                </div>
              )}
              {item.representative && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>Representante:</strong>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                    {item.representative}
                  </div>
                </div>
              )}
              {item.done_at && (
                <div style={{ marginBottom: "8px" }}>
                  <strong>Fecha:</strong>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                    {item.done_at.split('T')[0]}
                  </div>
                </div>
              )}
            </div>
          </Popup>
          <Tooltip
            direction="top"
            offset={[0, -28]}
            opacity={0.95}
            className="actividad-tooltip"
          >
            <div style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#d97706",
              textAlign: "center"
            }}>
              {item.act_type || 'Actividad'} - {item.description || ''}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </LayerGroup>
  );
};

export default CapaActividades;
