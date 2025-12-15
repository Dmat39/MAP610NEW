import { useEffect, useState } from 'react';
import { Marker, Popup, LayerGroup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import FiltroGiro from '../../filtros/FiltroGiro';
import { logger } from '../../../utils/logger.js';

const API_URL = import.meta.env.VITE_API_URL;

const iconoDefensa = new L.Icon({
  iconUrl: '/icon/defensa.png',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  popupAnchor: [0, -20],
});

const normalizarTexto = texto =>
  (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const CapaDefensaCivil = ({ visible }) => {
  const [lugares, setLugares] = useState([]);
  const [filtroGiro, setFiltroGiro] = useState('');
  const [girosDisponibles, setGirosDisponibles] = useState([]);

  useEffect(() => {
    if (!visible) return;

    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    fetch(`${API_URL}defense?page=0`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('Respuesta no válida');
        return res.json();
      })
      .then(responseData => {
        let datos = [];

        if (Array.isArray(responseData)) {
          datos = responseData;
        } else if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
          datos = responseData.data.data;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          datos = responseData.data;
        }

        setLugares(datos);

        const giros = [
          ...new Set(
            datos
              .map(item => item.GIro || item.giro)
              .filter(giro => typeof giro === 'string' && giro.trim() !== '')
          ),
        ];
        setGirosDisponibles(giros);
      })
      .catch(err => {
        logger.error('❌ Error cargando defensa civil:', err);
        setLugares([]);
        setGirosDisponibles([]);
      });
  }, [visible]);

  if (!visible) return null;

  const lugaresFiltrados =
    filtroGiro.trim() === ''
      ? lugares
      : lugares.filter(item => normalizarTexto(item.GIro || item.giro).includes(normalizarTexto(filtroGiro)));

  return (
    <>
      <FiltroGiro
        value={filtroGiro}
        onChangeFiltro={setFiltroGiro}
        listaOriginal={girosDisponibles}
      />

      <LayerGroup>
        {lugaresFiltrados.map((item, idx) => {
          const lat = parseFloat(item.latitude || item.lat || item.Latitud);
          const lng = parseFloat(item.longitude || item.lng || item.Longitud);

          if (isNaN(lat) || isNaN(lng)) {
            logger.warn(`⚠️ Coordenadas inválidas en índice ${idx}:`, item);
            return null;
          }

          return (
            <Marker key={item.id || `${lat}-${lng}-${idx}`} position={[lat, lng]} icon={iconoDefensa}>
              <Popup>
                <div style={{ fontSize: '13px', maxWidth: '260px' }}>
                  <strong>🏢 Defensa Civil</strong>
                  <br />
                  <strong>Dirección:</strong> {item.address || item.Dirección || 'Sin dirección'}
                  <br />
                  <strong>Giro:</strong> {item.GIro || item.giro || 'Sin giro'}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
                {item.GIro || item.giro || 'Defensa Civil'}
              </Tooltip>
            </Marker>
          );
        })}
      </LayerGroup>
    </>
  );
};

export default CapaDefensaCivil;
