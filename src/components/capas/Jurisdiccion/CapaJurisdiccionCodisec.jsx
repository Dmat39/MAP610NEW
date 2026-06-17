import { useEffect, useState, useRef, memo } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import { logger } from '../../../utils/logger.js';

const GEO_URL = '/data/sectores-pvl.geojson';

// Comunas usa overlayPane estándar (400).
// Las incidencias van en 'incidenciasPane' (420) creado en MapView → siempre encima.
const PANE_NAME = 'overlayPane';

const CapaJurisdiccionCodisec = ({
  visible = false,
  ubicadorActivo = false,
  camaraConVision = null,
  camaraSeleccionada = null,
}) => {
  const map = useMap();
  const [data, setData] = useState(null);
  const [key, setKey] = useState(0);
  const geoJsonRef = useRef(null);

  const esInactivo = camaraConVision !== null || camaraSeleccionada !== null;


  useEffect(() => {
    if (!visible) return;
    fetch(GEO_URL)
      .then(res => res.json())
      .then(geojson => {
        setData(geojson);
        setKey(prev => prev + 1);
        logger.log('Capa Comunas cargada');
      })
      .catch(err => logger.error('Error cargando Comunas:', err));
  }, [visible]);

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

  if (!visible) return null;

  return data ? (
    <GeoJSON
      key={key}
      ref={geoJsonRef}
      data={data}
      style={estiloPorDefecto}
      onEachFeature={popupFeature}
      interactive={!esInactivo}
      bubblingMouseEvents={!esInactivo}
      pane={esInactivo ? 'shadowPane' : PANE_NAME}
    />
  ) : null;
};

export default memo(CapaJurisdiccionCodisec);
