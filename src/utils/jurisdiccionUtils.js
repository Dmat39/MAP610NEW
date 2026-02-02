// jurisdiccionUtils.js
// Utilidades para determinar la jurisdicción de un punto basándose en coordenadas

let jurisdiccionesCache = null;

/**
 * Algoritmo Ray Casting para determinar si un punto está dentro de un polígono
 * @param {number} lat - Latitud del punto
 * @param {number} lng - Longitud del punto
 * @param {Array} polygon - Array de coordenadas del polígono [[lng, lat], ...]
 * @returns {boolean}
 */
const puntoEnPoligono = (lat, lng, polygon) => {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Carga las jurisdicciones desde el archivo GeoJSON
 * @returns {Promise<Array>} Array de features de jurisdicciones
 */
export const cargarJurisdicciones = async () => {
  if (jurisdiccionesCache) {
    return jurisdiccionesCache;
  }

  try {
    const response = await fetch('/data/juridiccion.geojson');
    const data = await response.json();
    jurisdiccionesCache = data.features || [];
    return jurisdiccionesCache;
  } catch (error) {
    console.error('Error cargando jurisdicciones:', error);
    return [];
  }
};

/**
 * Determina la jurisdicción de un punto basándose en sus coordenadas
 * @param {number} lat - Latitud del punto
 * @param {number} lng - Longitud del punto
 * @param {Array} jurisdicciones - Array de features de jurisdicciones (opcional si ya están cargadas)
 * @returns {string} Nombre de la jurisdicción o 'Sin jurisdicción'
 */
export const obtenerJurisdiccion = (lat, lng, jurisdicciones) => {
  if (!jurisdicciones || jurisdicciones.length === 0) {
    return 'Sin jurisdicción';
  }

  for (const feature of jurisdicciones) {
    const geometry = feature.geometry;
    const nombre = feature.properties?.name || 'Sin nombre';

    if (geometry.type === 'Polygon') {
      const coordinates = geometry.coordinates[0]; // Primer anillo del polígono
      if (puntoEnPoligono(lat, lng, coordinates)) {
        return nombre;
      }
    } else if (geometry.type === 'MultiPolygon') {
      // Manejar MultiPolygon si existe
      for (const polygon of geometry.coordinates) {
        if (puntoEnPoligono(lat, lng, polygon[0])) {
          return nombre;
        }
      }
    }
  }

  return 'Sin jurisdicción';
};

/**
 * Asigna jurisdicciones a un array de cámaras
 * @param {Array} camaras - Array de cámaras con latitude y longitude
 * @returns {Promise<Array>} Array de cámaras con jurisdicción asignada
 */
export const asignarJurisdiccionACamaras = async (camaras) => {
  const jurisdicciones = await cargarJurisdicciones();

  return camaras.map(camara => {
    const lat = camara.latitude || camara.lat;
    const lng = camara.longitude || camara.lng;

    const jurisdiccion = obtenerJurisdiccion(lat, lng, jurisdicciones);

    return {
      ...camara,
      jurisdiccion
    };
  });
};

export default {
  cargarJurisdicciones,
  obtenerJurisdiccion,
  asignarJurisdiccionACamaras
};
