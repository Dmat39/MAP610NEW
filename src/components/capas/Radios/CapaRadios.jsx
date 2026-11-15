import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Marker, Popup, LayerGroup, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import { COLOR, estadoRadioDolphin } from '../../mapa/estados';
import { pinAPie, pinMovil } from '../../mapa/pines';
import { obtenerRadios } from '../../../services/radiosService';
import { computeJurisdiccion, pasaFiltroJurisdiccion } from '../../../utils/jurisdicciones';
import { haversineM } from '../../../utils/geoUtils';

const COLOR_ESTADO = {
  verde:    'OK',
  amarillo: 'SIN GPS',
  rojo:     'APAGADO',
};

// Mismos símbolos que Despacho: la radio de una móvil (tipo de Dolphin o asignada en SIVECAM) se ve como
// camioneta o moto; la portátil, como sereno a pie. El color es el estado (azul OK, amarillo sin GPS, gris apagado).
const mapRadioColor = (r) => COLOR[estadoRadioDolphin(r)];
const crearIcono = (r) => {
  const estado = estadoRadioDolphin(r);
  return r.es_movil
    ? pinMovil({ subtipo: r.clase === 'MOTO' ? 'MOTO' : 'CAMION', estado })
    : pinAPie({ tipo: 'RADIO', estado });
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
                  {r.es_movil ? `${r.clase === 'MOTO' ? 'Moto' : 'Móvil'}: ` : 'Radio: '}{r.unicocodigo || r.issi}
                </strong><br />
                <strong>ISSI:</strong> {r.issi}<br />
                {r.asignacion
                  ? <><strong>Asignada en SIVECAM</strong>{r.asignacion.placa ? `, placa ${r.asignacion.placa}` : ''}{r.unicocodigo_dolphin ? ` (Dolphin: ${r.unicocodigo_dolphin})` : ''}<br /></>
                  : <><strong>Tipo:</strong> {r.tipo}<br /></>}
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
