/**
 * Utilidades para manejo de cámaras y campos de visión
 */

/**
 * Calcula el ángulo entre dos coordenadas geográficas
 * @param {number} lat1 - Latitud de la cámara
 * @param {number} lng1 - Longitud de la cámara
 * @param {number} lat2 - Latitud de referencia (hacia donde mira)
 * @param {number} lng2 - Longitud de referencia (hacia donde mira)
 * @returns {number} - Ángulo en grados (0-360)
 */
export function getAngleFromCoords(lat1, lng1, lat2, lng2) {
  // Convertir de grados a radianes
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  // Calcular el ángulo usando la fórmula de bearing
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let brng = Math.atan2(y, x);

  // Convertir de radianes a grados
  brng = brng * 180 / Math.PI;

  // Normalizar el ángulo para que esté entre 0 y 360
  brng = (brng + 360) % 360;

  return brng;
}

/**
 * Verifica si las coordenadas de referencia son válidas
 * @param {string} referencia - String con formato "lat,lng"
 * @returns {boolean}
 */
export function isValidReferencia(referencia) {
  if (!referencia || typeof referencia !== 'string') {
    return false;
  }

  const parts = referencia.split(',');
  if (parts.length !== 2) {
    return false;
  }

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  return !isNaN(lat) && !isNaN(lng);
}

/**
 * Parsea las coordenadas de referencia de un string
 * @param {string} referencia - String con formato "lat,lng"
 * @returns {[number, number]} - Array con [lat, lng]
 */
export function parseReferencia(referencia) {
  const parts = referencia.split(',').map(s => parseFloat(s.trim()));
  return [parts[0], parts[1]];
}

/**
 * Genera un polígono de sector circular para el campo de visión de una cámara
 * @param {number} centerLat - Latitud del centro (ubicación de la cámara)
 * @param {number} centerLng - Longitud del centro (ubicación de la cámara)
 * @param {number} angleDeg - Ángulo de dirección en grados (0° = Este, medido desde eje X)
 * @param {number} arcDeg - Amplitud del arco (180 para semicírculo, 360 para círculo completo)
 * @param {number} radiusDeg - Radio en grados (default: 0.002 ≈ 200 metros)
 * @returns {Array<[number, number]>} - Array de coordenadas [lat, lng] para el polígono
 */
export function createSectorPolygon(centerLat, centerLng, angleDeg, arcDeg = 180, radiusDeg = 0.002) {
  const sectorPoints = [];
  const numPoints = 360; // Número de puntos para suavidad del polígono

  // Calcular rango del sector
  const start = angleDeg - (arcDeg / 2);
  const end = angleDeg + (arcDeg / 2);

  // Generar puntos del arco
  for (let i = 0; i <= numPoints; i++) {
    const t = start + (i / numPoints) * (end - start);
    const theta = (t * Math.PI) / 180; // Convertir a radianes

    // Calcular offset usando trigonometría
    // IMPORTANTE: 0° en eje X (Este)
    const dx = radiusDeg * Math.cos(theta); // eje X → longitud
    const dy = radiusDeg * Math.sin(theta); // eje Y → latitud

    const lat = centerLat + dy;
    const lng = centerLng + dx;

    sectorPoints.push([lat, lng]);
  }

  // Cerrar el sector conectando al centro
  sectorPoints.push([centerLat, centerLng]);

  return sectorPoints;
}

/**
 * Genera el campo de visión según el tipo de cámara
 * @param {string} cameraType - Tipo de cámara: "C180", "C360", "LPR"
 * @param {number} latitude - Latitud de la cámara
 * @param {number} longitude - Longitud de la cámara
 * @param {number|null} angle - Ángulo de dirección (solo para C180)
 * @param {number} radius - Radio en grados (default: 0.002)
 * @returns {Array<[number, number]>|null} - Coordenadas del polígono o null si no aplica
 */
export function generateVisionField(cameraType, latitude, longitude, angle, radius = 0.002) {
  if (!latitude || !longitude) {
    return null;
  }

  switch (cameraType) {
    case 'C180':
      // Semicírculo direccional (180°)
      if (angle === null || angle === undefined) {
        console.warn('Cámara C180 sin ángulo definido, no se puede generar campo de visión');
        return null;
      }
      return createSectorPolygon(latitude, longitude, angle, 180, radius);

    case 'C360':
      // Círculo completo (360°)
      return createSectorPolygon(latitude, longitude, 0, 360, radius);

    case 'LPR':
      // Sector pequeño para lectura de placas (35°)
      // Si no tiene ángulo, usar 0° por defecto (apuntando al Este)
      const angleLPR = angle !== null && angle !== undefined ? angle : 0;
      return createSectorPolygon(latitude, longitude, angleLPR, 35, radius);

    default:
      console.warn(`Tipo de cámara desconocido: ${cameraType}`);
      return null;
  }
}
