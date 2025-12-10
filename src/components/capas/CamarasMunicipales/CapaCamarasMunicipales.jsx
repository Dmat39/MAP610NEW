import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup, LayerGroup, Circle, Polygon } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import './CapaCamarasMunicipales.css';
import './LocationCopyPopup.css';
import { useMapLocationCopy } from '../../../hooks/useMapLocationCopy';
import { getAngleFromCoords, isValidReferencia, parseReferencia } from '../../../utils';
import { logger } from '../../../utils/logger.js';
import camarasService from '../../../services/camarasService';

import L from 'leaflet';

// Función para crear iconos según el tipo de cámara
const crearIconoCamara = tipo => {
  let iconUrl;
  switch (tipo) {
    case 'TIPO I':
      iconUrl = '/icon/camera.png';
      break;
    case 'TIPO II':
      iconUrl = '/icon/camera2.png';
      break;
    case 'TIPO III':
      iconUrl = '/icon/camera3.png';
      break;
    default:
      iconUrl = '/icon/camera.png'; // Fallback por defecto
  }

  return new L.Icon({
    iconUrl: iconUrl,
    iconSize: [28, 28],
    iconAnchor: [14, 14], // Centrado: la mitad del ancho y alto
    popupAnchor: [0, -14], // Popup aparece arriba del centro del icono
  });
};

// Icono de cámara seleccionada (no usado actualmente)
// const iconoCamaraSeleccionada = new L.DivIcon({
//   html: '<div style="background: red; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px;">📷</div>',
//   iconSize: [30, 30],
//   iconAnchor: [15, 15],
//   popupAnchor: [0, -15],
//   className: 'camara-seleccionada-icon'
// });

// Función para crear el campo de visión de una cámara
const createVisionField = (feature, lat, lng) => {
  const camara = feature.properties.camara;

  if (camara === '360') {
    // Cámara 360° - círculo completo con gradiente
    return L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'vision-field-marker',
        html: '<div class="vision-gradient"></div>',
        iconSize: [300, 300], // Tamaño más grande para mejor visibilidad
        iconAnchor: [150, 150], // Centro del círculo
      }),
      interactive: false,
      zIndexOffset: -1000,
    });
  } else if (camara === '180') {
    // Cámara 180° - semicírculo direccional
    const referencia = feature.properties.referencia;

    // Verificar que la referencia sea válida
    if (!isValidReferencia(referencia)) {
      logger.warn(`Cámara ${feature.properties.name} tiene referencia inválida:`, referencia);
      return null;
    }

    const [refLat, refLng] = parseReferencia(referencia);
    const direccion = getAngleFromCoords(lat, lng, refLat, refLng);

    return L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'vision-field-marker',
        html: `
          <div class="rotated-container" style="transform: rotate(${direccion}deg); transform-origin: center bottom;">
            <div class="vision-gradient-180"></div>
          </div>
        `,
        iconSize: [300, 150], // Tamaño más grande
        iconAnchor: [150, 150], // Anclado en la parte inferior central
      }),
      interactive: false,
      zIndexOffset: -1000,
    });
  }

  return null;
};

const CapaCamarasMunicipales = ({
  visible,
  camaraSeleccionada,
  camarasFiltradas,
  seguimientoCamara,
  limpiarSeguimiento,
  camaraConVision,
  setCamaraConVision,
}) => {
  const [camaras, setCamaras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [seguimientoActivo, setSeguimientoActivo] = useState(false);
  const [circuloSeguimiento, setCirculoSeguimiento] = useState(null);
  const [circulosAnteriores, setCirculosAnteriores] = useState([]);
  const [camarasCercanas, setCamarasCercanas] = useState([]);
  const [, setHistorialSeguimiento] = useState([]);
  const map = useMap();
  const markersRef = useRef({});

  // Usar el hook para habilitar la copia de ubicaciones
  useMapLocationCopy();

  // Agregar listener para obtener coordenadas con Ctrl+Click (herramienta de ayuda)
  useEffect(() => {
    if (!map) return;

    const handleMapClick = e => {
      // Solo si presiona Ctrl
      if (e.originalEvent.ctrlKey) {
        const { lat, lng } = e.latlng;
        logger.log('📍 Coordenadas para referencia:', `"${lat}, ${lng}"`);
        logger.log('📋 Copia esto en la propiedad "referencia" del GeoJSON');

        // Copiar al portapapeles automáticamente
        navigator.clipboard.writeText(`"${lat}, ${lng}"`).then(() => {
          logger.log('✅ Coordenadas copiadas al portapapeles!');
        });
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map]);

  // Cargar cámaras desde el backend
  useEffect(() => {
    const cargarCamaras = async () => {
      try {
        setCargando(true);
        setError(null);

        // Obtener TODAS las cámaras municipales (sin límite de paginación)
        const resultado = await camarasService.getCamarasMunicipales();
        logger.log(`✅ ${resultado.camaras.length} cámaras municipales cargadas desde el backend (Total: ${resultado.count})`);

        // Transformar los datos de la API al formato GeoJSON que espera el componente
        const camarasTransformadas = resultado.camaras.map(camara => {
          // Mapeo correcto de tipos de cámara
          let tipo, anguloVision;
          switch (camara.camera) {
            case 'C180':
              tipo = 'TIPO I';
              anguloVision = '180';
              break;
            case 'C360':
              tipo = 'TIPO II';
              anguloVision = '360';
              break;
            case 'LPR':
              tipo = 'TIPO III';
              anguloVision = 'LPR';
              break;
            default:
              tipo = 'TIPO I';
              anguloVision = '180';
          }

          return {
            geometry: {
              coordinates: [camara.longitude, camara.latitude],
            },
            properties: {
              name: camara.name,
              direccion: camara.address,
              tipo: tipo,
              camara: anguloVision,
              cameraModel: camara.camera, // Guardar el modelo original
              megafono: camara.megaphone,
              boton: camara.buttom,
              jurisdiccion: 'Municipal',
              // Campo referencia para cámaras C180 (coordenadas hacia donde apunta)
              referencia: camara.referencia || '',
              // El polígono de visión viene del backend (usado como fallback)
              geometryVision: camara.geometry,
            },
          };
        });

        setCamaras(camarasTransformadas);
        setCargando(false);
      } catch (err) {
        logger.error('Error cargando cámaras municipales:', err);
        setError(err.message);
        setCargando(false);

        // Si hay error de autenticación, no intentar recargar
        if (err.message.includes('Sesión expirada') || err.message.includes('autenticación')) {
          logger.warn('⚠️ Error de autenticación. Por favor, inicia sesión nuevamente.');
        }
      }
    };

    cargarCamaras();
  }, []);

  // Efecto para navegar a la cámara seleccionada
  useEffect(() => {
    if (camaraSeleccionada && map) {
      const coords = camaraSeleccionada.geometry?.coordinates || [
        camaraSeleccionada.lng,
        camaraSeleccionada.lat,
      ];
      if (coords && coords.length >= 2) {
        const [lng, lat] = coords;

        // Navegación suave a la cámara seleccionada
        map.flyTo([lat, lng], 18, {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25,
        });

        // Abrir popup después de la navegación
        setTimeout(() => {
          const markerId = `marker-${camaraSeleccionada.id}`;
          const marker = markersRef.current[markerId];
          if (marker) {
            marker.openPopup();
          }
        }, 1600);
      }
    }
  }, [camaraSeleccionada, map]);

  // Efecto para manejar el seguimiento de cámaras cercanas
  useEffect(() => {
    if (seguimientoCamara && map && camaras.length > 0) {
      iniciarSeguimientoCamaras(seguimientoCamara);
    }
  }, [seguimientoCamara, map, camaras]);

  // Efecto para limpiar seguimiento cuando se solicita
  useEffect(() => {
    if (limpiarSeguimiento && map) {
      limpiarTodoSeguimiento();
    }
  }, [limpiarSeguimiento, map]);

  const iniciarSeguimientoCamaras = camaraCentral => {
    if (!camaraCentral || !map) return;

    // Guardar el círculo anterior en el historial si existe
    if (circuloSeguimiento) {
      setCirculosAnteriores(prev => [...prev, circuloSeguimiento]);
      // Cambiar el estilo del círculo anterior para que sea menos prominente
      circuloSeguimiento.setStyle({
        color: '#9ca3af',
        fillColor: '#9ca3af',
        fillOpacity: 0.05,
        weight: 1,
        dashArray: '10 10',
      });
    }

    const lat = camaraCentral.lat;
    const lng = camaraCentral.lng;
    const latlng = L.latLng(lat, lng);

    logger.log('🎯 Iniciando seguimiento para cámara:', camaraCentral.name);

    // Calcular distancias a todas las cámaras
    const camarasConDistancia = camaras
      .map((feature, idx) => {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length < 2) return null;

        const [camaraLng, camaraLat] = coords;
        const camaraLatLng = L.latLng(camaraLat, camaraLng);
        const distance = latlng.distanceTo(camaraLatLng);

        return {
          feature,
          camaraLatLng,
          distance,
          idx,
          properties: feature.properties,
        };
      })
      .filter(item => item !== null);

    // Ordenar por distancia y tomar las 6 más cercanas
    const camarasOrdenadas = camarasConDistancia.sort((a, b) => a.distance - b.distance);
    const camarasCercanas = camarasOrdenadas.slice(0, 6); // Incluye la cámara central

    // Calcular el radio máximo (distancia a la cámara más lejana de las seleccionadas)
    const radioMaximo = camarasCercanas[camarasCercanas.length - 1].distance;

    // Crear círculo de seguimiento con colores variados
    const coloresSeguimiento = ['#10b981', '#059669', '#047857', '#065f46', '#0891b2', '#0e7490'];
    const colorAleatorio =
      coloresSeguimiento[Math.floor(Math.random() * coloresSeguimiento.length)];

    const nuevoCirculo = L.circle(latlng, {
      color: colorAleatorio,
      fillColor: colorAleatorio,
      fillOpacity: 0.2,
      radius: radioMaximo,
      weight: 3,
      dashArray: '5 5',
    });

    // Agregar tooltip al círculo con información
    nuevoCirculo.bindTooltip(
      `📍 ${camaraCentral.name}<br/>Radio: ${(radioMaximo / 1000).toFixed(2)}km<br/>Cámaras: ${camarasCercanas.length}`,
      {
        permanent: false,
        direction: 'center',
        className: 'seguimiento-tooltip',
      }
    );

    nuevoCirculo.addTo(map);
    setCirculoSeguimiento(nuevoCirculo);

    // Filtrar todas las cámaras dentro del círculo
    const camarasDentroDelCirculo = camarasConDistancia.filter(
      item => item.distance <= radioMaximo
    );

    setCamarasCercanas(camarasDentroDelCirculo);
    setSeguimientoActivo(true);

    // Agregar al historial de seguimiento
    setHistorialSeguimiento(prev => [
      ...prev,
      {
        camara: camaraCentral,
        timestamp: new Date(),
        radio: radioMaximo,
        camarasEncontradas: camarasDentroDelCirculo.length,
      },
    ]);

    // Navegar al área de seguimiento
    map.flyTo(latlng, 17, {
      animate: true,
      duration: 1.2,
      easeLinearity: 0.25,
    });

    logger.log(
      `📍 Seguimiento activado: ${camarasDentroDelCirculo.length} cámaras en un radio de ${(radioMaximo / 1000).toFixed(2)}km`
    );
  };

  const limpiarTodoSeguimiento = () => {
    // Limpiar círculo actual
    if (circuloSeguimiento) {
      map.removeLayer(circuloSeguimiento);
      setCirculoSeguimiento(null);
    }

    // Limpiar círculos anteriores
    circulosAnteriores.forEach(circulo => {
      if (map.hasLayer(circulo)) {
        map.removeLayer(circulo);
      }
    });
    setCirculosAnteriores([]);

    // Resetear estados
    setSeguimientoActivo(false);
    setCamarasCercanas([]);
    setHistorialSeguimiento([]);

    logger.log('🧹 Seguimiento limpiado');
  };

  // Efecto para limpiar seguimiento cuando se cambian los filtros
  useEffect(() => {
    if (camarasFiltradas && camarasFiltradas.length >= 0 && seguimientoActivo) {
      // Si se aplican filtros mientras hay seguimiento activo, limpiar seguimiento
      limpiarTodoSeguimiento();
    }
  }, [camarasFiltradas]);

  if (!visible) return null;

  // Mostrar mensajes de estado
  if (cargando) {
    return (
      <LayerGroup>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          Cargando cámaras municipales...
        </div>
      </LayerGroup>
    );
  }

  if (error) {
    return (
      <LayerGroup>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fee',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000,
          color: '#c00'
        }}>
          Error: {error}
        </div>
      </LayerGroup>
    );
  }

  // Determinar qué cámaras mostrar (seguimiento, filtradas o todas)
  let camarasAMostrar;

  if (seguimientoActivo && camarasCercanas.length > 0) {
    // Mostrar solo las cámaras del seguimiento
    camarasAMostrar = camarasCercanas.map(item => item.feature);
  } else if (camarasFiltradas && camarasFiltradas.length >= 0) {
    // Mostrar cámaras filtradas
    camarasAMostrar = camaras.filter(feature =>
      camarasFiltradas.some(cf => cf.name === feature.properties?.name)
    );
  } else {
    // Mostrar todas las cámaras
    camarasAMostrar = camaras;
  }

  return (
    <LayerGroup>
      {camarasAMostrar
        .map((feature, idx) => {
          const coords = feature.geometry?.coordinates;
          const props = feature.properties;
          if (!coords || coords.length < 2) return null;

          // En GeoJSON, las coordenadas están como [lng, lat]
          const [lng, lat] = coords;
          const markerId = `marker-${idx}`;

          // Determinar si esta cámara está seleccionada (por prop o por click local)
          const esSeleccionada =
            (camaraSeleccionada &&
              (camaraSeleccionada.name === props.name || camaraSeleccionada.id === idx)) ||
            camaraConVision === props.name;

          // Debug log - SIEMPRE mostrar para debugging
          logger.log('🔍 Cámara:', props.name, {
            esSeleccionada,
            camaraConVision,
            camaraSeleccionada,
            tipoCamara: props.camara,
          });

          // Determinar colores según el tipo de cámara (no usado actualmente)
          // Se mantiene para referencia futura
          let _circleColors;
          if (esSeleccionada) {
            // Si está seleccionada, usar colores de selección
            _circleColors = {
              color: '#667eea',
              fillColor: '#667eea',
            };
          } else {
            // Colores según el tipo de cámara
            switch (props.tipo) {
              case 'TIPO II':
                _circleColors = {
                  color: '#6c5ce7',
                  fillColor: '#44d500',
                };
                break;
              case 'TIPO III':
                _circleColors = {
                  color: '#1e47d1',
                  fillColor: '#1a68ff',
                };
                break;
              // default: // TIPO I y otros (no usado actualmente)
              //   circleColors = {
              //     color: "#6c5ce7",
              //     fillColor: "#a29bfe"
              //   };
            }
          }

          const elementos = [];

          // 1. Determinar si esta cámara está en modo seguimiento
          const enSeguimiento =
            seguimientoActivo && camarasCercanas.some(item => item.properties?.name === props.name);

          // 2. Mostrar el campo de visión si la cámara está seleccionada O en seguimiento
          if (esSeleccionada || enSeguimiento) {
            logger.log(
              '🎯 Mostrando campo de visión para:',
              props.name,
              'Tipo cámara:',
              props.camara,
              'Referencia:',
              props.referencia,
              'Geometry:', props.geometryVision
            );

            // PRIORIDAD: Para C180 con referencia, usar método CSS (más preciso)
            // Para C360 o sin referencia, usar polígono del backend
            const usarMetodoCSS = props.camara === '180' && isValidReferencia(props.referencia);

            if (usarMetodoCSS) {
              // Método CSS con gradiente rotado (para C180 con referencia)
              const visionField = createVisionField(feature, lat, lng);
              if (visionField) {
                elementos.push(
                  <Marker
                    key={`vision-${idx}`}
                    position={[lat, lng]}
                    icon={visionField.options.icon}
                    interactive={false}
                    zIndexOffset={-1000}
                  />
                );
              }
            } else if (props.geometryVision && props.geometryVision.coordinates) {
              // Método polígono del backend (para C360 o fallback)
              const coordinates = props.geometryVision.coordinates[0];
              // Convertir de [lng, lat] a [lat, lng] para Leaflet
              const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

              elementos.push(
                <Polygon
                  key={`vision-polygon-${idx}`}
                  positions={latLngs}
                  pathOptions={{
                    color: esSeleccionada ? '#667eea' : '#10b981',
                    fillColor: esSeleccionada ? '#667eea' : '#10b981',
                    fillOpacity: 0.2,
                    weight: 2,
                  }}
                  interactive={false}
                />
              );
            }
          }

          // Calcular información de distancia si está en seguimiento
          let infoDistancia = '';
          if (enSeguimiento && circuloSeguimiento) {
            const centroCirculo = circuloSeguimiento.getLatLng();
            const distancia = L.latLng(lat, lng).distanceTo(centroCirculo);
            const distanciaKm = (distancia / 1000).toFixed(2);
            infoDistancia = ` (${distanciaKm}km)`;
          }

          // 4. Crear el icono según si está seleccionada o no
          let iconUrl;
          switch (props.tipo) {
            case 'TIPO I':
              iconUrl = '/icon/camera.png';
              break;
            case 'TIPO II':
              iconUrl = '/icon/camera2.png';
              break;
            case 'TIPO III':
              iconUrl = '/icon/camera3.png';
              break;
            default:
              iconUrl = '/icon/camera.png';
          }

          let iconoMarcador;
          if (esSeleccionada) {
            // Icono con efecto de selección
            iconoMarcador = new L.DivIcon({
              html: `<div style="
              width: 40px;
              height: 40px;
              background-image: url('${iconUrl}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.8));
              animation: pulse-camara 2s infinite;
            "></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              popupAnchor: [0, -20],
              className: 'camara-seleccionada-custom',
            });
          } else {
            // Icono normal
            iconoMarcador = crearIconoCamara(props.tipo);
          }

          // 5. Renderizar UN SOLO marcador que funcione siempre
          elementos.push(
            <Marker
              key={markerId}
              position={[lat, lng]}
              icon={iconoMarcador}
              zIndexOffset={esSeleccionada ? 2000 : enSeguimiento ? 1500 : 1000}
              ref={ref => {
                if (ref) {
                  markersRef.current[markerId] = ref;
                }
              }}
              eventHandlers={{
                click: () => {
                  logger.log('📍 Click en cámara:', props.name);

                  // Hacer zoom hacia la cámara con animación suave
                  map.flyTo([lat, lng], 18, {
                    animate: true,
                    duration: 1.2,
                    easeLinearity: 0.25,
                  });

                  // Actualizar la cámara con campo de visión activo
                  setCamaraConVision(props.name);
                  logger.log('✅ camaraConVision actualizada a:', props.name);

                  if (enSeguimiento) {
                    // Si está en modo seguimiento, crear nuevo círculo centrado en esta cámara
                    const camaraData = {
                      name: props.name,
                      lat: lat,
                      lng: lng,
                      direccion: props.direccion,
                      tipo: props.tipo,
                      jurisdiccion: props.jurisdiccion,
                      megafono: props.megafono,
                      boton: props.boton,
                    };
                    iniciarSeguimientoCamaras(camaraData);
                  }
                },
              }}
            >
              <Popup
                eventHandlers={{
                  remove: () => {
                    logger.log('❌ Popup cerrado para:', props.name);
                    // Ocultar campo de visión cuando se cierra el popup
                    setCamaraConVision(null);
                  },
                }}
              >
                <div style={{ fontSize: '13px' }}>
                  <strong>
                    📍 {props.name}
                    {infoDistancia}
                  </strong>
                  <br />
                  Dirección: {props.direccion}
                  <br />
                  Tipo: {props.tipo}
                  <br />
                  Jurisdicción: {props.jurisdiccion}
                  <br />
                  Megáfono: {props.megafono ? '✅' : '❌'}
                  <br />
                  Botón de pánico: {props.boton ? '✅' : '❌'}
                  {enSeguimiento && (
                    <>
                      <br />
                      <br />
                      <div
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#10b981',
                          fontWeight: 'bold',
                          textAlign: 'center',
                        }}
                      >
                        🎯 Clic para nuevo seguimiento
                      </div>
                    </>
                  )}
                  {esSeleccionada && !enSeguimiento && (
                    <>
                      <br />
                      <br />
                      <div
                        style={{
                          background: 'rgba(102, 126, 234, 0.2)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#667eea',
                          fontWeight: 'bold',
                          textAlign: 'center',
                        }}
                      >
                        🎯 CAMPO DE VISIÓN ACTIVO
                      </div>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );

          return elementos;
        })
        .flat()}
    </LayerGroup>
  );
};

// Optimizar con React.memo para evitar re-renders innecesarios
export default React.memo(CapaCamarasMunicipales);
