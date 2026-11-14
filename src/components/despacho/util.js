// Utilidades de la pantalla Despacho y Patrullaje.

export const CENTRO_SJL = [-11.985, -77.0];

export const TURNOS = [
  { value: 'MORNING', label: 'Mañana', horas: '06:00-14:00' },
  { value: 'AFTERNOON', label: 'Tarde', horas: '14:00-22:00' },
  { value: 'NIGHT', label: 'Noche', horas: '22:00-06:00' },
];
export const turnoLabel = (v) => TURNOS.find((t) => t.value === v)?.label ?? v;

// Colores distinguibles para las rutas de cada móvil.
const PALETA = [
  '#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626',
  '#4f46e5', '#059669', '#c026d3', '#65a30d', '#0284c7', '#b45309', '#9333ea', '#e11d48',
];
export const colorPorIndice = (i) => PALETA[i % PALETA.length];
// Color estable por móvil (no cambia entre recargas aunque cambie el orden de la lista).
export const colorPorIssi = (issi) => {
  let h = 0;
  for (const c of String(issi)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
};

export const NIVEL_COLOR = { alto: '#dc2626', medio: '#f97316', bajo: '#eab308' };

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

export const ESTADO_DESPACHO = {
  ASIGNADO: { label: 'En camino', color: '#2563eb' },
  EN_LUGAR: { label: 'En el lugar', color: '#16a34a' },
  CERRADO: { label: 'Cerrado', color: '#64748b' },
  CANCELADO: { label: 'Cancelado', color: '#94a3b8' },
};
