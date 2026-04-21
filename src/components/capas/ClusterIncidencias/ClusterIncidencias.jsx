import React, { useState, useEffect, useRef } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils';
import { useMapContext } from '../../../context/MapContext';
import {
  realizarClustering,
  obtenerColorCluster,
  contarTiposPorCluster,
} from '../../../utils/clustering.utils.js';

const ClusterIncidencias = ({ visible, filtros = null }) => {
  const { radioCluster, tiposIncidenciasCluster, fechasClusters } = useMapContext();
  const [loading, setLoading] = useState(false);
  const map = useMap();
  const circlesRef = useRef([]);
  const abortControllerRef = useRef(null);

  const limpiarCirculos = () => {
    circlesRef.current.forEach(circle => {
      if (map.hasLayer(circle)) map.removeLayer(circle);
    });
    circlesRef.current = [];
  };

  const crearCirculosCluster = clustersData => {
    limpiarCirculos();

    clustersData.forEach(cluster => {
      const colores = obtenerColorCluster(cluster.cantidad);

      const circle = L.circle([cluster.centroide.lat, cluster.centroide.lng], {
        radius: cluster.radio,
        color: colores.color,
        fillColor: colores.fillColor,
        fillOpacity: colores.fillOpacity,
        weight: 3,
        opacity: 1,
        dashArray: '8,4',
      });

      const tiposStr = Object.entries(contarTiposPorCluster(cluster.puntos))
        .map(([tipo, cantidad]) => `${tipo}: ${cantidad}`)
        .join(' | ');

      circle.bindPopup(`
        <div style="font-size: 13px; max-width: 260px;">
          <strong>🎯 Cluster de Incidencias</strong><br/>
          <strong>Cantidad:</strong> ${cluster.cantidad} incidencias<br/>
          <strong>Radio:</strong> ${Math.round(cluster.radio)} metros<br/>
          <strong>Centroide:</strong><br/>
          Lat: ${cluster.centroide.lat.toFixed(6)}<br/>
          Lng: ${cluster.centroide.lng.toFixed(6)}<br/>
          <strong>Tipos:</strong><br/>
          ${tiposStr}
        </div>
      `);

      circle.bindTooltip(
        `<div style="font-size: 12px; font-weight: bold; text-align: center;">
          🎯 ${cluster.cantidad} incidencias<br/>
          ${Math.round(cluster.radio)}m radio
        </div>`,
        { direction: 'top', offset: [0, -10], opacity: 0.9 }
      );

      circle.addTo(map);
      circlesRef.current.push(circle);
    });
  };

  useEffect(() => {
    if (!visible) limpiarCirculos();
  }, [visible]);

  useEffect(() => {
    return () => {
      limpiarCirculos();
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const debounceTimer = setTimeout(() => {
      // Cancelar request anterior si existe
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);

      const buildURL = tipo => {
        const API_URL = import.meta.env.VITE_API_URL;
        if (!API_URL) throw new Error('VITE_API_URL no está configurada.');
        const params = new URLSearchParams();
        params.append('type', tipo);
        params.append('start', filtros?.fechaInicio || fechasClusters.fechaInicio);
        params.append('end', filtros?.fechaFin || fechasClusters.fechaFin);
        if (filtros?.Turno) params.append('shift', filtros.Turno);
        if (filtros?.Horario) params.append('schedule', filtros.Horario);
        if (filtros?.Jurisdiccion) params.append('jurisdiction', filtros.Jurisdiccion);
        return `${API_URL}incidence?${params.toString()}`;
      };

      const TOKEN = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

      const todasTipologias = [
        { tipo: 1, nombre: 'Robo',        key: 'robos' },
        { tipo: 2, nombre: 'Extorsión',   key: 'extorsiones' },
        { tipo: 3, nombre: 'Homicidio',   key: 'homicidios' },
        { tipo: 4, nombre: 'Feminicidio', key: 'feminicidios' },
        { tipo: 5, nombre: 'Sicariato',   key: 'sicariatos' },
        { tipo: 6, nombre: 'Secuestro',   key: 'secuestros' },
        { tipo: 7, nombre: 'Drogas',      key: 'drogas' },
        { tipo: 8, nombre: 'Barras',      key: 'barras' },
      ];

      const tipologias = todasTipologias.filter(t => tiposIncidenciasCluster[t.key]);

      Promise.all(
        tipologias.map(({ tipo, nombre }) =>
          fetch(buildURL(tipo), { headers, signal })
            .then(res => {
              if (!res.ok) throw new Error(`Error ${res.status} al obtener ${nombre}`);
              return res.json();
            })
            .then(result => {
              let rawData = result.data?.data || [];
              if (rawData.length > 2000) rawData = rawData.slice(0, 2000);
              return rawData
                .map(item => ({
                  Id: item.code || item.codigo_incidencia,
                  Latitud: parseFloat(item.latitude ?? item.Latitud),
                  Longitud: parseFloat(item.longitude ?? item.Longitud),
                  Tipo: nombre,
                  Descripcion: item.description || item.Descripcion,
                  Fecha: item.date || item.Fecha,
                }))
                .filter(item => !isNaN(item.Latitud) && !isNaN(item.Longitud));
            })
            .catch(err => {
              if (err.name === 'AbortError') return [];
              logger.warn(`⚠️ Error al obtener ${nombre}:`, err.message);
              return [];
            })
        )
      )
        .then(resultados => {
          if (signal.aborted) return;

          const data = resultados.flat();
          logger.log('📊 Datos para clustering:', data.length, 'incidencias');

          const clustersGenerados = realizarClustering(data, radioCluster);
          crearCirculosCluster(clustersGenerados);

          const puntosClusteados = clustersGenerados.reduce((s, c) => s + c.cantidad, 0);
          window.dispatchEvent(
            new CustomEvent('clustersGenerados', {
              detail: {
                totalClusters: clustersGenerados.length,
                totalPuntos: data.length,
                puntosClusteados,
              },
            })
          );
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          logger.error('❌ Error cargando datos para clustering:', err);
          limpiarCirculos();
          window.dispatchEvent(
            new CustomEvent('clustersGenerados', {
              detail: { totalClusters: 0, totalPuntos: 0, puntosClusteados: 0 },
            })
          );
        })
        .finally(() => {
          if (!signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      abortControllerRef.current?.abort();
    };
  }, [visible, radioCluster, filtros, tiposIncidenciasCluster, fechasClusters]);

  if (!visible) return null;

  return (
    <>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '14px 24px',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'Segoe UI, sans-serif',
            border: '1px solid rgba(200, 200, 200, 0.6)',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #3498db',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ marginLeft: 12, fontSize: '15px', fontWeight: '500', color: '#2c3e50' }}>
            Generando clusters...
          </span>
        </div>
      )}
      <LayerGroup />
    </>
  );
};

export default React.memo(ClusterIncidencias);
