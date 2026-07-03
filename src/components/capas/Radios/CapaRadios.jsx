import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Marker, Popup, LayerGroup, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { obtenerRadios } from '../../../services/radiosService';
import { computeJurisdiccion, pasaFiltroJurisdiccion } from '../../../utils/jurisdicciones';

const COLOR_ESTADO = {
  verde:    'OK',
  amarillo: 'SIN GPS',
  rojo:     'APAGADO',
};

const haversineM = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Cache de iconos por color para evitar recrear DivIcon en cada polling update
const _iconCacheRadios = new Map();

// Mapa de colores frontend para diferenciar de las bodycams
const mapRadioColor = (r) => {
  const cName = r?.color?.toLowerCase() || '';
  if (cName === 'verde') return '#3b82f6'; // Azul
  if (cName === 'amarillo') return '#f97316'; // Naranja
  if (cName === 'rojo') return '#6b7280'; // Gris
  
  const c = r?.hexacolor?.toLowerCase() || '';
  if (c === '#16a34a' || c === '#22c55e' || c === 'green') return '#3b82f6'; // Verde -> Azul
  if (c === '#eab308' || c === '#facc15' || c === 'yellow') return '#f97316'; // Amarillo -> Naranja
  if (c === '#ef4444' || c === '#f87171' || c === 'red') return '#6b7280'; // Rojo -> Gris
  return r?.hexacolor || '#3b82f6';
};

const crearIcono = (r) => {
  const color = mapRadioColor(r);
  if (_iconCacheRadios.has(color)) return _iconCacheRadios.get(color);
  const icon = new L.DivIcon({
    html: `<div>
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" style="display:block; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.3));">
        <rect x="2" y="2" width="22" height="22" rx="6" fill="white" stroke="${color}" stroke-width="2.5"/>
        <rect x="14.5" y="5.5" width="1.5" height="4" rx="0.75" fill="${color}"/>
        <rect x="9" y="8" width="8" height="12" rx="1.5" fill="${color}"/>
        <rect x="10.5" y="9.5" width="5" height="3.5" rx="0.5" fill="white" opacity="0.9"/>
        <circle cx="13" cy="16" r="1.5" fill="white"/>
        <rect x="11" y="18.5" width="4" height="0.6" rx="0.3" fill="white" opacity="0.6"/>
      </svg>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
    className: '',
  });
  _iconCacheRadios.set(color, icon);
  return icon;
};

const CapaRadios = ({
  visible,
  radioSeleccionado,
  maxVisible,
  filtroEstado = 'TODOS',
  filtroJurisdicciones = [],
  jurisdiccionesGeoJSON = null,
}) => {
  const [radios, setRadios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mapView, setMapView] = useState(null);
  const map = useMap();
  const markersRef = useRef({});

  // Precalcular la jurisdicción de cada radio una sola vez (por issi).
  const jurisdiccionPorRadio = useMemo(() => {
    const mapa = {};
    if (!jurisdiccionesGeoJSON) return mapa;
    radios.forEach(r => {
      mapa[r.issi] = computeJurisdiccion(r.latitud, r.longitud, jurisdiccionesGeoJSON);
    });
    return mapa;
  }, [radios, jurisdiccionesGeoJSON]);

  useMapEvents({
    moveend: () => setMapView({ bounds: map.getBounds(), center: map.getCenter() }),
    zoomend: () => setMapView({ bounds: map.getBounds(), center: map.getCenter() }),
  });

  useEffect(() => {
    if (map) setMapView({ bounds: map.getBounds(), center: map.getCenter() });
  }, [map]);

  useEffect(() => {
    if (!visible) return;

    const fetchRadios = async (isFirst = false) => {
      if (isFirst) setCargando(true);
      try {
        const data = await obtenerRadios();
        setRadios(data);
      } catch (error) {
        console.error('Error fetching radios GPS:', error);
      } finally {
        if (isFirst) setCargando(false);
      }
    };

    fetchRadios(true);
    const interval = setInterval(() => fetchRadios(false), 30000);
    return () => clearInterval(interval);
  }, [visible]);

  const visibleRadios = useMemo(() => {
    if (!radios.length || !mapView) return radios;

    const porEstado = filtroEstado === 'TODOS'
      ? radios
      : radios.filter(r => COLOR_ESTADO[r.color] === filtroEstado);

    const porJurisdiccion = porEstado.filter(r =>
      pasaFiltroJurisdiccion(jurisdiccionPorRadio[r.issi], filtroJurisdicciones)
    );

    const inBounds = porJurisdiccion.filter(r =>
      r.latitud != null && r.longitud != null &&
      mapView.bounds.contains([r.latitud, r.longitud])
    );

    if (!maxVisible || inBounds.length <= maxVisible) return inBounds;

    const { lat, lng } = mapView.center;
    return [...inBounds]
      .sort((a, b) => haversineM(lat, lng, a.latitud, a.longitud) - haversineM(lat, lng, b.latitud, b.longitud))
      .slice(0, maxVisible);
  }, [radios, mapView, maxVisible, filtroEstado, filtroJurisdicciones, jurisdiccionPorRadio]);

  useEffect(() => {
    if (radioSeleccionado && map) {
      const { latitud, longitud, issi } = radioSeleccionado;
      if (latitud && longitud) {
        map.flyTo([latitud, longitud], 18, { animate: true, duration: 1.5 });
        setTimeout(() => {
          const marker = markersRef.current[`radio-${issi}`];
          if (marker) marker.openPopup();
        }, 1600);
      }
    }
  }, [radioSeleccionado, map]);

  if (!visible) return null;

  if (cargando) return <LayerGroup />;

  return (
    <LayerGroup>
      {visibleRadios.map((r) => {
        const markerId = `radio-${r.issi}`;
        const icono = crearIcono(r);
        return (
          <Marker
            key={markerId}
            position={[r.latitud, r.longitud]}
            icon={icono}
            zIndexOffset={1400}
            ref={ref => { if (ref) markersRef.current[markerId] = ref; }}
          >
            <Popup>
              <div style={{ fontSize: '13px', minWidth: '170px' }}>
                <strong style={{ color: mapRadioColor(r) }}>
                  📡 Radio: {r.unicocodigo || r.issi}
                </strong><br />
                <strong>ISSI:</strong> {r.issi}<br />
                <strong>Tipo:</strong> {r.tipo}<br />
                <strong>Estado:</strong>{' '}
                <span style={{ color: mapRadioColor(r) }}>{r.estado}</span><br />
                <strong>Velocidad:</strong> {r.velocidad} km/h<br />
                <strong>Dirección:</strong> {r.direccion}<br />
                <strong>Última act.:</strong> {r.fechaHora}<br />
                <strong>Lat:</strong> {r.latitud?.toFixed(6)}<br />
                <strong>Lng:</strong> {r.longitud?.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default React.memo(CapaRadios);
