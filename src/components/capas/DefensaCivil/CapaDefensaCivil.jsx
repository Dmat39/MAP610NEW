import { useEffect, useState } from 'react';
import { Marker, Popup, LayerGroup, Tooltip, useMap } from 'react-leaflet';
import FiltroGiro from '../../filtros/FiltroGiro';
import { logger } from '../../../utils/logger.js';
import { createDefensaCivilIcon, getIconSizeForZoom } from '../../../utils/adaptiveIcons';

const API_URL = import.meta.env.VITE_API_URL;

const normalizarTexto = texto =>
  (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const CapaDefensaCivil = ({ visible }) => {
  const [lugares, setLugares] = useState([]);
  const [filtroGiro, setFiltroGiro] = useState('');
  const [girosDisponibles, setGirosDisponibles] = useState([]);
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

  // Calcular tamaño del icono según el zoom
  const iconSize = getIconSizeForZoom(currentZoom, 32, 48);

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
            <Marker
              key={item.id || `${lat}-${lng}-${idx}`}
              position={[lat, lng]}
              icon={createDefensaCivilIcon(iconSize)}
            >
              <Popup>
                <div style={{ fontSize: '14px', maxWidth: '300px' }}>
                  <div style={{
                    borderBottom: "2px solid #007bff",
                    paddingBottom: "8px",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#007bff"
                  }}>
                    🏢 Defensa Civil
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Dirección:</strong>
                    <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>
                      {item.address || item.Dirección || 'Sin dirección'}
                    </div>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong>Giro:</strong>
                    <span style={{
                      marginLeft: "6px",
                      padding: "2px 8px",
                      backgroundColor: "#cfe2ff",
                      color: "#007bff",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}>
                      {item.GIro || item.giro || 'Sin giro'}
                    </span>
                  </div>
                </div>
              </Popup>
              <Tooltip
                direction="top"
                offset={[0, -(iconSize / 2 + 10)]}
                opacity={0.95}
                className="defensa-civil-tooltip"
              >
                <div style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#007bff",
                  textAlign: "center"
                }}>
                  {item.GIro || item.giro || 'Defensa Civil'}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </LayerGroup>
    </>
  );
};

export default CapaDefensaCivil;
