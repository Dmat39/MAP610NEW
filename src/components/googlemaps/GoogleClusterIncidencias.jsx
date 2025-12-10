import React, { useState, useEffect, useRef } from 'react';
import {
  useRobosQuery,
  useExtorsionesQuery,
  useHomicidiosQuery,
  useFeminicidiosQuery,
  useSicariatosQuery,
  useSecuestrosQuery,
  useDrogasQuery,
  useBarrasQuery
} from '../../hooks/useIncidenciasQuery';
import { logger } from '../../utils/logger';

// Función para calcular distancia entre dos puntos en metros usando fórmula de Haversine
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
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
  return R * c;
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

// Algoritmo de clustering basado en densidad (DBSCAN mejorado)
const realizarClustering = (puntos, radioMaximo = 50) => {
  logger.log('🔧 Iniciando algoritmo de clustering...', {
    puntos: puntos.length,
    radio: radioMaximo,
  });
  const clusters = [];
  const visitados = new Set();

  for (let i = 0; i < puntos.length; i++) {
    if (visitados.has(i)) continue;

    const puntoActual = puntos[i];
    const cluster = [puntoActual];
    visitados.add(i);

    // Buscar todos los puntos cercanos al punto actual
    const cola = [i];

    while (cola.length > 0) {
      const indiceActual = cola.shift();
      const puntoBase = puntos[indiceActual];

      // Buscar vecinos del punto base
      for (let j = 0; j < puntos.length; j++) {
        if (visitados.has(j)) continue;

        const distancia = calcularDistancia(
          puntoBase.Latitud,
          puntoBase.Longitud,
          puntos[j].Latitud,
          puntos[j].Longitud
        );

        if (distancia <= radioMaximo) {
          cluster.push(puntos[j]);
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

      logger.log(`📍 Cluster ${clusters.length} creado:`, {
        puntos: cluster.length,
        centroide: `${centroide.lat.toFixed(6)}, ${centroide.lng.toFixed(6)}`,
        radio: Math.round(radio),
      });
    }
  }

  logger.log('🎯 Clustering completado:', clusters.length, 'clusters creados');
  return clusters;
};

// Función para obtener color según la cantidad de incidencias
const obtenerColorCluster = cantidad => {
  logger.log('🎨 Calculando color para cluster con cantidad:', cantidad);

  if (cantidad <= 3) {
    logger.log('→ Asignando color AMARILLO (cantidad <= 3)');
    return {
      strokeColor: '#FFB000', // Amarillo más intenso
      fillColor: '#FFD700',
      fillOpacity: 0.3,
    };
  } else if (cantidad <= 6) {
    logger.log('→ Asignando color NARANJA (cantidad <= 6)');
    return {
      strokeColor: '#FF6600', // Naranja más intenso
      fillColor: '#FF8C00',
      fillOpacity: 0.4,
    };
  } else if (cantidad >= 7) {
    logger.log('→ Asignando color ROJO (cantidad > 6)');
    return {
      strokeColor: '#CC0000', // Rojo más intenso
      fillColor: '#FF4500',
      fillOpacity: 0.5,
    };
  } else {
    return {
      strokeColor: '#FFB000', // Amarillo más intenso
      fillColor: '#FFD700',
      fillOpacity: 0.3,
    };
  }
};

const GoogleClusterIncidencias = ({ visible, radioCluster = 50, map, google, filtros = null }) => {
  const [loading, setLoading] = useState(false);
  const circlesRef = useRef([]);
  const [infoWindow, setInfoWindow] = useState(null);

  // Crear InfoWindow una sola vez
  useEffect(() => {
    if (!map || !google || infoWindow) return;

    const newInfoWindow = new google.maps.InfoWindow({
      disableAutoPan: false,
      maxWidth: 300,
      pixelOffset: new google.maps.Size(0, -30),
    });

    setInfoWindow(newInfoWindow);

    return () => {
      if (newInfoWindow) {
        newInfoWindow.close();
      }
    };
  }, [map, google, infoWindow]);

  // Función para limpiar círculos existentes
  const limpiarCirculos = () => {
    circlesRef.current.forEach(circle => {
      if (circle && circle.setMap) {
        circle.setMap(null);
      }
    });
    circlesRef.current = [];
  };

  // Función para crear círculos usando Google Maps Circle
  const crearCirculosCluster = clustersData => {
    if (!map || !google || !infoWindow) return;

    limpiarCirculos();

    clustersData.forEach(cluster => {
      logger.log(`🖼️ Creando círculo Google Maps para cluster ${cluster.id}:`, {
        cantidad: cluster.cantidad,
        puntos: cluster.puntos?.length,
        centroide: cluster.centroide,
      });

      const colores = obtenerColorCluster(cluster.cantidad);

      // Crear el círculo usando Google Maps Circle
      const circle = new google.maps.Circle({
        strokeColor: colores.strokeColor,
        strokeOpacity: 1,
        strokeWeight: 3,
        fillColor: colores.fillColor,
        fillOpacity: colores.fillOpacity,
        map: map,
        center: { lat: cluster.centroide.lat, lng: cluster.centroide.lng },
        radius: cluster.radio, // Radio en metros
        clickable: true,
        zIndex: 900, // Prioridad alta pero menor que los marcadores individuales
      });

      // Agregar evento click al círculo para mostrar info en el InfoWindow compartido
      circle.addListener('click', event => {
        // Cerrar InfoWindow anterior si está abierto
        infoWindow.close();

        // Crear contenido del popup/InfoWindow
        const tiposIncidencias = Object.entries(
          cluster.puntos.reduce((tipos, punto) => {
            tipos[punto.Tipo] = (tipos[punto.Tipo] || 0) + 1;
            return tipos;
          }, {})
        )
          .map(([tipo, cantidad]) => `${tipo}: ${cantidad}`)
          .join(' | ');

        // Configurar contenido para este cluster específico
        infoWindow.setContent(`
          <div style="font-size: 13px; max-width: 260px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
              <strong style="color: #333;">🎯 Cluster de Incidencias</strong>
              <button id="close-tooltip-btn" style="
                background: none; 
                border: none; 
                font-size: 16px; 
                cursor: pointer; 
                color: #666; 
                padding: 0; 
                margin: 0; 
                width: 20px; 
                height: 20px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                border-radius: 3px;
                transition: all 0.2s ease;
              " title="Cerrar">×</button>
            </div>
            <div>
              <strong>ID:</strong> ${cluster.id}<br/>
              <strong>Cantidad:</strong> ${cluster.cantidad} incidencias<br/>
              <strong>Radio:</strong> ${Math.round(cluster.radio)} metros<br/>
              <strong>Centroide:</strong><br/>
              <div style="margin: 5px 0; padding: 5px; background-color: #f8f9fa; border-radius: 3px; font-size: 12px;">
                Lat: ${cluster.centroide.lat.toFixed(6)}<br/>
                Lng: ${cluster.centroide.lng.toFixed(6)}
              </div>
              <strong>Tipos de incidencias:</strong><br/>
              <div style="margin: 5px 0; padding: 5px; background-color: #f8f9fa; border-radius: 3px; font-size: 12px;">
                ${tiposIncidencias}
              </div>
            </div>
          </div>
        `);

        // Posicionar y abrir InfoWindow
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);

        // Agregar evento al botón de cerrar después de que el InfoWindow se abra
        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          const closeBtn = document.getElementById('close-tooltip-btn');
          if (closeBtn) {
            // Agregar efecto hover
            closeBtn.addEventListener('mouseenter', () => {
              closeBtn.style.backgroundColor = '#ff4757';
              closeBtn.style.color = 'white';
            });
            closeBtn.addEventListener('mouseleave', () => {
              closeBtn.style.backgroundColor = 'transparent';
              closeBtn.style.color = '#666';
            });

            // Agregar evento de clic para cerrar
            closeBtn.addEventListener('click', () => {
              infoWindow.close();
            });
          }
        });
      });

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

  // Usar los hooks para obtener datos de todas las tipologías
  const robosQuery = useRobosQuery(filtros, visible);
  const extorsionesQuery = useExtorsionesQuery(filtros, visible);
  const homicidiosQuery = useHomicidiosQuery(filtros, visible);
  const feminicidiosQuery = useFeminicidiosQuery(filtros, visible);
  const sicariatosQuery = useSicariatosQuery(filtros, visible);
  const secuestrosQuery = useSecuestrosQuery(filtros, visible);
  const drogasQuery = useDrogasQuery(filtros, visible);
  const barrasQuery = useBarrasQuery(filtros, visible);

  // Efecto para procesar los datos cuando cambien
  useEffect(() => {
    if (!visible || !map || !google || !infoWindow) return;

    // Verificar si alguna consulta está cargando
    const isLoading = robosQuery.isLoading || extorsionesQuery.isLoading ||
      homicidiosQuery.isLoading || feminicidiosQuery.isLoading ||
      sicariatosQuery.isLoading || secuestrosQuery.isLoading ||
      drogasQuery.isLoading || barrasQuery.isLoading;

    const hasErrors = robosQuery.isError || extorsionesQuery.isError ||
      homicidiosQuery.isError || feminicidiosQuery.isError ||
      sicariatosQuery.isError || secuestrosQuery.isError ||
      drogasQuery.isError || barrasQuery.isError;

    setLoading(isLoading);

    // Si hay errores, limpiar y salir
    if (hasErrors) {
      logger.error('❌ Error cargando datos de incidencias');
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
      return;
    }

    // Si aún está cargando, no procesar
    if (isLoading) return;

    // Obtener los datos de todas las consultas
    const datosRobos = robosQuery.data || [];
    const datosExtorsiones = extorsionesQuery.data || [];
    const datosHomicidios = homicidiosQuery.data || [];
    const datosFeminicidios = feminicidiosQuery.data || [];
    const datosSicariatos = sicariatosQuery.data || [];
    const datosSecuestros = secuestrosQuery.data || [];
    const datosDrogas = drogasQuery.data || [];
    const datosBarras = barrasQuery.data || [];

    logger.log('🎯 Datos obtenidos de la API:', {
      robos: datosRobos.length,
      extorsiones: datosExtorsiones.length,
      homicidios: datosHomicidios.length,
      feminicidios: datosFeminicidios.length,
      sicariatos: datosSicariatos.length,
      secuestros: datosSecuestros.length,
      drogas: datosDrogas.length,
      barras: datosBarras.length,
    });

    // Combinar todos los tipos de datos
    const todosLosDatos = [
      ...datosRobos.map(item => ({ ...item, Tipo: 'Robo' })),
      ...datosExtorsiones.map(item => ({ ...item, Tipo: 'Extorsión' })),
      ...datosHomicidios.map(item => ({ ...item, Tipo: 'Homicidio' })),
      ...datosFeminicidios.map(item => ({ ...item, Tipo: 'Feminicidio' })),
      ...datosSicariatos.map(item => ({ ...item, Tipo: 'Sicariato' })),
      ...datosSecuestros.map(item => ({ ...item, Tipo: 'Secuestro' })),
      ...datosDrogas.map(item => ({ ...item, Tipo: 'Drogas' })),
      ...datosBarras.map(item => ({ ...item, Tipo: 'Barras' })),
    ];

    logger.log('📊 Total de datos combinados:', todosLosDatos.length, 'registros');

    // Convertir datos al formato esperado por el algoritmo de clustering
    // Solo incluir registros con coordenadas válidas
    const data = todosLosDatos
      .filter(item => {
        const lat = parseFloat(item.Latitud);
        const lng = parseFloat(item.Longitud);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      })
      .map((item, index) => ({
        Id: item.Id || index + 1,
        Latitud: parseFloat(item.Latitud),
        Longitud: parseFloat(item.Longitud),
        Tipo: item.Tipo,
      }));

    logger.log('📊 Datos procesados para clustering:', data.length, 'puntos válidos');

    if (data.length === 0) {
      logger.log('⚠️ No hay datos válidos para clustering');
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
      return;
    }

    // Realizar clustering
    logger.log('🔄 Iniciando proceso de clustering con radio:', radioCluster, 'm');
    const clustersGenerados = realizarClustering(data, radioCluster);
    logger.log('✅ Clustering completado:', clustersGenerados.length, 'clusters generados');

    // Crear círculos usando Google Maps Circle
    crearCirculosCluster(clustersGenerados);

    // Dispatch evento con estadísticas
    const puntosClusteados = clustersGenerados.reduce((sum, cluster) => sum + cluster.cantidad, 0);
    const estadisticas = {
      totalClusters: clustersGenerados.length,
      totalPuntos: data.length,
      puntosClusteados: puntosClusteados,
    };

    logger.log('📈 Estadísticas Google Maps:', estadisticas);

    window.dispatchEvent(
      new CustomEvent('clustersGenerados', {
        detail: estadisticas,
      })
    );
  }, [
    visible,
    radioCluster,
    map,
    google,
    filtros,
    infoWindow,
    robosQuery.data,
    extorsionesQuery.data,
    homicidiosQuery.data,
    feminicidiosQuery.data,
    sicariatosQuery.data,
    secuestrosQuery.data,
    drogasQuery.data,
    barrasQuery.data,
    robosQuery.isLoading,
    extorsionesQuery.isLoading,
    homicidiosQuery.isLoading,
    feminicidiosQuery.isLoading,
    sicariatosQuery.isLoading,
    secuestrosQuery.isLoading,
    drogasQuery.isLoading,
    barrasQuery.isLoading,
    robosQuery.isError,
    extorsionesQuery.isError,
    homicidiosQuery.isError,
    feminicidiosQuery.isError,
    sicariatosQuery.isError,
    secuestrosQuery.isError,
    drogasQuery.isError,
    barrasQuery.isError,
  ]);

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
    </>
  );
};

export default GoogleClusterIncidencias;
