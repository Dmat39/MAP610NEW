import { logger } from './logger.js';

const MAX_REGISTROS_POR_TIPOLOGIA = 2000;

// Caché LRU para distancias calculadas
const distanciaCache = new Map();
const MAX_CACHE_SIZE = 10000;

export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const cacheKey = `${lat1.toFixed(6)},${lon1.toFixed(6)}-${lat2.toFixed(6)},${lon2.toFixed(6)}`;

  if (distanciaCache.has(cacheKey)) {
    // LRU: mover al final
    const val = distanciaCache.get(cacheKey);
    distanciaCache.delete(cacheKey);
    distanciaCache.set(cacheKey, val);
    return val;
  }

  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const distancia = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // LRU: eliminar la entrada más antigua si se alcanzó el límite
  if (distanciaCache.size >= MAX_CACHE_SIZE) {
    distanciaCache.delete(distanciaCache.keys().next().value);
  }
  distanciaCache.set(cacheKey, distancia);

  return distancia;
};

export const calcularCentroide = puntos => {
  if (puntos.length === 0) return { lat: 0, lng: 0 };
  const sumLat = puntos.reduce((sum, p) => sum + p.Latitud, 0);
  const sumLng = puntos.reduce((sum, p) => sum + p.Longitud, 0);
  return { lat: sumLat / puntos.length, lng: sumLng / puntos.length };
};

export const calcularRadioCluster = (puntos, centroide) => {
  if (puntos.length === 0) return 50;
  const maxDistancia = Math.max(
    ...puntos.map(p => calcularDistancia(centroide.lat, centroide.lng, p.Latitud, p.Longitud))
  );
  return Math.max(maxDistancia + 10, 30);
};

// Fusiona clusters cuyo centroide cae dentro del círculo de otro cluster.
const fusionarClustersContenidos = clusters => {
  let result = clusters.map(c => ({ ...c, puntos: [...c.puntos] }));
  let changed = true;

  while (changed) {
    changed = false;

    outer: for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;

        const dist = calcularDistancia(
          result[i].centroide.lat, result[i].centroide.lng,
          result[j].centroide.lat, result[j].centroide.lng
        );

        if (dist <= result[i].radio) {
          const puntosMerged = [...result[i].puntos, ...result[j].puntos];
          const centroideMerged = calcularCentroide(puntosMerged);
          result[i] = {
            ...result[i],
            puntos: puntosMerged,
            centroide: centroideMerged,
            radio: calcularRadioCluster(puntosMerged, centroideMerged),
            cantidad: puntosMerged.length,
          };
          result.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }

  logger.log(`🔀 Fusión completada: ${clusters.length} → ${result.length} clusters`);
  return result;
};

// Clustering por radio fijo desde semilla: cada semilla absorbe solo los puntos
// dentro de radioMaximo de ella misma (sin expansión en cadena).
// Post-procesa fusionando clusters cuyo círculo visual quede contenido en otro.
export const realizarClustering = (puntos, radioMaximo = 50) => {
  if (!Array.isArray(puntos) || puntos.length === 0) return [];
  if (radioMaximo <= 0) {
    logger.warn('⚠️ Radio de clustering debe ser positivo');
    return [];
  }

  const puntosLimitados =
    puntos.length > MAX_REGISTROS_POR_TIPOLOGIA * 8
      ? puntos.slice(0, MAX_REGISTROS_POR_TIPOLOGIA * 8)
      : puntos;

  if (puntos.length > puntosLimitados.length) {
    logger.warn(`⚠️ Limitando clustering a ${puntosLimitados.length} de ${puntos.length} puntos`);
  }

  logger.debug('CLUSTERING', '🔧 Iniciando clustering...', {
    puntos: puntosLimitados.length,
    radio: radioMaximo,
  });

  const asignados = new Set();
  const clusters = [];

  for (let i = 0; i < puntosLimitados.length; i++) {
    if (asignados.has(i)) continue;

    const semilla = puntosLimitados[i];
    const miembros = [semilla];
    asignados.add(i);

    for (let j = 0; j < puntosLimitados.length; j++) {
      if (asignados.has(j)) continue;
      const d = calcularDistancia(
        semilla.Latitud, semilla.Longitud,
        puntosLimitados[j].Latitud, puntosLimitados[j].Longitud
      );
      if (d <= radioMaximo) {
        miembros.push(puntosLimitados[j]);
        asignados.add(j);
      }
    }

    if (miembros.length >= 2) {
      const centroide = calcularCentroide(miembros);
      clusters.push({
        id: `cluster_${i}`,
        puntos: miembros,
        centroide,
        radio: calcularRadioCluster(miembros, centroide),
        cantidad: miembros.length,
      });
    }
  }

  logger.log('🎯 Clustering inicial:', clusters.length, 'clusters');
  return fusionarClustersContenidos(clusters);
};

export const obtenerColorCluster = cantidad => {
  if (cantidad <= 3) return { color: '#d97706', fillColor: '#fbbf24', fillOpacity: 0.55 };
  if (cantidad <= 6) return { color: '#ea580c', fillColor: '#fb923c', fillOpacity: 0.60 };
  return { color: '#b91c1c', fillColor: '#ef4444', fillOpacity: 0.65 };
};

export const contarTiposPorCluster = puntos =>
  puntos.reduce((tipos, punto) => {
    const tipo = punto.Tipo || 'Desconocido';
    tipos[tipo] = (tipos[tipo] || 0) + 1;
    return tipos;
  }, {});
