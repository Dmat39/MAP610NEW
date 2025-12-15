// CapaParaderosAutorizados.jsx
import { useEffect, useState } from "react";
import { Marker, Popup, Tooltip, LayerGroup } from "react-leaflet";
import L from "leaflet";

const API_URL = import.meta.env.VITE_API_URL;

const iconoParaderoAutorizado = new L.Icon({
  iconUrl: "/icon/motoa.png",
  iconSize: [16, 16],
  iconAnchor: [6, 16],
  popupAnchor: [0, -26],
});

const CapaParaderosAutorizados = ({ visible }) => {
  const [data, setData] = useState([]);

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
            icon={iconoParaderoAutorizado}
          >
            <Popup>
              <div style={{ fontSize: "13px" }}>
                <strong>🛵 Paradero Autorizado</strong><br />
                {item.name || "Sin nombre"}
              </div>
            </Popup>
            <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
              {item.name || "Paradero"}
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
};

export default CapaParaderosAutorizados;
