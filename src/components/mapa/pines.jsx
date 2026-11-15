// Pines del mapa (Leaflet DivIcon, con caché) para el mapa general y Despacho. Regla en estados.js:
// la forma dice qué es, el color dice el estado.
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { PiVideoCameraFill, PiEyeFill } from 'react-icons/pi';
import { COLOR } from './estados';
import { IconoAPie, IconoCamara, IconoSirena, IconoVehiculo } from './simbolos';

const cache = new Map();
const divIcon = (key, html, size, anchor) => {
  if (!cache.has(key)) {
    cache.set(key, L.divIcon({ className: '', html, iconSize: size, iconAnchor: anchor ?? [size[0] / 2, size[1] / 2], popupAnchor: [0, -size[1] / 2] }));
  }
  return cache.get(key);
};
const svg = (el) => renderToStaticMarkup(el);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Indicativo fijo bajo el pin (ORION 52). Va dentro del ícono porque Leaflet admite un solo tooltip por marcador.
const etq = (texto) => (texto ? `<span class="pin-etq">${esc(texto)}</span>` : '');

/** Móvil (radio TETRA fija en camioneta o moto). `vieja`: posición con más de unos minutos, se atenúa. */
export const pinMovil = ({ subtipo, estado = 'disponible', vieja = false, etiqueta = '' }) =>
  divIcon(
    `m-${subtipo}-${estado}-${vieja}-${etiqueta}`,
    `<div class="pin pin-movil${vieja ? ' vieja' : ''}" style="--c:${COLOR[estado]}">${svg(<IconoVehiculo subtipo={subtipo} size={16} />)}${etq(etiqueta)}</div>`,
    [30, 30],
  );

/** Personal a pie: sereno con radio portátil (persona) o bodycam (cámara). `rank`: orden en la sugerencia. */
export const pinAPie = ({ tipo, estado = 'disponible', rank, doble = false, vieja = false, etiqueta = '' }) =>
  divIcon(
    `p-${tipo}-${estado}-${rank ?? ''}-${doble}-${vieja}-${etiqueta}`,
    `<div class="pin pin-apie${vieja ? ' vieja' : ''}" style="--c:${COLOR[estado]}">${svg(<IconoAPie tipo={tipo} size={13} />)}${
      doble ? `<i class="pin-extra">${svg(<PiVideoCameraFill size={8} />)}</i>` : ''
    }${rank ? `<b>${rank}</b>` : ''}${etq(etiqueta)}</div>`,
    [24, 24],
  );

/** Cámara fija. `ve`: su campo de visión cubre el punto (anillo índigo y ojo). */
export const pinCamara = ({ ve }) =>
  divIcon(
    `c-${ve}`,
    `<div class="pin pin-camara${ve ? ' ve' : ''}">${svg(<IconoCamara size={13} />)}${ve ? `<i class="pin-extra ve">${svg(<PiEyeFill size={8} />)}</i>` : ''}</div>`,
    [24, 24],
  );

/** Emergencia elegida: gota roja con pulso, siempre encima de todo. */
export const pinEmergencia = () =>
  divIcon('emergencia', `<div class="pin-gota emergencia">${svg(<IconoSirena size={15} />)}</div>`, [30, 36], [15, 36]);

/** Punto de un despacho abierto: naranja en camino, verde en el lugar. */
export const pinDespacho = (enLugar, etiqueta = '') =>
  divIcon(
    `d-${enLugar}-${etiqueta}`,
    `<div class="pin-gota ${enLugar ? 'en-lugar' : 'camino'}">${svg(<IconoSirena size={13} />)}</div>${etiqueta ? `<span class="pin-etq gota">${esc(etiqueta)}</span>` : ''}`,
    [26, 32], [13, 32],
  );

/** Parada de una ruta: número de orden. Verde cuando ya se visitó; `tenue` cuando la ruta no es la activa. */
export const pinParada = (n, visitada = false, tenue = false) =>
  divIcon(`s-${n}-${visitada}-${tenue}`, `<div class="pin-parada${visitada ? ' visitada' : ''}${tenue ? ' tenue' : ''}">${n}</div>`, [20, 20]);
