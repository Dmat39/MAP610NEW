// CapaCamarasVecinales.jsx
import { useEffect, useState } from "react";
import { Marker, Popup, Tooltip, LayerGroup, useMap } from "react-leaflet";
import L from "leaflet";
import { useMapLocationCopy } from "../../../hooks/useMapLocationCopy";
import { useMapContext } from "../../../context/MapContext";
import { logger } from "../../../utils/logger.js";
import camarasVecinalesService from "../../../services/camarasVecinalesService";
import "../../../components/capas/CamarasMunicipales/LocationCopyPopup.css";
import "./CapaCamarasVecinales.css";

// Componente para el contenido del popup con credenciales ocultables
const PopupContent = ({ camara }) => {
  const [mostrarCredenciales, setMostrarCredenciales] = useState(false);

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontSize: "12px",
      lineHeight: "1.4"
    }}>
      {/* Header compacto */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "8px",
        paddingBottom: "6px",
        borderBottom: "1px solid #e5e7eb"
      }}>
        <span style={{ fontSize: "18px" }}>📹</span>
        <div>
          <div style={{
            fontWeight: "700",
            fontSize: "13px",
            color: "#1f2937"
          }}>
            {camara.neighbor}
          </div>
        </div>
      </div>

      {/* Dirección compacta */}
      <div style={{
        fontSize: "11px",
        color: "#374151",
        marginBottom: "8px",
        display: "flex",
        gap: "4px",
        alignItems: "start"
      }}>
        <span style={{ fontSize: "12px", marginTop: "1px" }}>📍</span>
        <span>{camara.address}</span>
      </div>

      {/* Teléfono */}
      <div style={{
        fontSize: "11px",
        color: "#374151",
        marginBottom: "8px",
        display: "flex",
        gap: "4px",
        alignItems: "center"
      }}>
        <span style={{ fontSize: "12px" }}>📞</span>
        <span>{camara.phone || 'N/A'}</span>
      </div>

      {/* Botón para mostrar credenciales */}
      <button
        onClick={() => setMostrarCredenciales(!mostrarCredenciales)}
        style={{
          width: "100%",
          padding: "6px",
          background: mostrarCredenciales ? "#f1f5f9" : "#16a34a",
          color: mostrarCredenciales ? "#475569" : "#fff",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          transition: "all 0.2s"
        }}
      >
        <span>{mostrarCredenciales ? "🔒" : "🔐"}</span>
        {mostrarCredenciales ? "Ocultar Credenciales" : "Ver Credenciales"}
      </button>

      {/* Credenciales */}
      {mostrarCredenciales && (
        <div style={{
          background: "#f1f5f9",
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          marginTop: "8px"
        }}>
          {/* Usuario */}
          <div style={{ marginBottom: "5px" }}>
            <div style={{
              fontSize: "9px",
              fontWeight: "600",
              color: "#64748b",
              marginBottom: "2px"
            }}>
              Usuario
            </div>
            <div style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#0f172a",
              fontFamily: "monospace",
              background: "#fff",
              padding: "3px 6px",
              borderRadius: "3px",
              border: "1px solid #cbd5e1"
            }}>
              {camara.user || 'N/A'}
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "5px" }}>
            <div style={{
              fontSize: "9px",
              fontWeight: "600",
              color: "#64748b",
              marginBottom: "2px"
            }}>
              Contraseña
            </div>
            <div style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#0f172a",
              fontFamily: "monospace",
              background: "#fff",
              padding: "3px 6px",
              borderRadius: "3px",
              border: "1px solid #cbd5e1"
            }}>
              {camara.password || 'N/A'}
            </div>
          </div>

          {/* Serial */}
          <div>
            <div style={{
              fontSize: "9px",
              fontWeight: "600",
              color: "#64748b",
              marginBottom: "2px"
            }}>
              Serial (SN)
            </div>
            <div style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#0f172a",
              fontFamily: "monospace",
              background: "#fff",
              padding: "3px 6px",
              borderRadius: "3px",
              border: "1px solid #cbd5e1"
            }}>
              {camara.serial || 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Colores por marca de cámara vecinal
const COLORES_MARCA = {
  HIKVISION: '#ef4444',
  DAHUA: '#3b82f6',
};
const COLOR_VECINAL_DEFAULT = '#3b82f6';

const getZoomNivelVecinal = zoom => {
  if (zoom <= 12) return 1;
  if (zoom <= 15) return 2;
  return 3;
};

// Pin moderno: misma forma drop-pin que municipales, pero fondo blanco + borde/ícono coloreado
const crearIconoVecinalModerno = (marca, nivelZoom) => {
  const color = COLORES_MARCA[marca] || COLOR_VECINAL_DEFAULT;

  if (nivelZoom >= 3) {
    // Nivel 3: Drop-pin outline (fondo blanco, borde y cámara del color de la marca)
    return new L.DivIcon({
      html: `<div class="vec-pin-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 28 36" style="display:block">
          <path d="M14 0C6.27 0 0 6.27 0 14c0 9.75 14 22 14 22S28 23.75 28 14C28 6.27 21.73 0 14 0z"
                fill="white" stroke="${color}" stroke-width="2.5"/>
          <circle cx="14" cy="13" r="9" fill="white" stroke="${color}" stroke-width="1.5"/>
          <rect x="7" y="10" width="14" height="9" rx="1.5" fill="${color}"/>
          <circle cx="14" cy="14.5" r="3.5" fill="white"/>
          <circle cx="14" cy="14.5" r="1.8" fill="${color}"/>
          <path d="M11.5 10 L12.5 8.2 L15.5 8.2 L16.5 10 Z" fill="${color}"/>
        </svg>
      </div>`,
      iconSize: [22, 28],
      iconAnchor: [11, 28],
      popupAnchor: [0, -28],
      className: '',
    });
  }

  if (nivelZoom === 2) {
    // Nivel 2: Teardrop outline sin ícono
    return new L.DivIcon({
      html: `<div class="vec-pin-mid" style="--vec-color:${color};"></div>`,
      iconSize: [14, 18],
      iconAnchor: [7, 18],
      popupAnchor: [0, -18],
      className: '',
    });
  }

  // Nivel 1: Punto pequeño
  return new L.DivIcon({
    html: `<div class="vec-pin-dot" style="background:${color};"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
    popupAnchor: [0, -8],
    className: '',
  });
};

// Función para crear icono personalizado según la marca (legado, no usado)
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
  const [zoomNivel, setZoomNivel] = useState(1);
  const map = useMap();

  // Obtener el filtro de marcas del contexto
  const { marcasCamarasVisibles, setConteoCamarasVecinales } = useMapContext();

  // Usar el hook para habilitar la copia de ubicaciones
  useMapLocationCopy();

  // Sincronizar nivel de zoom
  useEffect(() => {
    if (!map) return;
    const actualizar = () => {
      setZoomNivel(prev => {
        const nuevo = getZoomNivelVecinal(map.getZoom());
        return prev !== nuevo ? nuevo : prev;
      });
    };
    actualizar();
    map.on('zoomend', actualizar);
    return () => map.off('zoomend', actualizar);
  }, [map]);

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

  // Calcular y actualizar el conteo de cámaras por marca
  useEffect(() => {
    const conteo = camaras.reduce((acc, camara) => {
      if (camara.brand === 'HIKVISION') {
        acc.HIKVISION++;
      } else if (camara.brand === 'DAHUA') {
        acc.DAHUA++;
      }
      return acc;
    }, { HIKVISION: 0, DAHUA: 0 });

    setConteoCamarasVecinales(conteo);
  }, [camaras, setConteoCamarasVecinales]);

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

  // Filtrar cámaras por marca
  const camarasFiltradas = camaras.filter(camara => {
    // Si la marca de la cámara está visible en el filtro, mostrarla
    return marcasCamarasVisibles[camara.brand];
  });

  return (
    <LayerGroup>
      {camarasFiltradas.map((camara, idx) => {
        const lat = camara.latitude;
        const lng = camara.longitude;

        if (!lat || !lng) return null;

        return (
          <Marker
            key={camara.id || idx}
            position={[lat, lng]}
            icon={crearIconoVecinalModerno(camara.brand, zoomNivel)}
          >
            <Popup maxWidth={260} className="custom-popup-vecinal">
              <PopupContent camara={camara} />
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaCamarasVecinales;
