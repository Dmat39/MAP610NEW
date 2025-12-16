import { useEffect, useState } from "react";
import camarasVecinalesService from "../../services/camarasVecinalesService";

const GoogleCapaCamarasVecinales = ({ visible, map, google }) => {
  const [camaras, setCamaras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [markers, setMarkers] = useState([]);

  // Cargar cámaras desde el backend
  useEffect(() => {
    const cargarCamaras = async () => {
      try {
        setCargando(true);
        setErrorCarga(null);

        const resultado = await camarasVecinalesService.getCamarasVecinales();
        console.log(`✅ ${resultado.count} cámaras vecinales cargadas desde el backend`);

        setCamaras(resultado.camaras);
        setCargando(false);
      } catch (err) {
        console.error('Error cargando cámaras vecinales:', err);
        setErrorCarga(err.message);
        setCargando(false);

        // Si hay error de autenticación, no intentar recargar
        if (err.message.includes('Sesión expirada') || err.message.includes('autenticación')) {
          console.warn('⚠️ Error de autenticación. Por favor, inicia sesión nuevamente.');
        }
      }
    };

    cargarCamaras();
  }, []);

  useEffect(() => {
    if (!map || !google || !visible) {
      // Limpiar markers si no visible
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
      return;
    }

    // Limpiar markers anteriores
    markers.forEach(marker => marker.setMap(null));

    const newMarkers = [];

    camaras.forEach((camara) => {
      const lat = camara.latitude;
      const lng = camara.longitude;

      if (!lat || !lng) return;

      // Determinar icono según la marca
      let iconUrl = "/icon/camerav.png"; // HikVision por defecto
      if (camara.brand === "DAHUA") {
        iconUrl = "/icon/camerav2.png";
      }

      // Crear marker
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(26, 26),
          anchor: new google.maps.Point(13, 26)
        }
      });

      // Info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-size: 13px;">
            <strong>📹 Cámara Vecinal</strong><br />
            Dirección: ${camara.address}<br />
            Marca: ${camara.brand}<br />
            Modo: ${camara.mode}<br />
            Vecino: ${camara.neighbor}
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Cleanup function
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, google, visible, camaras]);

  return null; // Este componente no renderiza JSX
};

export default GoogleCapaCamarasVecinales;
