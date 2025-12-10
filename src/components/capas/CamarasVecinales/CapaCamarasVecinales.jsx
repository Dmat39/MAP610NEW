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
  // Colores según la marca
  const colores = {
    HIKVISION: {
      primary: '#ef4444',
      secondary: '#dc2626',
      bg: '#fef2f2',
      shadow: 'rgba(239, 68, 68, 0.4)'
    },
    DAHUA: {
      primary: '#3b82f6',
      secondary: '#2563eb',
      bg: '#eff6ff',
      shadow: 'rgba(59, 130, 246, 0.4)'
    }
  };

  const color = colores[marca] || colores.DAHUA;

  // Icono según el modo (FIXED, DOME, BOTH)
  let iconoSvg = '';
  if (modo === 'DOME') {
    // Cámara tipo domo
    iconoSvg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="20" r="8" fill="${color.primary}" opacity="0.2"/>
        <path d="M16 10C11.58 10 8 13.58 8 18C8 20.21 9 22.15 10.57 23.43C11.35 24.04 12.29 24.45 13.31 24.62C14.17 24.76 15.07 24.82 16 24.82C16.93 24.82 17.83 24.76 18.69 24.62C19.71 24.45 20.65 24.04 21.43 23.43C23 22.15 24 20.21 24 18C24 13.58 20.42 10 16 10Z" fill="${color.primary}"/>
        <circle cx="16" cy="18" r="3.5" fill="${color.bg}"/>
        <circle cx="16" cy="18" r="2" fill="${color.secondary}"/>
      </svg>
    `;
  } else if (modo === 'BOTH') {
    // Cámara mixta (fixed + dome)
    iconoSvg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="8" width="12" height="8" rx="1" fill="${color.primary}"/>
        <rect x="13" y="10" width="6" height="4" rx="0.5" fill="${color.bg}"/>
        <circle cx="16" cy="12" r="1.5" fill="${color.secondary}"/>
        <path d="M16 16C13.79 16 12 17.79 12 20C12 21.1 12.45 22.09 13.17 22.83C13.67 23.33 14.3 23.68 15 23.83C15.32 23.91 15.65 23.95 16 23.95C16.35 23.95 16.68 23.91 17 23.83C17.7 23.68 18.33 23.33 18.83 22.83C19.55 22.09 20 21.1 20 20C20 17.79 18.21 16 16 16Z" fill="${color.primary}" opacity="0.8"/>
        <circle cx="16" cy="20" r="1.5" fill="${color.bg}"/>
      </svg>
    `;
  } else {
    // Cámara tipo FIXED (por defecto)
    iconoSvg = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="10" width="16" height="12" rx="2" fill="${color.primary}"/>
        <rect x="11" y="13" width="10" height="6" rx="1" fill="${color.bg}"/>
        <circle cx="16" cy="16" r="2.5" fill="${color.secondary}"/>
        <circle cx="16" cy="16" r="1" fill="${color.bg}"/>
        <rect x="6" y="18" width="2" height="6" rx="1" fill="${color.primary}" opacity="0.7"/>
        <circle cx="21" cy="13" r="1" fill="${color.bg}" opacity="0.8"/>
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
      filter: drop-shadow(0 4px 8px ${color.shadow});
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
            <Tooltip
              direction="top"
              offset={[0, -20]}
              opacity={1}
              className="custom-tooltip-vecinal"
            >
              <div style={{
                fontWeight: "600",
                fontSize: "12px",
                padding: "2px 4px"
              }}>
                📹 {camara.neighbor}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaCamarasVecinales;
