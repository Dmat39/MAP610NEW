// CapaJurisdiccion.jsx
import { useEffect, useState, useRef } from 'react';
import { GeoJSON } from 'react-leaflet';
import { logger } from '../../../utils/logger.js';

const CapaJurisdiccion = ({
  ubicadorActivo = false,
  camaraConVision = null,
  camaraSeleccionada = null,
}) => {
  const [data, setData] = useState(null);
  const [key, setKey] = useState(0); // Para forzar re-render
  const geoJsonRef = useRef(null);

  // Jurisdicciones deben estar inactivas si:
  // 1. El ubicador está activo
  // 2. Una cámara tiene campo de visión activo
  // 3. Una cámara está seleccionada desde la búsqueda
  const esInactivo = ubicadorActivo || camaraConVision !== null || camaraSeleccionada !== null;

  useEffect(() => {
    fetch('/data/juridiccion.geojson')
      .then(res => res.json())
      .then(setData)
      .catch(err => logger.error('Error cargando jurisdicción:', err));
  }, []);

  const estiloPorDefecto = feature => ({
    color: feature.properties.color || '#34b429',
    weight: 2,
    fillOpacity: esInactivo ? 0.1 : 0.2, // Menos opacidad cuando está inactivo
    interactive: !esInactivo, // Control directo de interactividad
    bubblingMouseEvents: esInactivo ? false : true, // Prevenir bubbling cuando inactivo
  });

  const popupJurisdiccion = (feature, layer) => {
    const nombre = feature.properties.name || 'Jurisdicción';

    if (!esInactivo) {
      layer.bindPopup(`<b>${nombre}</b>`);

      layer.on('click', function () {
        layer.openPopup();
      });
    } else {
      // Cuando está inactivo (ubicador o cámara activa), remover completamente todos los eventos
      layer.off();
      layer.unbindPopup();
      layer.unbindTooltip();

      // Hacer la capa completamente no interactiva
      if (layer.setStyle) {
        layer.setStyle({
          interactive: false,
          bubblingMouseEvents: false,
        });
      }
    }
  };

  // Efecto para manejar cambios en el estado de interactividad
  useEffect(() => {
    if (data) {
      // Forzar re-render cuando cambie el estado
      setKey(prev => prev + 1);
      const razon = camaraConVision
        ? `(Cámara ${camaraConVision} con visión)`
        : camaraSeleccionada
          ? `(Cámara ${camaraSeleccionada.name} seleccionada)`
          : '';
      logger.log(`🗺️ Jurisdicciones - ${esInactivo ? 'INACTIVAS' : 'ACTIVAS'}`, razon);
    }
  }, [esInactivo, data, camaraConVision, camaraSeleccionada]);

  // Efecto para aplicar estilos CSS cuando esté inactivo
  useEffect(() => {
    if (esInactivo) {
      // Hacer SOLO las jurisdicciones (paths/polygons) no clickeables, no todos los elementos interactivos
      const jurisdiccionElements = document.querySelectorAll('.leaflet-overlay-pane svg path.leaflet-interactive');
      jurisdiccionElements.forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.cursor = ubicadorActivo ? 'crosshair' : 'default';
      });
    } else {
      // Restaurar interactividad solo para jurisdicciones
      const jurisdiccionElements = document.querySelectorAll('.leaflet-overlay-pane svg path.leaflet-interactive');
      jurisdiccionElements.forEach(el => {
        el.style.pointerEvents = 'auto';
        el.style.cursor = '';
      });
    }

    return () => {
      // Cleanup: restaurar cuando se desmonte (solo jurisdicciones)
      const jurisdiccionElements = document.querySelectorAll('.leaflet-overlay-pane svg path.leaflet-interactive');
      jurisdiccionElements.forEach(el => {
        el.style.pointerEvents = 'auto';
        el.style.cursor = '';
      });
    };
  }, [esInactivo, ubicadorActivo]);

  if (!data) return null;

  return (
    <GeoJSON
      key={key} // Forzar re-render completo cuando cambie el estado
      ref={geoJsonRef}
      data={data}
      style={estiloPorDefecto}
      onEachFeature={popupJurisdiccion}
      interactive={!esInactivo}
      bubblingMouseEvents={!esInactivo}
      pane={esInactivo ? 'shadowPane' : 'overlayPane'} // Mover a capa inferior cuando inactivo
    />
  );
};

export default CapaJurisdiccion;
