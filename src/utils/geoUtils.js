/**
 * Verifica si un punto (lat, lng) está dentro de un polígono GeoJSON
 * Usa el algoritmo Ray Casting (punto en polígono)
 *
 * @param {number} lat - Latitud del punto
 * @param {number} lng - Longitud del punto
 * @param {Array} polygonCoords - Coordenadas del polígono en formato GeoJSON [[lng, lat], ...]
 * @returns {boolean} - true si el punto está dentro del polígono
 */
export const puntoEnPoligono = (lat, lng, polygonCoords) => {
  // polygonCoords es un array de [lng, lat] (formato GeoJSON)
  // El primer y último punto deben ser iguales (polígono cerrado)

  let inside = false;

  // Para polígonos MultiPolygon o Polygon, tomar el primer anillo
  const coords = Array.isArray(polygonCoords[0][0])
    ? polygonCoords[0]  // Es un Polygon con múltiples anillos
    : polygonCoords;    // Ya es un array de coordenadas

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i]; // lng, lat
    const [xj, yj] = coords[j]; // lng, lat

    // Ray casting algorithm
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Encuentra la jurisdicción a la que pertenece un punto dado
 *
 * @param {number} lat - Latitud del punto
 * @param {number} lng - Longitud del punto
 * @param {Object} jurisdiccionesGeoJSON - Objeto GeoJSON con las jurisdicciones
 * @returns {string|null} - Nombre de la jurisdicción o null si no se encuentra
 */
export const obtenerJurisdiccion = (lat, lng, jurisdiccionesGeoJSON) => {
  if (!jurisdiccionesGeoJSON || !jurisdiccionesGeoJSON.features) {
    return null;
  }

  for (const feature of jurisdiccionesGeoJSON.features) {
    const nombre = feature.properties.name;
    const geometry = feature.geometry;

    if (geometry.type === 'Polygon') {
      if (puntoEnPoligono(lat, lng, geometry.coordinates)) {
        return nombre;
      }
    } else if (geometry.type === 'MultiPolygon') {
      // Para MultiPolygon, verificar cada polígono
      for (const polygon of geometry.coordinates) {
        if (puntoEnPoligono(lat, lng, polygon)) {
          return nombre;
        }
      }
    }
  }

  return null;
};

/**
 * Normaliza el nombre de la jurisdicción para coincidir con la lista de filtros
 *
 * @param {string} nombre - Nombre de la jurisdicción del GeoJSON
 * @returns {string} - Nombre normalizado
 */
export const normalizarNombreJurisdiccion = (nombre) => {
  if (!nombre) return 'Sin Jurisdicción';

  // Mapeo de nombres del GeoJSON a nombres de filtros
  const mapeo = {
    '10 de octubre': '10 de Octubre',
    'zarate': 'Zarate',
    'mariscal caceres': 'Mariscal Caceres',
    'bayovar': 'Bayovar',
    'santa elizabeth': 'Santa Elizabeth',
    'canto rey': 'Canto Rey',
    'huayrona': 'Huayrona',
    'caja de agua': 'Caja de Agua',
  };

  const nombreLower = nombre.toLowerCase().trim();
  return mapeo[nombreLower] || nombre;
};
