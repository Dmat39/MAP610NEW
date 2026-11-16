// Reglas y constantes de la vista de operador (fase 3). Los componentes están en Operador.jsx.
import { PiPauseCircle, PiArrowSquareOut, PiWifiSlash, PiMapTrifold } from 'react-icons/pi';
import { ESTADOS, MINUTOS_GPS_VIEJO, estadoRecurso } from '../mapa/estados';

export const nombreEstado = (key) => ESTADOS.find((e) => e.key === key)?.label ?? key;

/** Estado de una unidad para listas y tarjeta (incluye "sin GPS reciente" cuando está libre pero su posición es vieja). */
export const estadoUnidad = (u, despacho) => {
  const e = estadoRecurso(u, despacho);
  return e === 'disponible' && (u.minutos_sin_reporte ?? 0) > MINUTOS_GPS_VIEJO ? 'gps_viejo' : e;
};

/** Clave única de una unidad: 'MOVIL:issi', 'RADIO:issi' o 'BODYCAM:codigo'. */
export const claveUnidad = (u) => `${u.tipo}:${u.id}`;

export const nombreTipoUnidad = (u) =>
  (u.tipo === 'MOVIL' ? ({ MOTO: 'Moto', CAMION: 'Camioneta' }[u.subtipo] ?? 'Camioneta') : u.tipo === 'BODYCAM' ? 'Bodycam' : 'Sereno con radio');

export const TIPO_ALERTA = {
  DETENIDA: { label: 'Detenida', icon: PiPauseCircle, desc: 'Más de 15 min quieta fuera de una parada' },
  FUERA_JURISDICCION: { label: 'Fuera de jurisdicción', icon: PiArrowSquareOut, desc: 'Lejos de la jurisdicción de su ruta' },
  SIN_REPORTE: { label: 'Dejó de reportar', icon: PiWifiSlash, desc: 'Estaba en línea y dejó de reportar' },
  JURISDICCION_SIN_MOVIL: { label: 'Jurisdicción sin móvil', icon: PiMapTrifold, desc: 'Ninguna móvil con GPS en servicio' },
};

export const ATAJOS = [
  ['N', 'Nueva emergencia: marcar el punto en el mapa'],
  ['E', 'Enviar la móvil sugerida (la primera de la lista)'],
  ['↓ / ↑', 'Siguiente / anterior incidencia pendiente'],
  ['L', 'Marcar la llegada del despacho en camino más antiguo'],
  ['C', 'Cerrar el despacho activo más antiguo (pide el resultado)'],
  ['/', 'Ir al buscador'],
  ['1 a 6', 'Cambiar de pestaña'],
  ['Esc', 'Cerrar tarjeta, emergencia o modo de marcado'],
  ['?', 'Mostrar u ocultar esta ayuda'],
];
