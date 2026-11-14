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

// ─── Despacho ───────────────────────────────────────────────────────────────
export const obtenerIncidencias = (horas = 6) => req(`despacho/incidencias?horas=${horas}`);
export const sugerirMoviles = (lat, lng) => req(`despacho/sugerir?${qs({ lat, lng })}`);
export const asignarMovil = (body) => req('despacho/asignar', { method: 'POST', body });
export const obtenerDespachos = (horas = 24) => req(`despacho?horas=${horas}`);
export const obtenerMetricasDespacho = (horas = 168) => req(`despacho/metricas?horas=${horas}`);
export const marcarLlegada = (id) => req(`despacho/${id}/llegada`, { method: 'PATCH' });
export const cerrarDespacho = (id, notas) => req(`despacho/${id}/cerrar`, { method: 'PATCH', body: { notas } });
export const cancelarDespacho = (id, notas) => req(`despacho/${id}/cancelar`, { method: 'PATCH', body: { notas } });
