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

  // Nuevo icono moderno de cámara de seguridad tipo domo/bala
  const iconoSvg = `
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${config.filterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#e8edf2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#c5d3e0;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="lensGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#4a5568;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a202c;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Brillo de fondo -->
      <ellipse cx="32" cy="32" rx="22" ry="20" fill="${config.glowColor}" opacity="${config.glowOpacity}" filter="url(#${config.filterId})"/>

      <!-- Base de montaje superior -->
      <rect x="20" y="14" width="24" height="6" rx="2" fill="url(#bodyGradient)" stroke="#334155" stroke-width="1.5"/>

      <!-- Líneas de ventilación en la base -->
      <line x1="24" y1="17" x2="26" y2="17" stroke="#64748b" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="29" y1="17" x2="31" y2="17" stroke="#64748b" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="34" y1="17" x2="36" y2="17" stroke="#64748b" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="39" y1="17" x2="41" y2="17" stroke="#64748b" stroke-width="0.8" stroke-linecap="round"/>

      <!-- Cuerpo principal tipo domo -->
      <path d="M 20 20 L 20 32 C 20 38 25 44 32 44 C 39 44 44 38 44 32 L 44 20 Z"
            fill="url(#bodyGradient)"
            stroke="#334155"
            stroke-width="2"/>

      <!-- Anillo decorativo del lente -->
      <circle cx="32" cy="32" r="10" fill="#94a3b8" stroke="#334155" stroke-width="1.5"/>

      <!-- Lente principal con gradiente -->
      <circle cx="32" cy="32" r="8" fill="url(#lensGradient)" stroke="#1e293b" stroke-width="1.5"/>

      <!-- Reflejo del lente (círculo interior) -->
      <circle cx="32" cy="32" r="5" fill="#0f172a"/>

      <!-- Reflejo de luz en el lente -->
      <ellipse cx="34" cy="30" rx="2.5" ry="3.5" fill="#ffffff" opacity="0.4"/>
      <ellipse cx="35" cy="29" rx="1" ry="1.5" fill="#ffffff" opacity="0.7"/>

      <!-- Detalles laterales del cuerpo -->
      <circle cx="24" cy="26" r="1.5" fill="#64748b" opacity="0.6"/>
      <circle cx="40" cy="26" r="1.5" fill="#64748b" opacity="0.6"/>

      <!-- LED indicador -->
      <circle cx="22" cy="23" r="1.2" fill="#22c55e" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;

  const html = `
    <div class="camara-vecinal-marker" style="
      position: relative;
      width: 40px;
      height: 40px;
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
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
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
