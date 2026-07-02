// Utilidades compartidas para el filtro de jurisdicción (global) de las capas de seguridad.
import { obtenerJurisdiccion, normalizarNombreJurisdiccion } from './geoUtils';

// Lista canónica de jurisdicciones disponibles (misma que usa el filtro de cámaras).
export const JURISDICCIONES_DISPONIBLES = [
  '10 de Octubre',
  'Zarate',
  'Mariscal Caceres',
  'Bayovar',
  'Santa Elizabeth',
  'Canto Rey',
  'Huayrona',
  'Caja de Agua',
];

// Devuelve el nombre normalizado de la jurisdicción de un punto, o 'Sin Jurisdicción'.
export const computeJurisdiccion = (lat, lng, geojson) => {
  if (lat == null || lng == null || !geojson) return 'Sin Jurisdicción';
  return normalizarNombreJurisdiccion(obtenerJurisdiccion(lat, lng, geojson));
};

// True si el punto pasa el filtro de jurisdicciones seleccionadas.
// Selección vacía = todas las jurisdicciones (no filtra).
export const pasaFiltroJurisdiccion = (jurisdiccion, seleccionadas) => {
  if (!Array.isArray(seleccionadas) || seleccionadas.length === 0) return true;
  return seleccionadas.includes(jurisdiccion);
};
