import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './CapaUbicadorPunto.css';
import { logger } from '../../../utils/logger.js';

// Configuración del icono personalizado para puntos ubicados
const iconoUbicacion = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIj4KICA8IS0tIFBpbiBwcmluY2lwYWwgLS0+CiAgPHBhdGggZD0iTTE2IDRjLTQuNCAwLTggMy42LTggOCAwIDQuNCA2LjIgMTIuOCA3LjIgMTQuMS40LjUgMS4yLjUgMS42IDAgMS0xLjMgNy4yLTkuNyA3LjItMTQuMSAwLTQuNC0zLjYtOC04LTh6IiBmaWxsPSIjZTc0YzNjIiBzdHJva2U9IiNjMDM5MmIiIHN0cm9rZS13aWR0aD0iMSIvPgogIDwhLS0gQ8OtcmN1bG8gaW50ZXJpb3IgLS0+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxMiIgcj0iMyIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjYzAzOTJiIiBzdHJva2Utd2lkdGg9IjEiLz4KICA8IS0tIFB1bnRvIGNlbnRyYWwgLS0+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxMiIgcj0iMS41IiBmaWxsPSIjYzAzOTJiIi8+CiAgPCEtLSBTb21icmEgLS0+CiAgPGVsbGlwc2UgY3g9IjE2IiBjeT0iMjgiIHJ4PSI0IiByeT0iMS41IiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIwLjIiLz4KPC9zdmc+', // Data URI del SVG
  iconSize: [32, 32],
  iconAnchor: [16, 28],
  popupAnchor: [0, -28],
});

const CapaUbicadorPunto = ({ visible }) => {
  const map = useMap();
  const marcadorRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  // Función para obtener dirección mediante geocodificación inversa
  const obtenerDireccion = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`
      );
      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      } else {
        return 'Dirección no encontrada';
      }
    } catch (error) {
      logger.error('Error al obtener dirección:', error);
      return 'Error al obtener dirección';
    }
  };

  // Función para limpiar marcador existente
  const limpiarMarcador = () => {
    if (marcadorRef.current && map.hasLayer(marcadorRef.current)) {
      map.removeLayer(marcadorRef.current);
      marcadorRef.current = null;
    }
    // Limpiar función global
    if (window.cerrarPopupUbicador) {
      delete window.cerrarPopupUbicador;
    }
  };

  // Función para deshabilitar/habilitar interceptor
  const toggleInterceptor = habilitar => {
    const interceptor = document.getElementById('ubicador-click-interceptor');
    if (interceptor) {
      if (habilitar) {
        interceptor.style.pointerEvents = 'auto';
        interceptor.style.display = 'block';
      } else {
        interceptor.style.pointerEvents = 'none';
        interceptor.style.display = 'none';
      }
    }
  };

  // Función para crear marcador con información
  const crearMarcador = useCallback(
    async (lat, lng) => {
      // Limpiar marcador anterior (solo mantener uno a la vez)
      if (marcadorRef.current) {
        if (map.hasLayer(marcadorRef.current)) {
          map.removeLayer(marcadorRef.current);
        }
        marcadorRef.current = null;
      }

      // Limpiar función global anterior si existe
      if (window.cerrarPopupUbicador) {
        delete window.cerrarPopupUbicador;
      }

      // Crear marcador temporal mientras se obtiene la dirección
      const marcador = L.marker([lat, lng], {
        icon: iconoUbicacion,
      });

      marcador.addTo(map);
      marcador.openPopup();
      marcadorRef.current = marcador;

      // Obtener dirección de forma asíncrona
      const direccion = await obtenerDireccion(lat, lng);

      // Crear función personalizada para cerrar popup
      const cerrarPopup = () => {
        limpiarMarcador();
      };

      // Actualizar popup con la dirección
      const popupCompleto = `
      <div class="popup-ubicador" style="font-size: 13px; max-width: 300px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #e74c3c;">📍 Punto Ubicado</strong>
          <button class="close-btn" onclick="window.cerrarPopupUbicador()"
                  title="Cerrar">×</button>
        </div>
        <strong>Coordenadas:</strong><br/>
        Latitud: ${lat.toFixed(6)}<br/>
        Longitud: ${lng.toFixed(6)}<br/>
        <strong>Dirección:</strong><br/>
        <span style="color: #34495e;">${direccion}</span>
        <hr style="margin: 8px 0; border: none; border-top: 1px solid #ecf0f1;">
        <small style="color: #7f8c8d;"><em>Haz clic en el botón × o en otro lugar del mapa para ubicar un nuevo punto</em></small>
      </div>
    `;

      // Hacer función global para el botón de cerrar
      window.cerrarPopupUbicador = cerrarPopup;

      // Actualizar popup con opciones para deshabilitar botón predeterminado
      marcador.unbindPopup();
      marcador.bindPopup(popupCompleto, {
        closeButton: false, // Deshabilitar el botón de cerrar predeterminado
        autoClose: false, // No cerrar automáticamente al hacer click en el mapa
        closeOnClick: false, // No cerrar al hacer click en el popup
      });
      marcador.openPopup();
    },
    [map]
  );

  // Manejador de click en el mapa
  const handleMapClick = useCallback(
    e => {
      logger.log('🎯 Click detectado en ubicador:', { isActive, visible });

      if (!isActive || !visible) {
        logger.log('🚫 Ubicador no está activo, ignorando click');
        return;
      }

      // Prevenir que el evento se propague a otras capas
      if (e.originalEvent) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
      }

      // Detener propagación del evento de Leaflet
      L.DomEvent.stopPropagation(e);

      const { lat, lng } = e.latlng;
      logger.log(`📍 Punto ubicado en: ${lat}, ${lng}`);
      crearMarcador(lat, lng);
    },
    [isActive, visible, crearMarcador]
  );

  // Efecto para agregar/quitar el evento de click
  useEffect(() => {
    if (visible) {
      setIsActive(true);

      // Quitar todos los listeners existentes primero
      map.off('click', handleMapClick);

      // Crear un overlay invisible de máxima prioridad para capturar todos los clicks
      const mapContainer = map.getContainer();
      const clickInterceptor = document.createElement('div');
      clickInterceptor.id = 'ubicador-click-interceptor';
      clickInterceptor.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        cursor: crosshair;
        pointer-events: auto;
      `;

      // Agregar el interceptor
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(clickInterceptor);

      // Agregar listener al interceptor con máxima prioridad
      const interceptorClickHandler = e => {
        e.preventDefault();
        e.stopPropagation();

        // Convertir coordenadas del click a coordenadas del mapa
        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const latlng = map.containerPointToLatLng([x, y]);

        // Simular evento de Leaflet
        const mockEvent = {
          latlng: latlng,
          originalEvent: e,
        };

        handleMapClick(mockEvent);
      };

      clickInterceptor.addEventListener('click', interceptorClickHandler);

      // Cambiar cursor para indicar que se puede hacer clic
      map.getContainer().style.cursor = 'crosshair';

      logger.log('📍 Modo ubicador de puntos activado con interceptor de máxima prioridad');

      // Guardar el handler para cleanup
      clickInterceptor._handler = interceptorClickHandler;
    } else {
      setIsActive(false);
      map.off('click', handleMapClick);

      // Limpiar TODOS los marcadores cuando se desmarca el checkbox
      limpiarMarcador();

      // Remover interceptor si existe
      const interceptor = document.getElementById('ubicador-click-interceptor');
      if (interceptor) {
        if (interceptor._handler) {
          interceptor.removeEventListener('click', interceptor._handler);
        }
        interceptor.remove();
      }

      // Restaurar cursor normal
      map.getContainer().style.cursor = '';

      logger.log('📍 Modo ubicador de puntos desactivado - Todos los puntos eliminados');
    }

    return () => {
      map.off('click', handleMapClick);
      map.getContainer().style.cursor = '';

      // Cleanup del interceptor
      const interceptor = document.getElementById('ubicador-click-interceptor');
      if (interceptor) {
        if (interceptor._handler) {
          interceptor.removeEventListener('click', interceptor._handler);
        }
        interceptor.remove();
      }
    };
  }, [visible, map, handleMapClick]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      limpiarMarcador();
      map.off('click', handleMapClick);
      map.getContainer().style.cursor = '';
    };
  }, []);

  if (!visible) return null;

  return (
    <LayerGroup>
      {/* Los marcadores se crean directamente con L.marker y se agregan al mapa */}
    </LayerGroup>
  );
};

export default CapaUbicadorPunto;
