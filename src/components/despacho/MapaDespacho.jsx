import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Circle, Polyline, Marker, Tooltip, GeoJSON, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { CENTRO_SJL, fmtKm, fmtMin } from './util';
import { COLOR, COLOR_RIESGO, OPACIDAD_RIESGO, MINUTOS_GPS_VIEJO, estadoRecurso } from '../mapa/estados';
import { pinAPie, pinCamara, pinDespacho, pinEmergencia, pinMovil, pinParada } from '../mapa/pines';

const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // en tema oscuro se invierte con CSS (ver index.css)
const ZOOM_ETIQUETAS = 15; // desde este zoom se muestra el indicativo junto a cada móvil
const estiloJur = { color: '#475569', weight: 1.4, dashArray: '5 5', fillColor: '#64748b', fillOpacity: 0.03 };
const nombreVehiculo = { MOTO: 'Moto', CAMION: 'Camioneta', AUTOMOVIL: 'Camioneta' };
const nombreEstado = { disponible: 'Disponible', ocupada: 'Atendiendo un despacho', en_lugar: 'En el lugar del despacho', sin_reporte: 'Sin reporte' };
const ESTADO_INC = { DESPACHADA: 'Despachada', EN_ATENCION: 'En atención', CERRADA: 'Cerrada' };

/**
 * Tarjeta flotante del mapa. Sale hacia el lado con más espacio, con ancho máximo y texto que salta de línea.
 * `sep` es la distancia al borde del ícono, para que la tarjeta no lo tape.
 */
const Tip = ({ titulo, tono, sep = 10, dy = 0, sticky, children }) => (
  <Tooltip className="cdp-tip" direction="auto" offset={[sep, dy]} opacity={1} sticky={sticky}>
    <div className="cdp-tip-t">
      {tono && <i className="cdp-tip-dot" style={{ background: COLOR[tono] ?? COLOR_RIESGO[tono] ?? tono }} />}
      <span>{titulo}</span>
    </div>
    {children && <div className="cdp-tip-b">{children}</div>}
  </Tooltip>
);

const ClickMapa = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick?.(e.latlng) });
  return null;
};

const ZoomActual = ({ onZoom }) => {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => { onZoom(map.getZoom()); }, [map, onZoom]);
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
  moviles, zonas, planes, incidencias, despachos, sugerencia, punto, borrador, jurisdicciones,
  capas, planSeleccionado, planResaltado, onResaltarPlan, onMapClick, onSelectIncidencia, onSelectPlan,
  cursorCruz, encuadre, oscuro,
}) => {
  const [zoom, setZoom] = useState(13);
  const enLinea = useMemo(() => moviles.filter((m) => m.en_linea), [moviles]);
  const offline = useMemo(() => moviles.filter((m) => !m.en_linea && (m.lat ?? null) !== null), [moviles]);
  const abiertos = useMemo(() => despachos.filter((d) => d.status === 'ASIGNADO' || d.status === 'EN_LUGAR'), [despachos]);
  const despachoPorRecurso = useMemo(() => new Map(abiertos.map((d) => [`${d.resource_type}:${d.unit_issi}`, d])), [abiertos]);
  const hayEmergencia = !!punto;
  const planActivo = planSeleccionado ?? planResaltado ?? null;
  // Paradas: solo de la ruta activa; si no hay ninguna activa y son pocas rutas, de todas.
  const mostrarParadasDe = (p) => (planActivo ? p.id === planActivo : planes.length <= 3 && !hayEmergencia);
  const planesVisibles = planSeleccionado ? planes.filter((p) => p.id === planSeleccionado) : planes;
  const etiquetas = zoom >= ZOOM_ETIQUETAS;

  return (
    <MapContainer center={CENTRO_SJL} zoom={13} className={`cdp-map${cursorCruz ? ' cdp-map-cruz' : ''}${oscuro ? ' oscuro' : ''}`}>
      <TileLayer url={TILE} attribution="&copy; OpenStreetMap" maxZoom={19} />
      <ClickMapa onClick={onMapClick} />
      <ZoomActual onZoom={setZoom} />
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

      {/* Zonas de riesgo del turno (rojo; más intenso = más riesgo) */}
      {capas.zonas && zonas.map((z) => (
        <Circle key={z.id} center={[z.lat, z.lon]} radius={100}
          pathOptions={{
            color: COLOR_RIESGO[z.nivel] ?? COLOR_RIESGO.bajo, weight: 1.2,
            fillOpacity: hayEmergencia ? 0.06 : (OPACIDAD_RIESGO[z.nivel] ?? 0.14), opacity: hayEmergencia ? 0.35 : 0.9,
          }}>
          <Tip titulo={`Zona de riesgo ${z.nivel}`} tono={z.nivel} sticky sep={14}>
            <div className="cdp-tip-m">{z.jurisdiccion}</div>
            {z.mensaje && <div>{z.mensaje}</div>}
          </Tip>
        </Circle>
      ))}

      {/* Rutas de patrullaje: tenues por defecto; se resalta la seleccionada o la que está bajo el cursor */}
      {capas.rutas && planesVisibles.map((p) => {
        const activa = planActivo === p.id;
        const tenue = (planActivo && !activa) || (hayEmergencia && !planSeleccionado);
        return (
          <Fragment key={p.id}>
            {Array.isArray(p.route) && p.route.length > 1 && (
              <Polyline
                positions={p.route}
                pathOptions={{
                  color: COLOR.ruta, weight: activa ? 5 : 3, opacity: tenue ? 0.18 : activa ? 0.95 : 0.5,
                  dashArray: p.source === 'MANUAL' ? '8 6' : null,
                }}
                eventHandlers={{
                  click: () => onSelectPlan?.(p.id),
                  mouseover: () => onResaltarPlan?.(p.id),
                  mouseout: () => onResaltarPlan?.(null),
                }}
              >
                <Tip titulo={p.unit_code} tono="ruta" sticky sep={14}>
                  <div className="cdp-tip-m">{p.source === 'MANUAL' ? 'Ruta manual' : 'Ruta inteligente'}, {p.stops.length} paradas. Clic para verla sola.</div>
                </Tip>
              </Polyline>
            )}
            {mostrarParadasDe(p) && p.stops.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={pinParada(s.order, !!s.visited_at, false)}>
                <Tip titulo={`${p.unit_code}, parada ${s.order}`} tono={s.visited_at ? 'en_lugar' : 'ruta'} sep={12}>
                  <div className="cdp-tip-m">Permanecer {s.dwell_min} min{s.visited_at ? '. Ya visitada' : ''}</div>
                  {s.reason && <div>{s.reason}</div>}
                </Tip>
              </Marker>
            ))}
          </Fragment>
        );
      })}

      {/* Incidencias recientes: morado = incidencia; el tamaño y el borde dicen la prioridad (alta más grande,
          con borde rojo); las ya despachadas o cerradas van huecas */}
      {capas.incidencias && incidencias.map((i) => {
        const pendiente = !i.estado || i.estado === 'PENDIENTE';
        const alta = i.prioridad === 'ALTA';
        return (
          <CircleMarker key={i.id} center={[i.lat, i.lon]} radius={alta ? 7 : i.prioridad === 'BAJA' ? 4 : 5}
            pathOptions={{
              color: alta && pendiente ? COLOR.emergencia : '#5b21b6', fillColor: COLOR.incidencia,
              fillOpacity: pendiente ? 0.95 : 0.2, weight: alta ? 2.5 : 1.5, opacity: pendiente ? 1 : 0.6,
            }}
            eventHandlers={{ click: () => onSelectIncidencia?.(i) }}>
            <Tip titulo={i.corto || i.tipo || 'Incidencia'} tono="incidencia" sep={10}>
              {i.corto && i.tipo && i.corto !== i.tipo && <div className="cdp-tip-m">{i.tipo}</div>}
              <div className="cdp-tip-m">{i.codigo}{i.jurisdiccion ? `, ${i.jurisdiccion}` : ''}</div>
              <div>
                {i.prioridad ? `Prioridad ${i.prioridad.toLowerCase()}` : ''}
                {i.estado && i.estado !== 'PENDIENTE' ? `. ${ESTADO_INC[i.estado] ?? i.estado}${i.unidades?.length ? `: ${i.unidades.join(', ')}` : ''}` : ''}
              </div>
              <div className="cdp-tip-acc">{pendiente ? 'Clic para despachar' : 'Clic para enviar refuerzo'}</div>
            </Tip>
          </CircleMarker>
        );
      })}

      {/* Despachos abiertos: recorrido por calles de la móvil hacia el punto (recta si aún no hay ruta) */}
      {abiertos.filter((d) => d.status === 'ASIGNADO' && d.movil_actual?.lat).map((d) => (
        <Polyline key={`r-${d.id}`}
          positions={d.ruta?.geometry?.length > 1 ? d.ruta.geometry : [[d.movil_actual.lat, d.movil_actual.lng], [d.lat, d.lng]]}
          pathOptions={{ color: COLOR.ocupada, weight: 3.5, opacity: 0.9, dashArray: d.ruta?.fuente === 'osrm' ? null : '4 6' }} />
      ))}
      {abiertos.map((d) => (
        <Marker key={`dp-${d.id}`} position={[d.lat, d.lng]} icon={pinDespacho(d.status === 'EN_LUGAR', d.unit_code)} zIndexOffset={900}>
          <Tip titulo={`${d.unit_code} hacia ${d.incident_code ?? 'punto marcado'}`} tono={d.status === 'EN_LUGAR' ? 'en_lugar' : 'ocupada'} sep={14} dy={-16}>
            {d.incident_corto && <div className="cdp-tip-m">{d.incident_corto}{d.priority ? `, prioridad ${d.priority.toLowerCase()}` : ''}</div>}
            <div className="cdp-tip-m">
              {d.status === 'EN_LUGAR'
                ? 'En el lugar'
                : d.ruta ? `En camino: ${fmtMin(d.ruta.duration_s)}, ${fmtKm(d.ruta.distance_m)} por calles` : `En camino, a ${fmtKm(d.distancia_actual_m)}`}
            </div>
          </Tip>
        </Marker>
      ))}

      {/* Emergencia elegida: solo se dibujan los recursos sugeridos, no todos */}
      {punto && <Marker position={[punto.lat, punto.lng]} icon={pinEmergencia()} zIndexOffset={2000} />}
      {punto && sugerencia?.ruta_mejor?.geometry?.length > 1 && (
        <Polyline positions={sugerencia.ruta_mejor.geometry}
          pathOptions={{ color: COLOR.emergencia, weight: 3.5, opacity: 0.9, dashArray: sugerencia.ruta_mejor.fuente === 'osrm' ? null : '6 6' }} />
      )}
      {punto && sugerencia?.ranking?.slice(0, 3).filter((r) => r.rank !== 1 || !sugerencia.ruta_mejor).map((r) => (
        <Polyline key={`s-${r.issi}`} positions={[[r.lat, r.lng], [punto.lat, punto.lng]]}
          pathOptions={{ color: r.rank === 1 ? COLOR.emergencia : '#94a3b8', weight: r.rank === 1 ? 2.5 : 1.5, dashArray: '6 6' }} />
      ))}
      {punto && sugerencia?.a_pie?.slice(0, 5).map((r) => (
        <Marker key={`ap-${r.tipo}-${r.id}`} position={[r.lat, r.lng]} zIndexOffset={700}
          icon={pinAPie({ tipo: r.tipo, estado: r.ocupada ? 'ocupada' : 'disponible', rank: r.rank, doble: !!r.acompanante, vieja: (r.minutos_sin_reporte ?? 0) > MINUTOS_GPS_VIEJO, etiqueta: r.codigo })}>
          <Tip titulo={`${r.tipo === 'BODYCAM' ? 'Bodycam' : 'Sereno con radio'} ${r.codigo}`} tono={r.ocupada ? 'ocupada' : 'disponible'} sep={12}>
            <div className="cdp-tip-m">A pie, {fmtMin(r.duration_s)} ({fmtKm(r.recta_m)} en línea recta)</div>
            {r.acompanante && <div>Lleva también {r.acompanante.tipo === 'BODYCAM' ? 'bodycam' : 'radio'} {r.acompanante.codigo}</div>}
            {(r.minutos_sin_reporte ?? 0) > MINUTOS_GPS_VIEJO && <div>Última posición hace {r.minutos_sin_reporte} min</div>}
          </Tip>
        </Marker>
      ))}
      {punto && sugerencia?.camaras?.rows?.slice(0, 5).map((c) => (
        <Marker key={`cam-${c.id}`} position={[c.lat, c.lng]} icon={pinCamara({ ve: c.ve_el_punto === true })} zIndexOffset={600}>
          <Tip titulo={`Cámara ${c.codigo}`} tono={c.ve_el_punto ? 'ruta' : 'camara'} sep={12}>
            <div className="cdp-tip-m">{c.tipo === 'VECINAL' ? 'Vecinal' : c.modelo}{c.direccion ? `, ${c.direccion}` : ''}</div>
            <div className={c.ve_el_punto ? 'cdp-tip-acc' : undefined}>
              {c.ve_el_punto ? 'Su campo de visión cubre la emergencia' : `A ${fmtKm(c.distancia_m)} del punto`}
            </div>
          </Tip>
        </Marker>
      ))}

      {/* Borrador de ruta manual */}
      {borrador.length > 0 && (
        <>
          <Polyline positions={borrador.map((b) => [b.lat, b.lng])} pathOptions={{ color: COLOR.ruta, dashArray: '6 6', weight: 2.5 }} />
          {borrador.map((b, i) => <Marker key={`b-${i}`} position={[b.lat, b.lng]} icon={pinParada(i + 1, false, false)} />)}
        </>
      )}

      {/* Móviles sin reporte (gris) y en línea (color según su estado; atenuadas si su GPS es viejo) */}
      {capas.offline && offline.map((m) => (
        <Marker key={`o-${m.issi}`} position={[m.lat, m.lng]} icon={pinMovil({ subtipo: m.subtipo, estado: 'sin_reporte', vieja: true, etiqueta: etiquetas ? m.codigo : '' })}>
          <Tip titulo={m.codigo} tono="sin_reporte" sep={15}>
            <div className="cdp-tip-m">Sin reporte hace {Math.round((m.minutos_sin_reporte ?? 0) / 60)} h</div>
            {m.estado_radio && <div>{m.estado_radio}</div>}
          </Tip>
        </Marker>
      ))}
      {capas.moviles && enLinea.map((m) => {
        const d = despachoPorRecurso.get(`MOVIL:${m.issi}`);
        const estado = estadoRecurso(m, d);
        const vieja = (m.minutos_sin_reporte ?? 0) > MINUTOS_GPS_VIEJO;
        const suPlan = planes.find((x) => x.unit_issi === m.issi);
        return (
          <Marker key={m.issi} position={[m.lat, m.lng]} zIndexOffset={500}
            icon={pinMovil({ subtipo: m.subtipo, estado, vieja, etiqueta: etiquetas ? m.codigo : '' })}
            eventHandlers={{
              click: () => { if (suPlan) onSelectPlan?.(suPlan.id); },
              mouseover: () => { if (suPlan) onResaltarPlan?.(suPlan.id); },
              mouseout: () => onResaltarPlan?.(null),
            }}>
            <Tip titulo={m.codigo} tono={estado} sep={15}>
              <div className="cdp-tip-m">{nombreVehiculo[m.subtipo] ?? m.subtipo}, {m.velocidad} km/h, {m.jurisdiccion?.nombre ?? 'sin jurisdicción'}</div>
              <div>
                {nombreEstado[estado]}{d?.incident_code ? ` (${d.incident_code})` : ''}. Último reporte hace {m.minutos_sin_reporte} min{vieja ? ', posición vieja' : ''}
              </div>
              {suPlan && <div className="cdp-tip-m">Ruta: {suPlan.stops.filter((s) => s.visited_at).length} de {suPlan.stops.length} paradas visitadas</div>}
            </Tip>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapaDespacho;
