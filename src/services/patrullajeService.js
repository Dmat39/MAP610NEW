// Prueba piloto MIT: rutas inteligentes, rutas manuales y despacho asistido (backend: /patrullaje y /despacho).
const API_URL = import.meta.env.VITE_API_URL;

const req = async (path, { method = 'GET', body } = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* respuesta vacía */
  }
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message.join(', ') : json?.message;
    throw new Error(msg || `Error ${res.status}`);
  }
  return json?.data ?? json;
};

const qs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

// ─── Patrullaje ─────────────────────────────────────────────────────────────
export const obtenerEstado = () => req('patrullaje/estado');
export const obtenerMoviles = () => req('patrullaje/moviles');
export const obtenerZonasRiesgo = (turno, top = 5) => req(`patrullaje/hotspots?${qs({ turno, top })}`); // top por jurisdicción
export const obtenerJurisdicciones = () => req('patrullaje/jurisdicciones');
export const obtenerPlanes = (fecha, turno) => req(`patrullaje/planes?${qs({ fecha, turno })}`);
export const generarRutas = (body) => req('patrullaje/planes/generar', { method: 'POST', body });
export const crearRutaManual = (body) => req('patrullaje/planes/manual', { method: 'POST', body });
export const anularRuta = (id) => req(`patrullaje/planes/${id}/anular`, { method: 'PATCH' });
export const verificarRuta = (id, desdeTurno) =>
  req(`patrullaje/planes/${id}/verificar?${qs({ desde: desdeTurno ? 'turno' : '' })}`, { method: 'POST' });
export const verificarTurno = (fecha, turno, desdeTurno) =>
  req(`patrullaje/planes/verificar-turno?${qs({ fecha, turno, desde: desdeTurno ? 'turno' : '' })}`, { method: 'POST' });

// ─── Unidades, recorrido, fuera de servicio y alertas (fase 3) ─────────────
export const obtenerAPie = () => req('patrullaje/a-pie');
export const obtenerRecorrido = (tipo, id, horas = 2) => req(`patrullaje/recursos/${tipo}/${encodeURIComponent(id)}/recorrido?horas=${horas}`);
export const marcarServicio = (tipo, id, body) => req(`patrullaje/recursos/${tipo}/${encodeURIComponent(id)}/servicio`, { method: 'PATCH', body });
export const obtenerAlertas = (horas = 24) => req(`patrullaje/alertas?horas=${horas}`);
export const atenderAlerta = (id) => req(`patrullaje/alertas/${id}/atender`, { method: 'PATCH' });

// Direcciones: Nominatim (OpenStreetMap) acotado a San Juan de Lurigancho. Uso ocasional desde el buscador.
const SJL_VIEWBOX = '-77.06,-11.86,-76.90,-12.06';
export const buscarDireccion = async (texto) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=es&countrycodes=pe&bounded=1&viewbox=${SJL_VIEWBOX}&q=${encodeURIComponent(texto)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('No se pudo buscar la dirección');
  return (await res.json()).map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), nombre: r.display_name }));
};

// ─── Despacho ───────────────────────────────────────────────────────────────
export const obtenerIncidencias = (horas = 6) => req(`despacho/incidencias?horas=${horas}`);
export const sugerirMoviles = (lat, lng) => req(`despacho/sugerir?${qs({ lat, lng })}`);
export const asignarMovil = (body) => req('despacho/asignar', { method: 'POST', body });
export const obtenerDespachos = (horas = 24) => req(`despacho?horas=${horas}`);
export const obtenerMetricasDespacho = (horas = 168) => req(`despacho/metricas?horas=${horas}`);
export const marcarLlegada = (id) => req(`despacho/${id}/llegada`, { method: 'PATCH' });
// body: { resultado, notas } (resultado: ATENDIDO, FALSA_ALARMA, DERIVADO_PNP, ...)
export const cerrarDespacho = (id, body = {}) => req(`despacho/${id}/cerrar`, { method: 'PATCH', body });
export const cancelarDespacho = (id, body = {}) => req(`despacho/${id}/cancelar`, { method: 'PATCH', body });
// Prioridad y nombre corto por tipo de incidencia
export const obtenerTiposIncidencia = () => req('despacho/tipos');
export const guardarTipoIncidencia = (body) => req('despacho/tipos', { method: 'PUT', body });
