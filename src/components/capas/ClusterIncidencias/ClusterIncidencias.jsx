import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils';
import { useMapContext } from '../../../context/MapContext';

// Límite máximo de registros por tipología para optimizar rendimiento
const MAX_REGISTROS_POR_TIPOLOGIA = 2000;

// Caché de distancias para evitar recalcular
const distanciaCache = new Map();

// Función para calcular distancia entre dos puntos en metros usando fórmula de Haversine
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  // Crear key único para el caché
  const cacheKey = `${lat1.toFixed(6)},${lon1.toFixed(6)}-${lat2.toFixed(6)},${lon2.toFixed(6)}`;

  // Verificar si ya está en caché
  if (distanciaCache.has(cacheKey)) {
    return distanciaCache.get(cacheKey);
  }

  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c;

  // Guardar en caché (limitar tamaño del caché)
  if (distanciaCache.size > 10000) {
    distanciaCache.clear(); // Limpiar caché si crece demasiado
  }
  distanciaCache.set(cacheKey, distancia);

  return distancia;
};

// Función para calcular el centroide de un conjunto de puntos
const calcularCentroide = puntos => {
  if (puntos.length === 0) return { lat: 0, lng: 0 };

  const sumLat = puntos.reduce((sum, punto) => sum + punto.Latitud, 0);
  const sumLng = puntos.reduce((sum, punto) => sum + punto.Longitud, 0);

  return {
    lat: sumLat / puntos.length,
    lng: sumLng / puntos.length,
  };
};

// Función para calcular el radio del cluster basado en la dispersión de puntos
const calcularRadioCluster = (puntos, centroide) => {
  if (puntos.length === 0) return 50;

  const distanciasAlCentroide = puntos.map(punto =>
    calcularDistancia(centroide.lat, centroide.lng, punto.Latitud, punto.Longitud)
  );

  const maxDistancia = Math.max(...distanciasAlCentroide);
  // Añadir un pequeño buffer para asegurar que todos los puntos estén dentro
  return Math.max(maxDistancia + 10, 30); // Mínimo 30 metros
};

// Algoritmo de clustering basado en densidad (DBSCAN optimizado)
const realizarClustering = (puntos, radioMaximo = 50) => {
  logger.debug('CLUSTERING', '🔧 Iniciando algoritmo de clustering...', {
    puntos: puntos.length,
    radio: radioMaximo,
  });

  // Si hay demasiados puntos, limitarlos para mantener rendimiento
  const puntosLimitados = puntos.length > MAX_REGISTROS_POR_TIPOLOGIA * 8
    ? puntos.slice(0, MAX_REGISTROS_POR_TIPOLOGIA * 8)
    : puntos;

  if (puntos.length > puntosLimitados.length) {
    logger.warn(`⚠️ Limitando clustering a ${puntosLimitados.length} puntos de ${puntos.length} totales`);
  }

  const clusters = [];
  const visitados = new Set();

  for (let i = 0; i < puntosLimitados.length; i++) {
    if (visitados.has(i)) continue;

    const puntoActual = puntosLimitados[i];
    const cluster = [puntoActual];
    visitados.add(i);

    // Buscar todos los puntos cercanos al punto actual
    const cola = [i];

    while (cola.length > 0) {
      const indiceActual = cola.shift();
      const puntoBase = puntosLimitados[indiceActual];

      // Buscar vecinos del punto base (optimizado con early exit)
      for (let j = i + 1; j < puntosLimitados.length; j++) {
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
          cola.push(j); // Agregar a la cola para expandir desde este punto
        }
      }
    }

    // Solo crear cluster si tiene al menos 2 puntos
    if (cluster.length >= 2) {
      const centroide = calcularCentroide(cluster);
      const radio = calcularRadioCluster(cluster, centroide);

      clusters.push({
        id: clusters.length + 1,
        puntos: cluster,
        centroide,
        radio,
        cantidad: cluster.length,
      });

      logger.debug('CLUSTERING', `📍 Cluster ${clusters.length} creado:`, {
        puntos: cluster.length,
        centroide: `${centroide.lat.toFixed(6)}, ${centroide.lng.toFixed(6)}`,
        radio: Math.round(radio),
      });
    }
  }

  logger.log('🎯 Clustering completado:', clusters.length, 'clusters creados');
  return clusters;
};

// Función para determinar el tipo de incidencia basado en la descripción
const determinarTipo = descripcion => {
  const desc = (descripcion || '').toLowerCase();
  const esExtorsion =
    desc.includes('extorsion') ||
    desc.includes('extorsionado') ||
    desc.includes('extorsionadores') ||
    desc.includes('explosivo') ||
    desc.includes('amenaza');
  return esExtorsion ? 'Extorsion' : 'Robo';
};

// Función para obtener color según la cantidad de incidencias
const obtenerColorCluster = cantidad => {
  if (cantidad <= 3) {
    return {
      color: '#FFB000', // Amarillo más intenso
      fillColor: '#FFD700',
      fillOpacity: 0.3,
    };
  } else if (cantidad <= 6) {
    return {
      color: '#FF6600', // Naranja más intenso
      fillColor: '#FF8C00',
      fillOpacity: 0.4,
    };
  } else if (cantidad >= 7) {
    return {
      color: '#CC0000', // Rojo más intenso
      fillColor: '#FF4500',
      fillOpacity: 0.5,
    };
  } else {
    return {
      color: '#FFB000', // Amarillo más intenso
      fillColor: '#FFD700',
      fillOpacity: 0.3,
    };
  }
};

const ClusterIncidencias = ({ visible, filtros = null }) => {
  const { radioCluster, tiposIncidenciasCluster, fechasClusters } = useMapContext();
  const [loading, setLoading] = useState(false);
  const map = useMap();
  const circlesRef = useRef([]);

  // Función para limpiar círculos existentes
  const limpiarCirculos = () => {
    circlesRef.current.forEach(circle => {
      if (map.hasLayer(circle)) {
        map.removeLayer(circle);
      }
    });
    circlesRef.current = [];
  };

  // Función para crear círculos usando L.circle
  const crearCirculosCluster = clustersData => {
    limpiarCirculos();

    clustersData.forEach(cluster => {
      const colores = obtenerColorCluster(cluster.cantidad);

      // Crear el círculo usando L.circle directamente
      const circle = L.circle([cluster.centroide.lat, cluster.centroide.lng], {
        radius: cluster.radio, // Radio en metros (no en píxeles)
        color: colores.color,
        fillColor: colores.fillColor,
        fillOpacity: colores.fillOpacity,
        weight: 3,
        opacity: 1,
        dashArray: '8,4',
      });

      // Agregar popup al círculo
      const popupContent = `
        <div style="font-size: 13px; max-width: 260px;">
          <strong>🎯 Cluster de Incidencias</strong><br/>
          <strong>ID:</strong> ${cluster.id}<br/>
          <strong>Cantidad:</strong> ${cluster.cantidad} incidencias<br/>
          <strong>Radio:</strong> ${Math.round(cluster.radio)} metros<br/>
          <strong>Centroide:</strong><br/>
          Lat: ${cluster.centroide.lat.toFixed(6)}<br/>
          Lng: ${cluster.centroide.lng.toFixed(6)}<br/>
          <strong>Tipos de incidencias:</strong><br/>
          ${Object.entries(
            cluster.puntos.reduce((tipos, punto) => {
              tipos[punto.Tipo] = (tipos[punto.Tipo] || 0) + 1;
              return tipos;
            }, {})
          )
            .map(([tipo, cantidad]) => `${tipo}: ${cantidad}`)
            .join(' | ')}
        </div>
      `;

      circle.bindPopup(popupContent);

      // Agregar tooltip al círculo
      const tooltipContent = `
        <div style="font-size: 12px; font-weight: bold; text-align: center;">
          <div>🎯 Cluster ${cluster.id}</div>
          <div>${cluster.cantidad} incidencias</div>
          <div>${Math.round(cluster.radio)}m radio</div>
        </div>
      `;

      circle.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.9,
      });

      // Agregar el círculo al mapa
      circle.addTo(map);

      // Guardar referencia para poder limpiarlo después
      circlesRef.current.push(circle);
    });
  };

  // Limpiar círculos cuando el componente se desmonte o la visibilidad cambie
  useEffect(() => {
    if (!visible) {
      limpiarCirculos();
      return;
    }
  }, [visible]);

  // Limpiar círculos al desmontar el componente
  useEffect(() => {
    return () => {
      limpiarCirculos();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Debounce para evitar clustering excesivo al cambiar radio
    const debounceTimer = setTimeout(() => {
      setLoading(true);

      // Función para construir URL del endpoint (con límite de registros)
      const buildURL = (tipo) => {
        const API_URL = import.meta.env.VITE_API_URL;
        if (!API_URL) {
          throw new Error('VITE_API_URL no está configurada. Por favor, define la variable de entorno.');
        }
        const params = new URLSearchParams();

        params.append('type', tipo);
        params.append('start', filtros?.fechaInicio || fechasClusters.fechaInicio);
        params.append('end', filtros?.fechaFin || fechasClusters.fechaFin);

        // Agregar filtros opcionales si existen
        if (filtros?.Turno) params.append('shift', filtros.Turno);
        if (filtros?.Horario) params.append('schedule', filtros.Horario);
        if (filtros?.Jurisdiccion) params.append('jurisdiction', filtros.Jurisdiccion);

        return `${API_URL}incidence?${params.toString()}`;
      };

    // Obtener token de autenticación
    const TOKEN = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (TOKEN) {
      headers['Authorization'] = `Bearer ${TOKEN}`;
    }

    // Tipologías a obtener: 1=Robo, 2=Extorsion, 3=Homicidio, 4=Feminicidio, 5=Sicariato, 6=Secuestro, 7=Drogas, 8=Barras
    const todasTipologias = [
      { tipo: 1, nombre: 'Robo', key: 'robos' },
      { tipo: 2, nombre: 'Extorsión', key: 'extorsiones' },
      { tipo: 3, nombre: 'Homicidio', key: 'homicidios' },
      { tipo: 4, nombre: 'Feminicidio', key: 'feminicidios' },
      { tipo: 5, nombre: 'Sicariato', key: 'sicariatos' },
      { tipo: 6, nombre: 'Secuestro', key: 'secuestros' },
      { tipo: 7, nombre: 'Drogas', key: 'drogas' },
      { tipo: 8, nombre: 'Barras', key: 'barras' }
    ];

    // Filtrar tipologías según los tipos activos en el contexto
    const tipologias = todasTipologias.filter(tipologia => tiposIncidenciasCluster[tipologia.key]);

    // Hacer peticiones para todas las tipologías en paralelo
    Promise.all(
      tipologias.map(({ tipo, nombre }) =>
        fetch(buildURL(tipo), { headers })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Error ${response.status} al obtener ${nombre}`);
            }
            return response.json();
          })
          .then(result => {
            // Extraer datos de la respuesta
            let rawData = result.data?.data || [];

            // Limitar datos por tipología para optimizar rendimiento
            if (rawData.length > MAX_REGISTROS_POR_TIPOLOGIA) {
              logger.warn(`⚠️ Limitando ${nombre} a ${MAX_REGISTROS_POR_TIPOLOGIA} registros de ${rawData.length}`);
              rawData = rawData.slice(0, MAX_REGISTROS_POR_TIPOLOGIA);
            }

            // Normalizar y agregar el tipo
            return rawData.map(item => ({
              Id: item.code || item.codigo_incidencia,
              Latitud: parseFloat(item.latitude || item.Latitud),
              Longitud: parseFloat(item.longitude || item.Longitud),
              Tipo: nombre,
              Descripcion: item.description || item.Descripcion,
              Fecha: item.date || item.Fecha,
            }));
          })
          .catch(error => {
            logger.warn(`⚠️ Error al obtener ${nombre}:`, error.message);
            return []; // Retornar array vacío si falla
          })
      )
    )
      .then(resultados => {
        // Combinar todos los resultados en un solo array
        const rawData = resultados.flat();

        logger.log('📊 Datos obtenidos para clustering:', rawData.length, 'incidencias');

        // Convertir datos al formato esperado por el algoritmo de clustering
        // Solo incluir registros con coordenadas válidas
        const data = rawData
          .filter(item => {
            const lat = item.Latitud;
            const lng = item.Longitud;
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
          })
          .map((item, index) => ({
            Id: item.Id || index + 1,
            Latitud: item.Latitud,
            Longitud: item.Longitud,
            Tipo: item.Tipo,
          }));

        // Realizar clustering
        const clustersGenerados = realizarClustering(data, radioCluster);

        // Crear círculos usando L.circle
        crearCirculosCluster(clustersGenerados);

        // Dispatch evento con estadísticas
        const puntosClusteados = clustersGenerados.reduce(
          (sum, cluster) => sum + cluster.cantidad,
          0
        );
        const estadisticas = {
          totalClusters: clustersGenerados.length,
          totalPuntos: data.length,
          puntosClusteados: puntosClusteados,
        };

        window.dispatchEvent(
          new CustomEvent('clustersGenerados', {
            detail: estadisticas,
          })
        );
      })
      .catch(error => {
        logger.error('❌ Error cargando datos para clustering:', error);
        logger.error('Detalles del error:', error.message);
        // Limpiar clusters y círculos en caso de error
        limpiarCirculos();
        window.dispatchEvent(
          new CustomEvent('clustersGenerados', {
            detail: {
              totalClusters: 0,
              totalPuntos: 0,
              puntosClusteados: 0,
            },
          })
        );
      })
      .finally(() => {
        setLoading(false);
      });
    }, 300); // Debounce de 300ms

    // Cleanup del debounce timer
    return () => clearTimeout(debounceTimer);
  }, [visible, radioCluster, filtros, tiposIncidenciasCluster, fechasClusters]);

  if (!visible) return null;

  return (
    <>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '14px 24px',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'Segoe UI, sans-serif',
            border: '1px solid rgba(200, 200, 200, 0.6)',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #3498db',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <span
            style={{
              marginLeft: 12,
              fontSize: '15px',
              fontWeight: '500',
              color: '#2c3e50',
            }}
          >
            Generando clusters...
          </span>
        </div>
      )}

      {/* LayerGroup vacío - los círculos se manejan imperativamente */}
      <LayerGroup>
        {/* Los círculos se crean directamente con L.circle y se agregan al mapa */}
      </LayerGroup>
    </>
  );
};

// Optimizar con React.memo para evitar re-renders innecesarios
export default React.memo(ClusterIncidencias);
