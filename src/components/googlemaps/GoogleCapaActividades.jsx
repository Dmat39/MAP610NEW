import { useEffect, useState, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const GoogleCapaActividades = ({ visible, map, google }) => {
  const [puntos, setPuntos] = useState([]);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (!map || !google || infoWindowRef.current) return;

    infoWindowRef.current = new google.maps.InfoWindow();

    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [map, google]);

  useEffect(() => {
    if (!visible) {
      setPuntos([]);
      return;
    }

    const token = localStorage.getItem('token');

    fetch(`${API_URL}activity?page=0`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Respuesta no válida');
        return res.json();
      })
      .then(responseData => {
        let datos = [];

        if (Array.isArray(responseData)) {
          datos = responseData;
        } else if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
          datos = responseData.data.data;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          datos = responseData.data;
        } else if (responseData?.content && Array.isArray(responseData.content)) {
          datos = responseData.content;
        }

        setPuntos(datos);
      })
      .catch(err => {
        console.error('Error cargando actividades:', err);
        setPuntos([]);
      });
  }, [visible]);

  useEffect(() => {
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current = [];

    if (!map || !google || !visible || puntos.length === 0 || !infoWindowRef.current) {
      return;
    }

    puntos.forEach((punto) => {
      const lat = parseFloat(punto.latitude || punto.lat);
      const lng = parseFloat(punto.longitude || punto.lng);

      if (isNaN(lat) || isNaN(lng)) return;

      const svgMarker = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#d97706',
        fillOpacity: 1,
        strokeColor: '#92400e',
        strokeWeight: 2,
        scale: 8,
      };

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: svgMarker,
        title: `${punto.act_type || 'Actividad'} - ${punto.description || ''}`,
      });

      const infoContent = `
        <div style="font-size: 13px; max-width: 280px; font-family: Arial, sans-serif;">
          <strong style="color: #d97706;">Actividad</strong><br/>
          ${punto.act_type ? `<strong>Tipo:</strong> <span style="color: #d97706; font-weight: bold;">${punto.act_type}</span><br/>` : ''}
          ${punto.description ? `<strong>Descripción:</strong> ${punto.description}<br/>` : ''}
          ${punto.address ? `<strong>Dirección:</strong> ${punto.address}<br/>` : ''}
          ${punto.representative ? `<strong>Representante:</strong> ${punto.representative}<br/>` : ''}
          ${punto.done_at ? `<strong>Fecha:</strong> ${punto.done_at.split('T')[0]}<br/>` : ''}
        </div>
      `;

      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, marker);
        }
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, [map, google, visible, puntos]);

  useEffect(() => {
    if (!visible) {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current = [];

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    }
  }, [visible]);

  return null;
};

export default GoogleCapaActividades;
