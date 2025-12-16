import { useEffect, useState } from "react";
import { LayerGroup, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import ClipLoader from "react-spinners/ClipLoader";
import "./CapaResiduos.css";
import { createResiduosIcon, getIconSizeForZoom } from "../../../utils/adaptiveIcons";

const API_URL = import.meta.env.VITE_API_URL;

const CapaResiduos = ({ visible }) => {
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(false);
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

  // Calcular tamaño del icono según el zoom
  const iconSize = getIconSizeForZoom(currentZoom, 32, 50);

  return (
    <LayerGroup>
      {puntos.map((punto, idx) => {
        const lat = parseFloat(punto.latitude || punto.lat || punto.latitud);
        const lng = parseFloat(punto.longitude || punto.lng || punto.longitud);

        if (isNaN(lat) || isNaN(lng)) return null;

        const tipo = punto.type || punto.id_tipo || 'amarillo';
        const colorTexto = tipo === 'verde' ? '#198754' : '#ffc107';
        const nombre = punto.name || punto.nombre || 'Sin nombre';

        return (
          <Marker
            key={punto.id || `residuo-${idx}-${nombre}`}
            position={[lat, lng]}
            icon={createResiduosIcon(iconSize, tipo)}
          >
            <Popup>
              <div className="residuos-popup" style={{ maxWidth: "300px" }}>
                <div className="header" style={{
                  color: colorTexto,
                  borderBottom: `2px solid ${colorTexto}`,
                  paddingBottom: "8px",
                  marginBottom: "12px",
                  fontSize: "15px",
                  fontWeight: "bold"
                }}>
                  🗑️ Punto Crítico de Residuos
                </div>

                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <span className="label" style={{ fontWeight: "600" }}>Código:</span>
                  <span style={{ color: colorTexto, fontWeight: 'bold', marginLeft: "6px" }}>
                    {nombre}
                  </span>
                </div>

                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <span className="label" style={{ fontWeight: "600" }}>Tipo:</span>
                  <span className="badge" style={{
                    backgroundColor: colorTexto,
                    color: 'white',
                    padding: "3px 10px",
                    borderRadius: "5px",
                    fontSize: "12px",
                    fontWeight: "500",
                    marginLeft: "6px",
                    display: "inline-block"
                  }}>
                    {tipo}
                  </span>
                </div>

                {punto.description && (
                  <div className="info-row" style={{ marginBottom: "8px" }}>
                    <span className="label" style={{ fontWeight: "600" }}>Descripción:</span>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      {punto.description}
                    </div>
                  </div>
                )}

                <div className="coordinates" style={{
                  fontSize: "11px",
                  color: "#888",
                  marginTop: "10px",
                  paddingTop: "8px",
                  borderTop: "1px solid #eee"
                }}>
                  <strong>📍 Coordenadas:</strong><br />
                  Lat: {lat.toFixed(6)} | Lng: {lng.toFixed(6)}
                </div>
              </div>
            </Popup>
            <Tooltip
              direction="top"
              offset={[0, -(iconSize / 2 + 10)]}
              opacity={0.95}
              className={`residuos-tooltip ${tipo}`}
            >
              <div style={{
                fontSize: "12px",
                fontWeight: "600",
                color: colorTexto,
                textAlign: 'center',
                lineHeight: '1.3'
              }}>
                <div>{nombre}</div>
                <div style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  marginTop: "3px",
                  opacity: 0.85
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