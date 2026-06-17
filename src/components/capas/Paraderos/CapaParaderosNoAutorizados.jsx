// CapaParaderosNoAutorizados.jsx
import { useEffect, useState, memo } from "react";
import { Marker, Popup, Tooltip, LayerGroup } from "react-leaflet";
import { createParaderoNoAutorizadoIcon } from "../../../utils/adaptiveIcons";

const API_URL = import.meta.env.VITE_API_URL;

// Tamaño fijo del icono (evita re-renders por zoom)
const ICON_SIZE = 38;

// Caché del icono - se crea una sola vez
const iconoParaderoNoAutorizado = createParaderoNoAutorizadoIcon(ICON_SIZE);

const CapaParaderosNoAutorizados = ({ visible }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!visible) return;

    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    fetch(`${API_URL}stop?page=0&authorized=false`, { headers })
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

        // Pre-procesar coordenadas al cargar
        const datosProcesados = datos
          .map((item, idx) => {
            const lat = parseFloat(item.latitude || item.lat);
            const lng = parseFloat(item.longitude || item.lng);

            if (isNaN(lat) || isNaN(lng)) return null;

            return {
              ...item,
              _lat: lat,
              _lng: lng,
              _id: item.id || `paradero-no-auth-${idx}`
            };
          })
          .filter(Boolean);

        setData(datosProcesados);
      })
      .catch((err) =>
        console.error("Error cargando paraderos no autorizados:", err)
      );
  }, [visible]);

  if (!visible) return null;

  return (
    <LayerGroup>
      {data.map((item) => (
        <Marker
          key={item._id}
          position={[item._lat, item._lng]}
          icon={iconoParaderoNoAutorizado}
        >
          <Popup>
            <div style={{ fontSize: "14px", maxWidth: "280px" }}>
              <div style={{
                borderBottom: "2px solid #dc3545",
                paddingBottom: "8px",
                marginBottom: "8px",
                fontWeight: "bold",
                color: "#dc3545"
              }}>
                🚫 Paradero NO Autorizado
              </div>
              <div style={{ marginBottom: "6px" }}>
                <strong>ID:</strong> {item.name || "Sin nombre"}
              </div>
              <div style={{ marginBottom: "6px" }}>
                <strong>Descripción:</strong>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                  {item.description || "Sin detalle"}
                </div>
              </div>
            </div>
          </Popup>
          <Tooltip
            direction="top"
            offset={[0, -28]}
            opacity={0.95}
            className="paradero-no-autorizado-tooltip"
          >
            <div style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#dc3545",
              textAlign: "center"
            }}>
              {item.name || "Paradero NO Autorizado"}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </LayerGroup>
  );
};

export default memo(CapaParaderosNoAutorizados);
