import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup, LayerGroup, Circle, Polygon } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import './CapaCamarasMunicipales.css';
import './LocationCopyPopup.css';
import { useMapLocationCopy } from '../../../hooks/useMapLocationCopy';
import { getAngleFromCoords, isValidReferencia, parseReferencia, generateVisionField } from '../../../utils';
import { logger } from '../../../utils/logger.js';
import camarasService from '../../../services/camarasService';
import { cargarJurisdicciones, obtenerJurisdiccion } from '../../../utils/jurisdiccionUtils';
import { normalizarNombreJurisdiccion } from '../../../utils/geoUtils';
import { useAuth } from '../../../context/AuthContext';

import L from 'leaflet';

// Colores por tipo de cámara
const COLORES_TIPO = {
  'TIPO I': '#3B82F6',
  'TIPO II': '#22C55E',
  'TIPO III': '#8B5CF6',
};
const COLOR_DEFAULT = '#3B82F6';

// Nivel de zoom: 1=lejano, 2=medio, 3=cercano
const getZoomNivel = zoom => {
  if (zoom <= 12) return 1;
  if (zoom <= 15) return 2;
  return 3;
};

// Crea el pin SVG completo (nivel 3) o con indicador de seguimiento
const _svgPin = (color, esSeleccionada, enSeguimiento) => {
  const w = esSeleccionada ? 34 : 28;
  const h = esSeleccionada ? 44 : 36;
  const indicador = esSeleccionada
    ? `<circle cx="22" cy="5" r="4.5" fill="${color}" stroke="white" stroke-width="1.5"/>`
    : enSeguimiento
      ? `<circle cx="22" cy="5" r="4.5" fill="#10b981" stroke="white" stroke-width="1.5"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 28 36" style="display:block">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="13" r="9" fill="white" opacity="0.93"/>
    <rect x="7" y="10" width="14" height="9" rx="1.5" fill="${color}"/>
    <circle cx="14" cy="14.5" r="3.5" fill="white"/>
    <circle cx="14" cy="14.5" r="1.8" fill="${color}"/>
    <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill="${color}"/>
    ${indicador}
  </svg>`;
};

// Función principal: crea el DivIcon según tipo, nivel de zoom y estado
const crearIconoCamaraModerno = (tipo, nivelZoom, esSeleccionada = false, enSeguimiento = false) => {
  const color = COLORES_TIPO[tipo] || COLOR_DEFAULT;

  // Siempre pin completo si está seleccionada
  if (esSeleccionada) {
    return new L.DivIcon({
      html: `<div class="cam-pin-wrap cam-pin-selected">${_svgPin(color, true, false)}</div>`,
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -44],
      className: '',
    });
  }

  if (nivelZoom >= 3) {
    const glowStyle = enSeguimiento ? 'filter:drop-shadow(0 0 5px #10b98170);' : '';
    return new L.DivIcon({
      html: `<div class="cam-pin-wrap" style="${glowStyle}">${_svgPin(color, false, enSeguimiento)}</div>`,
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -36],
      className: '',
    });
  }

  if (nivelZoom === 2) {
    const seguimientoStyle = enSeguimiento ? 'box-shadow:0 0 0 3px #10b98150;' : '';
    return new L.DivIcon({
      html: `<div class="cam-pin-mid" style="--pin-color:${color};${seguimientoStyle}"></div>`,
      iconSize: [18, 22],
      iconAnchor: [9, 22],
      popupAnchor: [0, -22],
      className: '',
    });
  }

  // Nivel 1: punto simple
  return new L.DivIcon({
    html: `<div class="cam-pin-dot" style="background:${color};"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -10],
    className: '',
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
  filtrosCamaras,
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
  const [zoomNivel, setZoomNivel] = useState(1);
  const map = useMap();
  const markersRef = useRef({});

  const { getVisibleFields } = useAuth();
  const visibleFields = getVisibleFields('camaras-municipales');
  const canSee = (field) => !visibleFields || visibleFields.length === 0 || visibleFields.includes(field);

  // Usar el hook para habilitar la copia de ubicaciones
  useMapLocationCopy();

  // Sincronizar nivel de zoom (1=lejano, 2=medio, 3=cercano)
  useEffect(() => {
    if (!map) return;
    const actualizar = () => {
      setZoomNivel(prev => {
        const nuevo = getZoomNivel(map.getZoom());
        return prev !== nuevo ? nuevo : prev;
      });
    };
    actualizar();
    map.on('zoomend', actualizar);
    return () => map.off('zoomend', actualizar);
  }, [map]);

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

        // Cargar jurisdicciones y cámaras en paralelo
        const [jurisdicciones, resultado] = await Promise.all([
          cargarJurisdicciones(),
          camarasService.getCamarasMunicipales()
        ]);

        logger.log(`✅ ${resultado.camaras.length} cámaras municipales cargadas desde el backend (Total: ${resultado.count})`);
        logger.log(`🗺️ ${jurisdicciones.length} jurisdicciones cargadas`);

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

          // Determinar la jurisdicción basándose en las coordenadas (normalizada igual que ControlCamaras)
          const jurisdiccion = normalizarNombreJurisdiccion(
            obtenerJurisdiccion(camara.latitude, camara.longitude, jurisdicciones)
          );

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
              jurisdiccion: jurisdiccion,
              // Coordenadas para generar el campo de visión
              latitude: camara.latitude,
              longitude: camara.longitude,
              // Ángulo de dirección desde el backend (en grados, medido desde el eje X)
              angle: camara.angle,
              // Radio del campo de visión en grados
              radius: camara.radius || 0.0013, // Default 0.0011 si no viene del backend
              // Campo referencia para cámaras C180 (coordenadas hacia donde apunta) - LEGACY
              referencia: camara.referencia || '',
              // El polígono de visión viene del backend (usado como fallback si existe)
              geometryVision: camara.geometry,
            },
          };
        });

        logger.log('📊 Cámaras transformadas (primeras 3):', camarasTransformadas.slice(0, 3));
        logger.log('📍 Total de cámaras a mostrar:', camarasTransformadas.length);

        setCamaras(camarasTransformadas);
        logger.log('🔘 Cámaras con botón de pánico:', camarasTransformadas.filter(f => f.properties.boton).length);
        logger.log('📷 Cámaras LPR (TIPO III):', camarasTransformadas.filter(f => f.properties.tipo === 'TIPO III').length);
        logger.log('📢 Cámaras con megáfono:', camarasTransformadas.filter(f => f.properties.megafono).length);
        const jurisdicciones10 = camarasTransformadas.filter(f => f.properties.jurisdiccion === '10 de Octubre').length;
        logger.log('🗺️ Cámaras en "10 de Octubre":', jurisdicciones10);
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

  // Efecto para limpiar seguimiento cuando se activa un filtro
  useEffect(() => {
    const isFilterActive = filtrosCamaras && (
      filtrosCamaras.megafono || filtrosCamaras.boton || filtrosCamaras.lpr ||
      (filtrosCamaras.jurisdicciones?.length > 0)
    );
    if (isFilterActive && seguimientoActivo) {
      limpiarTodoSeguimiento();
    }
  }, [filtrosCamaras]);


  if (!visible) return null;

  // Mostrar mensajes de estado
  if (cargando) {
    return (
      <div className="map-overlay">
        Cargando cámaras municipales...
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-overlay error">
        Error: {error}
      </div>
    );
  }

  // Determinar qué cámaras mostrar (seguimiento, filtradas o todas)
  const hayFiltroActivo = filtrosCamaras && (
    filtrosCamaras.megafono ||
    filtrosCamaras.boton ||
    filtrosCamaras.lpr ||
    (filtrosCamaras.jurisdicciones?.length > 0)
  );

  let camarasAMostrar;

  if (seguimientoActivo && camarasCercanas.length > 0) {
    camarasAMostrar = camarasCercanas.map(item => item.feature);
    logger.log('📍 Modo: Seguimiento -', camarasAMostrar.length, 'cámaras');
  } else if (hayFiltroActivo) {
    // Características: OR (muestra si cumple CUALQUIERA)
    // Jurisdicción: AND (acota por zona)
    camarasAMostrar = camaras.filter(feature => {
      const props = feature.properties;
      // Primero acotar por jurisdicción si está activa
      if (filtrosCamaras.jurisdicciones?.length > 0 &&
          !filtrosCamaras.jurisdicciones.includes(props.jurisdiccion)) return false;
      // Luego OR entre características
      const hayCaracteristica = filtrosCamaras.boton || filtrosCamaras.lpr || filtrosCamaras.megafono;
      if (hayCaracteristica) {
        return (filtrosCamaras.boton && !!props.boton) ||
               (filtrosCamaras.lpr && props.tipo === 'TIPO III') ||
               (filtrosCamaras.megafono && !!props.megafono);
      }
      return true;
    });
    logger.log('🔍 Modo: Filtradas -', camarasAMostrar.length, 'cámaras');
  } else {
    camarasAMostrar = camaras;
    logger.log('📷 Modo: Todas -', camarasAMostrar.length, 'cámaras');
  }

  return (
    <LayerGroup>
      {camarasAMostrar.map((feature, idx) => {
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

        // Determinar si esta cámara está en modo seguimiento
        const enSeguimiento =
          seguimientoActivo && camarasCercanas.some(item => item.properties?.name === props.name);

        // Calcular información de distancia si está en seguimiento
        let infoDistancia = '';
        if (enSeguimiento && circuloSeguimiento) {
          const centroCirculo = circuloSeguimiento.getLatLng();
          const distancia = L.latLng(lat, lng).distanceTo(centroCirculo);
          const distanciaKm = (distancia / 1000).toFixed(2);
          infoDistancia = ` (${distanciaKm}km)`;
        }

        const iconoMarcador = crearIconoCamaraModerno(props.tipo, zoomNivel, esSeleccionada, enSeguimiento);

        // Generar campo de visión si corresponde
        let visionPolygonElement = null;
        if (canSee('vision') && (esSeleccionada || enSeguimiento)) {
          // PRIORIDAD 1: Si el backend envía geometryVision (polígono pre-calculado), usarlo
          if (props.geometryVision && props.geometryVision.coordinates) {
            const coordinates = props.geometryVision.coordinates[0];
            // Convertir de [lng, lat] a [lat, lng] para Leaflet
            const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

            visionPolygonElement = (
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
          } else {
            // PRIORIDAD 2: Generar el polígono en el frontend usando angle del backend
            const visionPolygon = generateVisionField(
              props.cameraModel, // "C180", "C360", "LPR"
              props.latitude,
              props.longitude,
              props.angle, // Puede ser null para C360/LPR
              props.radius // Radio desde el backend
            );

            if (visionPolygon) {
              visionPolygonElement = (
                <Polygon
                  key={`vision-polygon-${idx}`}
                  positions={visionPolygon}
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
        }

        return (
          <React.Fragment key={`camara-${idx}`}>
            {visionPolygonElement}
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
                  if (canSee('vision')) {
                    setCamaraConVision(props.name);
                    logger.log('✅ camaraConVision actualizada a:', props.name);
                  }

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
                  {canSee('address') && <>Dirección: {props.direccion}<br /></>}
                  Jurisdicción: {props.jurisdiccion}
                  {(!visibleFields || visibleFields.length === 0) && (
                    <>
                      <br />
                      Tipo: {props.tipo}
                    </>
                  )}
                  {canSee('megaphone') && (
                    <>
                      <br />
                      Megáfono: {props.megafono ? '✅' : '❌'}
                    </>
                  )}
                  {canSee('buttom') && (
                    <>
                      <br />
                      Botón de pánico: {props.boton ? '✅' : '❌'}
                    </>
                  )}
                  {canSee('vision') && enSeguimiento && (
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
                  {canSee('vision') && esSeleccionada && !enSeguimiento && (
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
          </React.Fragment>
        );
      })}
    </LayerGroup>
  );
};

// Optimizar con React.memo para evitar re-renders innecesarios
export default React.memo(CapaCamarasMunicipales);
