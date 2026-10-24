// Pin de "mi ubicación" (Leaflet y Google Maps): gota azul con una persona en blanco,
// distinta a los pines rojos del ubicador y a los íconos de cámaras
export const PIN_ANCHO = 30;
export const PIN_ALTO = 40;

export const PIN_MI_UBICACION_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40" width="${PIN_ANCHO}" height="${PIN_ALTO}">` +
  '<path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z" ' +
  'fill="#2563eb" stroke="#ffffff" stroke-width="2"/>' +
  '<circle cx="15" cy="10.5" r="3.2" fill="#ffffff"/>' +
  '<path d="M9.2 21.5c0-3.4 2.6-5.8 5.8-5.8s5.8 2.4 5.8 5.8z" fill="#ffffff"/>' +
  '</svg>';
