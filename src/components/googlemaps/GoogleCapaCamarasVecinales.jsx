import { useEffect, useState, useMemo, memo } from "react";
import { useMapContext } from "../../context/MapContext";
import camarasVecinalesService from "../../services/camarasVecinalesService";
import { computeJurisdiccion, pasaFiltroJurisdiccion } from "../../utils/jurisdicciones";

const GoogleCapaCamarasVecinales = ({ visible, map, google, filtroJurisdicciones = [], jurisdiccionesGeoJSON = null }) => {
  const [camaras, setCamaras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [markers, setMarkers] = useState([]);

  // Obtener el filtro de marcas del contexto
  const { marcasCamarasVisibles } = useMapContext();

  // Precalcular la jurisdicción de cada cámara vecinal una sola vez.
  const jurisPorCamara = useMemo(() => {
    const mapa = new Map();
    if (!jurisdiccionesGeoJSON) return mapa;
    camaras.forEach(c => mapa.set(c, computeJurisdiccion(c.latitude, c.longitude, jurisdiccionesGeoJSON)));
    return mapa;
  }, [camaras, jurisdiccionesGeoJSON]);

  // Cargar cámaras desde el backend
  useEffect(() => {
    const cargarCamaras = async () => {
      try {
        setCargando(true);
        setErrorCarga(null);

        const resultado = await camarasVecinalesService.getCamarasVecinales();
        console.log(`✅ ${resultado.count} cámaras vecinales cargadas desde el backend`);

        setCamaras(resultado.camaras);
        setCargando(false);
      } catch (err) {
        console.error('Error cargando cámaras vecinales:', err);
        setErrorCarga(err.message);
        setCargando(false);

        // Si hay error de autenticación, no intentar recargar
        if (err.message.includes('Sesión expirada') || err.message.includes('autenticación')) {
          console.warn('⚠️ Error de autenticación. Por favor, inicia sesión nuevamente.');
        }
      }
    };

    cargarCamaras();
  }, []);

  useEffect(() => {
    if (!map || !google || !visible) {
      // Limpiar markers si no visible
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
      return;
    }

    // Limpiar markers anteriores
    markers.forEach(marker => marker.setMap(null));

    // Filtrar cámaras por marca y por jurisdicción global
    const camarasFiltradas = camaras.filter(camara =>
      marcasCamarasVisibles[camara.brand] &&
      pasaFiltroJurisdiccion(jurisPorCamara.get(camara), filtroJurisdicciones)
    );

    const newMarkers = [];

    camarasFiltradas.forEach((camara) => {
      const lat = camara.latitude;
      const lng = camara.longitude;

      if (!lat || !lng) return;

      // Determinar icono según la marca
      let iconUrl = "/icon/camerav.png"; // HikVision por defecto
      if (camara.brand === "DAHUA") {
        iconUrl = "/icon/camerav2.png";
      }

      // Crear marker
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(26, 26),
          anchor: new google.maps.Point(13, 26)
        }
      });

      // Info window con credenciales ocultables
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; line-height: 1.4; min-width: 240px; max-width: 260px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 18px;">📹</span>
              <div style="font-weight: 700; font-size: 13px; color: #1f2937;">
                ${camara.neighbor}
              </div>
            </div>

            <div style="font-size: 11px; color: #374151; margin-bottom: 8px; display: flex; gap: 4px; align-items: start;">
              <span style="font-size: 12px; margin-top: 1px;">📍</span>
              <span>${camara.address}</span>
            </div>

            <button
              id="toggle-creds-btn"
              onclick="
                var credsDiv = document.getElementById('credenciales-container');
                var btn = document.getElementById('toggle-creds-btn');
                if (credsDiv.style.display === 'none') {
                  credsDiv.style.display = 'block';
                  btn.innerHTML = '<span>🔒</span> Ocultar Credenciales';
                  btn.style.background = '#f1f5f9';
                  btn.style.color = '#475569';
                } else {
                  credsDiv.style.display = 'none';
                  btn.innerHTML = '<span>🔐</span> Ver Credenciales';
                  btn.style.background = '#3b82f6';
                  btn.style.color = '#fff';
                }
              "
              style="
                width: 100%;
                padding: 6px;
                background: #3b82f6;
                color: #fff;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                transition: all 0.2s;
              "
            >
              <span>🔐</span> Ver Credenciales
            </button>

            <div id="credenciales-container" style="display: none; background: #f1f5f9; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 8px;">
              <div style="margin-bottom: 5px;">
                <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-bottom: 2px;">
                  Usuario
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #0f172a; font-family: monospace; background: #fff; padding: 3px 6px; border-radius: 3px; border: 1px solid #cbd5e1;">
                  ${camara.user || 'N/A'}
                </div>
              </div>

              <div style="margin-bottom: 5px;">
                <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-bottom: 2px;">
                  Contraseña
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #0f172a; font-family: monospace; background: #fff; padding: 3px 6px; border-radius: 3px; border: 1px solid #cbd5e1;">
                  ${camara.password || 'N/A'}
                </div>
              </div>

              <div>
                <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-bottom: 2px;">
                  Serial
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #0f172a; font-family: monospace; background: #fff; padding: 3px 6px; border-radius: 3px; border: 1px solid #cbd5e1;">
                  ${camara.serial || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Cleanup function
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, google, visible, camaras, marcasCamarasVisibles, jurisPorCamara, filtroJurisdicciones]);

  return null; // Este componente no renderiza JSX
};

export default memo(GoogleCapaCamarasVecinales);
