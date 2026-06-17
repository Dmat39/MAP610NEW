import React, { useRef, useEffect } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils/logger.js';

// Configuración del icono personalizado para búsquedas
const iconoBusqueda = new L.Icon({
  iconUrl: '/icon/robo.png', // Reutilizando icono existente
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const CapaBusquedaDirecciones = ({ visible, resultados = [], resultadoSeleccionado = null }) => {
  const map = useMap();
  const marcadoresRef = useRef([]);

  // Función para limpiar marcadores existentes
  const limpiarMarcadores = () => {
    marcadoresRef.current.forEach(marcador => {
      if (map.hasLayer(marcador)) {
        map.removeLayer(marcador);
      }
    });
    marcadoresRef.current = [];
  };

  // Función para crear marcadores de resultados
  const crearMarcadores = resultadosData => {
    limpiarMarcadores();

    if (!resultadosData || resultadosData.length === 0) return;

    // Filtrar resultados según la selección
    const resultadosAMostrar = resultadoSeleccionado
      ? resultadosData.filter(resultado => resultado.id === resultadoSeleccionado)
      : resultadosData;

    logger.log(
      `📌 Creando ${resultadosAMostrar.length} marcadores${resultadoSeleccionado ? ` (solo resultado seleccionado: ${resultadoSeleccionado})` : ''}`
    );

    resultadosAMostrar.forEach((resultado, index) => {
      logger.log(`📌 Creando marcador ${index + 1}:`, resultado.direccion);

      // Crear marcador
      const marcador = L.marker([resultado.lat, resultado.lng], {
        icon: iconoBusqueda,
      });

      // Contenido del popup - agregar indicador si está seleccionado
      const popupContent = `
        <div style="font-size: 13px; max-width: 300px;">
          <strong>📍 Resultado de Búsqueda${resultadoSeleccionado === resultado.id ? ' ✅' : ''}</strong><br/>
          <strong>Dirección:</strong> ${resultado.direccion}<br/>
          <strong>Tipo:</strong> ${resultado.tipo}<br/>
          <strong>Categoría:</strong> ${resultado.categoria}<br/>
          <strong>Coordenadas:</strong><br/>
          Lat: ${resultado.lat.toFixed(6)}<br/>
          Lng: ${resultado.lng.toFixed(6)}<br/>
          ${resultado.detalles.country ? `<strong>País:</strong> ${resultado.detalles.country}<br/>` : ''}
          ${resultado.detalles.state ? `<strong>Región:</strong> ${resultado.detalles.state}<br/>` : ''}
          ${resultado.detalles.city ? `<strong>Ciudad:</strong> ${resultado.detalles.city}<br/>` : ''}
          ${resultado.detalles.postcode ? `<strong>Código Postal:</strong> ${resultado.detalles.postcode}<br/>` : ''}
        </div>
      `;

      marcador.bindPopup(popupContent);

      // Tooltip con dirección resumida
      const direccionCorta =
        resultado.direccion.length > 50
          ? resultado.direccion.substring(0, 50) + '...'
          : resultado.direccion;

      const tooltipText =
        resultadoSeleccionado === resultado.id ? `✅ ${direccionCorta}` : `📍 ${direccionCorta}`;

      marcador.bindTooltip(tooltipText, {
        direction: 'top',
        offset: [0, -32],
        opacity: 0.9,
      });

      // Agregar al mapa
      marcador.addTo(map);
      marcadoresRef.current.push(marcador);
    });

    // Centrar mapa según la selección
    if (resultadosAMostrar.length > 0) {
      if (resultadoSeleccionado) {
        // Si hay selección específica, centrar en ese resultado con más zoom
        const resultadoSeleccionadoData = resultadosAMostrar[0];
        map.setView([resultadoSeleccionadoData.lat, resultadoSeleccionadoData.lng], 18);
      } else {
        // Si no hay selección, centrar en el primer resultado con zoom normal
        const primerResultado = resultadosAMostrar[0];
        map.setView([primerResultado.lat, primerResultado.lng], 16);
      }
    }
  };

  // Efecto para crear marcadores cuando cambian los resultados o la selección
  useEffect(() => {
    if (visible && resultados.length > 0) {
      crearMarcadores(resultados);
    } else {
      limpiarMarcadores();
    }
  }, [visible, resultados, resultadoSeleccionado]);

  // Limpiar marcadores cuando la visibilidad cambie
  useEffect(() => {
    if (!visible) {
      limpiarMarcadores();
    }
  }, [visible]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      limpiarMarcadores();
    };
  }, []);

  if (!visible) return null;

  return (
    <LayerGroup>
      {/* Los marcadores se crean directamente con L.marker y se agregan al mapa */}
    </LayerGroup>
  );
};

export default React.memo(CapaBusquedaDirecciones);
