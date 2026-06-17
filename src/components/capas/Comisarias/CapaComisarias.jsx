import { useEffect, useState, memo } from 'react';
import { Marker, Popup, LayerGroup, Tooltip } from 'react-leaflet';
import { createComisariaIcon } from '../../../utils/adaptiveIcons';
import { logger } from '../../../utils/logger.js';

const API_URL = import.meta.env.VITE_API_URL;
const iconoComisaria = createComisariaIcon();

const CapaComisarias = ({ visible }) => {
  const [comisarias, setComisarias] = useState([]);

  useEffect(() => {
    if (!visible) return;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}comisaria?page=0`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Respuesta no válida');
        return res.json();
      })
      .then(responseData => {
        let datos = [];
        if (Array.isArray(responseData)) datos = responseData;
        else if (responseData?.data?.data) datos = responseData.data.data;
        else if (responseData?.data) datos = responseData.data;
        setComisarias(datos.filter(c => c.latitude && c.longitude));
      })
      .catch(err => {
        logger.error('Error cargando comisarías:', err);
        setComisarias([]);
      });
  }, [visible]);

  if (!visible) return null;

  return (
    <LayerGroup>
      {comisarias.map(item => (
        <Marker
          key={item.id}
          position={[item.latitude, item.longitude]}
          icon={iconoComisaria}
        >
          <Popup>
            <div style={{ fontSize: '14px', maxWidth: '280px' }}>
              <div style={{
                borderBottom: '2px solid #1a237e',
                paddingBottom: '8px',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#1a237e',
              }}>
                🚔 Comisaría
              </div>
              {item.name && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Nombre:</strong>
                  <div style={{ fontSize: '12px', color: '#333', marginTop: '2px' }}>
                    {item.name}
                  </div>
                </div>
              )}
              <a
                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: '4px',
                  padding: '4px 12px',
                  backgroundColor: '#1a237e',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
              >
                Ver en Google Maps
              </a>
            </div>
          </Popup>
          {item.name && (
            <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a237e' }}>
                {item.name}
              </div>
            </Tooltip>
          )}
        </Marker>
      ))}
    </LayerGroup>
  );
};

export default memo(CapaComisarias);
