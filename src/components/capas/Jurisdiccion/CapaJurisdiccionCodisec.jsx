import { useEffect, useState, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import { logger } from '../../../utils/logger.js';
import './CapaJurisdiccionCodisec.css';

const FUENTES = {
  jurisdicciones: {
    label: 'Jurisdicciones',
    url: '/data/sectores-pvl.geojson',
  },
  comunas: {
    label: 'Comunas',
    url: '/data/sectores-pvl.geojson',
  },
};

const CapaJurisdiccionCodisec = ({
  visible = false,
  ubicadorActivo = false,
  camaraConVision = null,
  camaraSeleccionada = null,
}) => {
  const map = useMap();
  const [fuenteActiva, setFuenteActiva] = useState('jurisdicciones');
  const [data, setData] = useState(null);
  const [key, setKey] = useState(0);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const geoJsonRef = useRef(null);

  const esInactivo = camaraConVision !== null || camaraSeleccionada !== null;

  // Cargar datos cuando cambia la fuente activa
  useEffect(() => {
    if (!visible) return;

    const fuente = FUENTES[fuenteActiva];
    fetch(fuente.url)
      .then(res => res.json())
      .then(geojson => {
        setData(geojson);
        setKey(prev => prev + 1);
        logger.log(`Capa CODISEC: ${fuente.label} cargado`);
      })
      .catch(err => logger.error(`Error cargando ${fuente.label}:`, err));
  }, [fuenteActiva, visible]);

  // Re-render cuando cambia interactividad
  useEffect(() => {
    if (data) {
      setKey(prev => prev + 1);
    }
  }, [esInactivo, ubicadorActivo]);

  const estiloPorDefecto = feature => ({
    color: feature.properties.color || '#34b429',
    weight: 2,
    fillOpacity: esInactivo ? 0.1 : 0.25,
    interactive: !esInactivo && !ubicadorActivo,
    bubblingMouseEvents: esInactivo || ubicadorActivo ? false : true,
  });

  const popupFeature = (feature, layer) => {
    const nombre = feature.properties.name || 'Zona';

    if (!esInactivo && !ubicadorActivo) {
      layer.bindPopup(`<b>${nombre}</b>`);
      layer.on('click', function () {
        layer.openPopup();
      });
    } else {
      layer.off();
      layer.unbindPopup();
      layer.unbindTooltip();
      if (layer.setStyle) {
        layer.setStyle({ interactive: false, bubblingMouseEvents: false });
      }
    }
  };

  const handleCambiarFuente = (nuevaFuente) => {
    setFuenteActiva(nuevaFuente);
    setSelectorAbierto(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Selector flotante sobre el mapa */}
      <div className="codisec-selector-container">
        <button
          className="codisec-selector-btn"
          onClick={() => setSelectorAbierto(!selectorAbierto)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span>{FUENTES[fuenteActiva].label}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`codisec-chevron ${selectorAbierto ? 'rotated' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {selectorAbierto && (
          <div className="codisec-selector-dropdown">
            {Object.entries(FUENTES).map(([key, fuente]) => (
              <button
                key={key}
                className={`codisec-selector-option ${fuenteActiva === key ? 'active' : ''}`}
                onClick={() => handleCambiarFuente(key)}
              >
                <span className={`codisec-dot ${fuenteActiva === key ? 'active' : ''}`} />
                {fuente.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Capa GeoJSON */}
      {data && (
        <GeoJSON
          key={key}
          ref={geoJsonRef}
          data={data}
          style={estiloPorDefecto}
          onEachFeature={popupFeature}
          interactive={!esInactivo}
          bubblingMouseEvents={!esInactivo}
          pane={esInactivo ? 'shadowPane' : 'overlayPane'}
        />
      )}
    </>
  );
};

export default CapaJurisdiccionCodisec;
