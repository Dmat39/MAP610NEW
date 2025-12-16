import L from 'leaflet';

/**
 * Crea un icono SVG adaptativo que se ajusta al nivel de zoom del mapa
 * @param {Object} options - Opciones del icono
 * @param {string} options.svgContent - Contenido SVG del icono
 * @param {string} options.color - Color principal del icono
 * @param {string} options.bgColor - Color de fondo
 * @param {number} options.baseSize - Tamaño base del icono
 * @returns {L.DivIcon} - Icono de Leaflet
 */
export const createAdaptiveIcon = ({
  svgContent,
  color,
  bgColor,
  baseSize = 36,
  strokeWidth = 2,
  shadowColor = 'rgba(0, 0, 0, 0.15)',
  borderWidth = 3
}) => {
  const iconHtml = `
    <div class="adaptive-marker-container" style="
      width: ${baseSize}px;
      height: ${baseSize}px;
      position: relative;
      pointer-events: auto;
      filter: none;
    ">
      <div class="marker-circle" style="
        width: 100%;
        height: 100%;
        background: ${bgColor};
        border: ${borderWidth}px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px ${shadowColor};
        transition: all 0.3s ease;
        cursor: pointer;
        overflow: hidden;
        filter: none;
      ">
        <svg
          width="${baseSize * 0.55}"
          height="${baseSize * 0.55}"
          viewBox="0 0 24 24"
          fill="none"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="pointer-events: none; filter: none;"
        >
          ${svgContent}
        </svg>
      </div>
      <div class="marker-pin" style="
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 12px solid ${color};
        pointer-events: none;
        filter: none;
        box-shadow: none;
      "></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-adaptive-marker leaflet-marker-icon',
    iconSize: [baseSize, baseSize + 12],
    iconAnchor: [baseSize / 2, baseSize + 8],
    popupAnchor: [0, -(baseSize + 8)],
  });
};

/**
 * Hook personalizado para obtener el tamaño del icono según el nivel de zoom
 * @param {Object} map - Instancia del mapa de Leaflet
 * @param {number} minSize - Tamaño mínimo del icono
 * @param {number} maxSize - Tamaño máximo del icono
 * @returns {number} - Tamaño calculado
 */
export const getIconSizeForZoom = (zoom, minSize = 24, maxSize = 48) => {
  // Zoom típico: 10-18
  // Escala lineal entre minSize y maxSize
  const minZoom = 10;
  const maxZoom = 18;

  if (zoom <= minZoom) return minSize;
  if (zoom >= maxZoom) return maxSize;

  const ratio = (zoom - minZoom) / (maxZoom - minZoom);
  return Math.round(minSize + (maxSize - minSize) * ratio);
};

// SVG PATHS para diferentes tipos de iconos

export const SVG_PATHS = {
  // Paradero Autorizado - Mototaxi detallado
  MOTO_AUTORIZADO: `
    <!-- Rueda trasera -->
    <circle cx="6" cy="17" r="2.5" fill="none" stroke-width="2"/>
    <circle cx="6" cy="17" r="1" fill="currentColor"/>

    <!-- Rueda delantera -->
    <circle cx="18" cy="17" r="2.5" fill="none" stroke-width="2"/>
    <circle cx="18" cy="17" r="1" fill="currentColor"/>

    <!-- Cabina/techo -->
    <path d="M8 9 L10 7 L14 7 L16 9 L16 12 L8 12 Z" fill="currentColor" opacity="0.3" stroke-width="1.5"/>

    <!-- Estructura del chasis -->
    <path d="M6 17 L8 13 L10 11" stroke-width="2" stroke-linecap="round"/>
    <path d="M18 17 L16 13 L14 11" stroke-width="2" stroke-linecap="round"/>
    <line x1="10" y1="11" x2="14" y2="11" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Asiento -->
    <rect x="10" y="10" width="4" height="2" rx="1" fill="currentColor" opacity="0.5"/>

    <!-- Manubrio -->
    <path d="M13 11 L13.5 8" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="12" y1="8" x2="15" y2="8" stroke-width="2" stroke-linecap="round"/>
  `,

  // Paradero No Autorizado - Mototaxi con prohibición
  MOTO_NO_AUTORIZADO: `
    <!-- Mototaxi simplificado -->
    <circle cx="7" cy="16" r="2" fill="none" stroke-width="1.8"/>
    <circle cx="17" cy="16" r="2" fill="none" stroke-width="1.8"/>

    <!-- Cabina pequeña -->
    <path d="M9 10 L10 8 L14 8 L15 10 L15 13 L9 13 Z" fill="currentColor" opacity="0.2" stroke-width="1.5"/>
    <line x1="10" y1="13" x2="7" y2="16" stroke-width="1.8"/>
    <line x1="14" y1="13" x2="17" y2="16" stroke-width="1.8"/>

    <!-- Señal de prohibición grande -->
    <circle cx="12" cy="12" r="10" stroke-width="3"/>
    <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" stroke-width="3.5" stroke-linecap="round"/>
  `,

  // Defensa Civil - Edificio con escudo
  DEFENSA_CIVIL: `
    <path d="M3 21h18"/>
    <path d="M5 21V7l7-4 7 4v14"/>
    <path d="M9 9h6v6H9z"/>
    <path d="M12 3v3"/>
    <path d="M12 15c-1.5 0-2.5-1-2.5-2.5S10.5 10 12 10s2.5 1 2.5 2.5S13.5 15 12 15z"/>
    <circle cx="12" cy="12.5" r="0.5" fill="currentColor"/>
  `,

  // Residuos Sólidos - Basurero mejorado
  RESIDUOS: `
    <path d="M3 6h18"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  `,

  // Residuos Reciclables
  RESIDUOS_RECICLAR: `
    <path d="M7 19H6.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 12.6"/>
    <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/>
    <path d="m14 16-3 3 3 3"/>
    <path d="M8.293 13.596 7.196 15.5"/>
    <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/>
    <path d="m13.378 9.633 4.096 1.492"/>
    <path d="M6.308 15.5H10"/>
  `,

  // Sostenimiento - Tienda
  SOSTENIMIENTO: `
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
    <path d="M9 22V12h6v10"/>
    <path d="M8 6h8"/>
    <path d="M6 6h1"/>
    <path d="M17 6h1"/>
    <circle cx="10" cy="16" r="0.5" fill="currentColor"/>
    <circle cx="14" cy="16" r="0.5" fill="currentColor"/>
  `,
};

// Funciones helper para crear iconos específicos

export const createParaderoAutorizadoIcon = (size = 36) => {
  return createAdaptiveIcon({
    svgContent: SVG_PATHS.MOTO_AUTORIZADO,
    color: '#28a745',
    bgColor: '#d4edda',
    baseSize: size,
    strokeWidth: 2.5,
    borderWidth: 3,
  });
};

export const createParaderoNoAutorizadoIcon = (size = 36) => {
  return createAdaptiveIcon({
    svgContent: SVG_PATHS.MOTO_NO_AUTORIZADO,
    color: '#dc3545',
    bgColor: '#f8d7da',
    baseSize: size,
    strokeWidth: 2.8,
    borderWidth: 3,
  });
};

export const createDefensaCivilIcon = (size = 36) => {
  return createAdaptiveIcon({
    svgContent: SVG_PATHS.DEFENSA_CIVIL,
    color: '#007bff',
    bgColor: '#cfe2ff',
    baseSize: size,
    strokeWidth: 2.3,
    borderWidth: 3,
  });
};

export const createResiduosIcon = (size = 36, tipo = 'amarillo') => {
  const configs = {
    verde: {
      svgContent: SVG_PATHS.RESIDUOS_RECICLAR,
      color: '#198754',
      bgColor: '#d1e7dd',
    },
    amarillo: {
      svgContent: SVG_PATHS.RESIDUOS,
      color: '#ffc107',
      bgColor: '#fff3cd',
    },
  };

  const config = configs[tipo] || configs.amarillo;

  return createAdaptiveIcon({
    ...config,
    baseSize: size,
    strokeWidth: 2.5,
    borderWidth: 3,
  });
};

export const createSostenimientoIcon = (size = 36) => {
  return createAdaptiveIcon({
    svgContent: SVG_PATHS.SOSTENIMIENTO,
    color: '#6f42c1',
    bgColor: '#e0cffc',
    baseSize: size,
    strokeWidth: 2.3,
    borderWidth: 3,
  });
};

// CSS para animaciones (debe ser agregado globalmente)
export const ADAPTIVE_ICON_STYLES = `
  .custom-adaptive-marker {
    background: transparent !important;
    border: none !important;
  }

  .adaptive-marker-container .marker-circle:hover {
    transform: scale(1.15);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }

  .adaptive-marker-container {
    animation: markerPulse 2s ease-in-out infinite;
  }

  @keyframes markerPulse {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
`;
