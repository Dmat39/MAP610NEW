import { useEffect, useState, useMemo, useCallback } from 'react';
import { Marker, Popup, LayerGroup, Tooltip } from 'react-leaflet';
import FiltroGiro from '../../filtros/FiltroGiro';
import { logger } from '../../../utils/logger.js';
import { createDefensaCivilIcon } from '../../../utils/adaptiveIcons';

const API_URL = import.meta.env.VITE_API_URL;

const normalizarTexto = texto =>
  (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Límites de San Juan de Lurigancho (bounding box)
const SJL_BOUNDS = {
  minLat: -12.03,
  maxLat: -11.85,
  minLng: -77.02,
  maxLng: -76.88
};

// Verificar si un punto está dentro de San Juan de Lurigancho
const estaDentroSJL = (lat, lng) => {
  return lat >= SJL_BOUNDS.minLat &&
         lat <= SJL_BOUNDS.maxLat &&
         lng >= SJL_BOUNDS.minLng &&
         lng <= SJL_BOUNDS.maxLng;
};

// Tamaño fijo del icono (evita re-renders por zoom)
const ICON_SIZE = 36;

// Caché del icono - se crea una sola vez
const iconoDefensaCivil = createDefensaCivilIcon(ICON_SIZE);

const CapaDefensaCivil = ({ visible }) => {
  const [lugares, setLugares] = useState([]);
  const [filtroGiro, setFiltroGiro] = useState('');
  const [girosDisponibles, setGirosDisponibles] = useState([]);

  // Callback memoizado para el filtro
  const handleFiltroChange = useCallback((valor) => {
    setFiltroGiro(valor);
  }, []);

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

        // Pre-procesar: filtrar y normalizar coordenadas al cargar
        const datosProcesados = datos
          .map((item, idx) => {
            const lat = parseFloat(item.latitude || item.lat || item.Latitud);
            const lng = parseFloat(item.longitude || item.lng || item.Longitud);

            if (isNaN(lat) || isNaN(lng) || !estaDentroSJL(lat, lng)) {
              return null;
            }

            return {
              ...item,
              _lat: lat,
              _lng: lng,
              _giroNorm: normalizarTexto(item.GIro || item.giro),
              _id: item.id || `${lat}-${lng}-${idx}`
            };
          })
          .filter(Boolean);

        setLugares(datosProcesados);

        const giros = [
          ...new Set(
            datosProcesados
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

  // Memoizar lugares filtrados
  const lugaresFiltrados = useMemo(() => {
    if (filtroGiro.trim() === '') {
      return lugares;
    }
    const filtroNorm = normalizarTexto(filtroGiro);
    return lugares.filter(item => item._giroNorm.includes(filtroNorm));
  }, [lugares, filtroGiro]);

  if (!visible) return null;

  return (
    <>
      <FiltroGiro
        value={filtroGiro}
        onChangeFiltro={handleFiltroChange}
        listaOriginal={girosDisponibles}
      />

      <LayerGroup>
        {lugaresFiltrados.map((item) => (
          <Marker
            key={item._id}
            position={[item._lat, item._lng]}
            icon={iconoDefensaCivil}
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
              offset={[0, -28]}
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
        ))}
      </LayerGroup>
    </>
  );
};

export default CapaDefensaCivil;
