import { useEffect, useState } from "react";
import { LayerGroup, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import ClipLoader from "react-spinners/ClipLoader";
import { Trash2, Recycle } from "lucide-react";
import "./CapaResiduos.css";

const API_URL = import.meta.env.VITE_API_URL;

// Función mejorada para crear iconos usando Lucide React
const createLucideIcon = (IconComponent, color, bgColor) => {
  // Crear elemento HTML del marcador
  const iconDiv = document.createElement('div');
  iconDiv.className = 'lucide-residuos-marker';
  iconDiv.innerHTML = `
    <div style="
      width: 32px;
      height: 32px;
      background-color: ${bgColor};
      border: 3px solid ${color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      <div style="
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 10px solid ${color};
      "></div>
    </div>
  `;
  
  // Agregar el icono SVG directamente
  const iconContainer = iconDiv.querySelector('div');
  const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgIcon.setAttribute('width', '18');
  svgIcon.setAttribute('height', '18');
  svgIcon.setAttribute('viewBox', '0 0 24 24');
  svgIcon.setAttribute('fill', 'none');
  svgIcon.setAttribute('stroke', color);
  svgIcon.setAttribute('stroke-width', '2.5');
  svgIcon.setAttribute('stroke-linecap', 'round');
  svgIcon.setAttribute('stroke-linejoin', 'round');
  svgIcon.style.zIndex = '2';
  svgIcon.style.position = 'relative';
  
  // Diferentes paths según el tipo de icono
  if (IconComponent === Recycle) {
    svgIcon.innerHTML = '<path d="m7 21-3-3 3-3"/><path d="m21 21-3-3 3-3"/><path d="M4.5 12.5L2 10l-2 2.5"/><path d="M19.5 12.5L22 10l2 2.5"/><path d="M10 16.5V21l-4-2.5L10 16.5Z"/><path d="M14 16.5V21l4-2.5L14 16.5Z"/><path d="M8 8.5h8"/>';
  } else if (IconComponent === Trash2) {
    svgIcon.innerHTML = '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>';
  }
  
  iconContainer.appendChild(svgIcon);
  
  return L.divIcon({
    html: iconDiv.innerHTML,
    className: 'custom-lucide-residuos',
    iconSize: [32, 42],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38],
  });
};

// Crear iconos específicos para cada tipo
const iconVerde = createLucideIcon(Recycle, '#198754', '#d1e7dd');
const iconAmarillo = createLucideIcon(Trash2, '#fd7e14', '#fff3cd');

const CapaResiduos = ({ visible }) => {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPuntos([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const response = await fetch(`${API_URL}waste?page=0`, { headers });
        const responseData = await response.json();

        let datos = [];
        if (Array.isArray(responseData)) {
          datos = responseData;
        } else if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
          datos = responseData.data.data;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          datos = responseData.data;
        }

        setPuntos(datos);
      } catch (error) {
        console.error("Error fetching residuos data:", error);
        setPuntos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [visible]);

  if (!visible) return null;

  if (loading) {
    return (
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "20px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}>
        <ClipLoader color="#28a745" size={20} />
        <span>Cargando puntos de residuos...</span>
      </div>
    );
  }

  return (
    <LayerGroup>
      {puntos.map((punto, idx) => {
        const lat = parseFloat(punto.latitude || punto.lat || punto.latitud);
        const lng = parseFloat(punto.longitude || punto.lng || punto.longitud);

        if (isNaN(lat) || isNaN(lng)) return null;

        const tipo = punto.type || punto.id_tipo || 'amarillo';
        const icon = tipo === 'verde' ? iconVerde : iconAmarillo;
        const colorTexto = tipo === 'verde' ? '#28a745' : '#ffc107';
        const nombre = punto.name || punto.nombre || 'Sin nombre';

        return (
          <Marker
            key={punto.id || `residuo-${idx}-${nombre}`}
            position={[lat, lng]}
            icon={icon}
          >
            <Popup>
              <div className="residuos-popup" style={{ maxWidth: "280px" }}>
                <div className="header" style={{ color: colorTexto }}>
                  🗑️ Punto Crítico de Residuos
                </div>
                <div className="divider" style={{ backgroundColor: colorTexto }}></div>

                <div className="info-row">
                  <span className="label">Código:</span>
                  <span style={{ color: colorTexto, fontWeight: 'bold' }}>
                    {nombre}
                  </span>
                </div>

                <div className="info-row">
                  <span className="label">Tipo:</span>
                  <span className="badge" style={{
                    backgroundColor: colorTexto,
                    color: 'white'
                  }}>
                    {tipo}
                  </span>
                </div>

                {punto.description && (
                  <div className="info-row">
                    <span className="label">Descripción:</span>
                    <span>{punto.description}</span>
                  </div>
                )}

                <div className="coordinates">
                  <strong>📍 Coordenadas:</strong><br />
                  Lat: {lat.toFixed(6)} | Lng: {lng.toFixed(6)}
                </div>
              </div>
            </Popup>
            <Tooltip
              direction="top"
              offset={[0, -25]}
              opacity={0.95}
              className={`residuos-tooltip ${tipo}`}
            >
              <div style={{
                fontSize: "11px",
                fontWeight: "bold",
                color: colorTexto,
                textAlign: 'center',
                lineHeight: '1.2'
              }}>
                <div>{nombre}</div>
                <div style={{
                  fontSize: "9px",
                  textTransform: "uppercase",
                  marginTop: "2px",
                  opacity: 0.8
                }}>
                  {tipo}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaResiduos; 