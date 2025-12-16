// CapaCamarasVecinales.jsx
import { useEffect, useState } from "react";
import { Marker, Popup, Tooltip, LayerGroup } from "react-leaflet";
import L from "leaflet";
import { useMapLocationCopy } from "../../../hooks/useMapLocationCopy";
import { logger } from "../../../utils/logger.js";
import camarasVecinalesService from "../../../services/camarasVecinalesService";
import "../../../components/capas/CamarasMunicipales/LocationCopyPopup.css";
import "./CapaCamarasVecinales.css";

// Función para crear icono personalizado según la marca
const crearIconoVecinal = (marca, modo) => {
  // Configuración de brillo según la marca
  const configuracion = {
    HIKVISION: {
      glowColor: '#ef4444',
      glowOpacity: '0.3',
      filterId: 'glow-red'
    },
    DAHUA: {
      glowColor: '#3b82f6',
      glowOpacity: '0.3',
      filterId: 'glow-blue'
    }
  };

  const config = configuracion[marca] || configuracion.DAHUA;

  // Icono según el modo (FIXED, DOME, BOTH)
  let iconoSvg = '';
  if (modo === 'DOME') {
    // Cámara tipo domo con contorno negro y brillo de color
    iconoSvg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="${config.filterId}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Brillo de fondo -->
        <ellipse cx="16" cy="17" rx="11" ry="10" fill="${config.glowColor}" opacity="${config.glowOpacity}" filter="url(#${config.filterId})"/>

        <!-- Parte superior -->
        <path d="M 8 11 L 8 14 L 24 14 L 24 11 C 24 10.5 23.5 10 23 10 L 9 10 C 8.5 10 8 10.5 8 11 Z" fill="#f5f5f5" stroke="#1f2937" stroke-width="1.5"/>

        <!-- Líneas decorativas -->
        <line x1="9" y1="12" x2="16" y2="12" stroke="#9ca3af" stroke-width="1"/>
        <line x1="18" y1="12" x2="23" y2="12" stroke="#9ca3af" stroke-width="1"/>

        <!-- Base domo -->
        <path d="M 8 14 L 8 19 C 8 22 11.5 24.5 16 24.5 C 20.5 24.5 24 22 24 19 L 24 14 Z" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>

        <!-- Anillo del lente -->
        <circle cx="16" cy="19" r="4" fill="#d1d5db" stroke="#1f2937" stroke-width="1.2"/>

        <!-- Lente central -->
        <circle cx="16" cy="19" r="2.5" fill="#374151" stroke="#1f2937" stroke-width="1"/>

        <!-- Reflejo -->
        <ellipse cx="17" cy="18" rx="0.8" ry="1" fill="#ffffff" opacity="0.7"/>

        <!-- Centro del lente -->
        <circle cx="16" cy="19" r="1.3" fill="#111827"/>
      </svg>
    `;
  } else if (modo === 'BOTH') {
    // Cámara mixta (fixed + dome) con contorno negro y brillo de color
    iconoSvg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="${config.filterId}-both" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Brillo de fondo -->
        <ellipse cx="16" cy="17" rx="11" ry="10" fill="${config.glowColor}" opacity="${config.glowOpacity}" filter="url(#${config.filterId}-both)"/>

        <!-- Cámara fija superior -->
        <rect x="10" y="8" width="12" height="6" rx="1" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>
        <rect x="13" y="10" width="6" height="2.5" rx="0.5" fill="#d1d5db" stroke="#1f2937" stroke-width="0.8"/>
        <circle cx="16" cy="11" r="1" fill="#374151"/>

        <!-- Base domo inferior -->
        <path d="M 12 14 L 12 18 C 12 20 13.8 21.5 16 21.5 C 18.2 21.5 20 20 20 18 L 20 14 Z" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>

        <!-- Lente del domo -->
        <circle cx="16" cy="17.5" r="2.5" fill="#d1d5db" stroke="#1f2937" stroke-width="1"/>
        <circle cx="16" cy="17.5" r="1.5" fill="#374151"/>
        <ellipse cx="16.5" cy="17" rx="0.5" ry="0.7" fill="#ffffff" opacity="0.7"/>
      </svg>
    `;
  } else {
    // Cámara tipo FIXED (por defecto) con contorno negro y brillo de color
    iconoSvg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="${config.filterId}-fixed" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Brillo de fondo -->
        <ellipse cx="16" cy="16" rx="11" ry="9" fill="${config.glowColor}" opacity="${config.glowOpacity}" filter="url(#${config.filterId}-fixed)"/>

        <!-- Cuerpo de la cámara -->
        <rect x="8" y="10" width="16" height="12" rx="2" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>

        <!-- Pantalla/lente frontal -->
        <rect x="11" y="13" width="10" height="6" rx="1" fill="#d1d5db" stroke="#1f2937" stroke-width="1"/>

        <!-- Lente central -->
        <circle cx="16" cy="16" r="2.5" fill="#374151" stroke="#1f2937" stroke-width="1"/>
        <circle cx="16" cy="16" r="1.3" fill="#111827"/>

        <!-- Reflejo del lente -->
        <ellipse cx="16.8" cy="15.5" rx="0.6" ry="0.8" fill="#ffffff" opacity="0.7"/>

        <!-- Soporte -->
        <rect x="6" y="18" width="2" height="5" rx="1" fill="#9ca3af" stroke="#1f2937" stroke-width="1"/>

        <!-- LED indicador -->
        <circle cx="21" cy="13" r="0.8" fill="#22c55e" opacity="0.8"/>
      </svg>
    `;
  }

  const html = `
    <div class="camara-vecinal-marker" style="
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    ">
      ${iconoSvg}
    </div>
  `;

  return new L.DivIcon({
    html: html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    className: 'custom-camara-vecinal-icon'
  });
};

const CapaCamarasVecinales = ({ visible }) => {
  const [camaras, setCamaras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Usar el hook para habilitar la copia de ubicaciones
  useMapLocationCopy();

  // Cargar cámaras desde el backend
  useEffect(() => {
    const cargarCamaras = async () => {
      try {
        setCargando(true);
        setError(null);

        const resultado = await camarasVecinalesService.getCamarasVecinales();
        logger.log(`✅ ${resultado.count} cámaras vecinales cargadas desde el backend`);

        setCamaras(resultado.camaras);
        setCargando(false);
      } catch (err) {
        logger.error('Error cargando cámaras vecinales:', err);
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
          Cargando cámaras vecinales...
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

  return (
    <LayerGroup>
      {camaras.map((camara, idx) => {
        const lat = camara.latitude;
        const lng = camara.longitude;

        if (!lat || !lng) return null;

        // Determinar el color según la marca
        const colorMarca = camara.brand === "HIKVISION" ? "#ef4444" : "#3b82f6";
        const bgMarca = camara.brand === "HIKVISION" ? "#fef2f2" : "#eff6ff";

        return (
          <Marker
            key={camara.id || idx}
            position={[lat, lng]}
            icon={crearIconoVecinal(camara.brand, camara.mode)}
          >
            <Popup maxWidth={320} className="custom-popup-vecinal">
              <div style={{
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                fontSize: "14px",
                lineHeight: "1.6"
              }}>
                {/* Header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                  paddingBottom: "10px",
                  borderBottom: "2px solid #e5e7eb"
                }}>
                  <div style={{
                    fontSize: "28px",
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                  }}>📹</div>
                  <div>
                    <div style={{
                      fontWeight: "700",
                      fontSize: "16px",
                      color: "#1f2937",
                      marginBottom: "2px"
                    }}>
                      Cámara Vecinal
                    </div>
                    <div style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      fontWeight: "500"
                    }}>
                      {camara.neighbor}
                    </div>
                  </div>
                </div>

                {/* Información */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Dirección */}
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px"
                  }}>
                    <span style={{ fontSize: "16px", marginTop: "2px" }}>📍</span>
                    <div>
                      <div style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "2px"
                      }}>
                        Dirección
                      </div>
                      <div style={{
                        fontSize: "13px",
                        color: "#374151",
                        fontWeight: "500"
                      }}>
                        {camara.address}
                      </div>
                    </div>
                  </div>

                  {/* Detalles técnicos */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginTop: "4px"
                  }}>
                    {/* Marca */}
                    <div style={{
                      background: bgMarca,
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: `1px solid ${colorMarca}20`
                    }}>
                      <div style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "3px"
                      }}>
                        Marca
                      </div>
                      <div style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: colorMarca
                      }}>
                        {camara.brand}
                      </div>
                    </div>

                    {/* Modo */}
                    <div style={{
                      background: "#f0fdf4",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #10b98120"
                    }}>
                      <div style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "3px"
                      }}>
                        Modo
                      </div>
                      <div style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#10b981"
                      }}>
                        {camara.mode}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaCamarasVecinales;
