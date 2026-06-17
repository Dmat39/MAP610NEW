import { useEffect, useState, memo } from "react";
import { LayerGroup, Marker, Popup, Tooltip } from "react-leaflet";
import ClipLoader from "react-spinners/ClipLoader";
import "./CapaResiduos.css";
import { createResiduosIcon } from "../../../utils/adaptiveIcons";

const API_URL = import.meta.env.VITE_API_URL;

// Tamaño fijo del icono (evita re-renders por zoom)
const ICON_SIZE = 36;

// Caché de iconos - se crean una sola vez
const iconoResiduosVerde = createResiduosIcon(ICON_SIZE, 'verde');
const iconoResiduosAmarillo = createResiduosIcon(ICON_SIZE, 'amarillo');

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

        // Pre-procesar coordenadas y tipos al cargar
        const datosProcesados = datos
          .map((punto, idx) => {
            const lat = parseFloat(punto.latitude || punto.lat || punto.latitud);
            const lng = parseFloat(punto.longitude || punto.lng || punto.longitud);

            if (isNaN(lat) || isNaN(lng)) return null;

            // Mapear el campo color del backend (GREEN, YELLOW) a tipo (verde, amarillo)
            let tipo = punto.type || punto.id_tipo || 'amarillo';
            if (punto.color) {
              tipo = punto.color === 'GREEN' ? 'verde' : 'amarillo';
            }

            return {
              ...punto,
              _lat: lat,
              _lng: lng,
              _tipo: tipo,
              _colorTexto: tipo === 'verde' ? '#198754' : '#ffc107',
              _nombre: punto.name || punto.nombre || 'Sin nombre',
              _id: punto.id || `residuo-${idx}`
            };
          })
          .filter(Boolean);

        setPuntos(datosProcesados);
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
      {puntos.map((punto) => (
        <Marker
          key={punto._id}
          position={[punto._lat, punto._lng]}
          icon={punto._tipo === 'verde' ? iconoResiduosVerde : iconoResiduosAmarillo}
        >
          <Popup>
            <div className="residuos-popup" style={{ maxWidth: "300px" }}>
              <div className="header" style={{
                color: punto._colorTexto,
                borderBottom: `2px solid ${punto._colorTexto}`,
                paddingBottom: "8px",
                marginBottom: "12px",
                fontSize: "15px",
                fontWeight: "bold"
              }}>
                🗑️ Punto Crítico de Residuos
              </div>

              <div className="info-row" style={{ marginBottom: "8px" }}>
                <span className="label" style={{ fontWeight: "600" }}>Código:</span>
                <span style={{ color: punto._colorTexto, fontWeight: 'bold', marginLeft: "6px" }}>
                  {punto._nombre}
                </span>
              </div>

              <div className="info-row" style={{ marginBottom: "8px" }}>
                <span className="label" style={{ fontWeight: "600" }}>Tipo:</span>
                <span className="badge" style={{
                  backgroundColor: punto._colorTexto,
                  color: 'white',
                  padding: "3px 10px",
                  borderRadius: "5px",
                  fontSize: "12px",
                  fontWeight: "500",
                  marginLeft: "6px",
                  display: "inline-block"
                }}>
                  {punto._tipo}
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
                Lat: {punto._lat.toFixed(6)} | Lng: {punto._lng.toFixed(6)}
              </div>
            </div>
          </Popup>
          <Tooltip
            direction="top"
            offset={[0, -28]}
            opacity={0.95}
            className={`residuos-tooltip ${punto._tipo}`}
          >
            <div style={{
              fontSize: "12px",
              fontWeight: "600",
              color: punto._colorTexto,
              textAlign: 'center',
              lineHeight: '1.3'
            }}>
              <div>{punto._nombre}</div>
              <div style={{
                fontSize: "10px",
                textTransform: "uppercase",
                marginTop: "3px",
                opacity: 0.85
              }}>
                {punto._tipo}
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </LayerGroup>
  );
};

export default memo(CapaResiduos); 