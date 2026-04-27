import React, { useState, useEffect, useRef } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils';
import { realizarClustering, obtenerColorCluster } from '../../../utils/clustering.utils.js';

const API_URL = import.meta.env.VITE_API_URL;

// Tipos/subtypes correctos según useIncidenciasQuery.js
// Extorsión va ANTES que Robo para que el dedup priorice su etiqueta
const SERENOS_TIPOS = [
  { tipo: 3, subtype: 24,   nombre: 'Extorsión' },
  { tipo: 3, subtype: null, nombre: 'Robo' },
  { tipo: 1, subtype: 1,    nombre: 'Homicidio' },
  { tipo: 1, subtype: 2,    nombre: 'Feminicidio' },
  { tipo: 1, subtype: 3,    nombre: 'Sicariato' },
  { tipo: 2, subtype: 6,    nombre: 'Secuestro' },
  { tipo: 5, subtype: 28,   nombre: 'Drogas' },
  { tipo: 7, subtype: 31,   nombre: 'Barras' },
];

const ClusterCombinado = ({ visible, radio = 50, fechas }) => {
  const radioCluster = radio;
  const fechasClusters = fechas ?? { fechaInicio: '', fechaFin: '' };
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

      const circle = L.circle([cluster.centroide.lat, cluster.centroide.lng], {
        radius: cluster.radio,
        color: colores.color,
        fillColor: colores.fillColor,
        fillOpacity: colores.fillOpacity,
        weight: 3,
        opacity: 1,
        dashArray: '8,4',
      });

      circle.bindPopup(`
        <div style="font-family:'Segoe UI',system-ui,sans-serif; font-size:13px; max-width:280px; line-height:1.5;">
          <div style="font-weight:700; font-size:14px; color:#1f2937; padding-bottom:6px; margin-bottom:8px; border-bottom:2px solid #16a34a;">
            Cluster Combinado
          </div>
          <div style="margin-bottom:4px; color:#374151;"><span style="font-weight:600;">Total:</span> ${cluster.cantidad} incidencias</div>
          <div style="margin-bottom:8px; color:#374151;"><span style="font-weight:600;">Radio:</span> ${Math.round(cluster.radio)} m</div>
          <div style="display:flex; gap:8px; margin-bottom:8px;">
            <div style="flex:1; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:16px; font-weight:700; color:#1d4ed8;">${totalSerenos}</div>
              <div style="font-size:10px; color:#3b82f6; font-weight:500;">Serenos</div>
            </div>
            <div style="flex:1; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:16px; font-weight:700; color:#dc2626;">${totalPnp}</div>
              <div style="font-size:10px; color:#ef4444; font-weight:500;">PNP</div>
            </div>
          </div>
          <div style="font-weight:600; font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;">Por tipo</div>
          <div style="font-size:12px; color:#374151; line-height:1.6;">${tiposStr}</div>
        </div>
      `);

      circle.bindTooltip(
        `<div style="font-family:'Segoe UI',system-ui,sans-serif; font-size:12px; font-weight:600; text-align:center; color:#1f2937;">
          ${cluster.cantidad} incidencias<br/>
          <span style="color:#1d4ed8;">${totalSerenos} Serenos</span> &nbsp;|&nbsp; <span style="color:#dc2626;">${totalPnp} PNP</span>
        </div>`,
        { direction: 'top', offset: [0, -10], opacity: 0.95 }
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
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);

      const TOKEN = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

      const defaultStart = (() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })();
      const defaultEnd = new Date().toISOString().split('T')[0];
      const startDate = fechasClusters.fechaInicio || defaultStart;
      const endDate   = fechasClusters.fechaFin    || defaultEnd;
      const endFecha  = `${endDate}T23:59:59`;

      const serenosFetches = SERENOS_TIPOS.map(({ tipo, subtype, nombre }) => {
        const params = new URLSearchParams({ type: tipo, start: startDate, end: endFecha, page: 0, limit: 5000 });
        if (subtype) params.set('subtype', subtype);
        return fetch(`${API_URL}incidence?${params}`, { headers, signal })
          .then(res => {
            if (!res.ok) throw new Error(`Error ${res.status}`);
            return res.json();
          })
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
          .catch(err => {
            if (err.name === 'AbortError') return [];
            logger.warn(`⚠️ Error serenos ${nombre}:`, err.message);
            return [];
          });
      });

      const pnpParams = new URLSearchParams({ start: startDate, end: endFecha, page: 0, limit: 5000 });
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
        .catch(err => {
          if (err.name === 'AbortError') return [];
          logger.warn('⚠️ Error PNP cluster:', err.message);
          return [];
        });

      Promise.all([...serenosFetches, pnpFetch])
        .then(resultados => {
          if (signal.aborted) return;

          const raw = resultados.flat();
          // Dedup serenos por ID (Extorsión ya va primero para ganar la etiqueta)
          const seenSerenos = new Set();
          const serenosDedup = raw.filter(p => {
            if (p.Origen !== 'Sereno') return true;
            const key = p.Id != null ? String(p.Id) : `${p.Latitud},${p.Longitud}`;
            if (seenSerenos.has(key)) return false;
            seenSerenos.add(key);
            return true;
          });
          const data = serenosDedup;
          logger.log('📊 Cluster combinado:', data.length, 'puntos únicos (', raw.length - data.length, 'duplicados eliminados)');

          const clustersGenerados = realizarClustering(data, radioCluster);
          const clustersMixtos = clustersGenerados.filter(c =>
            c.puntos.some(p => p.Origen === 'Sereno') &&
            c.puntos.some(p => p.Origen === 'PNP')
          );
          crearCirculosCluster(clustersGenerados);

          const puntosClusteados = clustersMixtos.reduce((s, c) => s + c.cantidad, 0);
          window.dispatchEvent(
            new CustomEvent('clusterCombinadoGenerado', {
              detail: {
                totalClusters: clustersMixtos.length,
                totalPuntos: data.length,
                puntosClusteados,
                totalSerenos: clustersMixtos.reduce((s, c) => s + c.puntos.filter(p => p.Origen === 'Sereno').length, 0),
                totalPnp: clustersMixtos.reduce((s, c) => s + c.puntos.filter(p => p.Origen === 'PNP').length, 0),
              },
            })
          );
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          logger.error('❌ Error cluster combinado:', err);
          limpiarCirculos();
        })
        .finally(() => {
          if (!signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      abortControllerRef.current?.abort();
    };
  }, [visible, radioCluster, fechasClusters]);

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
              border: '2px solid #e2e8f0',
              borderTop: '2px solid #16a34a',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ marginLeft: 12, fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Generando cluster combinado...
          </span>
        </div>
      )}
      <LayerGroup />
    </>
  );
};

export default React.memo(ClusterCombinado);
