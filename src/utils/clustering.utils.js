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

// DBSCAN corregido: busca vecinos en todos los índices, no solo j > i
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

  const clusters = [];
  const visitados = new Set();

  for (let i = 0; i < puntosLimitados.length; i++) {
    if (visitados.has(i)) continue;

    const cluster = [puntosLimitados[i]];
    visitados.add(i);
    const cola = [i];

    while (cola.length > 0) {
      const indiceActual = cola.shift();
      const puntoBase = puntosLimitados[indiceActual];

      for (let j = 0; j < puntosLimitados.length; j++) {
        if (visitados.has(j)) continue;

        const distancia = calcularDistancia(
          puntoBase.Latitud,
          puntoBase.Longitud,
          puntosLimitados[j].Latitud,
          puntosLimitados[j].Longitud
        );

        if (distancia <= radioMaximo) {
          cluster.push(puntosLimitados[j]);
          visitados.add(j);
          cola.push(j);
        }
      }
    }

    if (cluster.length >= 2) {
      const centroide = calcularCentroide(cluster);
      const radio = calcularRadioCluster(cluster, centroide);
      clusters.push({
        id: `cluster_${Date.now()}_${clusters.length}`,
        puntos: cluster,
        centroide,
        radio,
        cantidad: cluster.length,
      });
    }
  }

  logger.log('🎯 Clustering completado:', clusters.length, 'clusters');
  return clusters;
};

export const obtenerColorCluster = cantidad => {
  if (cantidad <= 3) return { color: '#FFB000', fillColor: '#FFD700', fillOpacity: 0.3 };
  if (cantidad <= 6) return { color: '#FF6600', fillColor: '#FF8C00', fillOpacity: 0.4 };
  return { color: '#CC0000', fillColor: '#FF4500', fillOpacity: 0.5 };
};

export const contarTiposPorCluster = puntos =>
  puntos.reduce((tipos, punto) => {
    const tipo = punto.Tipo || 'Desconocido';
    tipos[tipo] = (tipos[tipo] || 0) + 1;
    return tipos;
  }, {});
