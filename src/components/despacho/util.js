// Utilidades de la pantalla Despacho y Patrullaje.

export const CENTRO_SJL = [-11.985, -77.0];

export const TURNOS = [
  { value: 'MORNING', label: 'Mañana', horas: '06:00-14:00' },
  { value: 'AFTERNOON', label: 'Tarde', horas: '14:00-22:00' },
  { value: 'NIGHT', label: 'Noche', horas: '22:00-06:00' },
];
export const turnoLabel = (v) => TURNOS.find((t) => t.value === v)?.label ?? v;

export const fmtMin = (s) => ((s ?? null) === null ? '-' : s < 60 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1)} min`);
export const fmtKm = (m) => ((m ?? null) === null ? '-' : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
export const fmtHora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : '-';

export const hoyLima = () =>
  new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

export const textoWhatsApp = (d) => {
  const lineas = [
    `*CECOM SJL: despacho*`,
    d.incident_code ? `Incidencia: ${d.incident_code}` : null,
    d.incident_type ? `Tipo: ${d.incident_type}` : null,
    d.reference ? `Referencia: ${d.reference}` : null,
    `Móvil: ${d.unit_code}`,
    `Ir con Waze: ${d.enlaces?.waze}`,
    `Google Maps: ${d.enlaces?.google}`,
  ].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`;
};

// Colores de estado: los mismos de mapa/simbolos (naranja en camino, verde en el lugar)
export const ESTADO_DESPACHO = {
  ASIGNADO: { label: 'En camino', color: '#f97316' },
  EN_LUGAR: { label: 'En el lugar', color: '#15803d' },
  CERRADO: { label: 'Cerrado', color: '#64748b' },
  CANCELADO: { label: 'Cancelado', color: '#94a3b8' },
};

// Prioridad por tipo de incidencia (la define el backend; aquí solo cómo se muestra).
// Rojo = urgente (mismo tono que emergencia), ámbar = media, gris = baja.
export const PRIORIDAD = {
  ALTA: { label: 'Alta', color: '#dc2626', orden: 0 },
  MEDIA: { label: 'Media', color: '#b45309', orden: 1 },
  BAJA: { label: 'Baja', color: '#64748b', orden: 2 },
};

// Estado de una incidencia según sus despachos
export const ESTADO_INCIDENCIA = {
  PENDIENTE: { label: 'Pendiente', color: '#7c3aed' },
  DESPACHADA: { label: 'Despachada', color: '#f97316' },
  EN_ATENCION: { label: 'En atención', color: '#15803d' },
  CERRADA: { label: 'Cerrada', color: '#64748b' },
};

// Resultado al cerrar o cancelar un despacho (mismos valores que el backend)
export const RESULTADOS_CIERRE = [
  ['ATENDIDO', 'Atendido'],
  ['SIN_NOVEDAD', 'Sin novedad al llegar'],
  ['FALSA_ALARMA', 'Falsa alarma'],
  ['DERIVADO_PNP', 'Derivado a PNP'],
  ['DERIVADO_BOMBEROS', 'Derivado a Bomberos'],
  ['DERIVADO_SAMU', 'Derivado a SAMU'],
  ['NO_UBICADO', 'No se ubicó el lugar'],
  ['OTRO', 'Otro'],
];
export const RESULTADOS_CANCELACION = [
  ['REASIGNADO', 'Se reasignó a otra unidad'],
  ['FALSA_ALARMA', 'Falsa alarma'],
  ['DERIVADO_PNP', 'Lo atiende la PNP'],
  ['OTRO', 'Otro'],
];
export const textoResultado = (r) =>
  [...RESULTADOS_CIERRE, ...RESULTADOS_CANCELACION].find(([k]) => k === r)?.[1] ?? r ?? '';

// Cronómetro: 0:45, 12:03, 1:05:10
export const fmtCrono = (s) => {
  if ((s ?? null) === null || s < 0) return '-';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};

// Segundos desde una fecha ISO hasta `ahora` (ms)
export const segDesde = (iso, ahora = Date.now()) => (iso ? Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000)) : null);

// Distancia en metros entre dos puntos (haversine), para nombrar paradas por la zona de riesgo más cercana
export const distanciaM = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};
