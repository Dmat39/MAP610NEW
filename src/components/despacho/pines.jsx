// Pines del mapa de Despacho y Patrullaje. Una sola familia de íconos (Phosphor, vía react-icons/pi).
// Regla para el personal: vehículo = ícono de auto/camioneta/moto; a pie = persona o bodycam; cámara = cámara.
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { PiVideoCameraFill } from 'react-icons/pi';
import { IconoAPie, IconoCamara, IconoSirena, IconoVehiculo } from './iconos';

const cache = new Map();
const divIcon = (key, html, size, anchor) => {
  if (!cache.has(key)) cache.set(key, L.divIcon({ className: '', html, iconSize: size, iconAnchor: anchor ?? [size[0] / 2, size[1] / 2] }));
  return cache.get(key);
};
const svg = (el) => renderToStaticMarkup(el);

/** Móvil: placa redonda del color de su ruta con el vehículo. Anillo naranja si tiene un despacho abierto. */
export const pinMovil = ({ subtipo, color, ocupada, apagada }) =>
  divIcon(
    `m-${subtipo}-${color}-${ocupada}-${apagada}`,
    `<div class="pin pin-movil${ocupada ? ' ocupada' : ''}${apagada ? ' apagada' : ''}" style="--c:${apagada ? '#94a3b8' : color}">${svg(<IconoVehiculo subtipo={subtipo} size={16} />)}</div>`,
    [30, 30],
  );

/** Personal a pie (radio portátil o bodycam), con el número de su orden en la sugerencia. */
export const pinAPie = ({ tipo, rank, doble }) =>
  divIcon(
    `p-${tipo}-${rank}-${doble}`,
    `<div class="pin pin-apie ${tipo === 'BODYCAM' ? 'bodycam' : 'radio'}">${svg(<IconoAPie tipo={tipo} size={13} />)}${doble ? `<i class="pin-extra">${svg(<PiVideoCameraFill size={8} />)}</i>` : ''}<b>${rank}</b></div>`,
    [24, 24],
  );

/** Cámara cercana. Borde verde si su campo de visión cubre la emergencia. */
export const pinCamara = ({ ve }) =>
  divIcon(`c-${ve}`, `<div class="pin pin-camara${ve ? ' ve' : ''}">${svg(<IconoCamara size={13} />)}</div>`, [24, 24]);

/** Emergencia elegida para despachar. */
export const pinEmergencia = () =>
  divIcon('emergencia', `<div class="pin-gota">${svg(<IconoSirena size={15} />)}</div>`, [30, 36], [15, 36]);

/** Despacho abierto en el mapa (azul en camino, verde en el lugar). */
export const pinDespacho = (enLugar) =>
  divIcon(`d-${enLugar}`, `<div class="pin-gota ${enLugar ? 'ok' : 'camino'}">${svg(<IconoSirena size={13} />)}</div>`, [26, 32], [13, 32]);

/** Parada de una ruta: número del orden de visita; relleno verde si ya se visitó. */
export const pinParada = (n, color, visitada) =>
  divIcon(
    `s-${n}-${color}-${visitada}`,
    `<div class="pin-parada${visitada ? ' visitada' : ''}" style="--c:${color}">${n}</div>`,
    [20, 20],
  );
