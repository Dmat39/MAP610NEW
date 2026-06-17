import { useEffect, useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { CircleMarker, Polygon, Popup, Tooltip, LayerGroup } from 'react-leaflet';
import { Filter, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { logger } from '../../../utils/logger.js';
import './CapaPuntosCampana.css';

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

const cleanDescription = (desc) => {
  if (!desc) return null;
  const isArtifact = (s) => /^(nombre|descripci[oó]n)\s*:?\s*$/i.test(s) || s === '';
  let parts = desc.split(/<br\s*\/?>/i).map(p => p.trim());
  while (parts.length > 0 && isArtifact(parts[parts.length - 1])) parts.pop();
  while (parts.length > 0 && parts[0] === '') parts.shift();
  if (parts.length > 0) {
    parts[0] = parts[0].replace(/^descripci[oó]n:\s*/i, '');
    if (!parts[0]) parts.shift();
  }
  return parts.join('<br>').trim() || null;
};


const toLflt = (coords) => coords.map(([lng, lat]) => [lat, lng]);

const isNestedPolygon = (arr) =>
  Array.isArray(arr) && arr.length > 0 &&
  Array.isArray(arr[0]) && Array.isArray(arr[0][0]);

const getCentroid = (polygon) => {
  if (!polygon || polygon.length === 0) return null;
  const ring = isNestedPolygon(polygon) ? polygon[0] : polygon;
  if (!ring || ring.length === 0) return null;
  const latSum = ring.reduce((s, c) => s + c[1], 0);
  const lngSum = ring.reduce((s, c) => s + c[0], 0);
  return [latSum / ring.length, lngSum / ring.length];
};

// ── Popup ─────────────────────────────────────────────────────────────────────

const PopupContent = ({ punto, color, catLabel, desc, isMobile }) => (
  <div style={{ fontSize: 13, lineHeight: 1.6, width: '100%' }}>
    <div style={{
      borderBottom: `3px solid ${color}`,
      paddingBottom: 6, marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ fontSize: 15 }}>🏗️</span>
      <span style={{ fontWeight: 700, color, fontSize: 13 }}>Punto de Obra</span>
    </div>

    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        Nombre
      </div>
      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, wordBreak: 'break-word' }}>
        {punto.name}
      </div>
    </div>

    <div style={{ marginBottom: desc ? 10 : 0 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        Categoría
      </div>
      <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: 12,
        fontSize: 11, fontWeight: 600,
        backgroundColor: `${color}22`, color, border: `1px solid ${color}55`,
      }}>
        {catLabel}
      </span>
    </div>

    {desc && (
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 8 }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Descripción
        </div>
        <div
          style={{
            fontSize: 11, color: '#475569',
            maxHeight: isMobile ? 120 : 160,
            overflowY: 'auto', wordBreak: 'break-word', lineHeight: 1.5,
          }}
          dangerouslySetInnerHTML={{ __html: desc }}
        />
      </div>
    )}
  </div>
);

// ── Panel de filtro (portal, mismo estilo que FiltroIncidentes) ───────────────

const FiltroPuntosCampana = ({ puntos, filterCat, setFilterCat, mostrarAreas, setMostrarAreas }) => {
  const [collapsed, setCollapsed] = useState(false);

  const cats = useMemo(() => {
    const set = new Set(puntos.map(p => p.category));
    return [...set].sort();
  }, [puntos]);

  const countFiltrados = filterCat
    ? puntos.filter(p => p.category === filterCat).length
    : puntos.length;

  const conArea = puntos.filter(p => p.polygon && p.polygon.length >= 3).length;

  const limpiar = () => {
    setFilterCat('');
    setMostrarAreas(false);
  };

  return (
    <div className="obras-filtro-panel">

      {/* Header */}
      <div className="obras-filtro-header" onClick={() => setCollapsed(p => !p)}>
        <span className="obras-filtro-titulo">
          <Filter size={17} color="#16a34a" />
          Filtro — Puntos de Obra
        </span>
        <button className="obras-collapse-btn">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="obras-filtro-body">

          {/* Contador */}
          <div className="obras-contador-wrap">
            <div className="obras-contador-num">{countFiltrados}</div>
            <div className="obras-contador-label">
              punto{countFiltrados !== 1 ? 's' : ''} visible{countFiltrados !== 1 ? 's' : ''}
            </div>
            {conArea > 0 && (
              <div className="obras-contador-area">{conArea} con área</div>
            )}
          </div>

          {/* Toggle mostrar áreas */}
          {conArea > 0 && (
            <label className="obras-toggle-row">
              <span className="obras-toggle-label">Mostrar áreas en el mapa</span>
              <div
                className={`obras-toggle${mostrarAreas ? ' on' : ''}`}
                onClick={() => setMostrarAreas(p => !p)}
              >
                <div className="obras-toggle-thumb" />
              </div>
            </label>
          )}

          {/* Filtro por categoría */}
          <div className="obras-filtro-cats">
            <div className="obras-filtro-sublabel">Categoría</div>
            <button
              className={`obras-cat-btn${!filterCat ? ' active' : ''}`}
              onClick={() => setFilterCat('')}
            >
              Todas
            </button>
            {cats.map(c => {
              const color = CATEGORY_COLORS[c] || DEFAULT_COLOR;
              const cnt   = puntos.filter(p => p.category === c).length;
              return (
                <button
                  key={c}
                  className={`obras-cat-btn${filterCat === c ? ' active' : ''}`}
                  style={filterCat === c
                    ? { borderColor: color, color, background: `${color}30` }
                    : {}}
                  onClick={() => setFilterCat(prev => prev === c ? '' : c)}
                >
                  <span className="obras-cat-dot" style={{ background: color }} />
                  {CATEGORY_LABELS[c] || c}
                  <span className="obras-cat-count">{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* Limpiar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="obras-reset-btn" onClick={limpiar}>
              <RotateCcw size={13} /> Limpiar
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const CapaPuntosCampana = ({ visible }) => {
  const [puntos, setPuntos]           = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [filterCat, setFilterCat]     = useState('');
  const [mostrarAreas, setMostrarAreas] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const token = localStorage.getItem('token');
    fetch(`${API_URL}campaign-point?page=0`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar puntos de obra');
        return res.json();
      })
      .then(responseData => {
        let datos = [];
        if (Array.isArray(responseData)) datos = responseData;
        else if (responseData?.data?.data && Array.isArray(responseData.data.data)) datos = responseData.data.data;
        else if (responseData?.data && Array.isArray(responseData.data)) datos = responseData.data;
        const conGeom = datos.filter(p =>
          (p.lat != null && p.lng != null) || (p.polygon && p.polygon.length > 0)
        );
        setPuntos(conGeom);
      })
      .catch(err => {
        logger.error('❌ Error cargando puntos de obra:', err);
        setPuntos([]);
      });
  }, [visible]);

  const puntosFiltrados = useMemo(() => {
    if (!filterCat) return puntos;
    return puntos.filter(p => p.category === filterCat);
  }, [puntos, filterCat]);

  if (!visible) return null;

  const isMobile   = window.innerWidth < 480;
  const popupWidth = isMobile ? window.innerWidth * 0.82 : 320;

  return (
    <>
      <LayerGroup>
        {puntosFiltrados.flatMap(punto => {
          const color    = getColor(punto);
          const catLabel = CATEGORY_LABELS[punto.category] || punto.category;
          const desc     = cleanDescription(punto.description);
          const selected = selectedId === punto.id;

          // Centro del marcador
          let center = null;
          if (punto.lat != null && punto.lng != null) {
            center = [punto.lat, punto.lng];
          } else if (punto.polygon) {
            center = getCentroid(punto.polygon);
          }
          if (!center) return [];

          const popup = (
            <Popup minWidth={popupWidth} maxWidth={popupWidth}>
              <PopupContent punto={punto} color={color} catLabel={catLabel} desc={desc} isMobile={isMobile} />
            </Popup>
          );

          const result = [];

          // ── Polígono ────────────────────────────────────────────────────
          // Se muestra si: mostrarAreas=true  O  el punto está seleccionado
          const showPoly = (mostrarAreas || selected) && punto.polygon && punto.polygon.length >= 3;

          if (showPoly) {
            const pathOpts = {
              color, fillColor: color, fillOpacity: 0.3, weight: 2.5, opacity: 0.9,
            };
            const hover = {
              mouseover: (e) => e.target.setStyle({ fillOpacity: 0.55, weight: 3.5 }),
              mouseout:  (e) => e.target.setStyle({ fillOpacity: 0.3,  weight: 2.5 }),
            };

            if (isNestedPolygon(punto.polygon)) {
              punto.polygon.forEach((poly, i) => {
                result.push(
                  <Polygon
                    key={`poly-${punto.id}-${i}`}
                    positions={toLflt(poly)}
                    pathOptions={pathOpts}
                    eventHandlers={{
                      ...hover,
                      click: () => setSelectedId(prev => prev === punto.id ? null : punto.id),
                    }}
                  >
                    {i === 0 && popup}
                    {i === 0 && (
                      <Tooltip sticky opacity={0.95}>
                        <span style={{ fontSize: 11, fontWeight: 600, color }}>{punto.name}</span>
                      </Tooltip>
                    )}
                  </Polygon>
                );
              });
            } else {
              result.push(
                <Polygon
                  key={`poly-${punto.id}`}
                  positions={toLflt(punto.polygon)}
                  pathOptions={pathOpts}
                  eventHandlers={{
                    ...hover,
                    click: () => setSelectedId(prev => prev === punto.id ? null : punto.id),
                  }}
                >
                  {popup}
                  <Tooltip sticky opacity={0.95}>
                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{punto.name}</span>
                  </Tooltip>
                </Polygon>
              );
            }
          }

          // ── Dot (siempre encima) ────────────────────────────────────────
          result.push(
            <CircleMarker
              key={`dot-${punto.id}`}
              center={center}
              radius={selected ? 8 : 6}
              pathOptions={{
                color:       selected ? color : '#fff',
                fillColor:   color,
                fillOpacity: 1,
                weight:      selected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => setSelectedId(prev => prev === punto.id ? null : punto.id),
              }}
            >
              {!showPoly && popup}
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95} sticky={false}>
                <span style={{ fontSize: 11, fontWeight: 600, color }}>{punto.name}</span>
              </Tooltip>
            </CircleMarker>
          );

          return result;
        })}
      </LayerGroup>

      {/* Panel de filtro fuera del mapa */}
      {createPortal(
        <FiltroPuntosCampana
          puntos={puntos}
          filterCat={filterCat}
          setFilterCat={setFilterCat}
          mostrarAreas={mostrarAreas}
          setMostrarAreas={setMostrarAreas}
        />,
        document.body
      )}
    </>
  );
};

export default memo(CapaPuntosCampana);
