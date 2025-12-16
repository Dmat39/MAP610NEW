// CapaParaderosAutorizados.jsx
import { useEffect, useState } from "react";
import { Marker, Popup, Tooltip, LayerGroup, useMap } from "react-leaflet";
import { createParaderoAutorizadoIcon, getIconSizeForZoom } from "../../../utils/adaptiveIcons";

const API_URL = import.meta.env.VITE_API_URL;

const CapaParaderosAutorizados = ({ visible }) => {
  const [data, setData] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(13);
  const map = useMap();

  // Escuchar cambios de zoom
  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);
    setCurrentZoom(map.getZoom());

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  useEffect(() => {
    if (!visible) return;

    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    fetch(`${API_URL}stop?page=0&authorized=true`, { headers })
      .then((res) => res.json())
      .then((responseData) => {
        let datos = [];

        if (Array.isArray(responseData)) {
          datos = responseData;
        } else if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
          datos = responseData.data.data;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          datos = responseData.data;
        }

        setData(datos);
      })
      .catch((err) =>
        console.error("Error cargando paraderos autorizados:", err)
      );
  }, [visible]);

  if (!visible) return null;

  // Calcular tamaño del icono según el zoom
  const iconSize = getIconSizeForZoom(currentZoom, 28, 44);

  return (
    <LayerGroup>
      {data.map((item, idx) => {
        // Adaptado para la estructura del backend
        const lat = parseFloat(item.latitude || item.lat);
        const lng = parseFloat(item.longitude || item.lng);

        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <Marker
            key={item.id || idx}
            position={[lat, lng]}
            icon={createParaderoAutorizadoIcon(iconSize)}
          >
            <Popup>
              <div style={{ fontSize: "14px", maxWidth: "280px" }}>
                <div style={{
                  borderBottom: "2px solid #28a745",
                  paddingBottom: "8px",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#28a745"
                }}>
                  🛵 Paradero Autorizado
                </div>
                <div style={{ marginBottom: "6px" }}>
                  <strong>Nombre:</strong> {item.name || "Sin nombre"}
                </div>
                {item.description && (
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                    {item.description}
                  </div>
                )}
              </div>
            </Popup>
            <Tooltip
              direction="top"
              offset={[0, -(iconSize / 2 + 10)]}
              opacity={0.95}
              className="paradero-tooltip"
            >
              <div style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#28a745",
                textAlign: "center"
              }}>
                {item.name || "Paradero Autorizado"}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaParaderosAutorizados;
