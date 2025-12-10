import { useEffect, useState, useCallback, useRef } from "react";
import { useFeminicidiosQuery } from "../../hooks/useIncidenciasQuery";

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

const GoogleCapaFeminicidios = ({ visible, filtros = null, map, google }) => {
  const {
    data: feminicidiosFiltrados = [],
    isLoading: loading,
    error,
    isFetching
  } = useFeminicidiosQuery(filtros, visible);

  const [currentZoom, setCurrentZoom] = useState(13);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]);

  const calcularRadio = useCallback((zoom) => {
    const radioBase = 50;
    const factor = Math.pow(2, (15 - zoom));
    return Math.max(radioBase * factor, 10);
  }, []);

  const limpiarMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
  }, []);

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

  useEffect(() => {
    if (!map || !google) return;

    const zoomListener = map.addListener('zoom_changed', () => {
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);
    });

    setCurrentZoom(map.getZoom() || 13);

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
    };
  }, [map, google]);

  const createInfoWindowContent = useCallback((item) => {
    return `
          <div style="font-size: 13px; max-width: 260px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
              <strong style="color: #333;">Feminicidio</strong>
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

  useEffect(() => {
    if (!map || !google || !visible || !infoWindowRef.current) {
      limpiarMarkers();
      return;
    }

    limpiarMarkers();

    const newMarkers = [];
    const radioActual = calcularRadio(currentZoom);

    feminicidiosFiltrados.forEach((item) => {
      const lat = parseFloat(item.Latitud);
      const lng = parseFloat(item.Longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = getColorByTurno(item.Turno);

      const circle = new google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.3,
        map: map,
        center: { lat, lng },
        radius: radioActual,
        clickable: true,
        zIndex: 1000
      });

      circle.addListener("click", (event) => {
        infoWindowRef.current.close();
        infoWindowRef.current.setContent(createInfoWindowContent(item));
        infoWindowRef.current.setPosition(event.latLng);
        infoWindowRef.current.open(map);

        google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
          const closeBtn = document.getElementById('close-tooltip-btn');
          if (closeBtn) {
            closeBtn.addEventListener('mouseenter', () => {
              closeBtn.style.backgroundColor = '#ff4757';
              closeBtn.style.color = 'white';
            });
            closeBtn.addEventListener('mouseleave', () => {
              closeBtn.style.backgroundColor = 'transparent';
              closeBtn.style.color = '#666';
            });
            closeBtn.addEventListener('click', () => {
              infoWindowRef.current.close();
            });
          }
        });
      });

      newMarkers.push(circle);
    });

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    };
  }, [map, google, visible, feminicidiosFiltrados, currentZoom, calcularRadio, createInfoWindowContent, limpiarMarkers]);

  return null;
};

export default GoogleCapaFeminicidios;
