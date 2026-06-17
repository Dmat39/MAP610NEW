import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';
import { useClusterWorker } from '../../hooks/useClusterWorker';
import { obtenerColorCluster } from '../../utils/clustering.utils.js';
const API_URL = import.meta.env.VITE_API_URL;

const SERENOS_TIPOS = [
  { tipo: 1, nombre: 'Robo' },
  { tipo: 2, nombre: 'Extorsión' },
  { tipo: 3, nombre: 'Homicidio' },
  { tipo: 4, nombre: 'Feminicidio' },
  { tipo: 5, nombre: 'Sicariato' },
  { tipo: 6, nombre: 'Secuestro' },
  { tipo: 7, nombre: 'Drogas' },
  { tipo: 8, nombre: 'Barras' },
];

const GoogleClusterCombinado = ({ visible, map, google, radio = 50, fechas }) => {
  const radioCluster = radio;
  const fechasClusters = fechas ?? { fechaInicio: '', fechaFin: '' };
  const [loading, setLoading] = useState(false);
  const circlesRef = useRef([]);
  const [infoWindow, setInfoWindow] = useState(null);
  const abortControllerRef = useRef(null);
  const clusterAsync = useClusterWorker();

  useEffect(() => {
    if (!map || !google || infoWindow) return;
    const iw = new google.maps.InfoWindow({ maxWidth: 300 });
    setInfoWindow(iw);
    return () => iw.close();
  }, [map, google, infoWindow]);

  const limpiarCirculos = () => {
    circlesRef.current.forEach(c => c?.setMap?.(null));
    circlesRef.current = [];
  };

  const crearCirculosCluster = clustersData => {
    if (!map || !google || !infoWindow) return;
    limpiarCirculos();

    const soloMixtos = clustersData.filter(c =>
      c.puntos.some(p => p.Origen === 'Sereno') &&
      c.puntos.some(p => p.Origen === 'PNP')
    );

    soloMixtos.forEach(cluster => {
      const colores = obtenerColorCluster(cluster.cantidad);
      const totalSerenos = cluster.puntos.filter(p => p.Origen === 'Sereno').length;
      const totalPnp = cluster.puntos.filter(p => p.Origen === 'PNP').length;

      const tiposStr = Object.entries(
        cluster.puntos.reduce((acc, p) => {
          acc[p.Tipo] = (acc[p.Tipo] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([tipo, cant]) => `${tipo}: ${cant}`)
        .join('<br/>');

      const circle = new google.maps.Circle({
        strokeColor: colores.color,
        strokeOpacity: 1,
        strokeWeight: 3,
        fillColor: colores.fillColor,
        fillOpacity: colores.fillOpacity,
        map,
        center: { lat: cluster.centroide.lat, lng: cluster.centroide.lng },
        radius: cluster.radio,
        clickable: true,
        zIndex: 900,
      });

      circle.addListener('click', event => {
        infoWindow.close();
        infoWindow.setContent(`
          <div style="font-size: 13px; max-width: 280px; position: relative;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:5px;">
              <strong style="color:#333;">🔗 Cluster Combinado</strong>
              <button id="close-cluster-combinado" style="background:none;border:none;font-size:16px;cursor:pointer;color:#666;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;" title="Cerrar">×</button>
            </div>
            <strong>Total:</strong> ${cluster.cantidad} incidencias<br/>
            <strong>Radio:</strong> ${Math.round(cluster.radio)} metros<br/>
            <hr style="margin:6px 0;border-color:#eee;"/>
            <strong>🔵 Serenos:</strong> ${totalSerenos}<br/>
            <strong>🔴 PNP:</strong> ${totalPnp}<br/>
            <hr style="margin:6px 0;border-color:#eee;"/>
            <strong>Por tipo:</strong><br/>
            <div style="margin-top:4px;font-size:12px;color:#555;">${tiposStr}</div>
          </div>
        `);
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);

        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          const btn = document.getElementById('close-cluster-combinado');
          if (btn) btn.addEventListener('click', () => infoWindow.close());
        });
      });

      circlesRef.current.push(circle);
    });
  };

  useEffect(() => {
    if (!visible) limpiarCirculos();
  }, [visible]);

  useEffect(() => () => {
    limpiarCirculos();
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!visible || !map || !google || !infoWindow) return;

    const debounceTimer = setTimeout(() => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);

      const TOKEN = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

      const fechaInicio = fechasClusters.fechaInicio;
      const fechaFin = fechasClusters.fechaFin;

      const serenosFetches = SERENOS_TIPOS.map(({ tipo, nombre }) => {
        const params = new URLSearchParams({ type: tipo, start: fechaInicio, end: fechaFin });
        return fetch(`${API_URL}incidence?${params}`, { headers, signal })
          .then(res => { if (!res.ok) throw new Error(`Error ${res.status}`); return res.json(); })
          .then(result => {
            let raw = result.data?.data || [];
            if (raw.length > 2000) raw = raw.slice(0, 2000);
            return raw
              .map(item => ({
                Id: item.code || item.codigo_incidencia,
                Latitud: parseFloat(item.latitude ?? item.Latitud),
                Longitud: parseFloat(item.longitude ?? item.Longitud),
                Tipo: nombre,
                Origen: 'Sereno',
              }))
              .filter(p => !isNaN(p.Latitud) && !isNaN(p.Longitud));
          })
          .catch(err => { if (err.name === 'AbortError') return []; logger.warn(`⚠️ Serenos ${nombre}:`, err.message); return []; });
      });

      const pnpParams = new URLSearchParams({ start: fechaInicio, end: fechaFin, limit: 5000 });
      const pnpFetch = fetch(`${API_URL}pnp-incidence?${pnpParams}`, { headers, signal })
        .then(res => { if (!res.ok) throw new Error(`Error ${res.status}`); return res.json(); })
        .then(result => {
          const raw = result.data?.data || result.data || [];
          return raw
            .map(item => ({
              Id: item.id,
              Latitud: parseFloat(item.latitude),
              Longitud: parseFloat(item.longitude),
              Tipo: item.incidence_type || 'PNP',
              Origen: 'PNP',
            }))
            .filter(p => !isNaN(p.Latitud) && !isNaN(p.Longitud));
        })
        .catch(err => { if (err.name === 'AbortError') return []; logger.warn('⚠️ PNP cluster:', err.message); return []; });

      Promise.all([...serenosFetches, pnpFetch])
        .then(async resultados => {
          if (signal.aborted) return;
          const data = resultados.flat();
          logger.log('📊 Google cluster combinado:', data.length, 'puntos');

          const clustersGenerados = await clusterAsync(data, radioCluster);
          if (signal.aborted) return;
          const clustersMixtos = clustersGenerados.filter(c =>
            c.puntos.some(p => p.Origen === 'Sereno') &&
            c.puntos.some(p => p.Origen === 'PNP')
          );
          crearCirculosCluster(clustersGenerados);

          const puntosClusteados = clustersMixtos.reduce((s, c) => s + c.cantidad, 0);
          window.dispatchEvent(new CustomEvent('clusterCombinadoGenerado', {
            detail: {
              totalClusters: clustersMixtos.length,
              totalPuntos: data.length,
              puntosClusteados,
              totalSerenos: clustersMixtos.reduce((s, c) => s + c.puntos.filter(p => p.Origen === 'Sereno').length, 0),
              totalPnp: clustersMixtos.reduce((s, c) => s + c.puntos.filter(p => p.Origen === 'PNP').length, 0),
            },
          }));
        })
        .catch(err => { if (err.name === 'AbortError') return; logger.error('❌ Error:', err); limpiarCirculos(); })
        .finally(() => { if (!signal.aborted) setLoading(false); });
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      abortControllerRef.current?.abort();
    };
  }, [visible, radioCluster, fechasClusters, map, google, infoWindow]);

  if (!visible) return null;

  return loading ? (
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
          border: '2px solid #8b5cf6',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <span style={{ marginLeft: 12, fontSize: '15px', fontWeight: '500', color: '#2c3e50' }}>
        Generando cluster combinado...
      </span>
    </div>
  ) : null;
};

export default React.memo(GoogleClusterCombinado);
