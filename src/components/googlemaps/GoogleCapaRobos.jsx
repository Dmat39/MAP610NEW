import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { useRobosQuery } from "../../hooks/useIncidenciasQuery";

// Función para obtener color por turno (mantenida localmente para el renderizado)
const getColorByTurno = (turno = "") => {
  const normalizado = (turno || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
    
  switch (normalizado) {
    case "turno manana":
      return "#ffd93d";
    case "turno tarde":
      return "#ff8c42";
    case "turno noche":
      return "#6c5ce7";
    default:
      return "#74b9ff";
  }
};

const GoogleCapaRobos = ({ visible, filtros = null, map, google }) => {
  // Usar TanStack Query para obtener los datos con caché de 12 horas
  const { 
    data: robosFiltrados = [], 
    isLoading: loading, 
    error,
    isFetching
  } = useRobosQuery(filtros, visible);
  
  const [currentZoom, setCurrentZoom] = useState(13);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]); // Usar useRef en lugar de useState para markers

  // Función memoizada para calcular radio dinámico basado en el zoom
  const calcularRadio = useCallback((zoom) => {
    // Radio base que se ajusta según el zoom
    // A mayor zoom, menor radio para mantener consistencia visual
    const radioBase = 50;
    const factor = Math.pow(2, (15 - zoom)); // Factor exponencial
    return Math.max(radioBase * factor, 10); // Mínimo 10 metros
  }, []);

  // Función para limpiar markers
  const limpiarMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
  }, []);

  // Crear InfoWindow una sola vez usando useRef
  useEffect(() => {
    if (!map || !google || infoWindowRef.current) return;

    const newInfoWindow = new google.maps.InfoWindow({
      disableAutoPan: false,
      maxWidth: 300,
      pixelOffset: new google.maps.Size(0, -30)
    });

    infoWindowRef.current = newInfoWindow;

    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [map, google]);

  // Listener para cambios de zoom - sin dependencias problemáticas
  useEffect(() => {
    if (!map || !google) return;

    const zoomListener = map.addListener('zoom_changed', () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
    });

    // Obtener zoom inicial
    setCurrentZoom(map.getZoom() || 13);

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
    };
  }, [map, google]);

  // Memoizar el contenido del InfoWindow para evitar recreaciones innecesarias
  const createInfoWindowContent = useCallback((item) => {
    return `
          <div style="font-size: 13px; max-width: 260px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
              <strong style="color: #333;">🦹‍♂️ Robo</strong>
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
              <strong>Cod. Inc.:</strong> ${item.codigo_incidencia}<br />
              <strong>Descripción:</strong><br />
              <div style="margin: 5px 0; padding: 5px; background-color: #f8f9fa; border-radius: 3px; font-size: 12px;">
                ${item.Descripcion}
              </div>
              <strong>Fecha:</strong> ${item.Fecha}<br />
              <strong>Hora:</strong> ${item.Hora || "-"}<br />
              <strong>Turno:</strong> ${item.Turno}<br />
              <strong>Horario:</strong> ${item.Horario}<br />
              <strong>Jurisdicción:</strong> ${item.Jurisdiccion}
            </div>
          </div>
    `;
  }, []);

  // Efecto principal para manejar los markers - optimizado SIN markers en dependencias
  useEffect(() => {
    if (!map || !google || !visible || !infoWindowRef.current) {
      // Limpiar markers si no visible
      limpiarMarkers();
      return;
    }

    // Limpiar markers anteriores
    limpiarMarkers();

    const newMarkers = [];
    const radioActual = calcularRadio(currentZoom);

    robosFiltrados.forEach((item) => {
      const lat = parseFloat(item.Latitud);
      const lng = parseFloat(item.Longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = getColorByTurno(item.Turno);

      // Crear marker circular usando un círculo de Google Maps con radio dinámico
      const circle = new google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.3,
        map: map,
        center: { lat, lng },
        radius: radioActual, // Radio dinámico basado en zoom
        clickable: true,
        zIndex: 1000 // Alta prioridad sobre otros elementos del mapa
      });

      // Agregar evento click para mostrar info en el InfoWindow compartido
      circle.addListener("click", (event) => {
        // Cerrar InfoWindow anterior si está abierto
        infoWindowRef.current.close();
        
        // Configurar contenido para este marcador específico
        infoWindowRef.current.setContent(createInfoWindowContent(item));
        
        // Posicionar y abrir InfoWindow
        infoWindowRef.current.setPosition(event.latLng);
        infoWindowRef.current.open(map);

        // Agregar evento al botón de cerrar después de que el InfoWindow se abra
        google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
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
              infoWindowRef.current.close();
            });
          }
        });
      });

      newMarkers.push(circle);
    });

    // Actualizar la referencia de markers
    markersRef.current = newMarkers;

    // Cleanup function
    return () => {
      newMarkers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    };
  }, [map, google, visible, robosFiltrados, currentZoom, calcularRadio, createInfoWindowContent, limpiarMarkers]);

  return null; // Este componente no renderiza JSX
};

export default memo(GoogleCapaRobos);