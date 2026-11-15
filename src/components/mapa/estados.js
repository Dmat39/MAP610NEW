// Lenguaje visual único de los mapas de SIVECAM (mapa general y Despacho y Patrullaje).
// Regla para el operador: la FORMA dice qué es; el COLOR dice el estado. Ningún color significa dos cosas.
//   Forma:  camioneta, moto, persona (sereno a pie con radio), bodycam, cámara fija, sirena (emergencia/despacho),
//           triángulo (incidencia), círculo rojo (zona de riesgo), número (parada de ruta).
//   Color:  azul disponible, naranja asignada/en camino, verde en el lugar, amarillo sin GPS reciente,
//           gris sin reporte, rojo emergencia o riesgo, morado incidencia, índigo ruta, pizarra cámara.
// Aquí van los colores y las reglas de estado; los componentes están en simbolos.jsx y los pines en pines.jsx.

export const COLOR = {
  disponible: '#2563eb',
  ocupada: '#f97316',
  en_lugar: '#15803d',
  gps_viejo: '#eab308',
  sin_reporte: '#94a3b8',
  emergencia: '#dc2626',
  incidencia: '#7c3aed',
  ruta: '#4f46e5',
  camara: '#334155',
};

export const ESTADOS = [
  { key: 'disponible', label: 'Disponible', desc: 'Reporta GPS y está libre' },
  { key: 'ocupada', label: 'En camino', desc: 'Asignada a un despacho' },
  { key: 'en_lugar', label: 'En el lugar', desc: 'Llegó al punto del despacho' },
  { key: 'gps_viejo', label: 'Sin GPS reciente', desc: 'Encendida, pero su posición es vieja' },
  { key: 'sin_reporte', label: 'Sin reporte', desc: 'Apagada o sin señal' },
];

// Zonas de riesgo: un solo tono (rojo = riesgo); más intenso = más riesgo.
export const COLOR_RIESGO = { alto: '#b91c1c', medio: '#ef4444', bajo: '#fca5a5' };
export const OPACIDAD_RIESGO = { alto: 0.28, medio: 0.2, bajo: 0.14 };

export const MINUTOS_GPS_VIEJO = 5;

/** Estado de una móvil o recurso de Despacho. `despacho`: el despacho abierto de ese recurso, si hay. */
export const estadoRecurso = (r, despacho) => {
  if (!r?.en_linea) return 'sin_reporte';
  if (despacho?.status === 'EN_LUGAR') return 'en_lugar';
  if (r.despacho_abierto || despacho) return 'ocupada';
  return 'disponible';
};

/** Estado de una radio del mapa general según el color que entrega Dolphin (verde / amarillo / rojo). */
export const estadoRadioDolphin = (r) => {
  const c = String(r?.color ?? '').toLowerCase();
  if (c === 'verde') return 'disponible';
  if (c === 'amarillo') return 'gps_viejo';
  if (c === 'rojo') return 'sin_reporte';
  const h = String(r?.hexacolor ?? '').toLowerCase();
  if (['#16a34a', '#22c55e', 'green'].includes(h)) return 'disponible';
  if (['#eab308', '#facc15', 'yellow'].includes(h)) return 'gps_viejo';
  if (['#ef4444', '#f87171', 'red'].includes(h)) return 'sin_reporte';
  return 'disponible';
};

/** Estado de una bodycam del mapa general por el tiempo desde su última ubicación. */
export const estadoBodycamPorTiempo = (ultimaUbicacion) => {
  const min = (Date.now() - new Date(ultimaUbicacion).getTime()) / 60000;
  if (!Number.isFinite(min) || min > 60) return 'sin_reporte';
  if (min > 30) return 'gps_viejo';
  return 'disponible';
};
