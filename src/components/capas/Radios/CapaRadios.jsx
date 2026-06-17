import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup, LayerGroup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { obtenerRadios } from '../../../services/radiosService';

const svgRadio = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#6366f1">
  <!-- antena -->
  <rect x="13" y="1" width="2" height="5" rx="1" fill="#6366f1"/>
  <!-- cuerpo walkie-talkie -->
  <rect x="6" y="5" width="12" height="17" rx="2" fill="#6366f1"/>
  <!-- pantalla -->
  <rect x="8" y="7" width="8" height="4" rx="1" fill="white" opacity="0.9"/>
  <!-- botón PTT -->
  <rect x="8" y="13" width="4" height="2" rx="1" fill="white" opacity="0.8"/>
  <!-- altavoz líneas -->
  <rect x="8" y="16.5" width="8" height="1" rx="0.5" fill="white" opacity="0.5"/>
  <rect x="8" y="18"   width="6" height="1" rx="0.5" fill="white" opacity="0.5"/>
</svg>
`;

const colorMap = {
  verde:    '#22c55e',
  rojo:     '#ef4444',
  amarillo: '#eab308',
  naranja:  '#f97316',
  gris:     '#6b7280',
};

// Cache de iconos por color para evitar recrear DivIcon en cada polling update
const _iconCacheRadios = new Map();

const crearIcono = (hexacolor) => {
  const color = hexacolor || '#6366f1';
  if (_iconCacheRadios.has(color)) return _iconCacheRadios.get(color);
  const svg = svgRadio.replaceAll('#6366f1', color);
  const icon = new L.DivIcon({
    html: `<div style="background:white;border-radius:50%;padding:4px;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">${svg}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    className: '',
  });
  _iconCacheRadios.set(color, icon);
  return icon;
};

const CapaRadios = ({ visible, radioSeleccionado }) => {
  const [radios, setRadios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const map = useMap();
  const markersRef = useRef({});

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
      {radios.map((r) => {
        const markerId = `radio-${r.issi}`;
        const icono = crearIcono(r.hexacolor);
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
                <strong style={{ color: r.hexacolor || '#6366f1' }}>
                  📡 Radio: {r.unicocodigo || r.issi}
                </strong><br />
                <strong>ISSI:</strong> {r.issi}<br />
                <strong>Tipo:</strong> {r.tipo}<br />
                <strong>Estado:</strong>{' '}
                <span style={{ color: r.hexacolor || '#6366f1' }}>{r.estado}</span><br />
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
