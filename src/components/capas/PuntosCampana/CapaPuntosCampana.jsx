import { useEffect, useState, useMemo } from 'react';
import { Marker, Popup, Tooltip, LayerGroup } from 'react-leaflet';
import { createCampaignPointIcon } from '../../../utils/adaptiveIcons';
import { logger } from '../../../utils/logger.js';

const API_URL = import.meta.env.VITE_API_URL;

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

// Limpia artefactos vacíos del KML (campos vacíos del template: "Descripción:", "nombre:")
const cleanDescription = (desc) => {
  if (!desc) return null;

  // Dividir por <br> y limpiar cada parte
  const isArtifact = (s) => /^(nombre|descripci[oó]n)\s*:?\s*$/i.test(s) || s === '';

  let parts = desc.split(/<br\s*\/?>/i).map(p => p.trim());

  // Quitar partes vacías o de template al final
  while (parts.length > 0 && isArtifact(parts[parts.length - 1])) parts.pop();

  // Quitar partes vacías al inicio
  while (parts.length > 0 && parts[0] === '') parts.shift();

  // Si la primera parte empieza con "Descripción: contenido", quitar el prefijo label
  if (parts.length > 0) {
    parts[0] = parts[0].replace(/^descripci[oó]n:\s*/i, '');
    if (!parts[0]) parts.shift();
  }

  const cleaned = parts.join('<br>').trim();
  return cleaned || null;
};

// Desduplicar por nombre normalizado: si hay POLYGON y MULTI con el mismo nombre
// (mismo lugar exportado dos veces por el KML), conservar solo uno
const deduplicar = (puntos) => {
  const seen = new Set();
  return puntos.filter(p => {
    const key = p.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const CapaPuntosCampana = ({ visible }) => {
  const [puntos, setPuntos] = useState([]);

  useEffect(() => {
    if (!visible) return;

    const token = localStorage.getItem('token');
    fetch(`${API_URL}campaign-point?page=0`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar puntos de campaña');
        return res.json();
      })
      .then(responseData => {
        let datos = [];
        if (Array.isArray(responseData)) datos = responseData;
        else if (responseData?.data?.data && Array.isArray(responseData.data.data)) datos = responseData.data.data;
        else if (responseData?.data && Array.isArray(responseData.data)) datos = responseData.data;
        const conCoordenadas = datos.filter(p => p.lat != null && p.lng != null);
        setPuntos(deduplicar(conCoordenadas));
      })
      .catch(err => {
        logger.error('❌ Error cargando puntos de campaña:', err);
        setPuntos([]);
      });
  }, [visible]);

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
        const color    = getColor(punto);
        const icon     = iconCache[color];
        const catLabel = CATEGORY_LABELS[punto.category] || punto.category;
        const desc     = cleanDescription(punto.description);

        const isMobile   = window.innerWidth < 480;
        const popupWidth = isMobile ? window.innerWidth * 0.82 : 320;

        return (
          <Marker key={punto.id} position={[punto.lat, punto.lng]} icon={icon}>
            <Popup minWidth={popupWidth} maxWidth={popupWidth}>
              <div style={{ fontSize: 13, lineHeight: 1.6, width: '100%' }}>

                {/* Encabezado */}
                <div style={{
                  borderBottom: `3px solid ${color}`,
                  paddingBottom: 6,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{ fontSize: 15 }}>🚩</span>
                  <span style={{ fontWeight: 700, color, fontSize: 13 }}>Punto de Campaña</span>
                </div>

                {/* Nombre */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Nombre
                  </div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, wordBreak: 'break-word' }}>
                    {punto.name}
                  </div>
                </div>

                {/* Categoría */}
                <div style={{ marginBottom: desc ? 10 : 0 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Categoría
                  </div>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: `${color}22`,
                    color,
                    border: `1px solid ${color}55`,
                    wordBreak: 'break-word',
                  }}>
                    {catLabel}
                  </span>
                </div>

                {/* Descripción */}
                {desc && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      Descripción
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#475569',
                        maxHeight: isMobile ? 120 : 160,
                        overflowY: 'auto',
                        wordBreak: 'break-word',
                        lineHeight: 1.5,
                      }}
                      dangerouslySetInnerHTML={{ __html: desc }}
                    />
                  </div>
                )}

              </div>
            </Popup>
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
