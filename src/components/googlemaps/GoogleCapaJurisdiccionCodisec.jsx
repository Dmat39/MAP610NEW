import { useEffect, useState } from 'react';
import '../capas/Jurisdiccion/CapaJurisdiccionCodisec.css';

const FUENTES = {
  jurisdicciones: {
    label: 'Jurisdicciones',
    url: '/data/juridiccion.geojson',
  },
  comunas: {
    label: 'Comunas',
    url: '/data/sectores-pvl.geojson',
  },
};

const GoogleCapaJurisdiccionCodisec = ({
  map,
  google,
  visible = false,
  ubicadorActivo = false,
  camaraConVision = null,
  camaraSeleccionada = null,
}) => {
  const [fuenteActiva, setFuenteActiva] = useState('jurisdicciones');
  const [data, setData] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const esInactivo = camaraConVision !== null || camaraSeleccionada !== null;

  // Cargar datos cuando cambia la fuente activa
  useEffect(() => {
    if (!visible) return;

    const fuente = FUENTES[fuenteActiva];
    fetch(fuente.url)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error(`Error cargando ${fuente.label}:`, err));
  }, [fuenteActiva, visible]);

  // Renderizar polígonos en Google Maps
  useEffect(() => {
    if (!map || !google || !data || !visible) return;

    // Limpiar polígonos anteriores
    polygons.forEach(polygon => polygon.setMap(null));

    const newPolygons = [];

    data.features?.forEach(feature => {
      if (feature.geometry?.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates[0].map(coord => ({
          lat: coord[1],
          lng: coord[0],
        }));

        const polygon = new google.maps.Polygon({
          paths: coordinates,
          strokeColor: feature.properties.color || '#34b429',
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: feature.properties.color || '#34b429',
          fillOpacity: esInactivo ? 0.1 : 0.25,
        });

        polygon.setMap(map);

        if (!esInactivo && !ubicadorActivo) {
          const infoWindow = new google.maps.InfoWindow({
            content: `<b>${feature.properties.name || 'Zona'}</b>`,
          });

          polygon.addListener('click', event => {
            infoWindow.setPosition(event.latLng);
            infoWindow.open(map);
          });
        }

        polygon.setOptions({
          clickable: !esInactivo && !ubicadorActivo,
        });

        newPolygons.push(polygon);
      }
    });

    setPolygons(newPolygons);

    return () => {
      newPolygons.forEach(polygon => polygon.setMap(null));
    };
  }, [map, google, data, esInactivo, ubicadorActivo, visible]);

  // Limpiar polígonos cuando no es visible
  useEffect(() => {
    if (!visible) {
      polygons.forEach(polygon => polygon.setMap(null));
      setPolygons([]);
    }
  }, [visible]);

  const handleCambiarFuente = nuevaFuente => {
    setFuenteActiva(nuevaFuente);
    setSelectorAbierto(false);
  };

  if (!visible) return null;

  return (
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
  );
};

export default GoogleCapaJurisdiccionCodisec;
