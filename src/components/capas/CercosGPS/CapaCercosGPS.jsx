import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayerGroup, Marker, Popup, Polygon } from 'react-leaflet';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { obtenerRadios } from '../../../services/radiosService';

const crearIconoFuera = () => new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(239,68,68,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7],
  className: '',
});

const crearIconoDentro = (hexacolor) => new L.DivIcon({
  html: `<div style="width:11px;height:11px;background:${hexacolor || '#22c55e'};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></div>`,
  iconSize: [11, 11],
  iconAnchor: [5, 5],
  popupAnchor: [0, -5],
  className: '',
});

const puntoDentroPoligono = (lat, lng, coords) => {
  let dentro = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i];
    const [xj, yj] = coords[j];
    const intersecta = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersecta) dentro = !dentro;
  }
  return dentro;
};

const MapClickHandler = ({ dibujando, onPuntoAgregado }) => {
  useMapEvents({
    click(e) {
      if (dibujando) onPuntoAgregado([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const CapaCercosGPS = ({ visible, zonas, dibujando, puntosDibujo, onPuntoAgregado, onRadiosFuera }) => {
  const [radios, setRadios] = useState([]);
  const map = useMap();

  useEffect(() => {
    if (!visible) return;
    const fetch_ = async () => {
      try {
        const data = await obtenerRadios();
        setRadios(data);
      } catch {}
    };
    fetch_();
    const interval = setInterval(fetch_, 30000);
    return () => clearInterval(interval);
  }, [visible]);

  // Calcula una sola vez (por cambio de radios/zonas) qué radios están asignadas
  // a alguna zona activa y si están dentro o fuera de su polígono. Antes este
  // cálculo se repetía en el render (para los íconos) y en un efecto aparte
  // (para onRadiosFuera), duplicando el costo de puntoDentroPoligono en cada render.
  const radiosClasificados = useMemo(() => {
    if (!zonas.length || !radios.length) return [];
    return radios
      .filter(r => zonas.some(z => {
        if (!z.activo) return false;
        try {
          const issi = JSON.parse(z.radios_issi || '[]');
          return issi.length === 0 || issi.includes(String(r.issi));
        } catch { return true; }
      }))
      .map(r => {
        let fuera = false;
        for (const z of zonas) {
          if (!z.activo) continue;
          try {
            const issiAsignados = JSON.parse(z.radios_issi || '[]');
            if (issiAsignados.length > 0 && !issiAsignados.includes(String(r.issi))) continue;
            const gj = JSON.parse(z.geojson);
            const coords = gj.geometry?.coordinates?.[0] || gj.coordinates?.[0] || [];
            if (!puntoDentroPoligono(r.latitud, r.longitud, coords)) { fuera = true; break; }
          } catch {}
        }
        return { radio: r, fuera };
      });
  }, [radios, zonas]);

  useEffect(() => {
    if (!visible || !zonas.length || !radios.length) return;
    if (onRadiosFuera) onRadiosFuera(radiosClasificados.filter(rc => rc.fuera).map(rc => rc.radio));
  }, [radiosClasificados, visible, zonas.length, radios.length]);

  if (!visible) return null;

  return (
    <LayerGroup>
      <MapClickHandler dibujando={dibujando} onPuntoAgregado={onPuntoAgregado} />

      {/* Zonas guardadas */}
      {zonas.filter(z => z.activo).map(z => {
        try {
          const gj = JSON.parse(z.geojson);
          const coords = gj.geometry?.coordinates?.[0] || gj.coordinates?.[0] || [];
          const leafletCoords = coords.map(([lat, lng]) => [lat, lng]);
          return (
            <Polygon
              key={z.id}
              positions={leafletCoords}
              pathOptions={{ color: z.color || '#6366f1', fillColor: z.color || '#6366f1', fillOpacity: 0.15, weight: 2 }}
            >
              <Popup>
                <strong style={{ color: z.color || '#6366f1' }}>🔷 {z.nombre}</strong>
                {z.descripcion && <><br />{z.descripcion}</>}
              </Popup>
            </Polygon>
          );
        } catch { return null; }
      })}

      {/* Polígono en dibujo */}
      {puntosDibujo.length > 1 && (
        <Polygon
          positions={puntosDibujo}
          pathOptions={{ color: '#f59e0b', fillColor: '#fef3c7', fillOpacity: 0.2, weight: 2, dashArray: '6 4' }}
        />
      )}
      {puntosDibujo.map((p, i) => (
        <Marker key={`dp-${i}`} position={p} icon={new L.DivIcon({
          html: `<div style="width:8px;height:8px;background:#f59e0b;border:2px solid white;border-radius:50%"></div>`,
          iconSize: [8, 8], iconAnchor: [4, 4], className: '',
        })} />
      ))}

      {/* Radios clasificadas por zona — solo las asignadas a al menos una zona activa */}
      {radiosClasificados.map(({ radio: r, fuera }) => {
        const icono = fuera ? crearIconoFuera() : crearIconoDentro(r.hexacolor);
        return (
          <Marker key={`cerco-r-${r.issi}`} position={[r.latitud, r.longitud]} icon={icono} zIndexOffset={fuera ? 1600 : 1400}>
            <Popup>
              <div style={{ fontSize: '13px' }}>
                <strong style={{ color: fuera ? '#ef4444' : (r.hexacolor || '#22c55e') }}>
                  {fuera ? '🚨' : '✅'} {r.unicocodigo || r.issi}
                </strong><br />
                <strong>Estado:</strong> {fuera ? 'FUERA DEL CERCO' : 'Dentro del cerco'}<br />
                <strong>Velocidad:</strong> {r.velocidad} km/h
              </div>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default React.memo(CapaCercosGPS);
