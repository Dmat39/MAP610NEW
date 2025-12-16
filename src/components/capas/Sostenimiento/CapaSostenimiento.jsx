import { useEffect, useState } from 'react';
import { Marker, Popup, LayerGroup, Tooltip, useMap } from 'react-leaflet';
import { logger } from '../../../utils/logger.js';
import { createSostenimientoIcon, getIconSizeForZoom } from '../../../utils/adaptiveIcons';

const API_URL = import.meta.env.VITE_API_URL;

const CapaSostenimiento = ({ visible }) => {
  const [puntos, setPuntos] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(13);
  const map = useMap();

  // Escuchar cambios de zoom
  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);
    setCurrentZoom(map.getZoom());

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

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

  // Calcular tamaño del icono según el zoom
  const iconSize = getIconSizeForZoom(currentZoom, 32, 48);

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
            icon={createSostenimientoIcon(iconSize)}
          >
            <Popup>
              <div style={{ fontSize: '14px', maxWidth: '300px' }}>
                <div style={{
                  borderBottom: "2px solid #6f42c1",
                  paddingBottom: "8px",
                  marginBottom: "10px",
                  fontWeight: "bold",
                  color: "#6f42c1"
                }}>
                  🏪 Lugar Recuperado - Sostenimiento
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '10px',
                  fontStyle: 'italic',
                  backgroundColor: '#f8f9fa',
                  padding: '6px 8px',
                  borderRadius: '4px'
                }}>
                  Zona recuperada por comercio ambulatorio
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Código:</strong>
                  <span style={{ marginLeft: "6px", color: "#6f42c1", fontWeight: "600" }}>
                    {item.name || 'Sin nombre'}
                  </span>
                </div>
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
              </div>
            </Popup>
            <Tooltip
              direction="top"
              offset={[0, -(iconSize / 2 + 10)]}
              opacity={0.95}
              className="sostenimiento-tooltip"
            >
              <div style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#6f42c1",
                textAlign: "center"
              }}>
                🏪 {item.name || 'Sostenimiento'}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaSostenimiento;
