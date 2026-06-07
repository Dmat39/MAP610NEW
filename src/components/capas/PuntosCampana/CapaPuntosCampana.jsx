import { useEffect, useState, useMemo } from 'react';
import { Marker, Popup, Tooltip, LayerGroup } from 'react-leaflet';
import { createCampaignPointIcon } from '../../../utils/adaptiveIcons';
import { logger } from '../../../utils/logger.js';

const API_URL = import.meta.env.VITE_API_URL;

// Colores de respaldo por categoría (coinciden con el seed)
const CATEGORY_COLORS = {
  'PROPUESTA CON EXP. TEC.': '#01579B',
  'PROPUESTA SIN EXP. TEC.': '#0288D1',
  'OXI_FINAL':               '#097138',
  'OBRAS 2026':              '#E53935',
  'OBRAS 2025':              '#F57C00',
  'OBRAS 2024':              '#FBC02D',
  'OBRAS 2023':              '#558B2F',
  'MANTENIMIENTO':           '#6D4C41',
  'OPCION 1':                '#7B1FA2',
};

const DEFAULT_COLOR = '#607D8B';

// Etiquetas legibles para el popup
const CATEGORY_LABELS = {
  'PROPUESTA CON EXP. TEC.': 'Propuesta c/ Exp. Técnico',
  'PROPUESTA SIN EXP. TEC.': 'Propuesta s/ Exp. Técnico',
  'OXI_FINAL':               'Obras por Impuestos (OXI)',
  'OBRAS 2026':              'Obras 2026',
  'OBRAS 2025':              'Obras 2025',
  'OBRAS 2024':              'Obras 2024',
  'OBRAS 2023':              'Obras 2023',
  'MANTENIMIENTO':           'Mantenimiento Vial',
  'OPCION 1':                'Opción 1',
};

const getColor = (punto) => punto.color || CATEGORY_COLORS[punto.category] || DEFAULT_COLOR;

const CapaPuntosCampana = ({ visible }) => {
  const [puntos, setPuntos] = useState([]);

  useEffect(() => {
    if (!visible) return;

    fetch(`${API_URL}campaign-point`)
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar puntos de campaña');
        return res.json();
      })
      .then(responseData => {
        let datos = [];
        if (Array.isArray(responseData)) datos = responseData;
        else if (responseData?.data?.data && Array.isArray(responseData.data.data)) datos = responseData.data.data;
        else if (responseData?.data && Array.isArray(responseData.data)) datos = responseData.data;
        setPuntos(datos.filter(p => p.lat != null && p.lng != null));
      })
      .catch(err => {
        logger.error('❌ Error cargando puntos de campaña:', err);
        setPuntos([]);
      });
  }, [visible]);

  // Caché de íconos por color
  const iconCache = useMemo(() => {
    const cache = {};
    puntos.forEach(p => {
      const c = getColor(p);
      if (!cache[c]) cache[c] = createCampaignPointIcon(c, 34);
    });
    return cache;
  }, [puntos]);

  if (!visible) return null;

  return (
    <LayerGroup>
      {puntos.map(punto => {
        const color = getColor(punto);
        const icon = iconCache[color];
        const catLabel = CATEGORY_LABELS[punto.category] || punto.category;

        const isMobile = window.innerWidth < 480;
        const popupWidth = isMobile ? window.innerWidth * 0.82 : 300;

        const popup = (
          <Popup minWidth={popupWidth} maxWidth={popupWidth}>
            <div style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.5, width: '100%' }}>
              {/* Encabezado */}
              <div style={{
                borderBottom: `3px solid ${color}`,
                paddingBottom: 6,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ fontSize: isMobile ? 14 : 16 }}>🚩</span>
                <span style={{ fontWeight: 700, color, fontSize: isMobile ? 12 : 13 }}>Punto de Campaña</span>
              </div>

              {/* Nombre */}
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#1a1a2e', fontSize: isMobile ? 12 : 13, wordBreak: 'break-word' }}>
                {punto.name}
              </div>

              {/* Categoría */}
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 600,
                  backgroundColor: `${color}22`,
                  color,
                  border: `1px solid ${color}55`,
                  wordBreak: 'break-word',
                }}>
                  {catLabel}
                </span>
              </div>

              {/* Descripción (HTML del KML) */}
              {punto.description && (
                <div style={{
                  fontSize: 11,
                  color: '#555',
                  borderTop: '1px solid #eee',
                  paddingTop: 6,
                  maxHeight: isMobile ? 120 : 150,
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                }}
                  dangerouslySetInnerHTML={{ __html: punto.description }}
                />
              )}
            </div>
          </Popup>
        );

        return (
          <Marker key={punto.id} position={[punto.lat, punto.lng]} icon={icon}>
            {popup}
            <Tooltip direction="top" offset={[0, -30]} opacity={0.95}>
              <span style={{ fontSize: 11, fontWeight: 600, color }}>{punto.name}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaPuntosCampana;
