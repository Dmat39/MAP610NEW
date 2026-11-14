import { Fragment, useEffect, useMemo } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Circle, Polyline, Marker, Tooltip, GeoJSON, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { CENTRO_SJL, NIVEL_COLOR, fmtKm, fmtMin } from './util';
import { pinAPie, pinCamara, pinDespacho, pinEmergencia, pinMovil, pinParada } from './pines';

const estiloJur = { color: '#475569', weight: 1.4, dashArray: '5 5', fillColor: '#64748b', fillOpacity: 0.03 };
const nombreVehiculo = { MOTO: 'Moto', CAMION: 'Camioneta', AUTOMOVIL: 'Camioneta' };

/**
 * Tarjeta flotante del mapa. Sale hacia el lado del mapa con más espacio (izquierda o derecha del punto),
 * con ancho máximo y texto que salta de línea: así nunca queda una franja larga cortada en el borde.
 * `sep` es la distancia al borde del ícono, para que la tarjeta no lo tape.
 */
const Tip = ({ titulo, tono, sep = 10, dy = 0, sticky, children }) => (
  <Tooltip className="cdp-tip" direction="auto" offset={[sep, dy]} opacity={1} sticky={sticky}>
    <div className="cdp-tip-t">
      {tono && <i className={`cdp-tip-dot ${tono}`} />}
      <span>{titulo}</span>
    </div>
    {children && <div className="cdp-tip-b">{children}</div>}
  </Tooltip>
);

const ClickMapa = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick?.(e.latlng) });
  return null;
};

const Encuadrar = ({ puntos }) => {
  const map = useMap();
  useEffect(() => {
    if (puntos?.length > 1) map.fitBounds(L.latLngBounds(puntos), { padding: [48, 48], maxZoom: 16 });
    else if (puntos?.length === 1) map.setView(puntos[0], 16);
  }, [map, puntos]);
  return null;
};

const MapaDespacho = ({
  moviles, zonas, planes, colores, incidencias, despachos, sugerencia, punto, borrador, jurisdicciones,
  capas, planSeleccionado, onMapClick, onSelectIncidencia, onSelectPlan, cursorCruz, encuadre,
}) => {
  const enLinea = useMemo(() => moviles.filter((m) => m.en_linea), [moviles]);
  const offline = useMemo(() => moviles.filter((m) => !m.en_linea && (m.lat ?? null) !== null), [moviles]);
  const planesVisibles = planSeleccionado ? planes.filter((p) => p.id === planSeleccionado) : planes;
  const hayEmergencia = !!punto;

  return (
    <MapContainer center={CENTRO_SJL} zoom={13} className={`cdp-map${cursorCruz ? ' cdp-map-cruz' : ''}`}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />
      <ClickMapa onClick={onMapClick} />
      <Encuadrar puntos={encuadre} />

      {/* Límites de jurisdicción: el nombre aparece al pasar el mouse */}
      {capas.jurisdicciones && jurisdicciones && (
        <GeoJSON
          key={jurisdicciones.features?.length}
          data={jurisdicciones}
          style={estiloJur}
          interactive={!cursorCruz}
          onEachFeature={(f, layer) => layer.bindTooltip(f.properties?.nombre ?? '', { sticky: true, direction: 'auto', offset: [14, 0], opacity: 1, className: 'cdp-tip cdp-jur-tip' })}
        />
      )}

      {/* Zonas de riesgo del turno */}
      {capas.zonas && zonas.map((z) => (
        <Circle key={z.id} center={[z.lat, z.lon]} radius={100}
          pathOptions={{ color: NIVEL_COLOR[z.nivel] ?? '#eab308', fillOpacity: hayEmergencia ? 0.08 : 0.2, weight: 1.2, opacity: hayEmergencia ? 0.4 : 1 }}>
          <Tip titulo={`Zona de riesgo ${z.nivel}`} tono={`nivel-${z.nivel}`} sticky sep={14}>
            <div className="cdp-tip-m">{z.jurisdiccion}</div>
            {z.mensaje && <div>{z.mensaje}</div>}
          </Tip>
        </Circle>
      ))}

      {/* Rutas de patrullaje (se atenúan cuando hay una emergencia en curso) */}
      {capas.rutas && planesVisibles.map((p) => {
        const color = colores[p.unit_issi] ?? '#475569';
        const tenue = hayEmergencia && !planSeleccionado;
        return (
          <Fragment key={p.id}>
            {Array.isArray(p.route) && p.route.length > 1 && (
              <Polyline
                positions={p.route}
                pathOptions={{ color, weight: planSeleccionado ? 5 : 3, opacity: tenue ? 0.25 : 0.85, dashArray: p.source === 'MANUAL' ? '8 6' : null }}
                eventHandlers={{ click: () => onSelectPlan?.(p.id) }}
              >
                <Tip titulo={p.unit_code} sticky sep={14}>
                  <div className="cdp-tip-m">{p.source === 'MANUAL' ? 'Ruta manual' : 'Ruta inteligente'}. Clic para verla sola.</div>
                </Tip>
              </Polyline>
            )}
            {!tenue && p.stops.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={pinParada(s.order, color, !!s.visited_at)}>
                <Tip titulo={`${p.unit_code}, parada ${s.order}`} tono={s.visited_at ? 'ok' : null} sep={12}>
                  <div className="cdp-tip-m">Permanecer {s.dwell_min} min{s.visited_at ? '. Ya visitada' : ''}</div>
                  {s.reason && <div>{s.reason}</div>}
                </Tip>
              </Marker>
            ))}
          </Fragment>
        );
      })}

      {/* Incidencias recientes */}
      {capas.incidencias && incidencias.map((i) => (
        <CircleMarker key={i.id} center={[i.lat, i.lon]} radius={5}
          pathOptions={{ color: '#6d28d9', fillColor: '#a78bfa', fillOpacity: 0.95, weight: 1.5 }}
          eventHandlers={{ click: () => onSelectIncidencia?.(i) }}>
          <Tip titulo={i.tipo || 'Incidencia'} tono="incidencia" sep={8}>
            <div className="cdp-tip-m">{i.codigo}{i.jurisdiccion ? `, ${i.jurisdiccion}` : ''}</div>
            <div className="cdp-tip-acc">Clic para despachar</div>
          </Tip>
        </CircleMarker>
      ))}

      {/* Despachos abiertos */}
      {despachos.filter((d) => d.status === 'ASIGNADO' && d.movil_actual?.lat).map((d) => (
        <Polyline key={d.id} positions={[[d.movil_actual.lat, d.movil_actual.lng], [d.lat, d.lng]]}
          pathOptions={{ color: '#2563eb', weight: 2.5, dashArray: '4 6' }} />
      ))}
      {despachos.filter((d) => d.status === 'ASIGNADO' || d.status === 'EN_LUGAR').map((d) => (
        <Marker key={`dp-${d.id}`} position={[d.lat, d.lng]} icon={pinDespacho(d.status === 'EN_LUGAR')}>
          <Tip titulo={`${d.unit_code} hacia ${d.incident_code ?? 'punto marcado'}`} tono={d.status === 'EN_LUGAR' ? 'ok' : 'camino'} sep={14} dy={-16}>
            <div className="cdp-tip-m">{d.status === 'EN_LUGAR' ? 'En el lugar' : `En camino, a ${fmtKm(d.distancia_actual_m)}`}</div>
          </Tip>
        </Marker>
      ))}

      {/* Emergencia elegida: solo se dibujan los recursos sugeridos, no todos */}
      {punto && <Marker position={[punto.lat, punto.lng]} icon={pinEmergencia()} zIndexOffset={1000} />}
      {punto && sugerencia?.ranking?.slice(0, 3).map((r) => (
        <Polyline key={`s-${r.issi}`} positions={[[r.lat, r.lng], [punto.lat, punto.lng]]}
          pathOptions={{ color: r.rank === 1 ? '#dc2626' : '#94a3b8', weight: r.rank === 1 ? 2.5 : 1.5, dashArray: '6 6' }} />
      ))}
      {punto && sugerencia?.a_pie?.slice(0, 5).map((r) => (
        <Marker key={`ap-${r.tipo}-${r.id}`} position={[r.lat, r.lng]} icon={pinAPie({ tipo: r.tipo, rank: r.rank, doble: !!r.acompanante })}>
          <Tip titulo={`${r.tipo === 'BODYCAM' ? 'Bodycam' : 'Sereno con radio'} ${r.codigo}`} sep={12}>
            <div className="cdp-tip-m">A pie, {fmtMin(r.duration_s)} ({fmtKm(r.recta_m)} en línea recta)</div>
            {r.acompanante && <div>Lleva también {r.acompanante.tipo === 'BODYCAM' ? 'bodycam' : 'radio'} {r.acompanante.codigo}</div>}
          </Tip>
        </Marker>
      ))}
      {punto && sugerencia?.camaras?.rows?.slice(0, 5).map((c) => (
        <Marker key={`cam-${c.id}`} position={[c.lat, c.lng]} icon={pinCamara({ ve: c.ve_el_punto === true })}>
          <Tip titulo={`Cámara ${c.codigo}`} tono={c.ve_el_punto ? 'ok' : null} sep={12}>
            <div className="cdp-tip-m">{c.tipo === 'VECINAL' ? 'Vecinal' : c.modelo}{c.direccion ? `, ${c.direccion}` : ''}</div>
            <div className={c.ve_el_punto ? 'cdp-tip-ok' : undefined}>
              {c.ve_el_punto ? 'Su campo de visión cubre la emergencia' : `A ${fmtKm(c.distancia_m)} del punto`}
            </div>
          </Tip>
        </Marker>
      ))}

      {/* Borrador de ruta manual */}
      {borrador.length > 0 && (
        <>
          <Polyline positions={borrador.map((b) => [b.lat, b.lng])} pathOptions={{ color: '#1e293b', dashArray: '6 6', weight: 2 }} />
          {borrador.map((b, i) => <Marker key={`b-${i}`} position={[b.lat, b.lng]} icon={pinParada(i + 1, '#1e293b', false)} />)}
        </>
      )}

      {/* Móviles sin reporte (gris) y en línea (color de su ruta) */}
      {capas.offline && offline.map((m) => (
        <Marker key={`o-${m.issi}`} position={[m.lat, m.lng]} icon={pinMovil({ subtipo: m.subtipo, apagada: true })} opacity={0.7}>
          <Tip titulo={m.codigo} tono="apagada" sep={15}>
            <div className="cdp-tip-m">Sin reporte hace {Math.round((m.minutos_sin_reporte ?? 0) / 60)} h</div>
            {m.estado_radio && <div>{m.estado_radio}</div>}
          </Tip>
        </Marker>
      ))}
      {capas.moviles && enLinea.map((m) => (
        <Marker key={m.issi} position={[m.lat, m.lng]} zIndexOffset={500}
          icon={pinMovil({ subtipo: m.subtipo, color: colores[m.issi] ?? '#2563eb', ocupada: !!m.despacho_abierto })}
          eventHandlers={{ click: () => { const p = planes.find((x) => x.unit_issi === m.issi); if (p) onSelectPlan?.(p.id); } }}>
          <Tip titulo={m.codigo} tono={m.despacho_abierto ? 'ocupada' : 'ok'} sep={15}>
            <div className="cdp-tip-m">{nombreVehiculo[m.subtipo] ?? m.subtipo}, {m.velocidad} km/h, {m.jurisdiccion?.nombre ?? 'sin jurisdicción'}</div>
            <div>{m.despacho_abierto ? 'Atendiendo un despacho' : 'Disponible'}. Último reporte hace {m.minutos_sin_reporte} min</div>
          </Tip>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapaDespacho;
