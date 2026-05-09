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
  // Paradero Autorizado - Bus/Autobús moderno
  MOTO_AUTORIZADO: `
    <!-- Cuerpo principal del bus -->
    <rect x="4" y="8" width="16" height="9" rx="1.5" fill="currentColor" opacity="0.9" stroke-width="2"/>

    <!-- Parabrisas frontal -->
    <path d="M4 10 L6 8.5 L8 8.5 L8 10 Z" fill="white" opacity="0.6" stroke="none"/>

    <!-- Ventanas del bus -->
    <rect x="6" y="9.5" width="2.5" height="3" rx="0.3" fill="white" opacity="0.7" stroke="none"/>
    <rect x="9" y="9.5" width="2.5" height="3" rx="0.3" fill="white" opacity="0.7" stroke="none"/>
    <rect x="12" y="9.5" width="2.5" height="3" rx="0.3" fill="white" opacity="0.7" stroke="none"/>
    <rect x="15.5" y="9.5" width="2" height="3" rx="0.3" fill="white" opacity="0.7" stroke="none"/>

    <!-- Faros delanteros -->
    <circle cx="5" cy="16" r="0.4" fill="white" opacity="0.9"/>
    <circle cx="19" cy="16" r="0.4" fill="white" opacity="0.9"/>

    <!-- Rueda trasera -->
    <circle cx="7" cy="18" r="2" fill="white" stroke-width="2.2"/>
    <circle cx="7" cy="18" r="0.8" fill="currentColor"/>

    <!-- Rueda delantera -->
    <circle cx="17" cy="18" r="2" fill="white" stroke-width="2.2"/>
    <circle cx="17" cy="18" r="0.8" fill="currentColor"/>

    <!-- Parachoques inferior -->
    <rect x="4" y="16.5" width="16" height="0.8" rx="0.4" fill="currentColor" opacity="0.7" stroke="none"/>

    <!-- Detalles laterales -->
    <line x1="5.5" y1="13" x2="18.5" y2="13" stroke="white" stroke-width="0.5" opacity="0.4"/>
  `,

  // Paradero No Autorizado - Bus con señal de prohibición
  MOTO_NO_AUTORIZADO: `
    <!-- Bus amarillo/naranja de fondo -->
    <!-- Cuerpo principal del bus -->
    <rect x="5" y="9" width="14" height="8" rx="1.2" fill="#FFA726" opacity="0.9" stroke="#F57C00" stroke-width="1.5"/>

    <!-- Parabrisas frontal -->
    <path d="M5 11 L6.5 9.5 L8 9.5 L8 11 Z" fill="white" opacity="0.5" stroke="none"/>

    <!-- Ventanas del bus -->
    <rect x="6.5" y="10" width="2" height="2.5" rx="0.2" fill="#90CAF9" opacity="0.6" stroke="none"/>
    <rect x="9" y="10" width="2" height="2.5" rx="0.2" fill="#90CAF9" opacity="0.6" stroke="none"/>
    <rect x="11.5" y="10" width="2" height="2.5" rx="0.2" fill="#90CAF9" opacity="0.6" stroke="none"/>
    <rect x="14" y="10" width="2" height="2.5" rx="0.2" fill="#90CAF9" opacity="0.6" stroke="none"/>

    <!-- Rueda trasera -->
    <circle cx="8" cy="18" r="1.8" fill="#424242" stroke="#212121" stroke-width="1.5"/>
    <circle cx="8" cy="18" r="0.6" fill="#757575"/>

    <!-- Rueda delantera -->
    <circle cx="16" cy="18" r="1.8" fill="#424242" stroke="#212121" stroke-width="1.5"/>
    <circle cx="16" cy="18" r="0.6" fill="#757575"/>

    <!-- Parachoques -->
    <rect x="5" y="16.5" width="14" height="0.6" rx="0.3" fill="#F57C00" opacity="0.8" stroke="none"/>

    <!-- Círculo rojo de prohibición grande -->
    <circle cx="12" cy="12" r="10.5" fill="none" stroke="#D32F2F" stroke-width="2.8"/>

    <!-- Barra diagonal de prohibición -->
    <line x1="4" y1="4" x2="20" y2="20" stroke="#D32F2F" stroke-width="3.2" stroke-linecap="round"/>
  `,

  // Defensa Civil - Escudo con cruz médica
  DEFENSA_CIVIL: `
    <!-- Escudo exterior -->
    <path d="M12 2 L4 6 L4 11 C4 16 7 20 12 22 C17 20 20 16 20 11 L20 6 Z"
          fill="currentColor"
          opacity="0.85"
          stroke="currentColor"
          stroke-width="1.5"/>

    <!-- Línea divisoria central vertical del escudo -->
    <line x1="12" y1="3" x2="12" y2="21" stroke="white" stroke-width="1.2" opacity="0.5"/>

    <!-- Cruz médica - barra horizontal -->
    <rect x="7" y="10" width="10" height="3" rx="0.5" fill="white" stroke="none"/>

    <!-- Cruz médica - barra vertical -->
    <rect x="10.5" y="7.5" width="3" height="10" rx="0.5" fill="white" stroke="none"/>

    <!-- Borde interior del escudo para más definición -->
    <path d="M12 3.5 L5 7 L5 11 C5 15.5 7.5 19 12 20.8 C16.5 19 19 15.5 19 11 L19 7 Z"
          fill="none"
          stroke="white"
          stroke-width="1.2"
          opacity="0.6"/>
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

  // Comisaría - Escudo policial con estrella
  COMISARIA: `
    <!-- Cuerpo principal del escudo/badge policial -->
    <path d="M12 2 L20 5.5 L20 13 C20 18 16.5 22 12 23 C7.5 22 4 18 4 13 L4 5.5 Z"
          fill="currentColor" opacity="0.92"/>

    <!-- Borde interior del escudo -->
    <path d="M12 3.5 L19 6.5 L19 13 C19 17.5 16 21 12 22 C8 21 5 17.5 5 13 L5 6.5 Z"
          fill="none" stroke="white" stroke-width="0.9" opacity="0.55"/>

    <!-- Franja superior (ribete del badge) -->
    <path d="M4 5.5 L12 2 L20 5.5 L20 7.5 L4 7.5 Z"
          fill="white" opacity="0.18"/>

    <!-- Estrella de 5 puntas centrada en el escudo -->
    <polygon points="12,5.5 13.1,8.5 16.3,8.6 13.7,10.6 14.7,13.6 12,11.8 9.3,13.6 10.3,10.6 7.7,8.6 10.9,8.5"
             fill="white" opacity="0.95"/>

    <!-- Línea divisoria central -->
    <line x1="5" y1="15.5" x2="19" y2="15.5" stroke="white" stroke-width="0.8" opacity="0.4"/>

    <!-- Detalle inferior (placa/número) -->
    <rect x="9" y="17" width="6" height="2" rx="0.8" fill="white" opacity="0.35"/>
  `,

  // Actividades - Calendario/Evento
  ACTIVIDADES: `
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <path d="M8 14h.01"/>
    <path d="M12 14h.01"/>
    <path d="M16 14h.01"/>
    <path d="M8 18h.01"/>
    <path d="M12 18h.01"/>
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
    color: '#1565C0',
    bgColor: '#E3F2FD',
    baseSize: size,
    strokeWidth: 2.5,
    borderWidth: 4,
  });
};

export const createParaderoNoAutorizadoIcon = (size = 36) => {
  return createAdaptiveIcon({
    svgContent: SVG_PATHS.MOTO_NO_AUTORIZADO,
    color: '#616161',
    bgColor: '#FAFAFA',
    baseSize: size,
    strokeWidth: 2.8,
    borderWidth: 4,
  });
};

export const createDefensaCivilIcon = (size = 36) => {
  return createAdaptiveIcon({
    svgContent: SVG_PATHS.DEFENSA_CIVIL,
    color: '#FF8C42',
    bgColor: '#FFF3E0',
    baseSize: size,
    strokeWidth: 2.3,
    borderWidth: 3,
  });
};

export const createComisariaIcon = () => {
  const pinSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <!-- Sombra suave debajo del pin -->
      <ellipse cx="16" cy="43" rx="5" ry="1.8" fill="rgba(21,101,192,0.22)"/>
      <!-- Cuerpo del pin (teardrop) -->
      <path d="M16 1 C8 1 1 8 1 16 C1 25 10 36 16 43 C22 36 31 25 31 16 C31 8 24 1 16 1 Z"
            fill="#BBDEFB" stroke="#1565C0" stroke-width="2.2"/>
      <!-- Escudo policial dentro del pin -->
      <g transform="translate(5.5, 3) scale(0.875)">
        <path d="M12 2 L20 5.5 L20 13 C20 18 16.5 22 12 23 C7.5 22 4 18 4 13 L4 5.5 Z"
              fill="#1565C0" opacity="0.92"/>
        <path d="M12 3.5 L19 6.5 L19 13 C19 17.5 16 21 12 22 C8 21 5 17.5 5 13 L5 6.5 Z"
              fill="none" stroke="white" stroke-width="0.9" opacity="0.55"/>
        <path d="M4 5.5 L12 2 L20 5.5 L20 7.5 L4 7.5 Z"
              fill="white" opacity="0.18"/>
        <polygon points="12,5.5 13.1,8.5 16.3,8.6 13.7,10.6 14.7,13.6 12,11.8 9.3,13.6 10.3,10.6 7.7,8.6 10.9,8.5"
                 fill="white" opacity="0.95"/>
        <line x1="5" y1="15.5" x2="19" y2="15.5" stroke="white" stroke-width="0.8" opacity="0.4"/>
        <rect x="9" y="17" width="6" height="2" rx="0.8" fill="white" opacity="0.35"/>
      </g>
    </svg>`;

  return L.divIcon({
    html: `<div style="filter:none;line-height:0;">${pinSvg}</div>`,
    className: 'custom-adaptive-marker leaflet-marker-icon',
    iconSize: [32, 44],
    iconAnchor: [16, 43],
    popupAnchor: [0, -44],
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

export const createActividadesIcon = (size = 36) => {
  return createAdaptiveIcon({
    svgContent: SVG_PATHS.ACTIVIDADES,
    color: '#d97706',
    bgColor: '#fef3c7',
    baseSize: size,
    strokeWidth: 2.3,
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

// CSS para estilos (debe ser agregado globalmente)
export const ADAPTIVE_ICON_STYLES = `
  .custom-adaptive-marker {
    background: transparent !important;
    border: none !important;
  }

  .adaptive-marker-container .marker-circle:hover {
    transform: scale(1.15);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
`;
