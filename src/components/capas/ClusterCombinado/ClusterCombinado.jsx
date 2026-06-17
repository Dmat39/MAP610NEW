import React, { useState, useEffect, useRef } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils';
import { useClusterWorker } from '../../../hooks/useClusterWorker';
import { obtenerColorCluster } from '../../../utils/clustering.utils.js';

const API_URL = import.meta.env.VITE_API_URL;

const TIPO_COLORS = {
  'Robo':        { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  'Extorsión':   { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  'Homicidio':   { bg: '#f1f5f9', color: '#1e293b', border: '#cbd5e1' },
  'Feminicidio': { bg: '#fdf2f8', color: '#a21caf', border: '#f5d0fe' },
  'Sicariato':   { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
  'Secuestro':   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Drogas':      { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Barras':      { bg: '#fefce8', color: '#a16207', border: '#fef08a' },
};
const COLOR_DEF = { bg: '#f8fafc', color: '#374151', border: '#e2e8f0' };

const fmtFecha = d => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return isNaN(dt) ? String(d) : dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(d); }
};

const buildDetalleRowsCombinado = puntos => {
  const sorted = [...puntos].sort((a, b) => {
    if (!a.Fecha && !b.Fecha) return 0;
    if (!a.Fecha) return 1;
    if (!b.Fecha) return -1;
    return new Date(b.Fecha) - new Date(a.Fecha);
  });
  const shown = sorted.slice(0, 10);
  const remaining = sorted.length - shown.length;

  const rows = shown.map(p => {
    const c = TIPO_COLORS[p.Tipo] || COLOR_DEF;
    const origenStyle = p.Origen === 'Sereno'
      ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;'
      : 'background:#fff1f2;color:#be123c;border:1px solid #fecdd3;';
    const origenBadge = `<span style="${origenStyle}border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700;flex-shrink:0;white-space:nowrap;">${p.Origen}</span>`;
    const tipoBadge = p.Origen === 'Sereno'
      ? `<span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700;flex-shrink:0;white-space:nowrap;">${p.Tipo}</span>`
      : '';
    const denunciaLine = p.Origen === 'PNP'
      ? (p.Denuncia
          ? `<div style="font-size:12px;font-weight:700;color:#111827;">N° ${p.Denuncia}</div>`
          : `<div style="font-size:11px;color:#6b7280;font-style:italic;">Sin N° denuncia</div>`)
      : (p.Id ? `<div style="font-size:12px;font-weight:600;color:#111827;">${p.Id}</div>` : '');
    const fechaLine = p.Fecha ? `<div style="font-size:11px;color:#4b5563;">${fmtFecha(p.Fecha)}</div>` : '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #e5e7eb;"><div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">${origenBadge}${tipoBadge}</div><div style="text-align:right;">${denunciaLine}${fechaLine}</div></div>`;
  }).join('');

  const masRow = remaining > 0
    ? `<div style="text-align:center;font-size:11px;color:#6b7280;padding-top:6px;font-style:italic;">+${remaining} incidencia${remaining !== 1 ? 's' : ''} más</div>`
    : '';

  return rows + masRow;
};

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
  const clusterAsync = useClusterWorker();

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

      const tipoCounts = {};
      cluster.puntos.forEach(p => { tipoCounts[p.Tipo] = (tipoCounts[p.Tipo] || 0) + 1; });
      const tiposBadges = Object.entries(tipoCounts)
        .map(([tipo, cnt]) => {
          const c = TIPO_COLORS[tipo] || COLOR_DEF;
          return `<span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap;">${tipo} ×${cnt}</span>`;
        }).join('');

      const circle = L.circle([cluster.centroide.lat, cluster.centroide.lng], {
        radius: cluster.radio,
        color: colores.color,
        fillColor: colores.fillColor,
        fillOpacity: colores.fillOpacity,
        weight: 4,
        opacity: 1,
        dashArray: null,
      });

      circle.bindPopup(`
         <div style="font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;min-width:320px;max-width:340px;line-height:1.5;">  
          <div style="font-weight:700;font-size:14px;color:#111827;padding-bottom:7px;margin-bottom:10px;border-bottom:2px solid #16a34a;">
            Cluster Combinado
          </div>
          <div style="display:flex;gap:16px;margin-bottom:10px;">
            <span style="color:#111827;font-size:13px;"><b>Total:</b> ${cluster.cantidad}</span>
            <span style="color:#374151;font-size:12px;">Radio: ${Math.round(cluster.radio)} m</span>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <div style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:7px 8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#1d4ed8;">${totalSerenos}</div>
              <div style="font-size:11px;color:#1d4ed8;font-weight:600;text-transform:uppercase;">Serenos</div>
            </div>
            <div style="flex:1;background:#fff1f2;border:1px solid #fecdd3;border-radius:6px;padding:7px 8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#be123c;">${totalPnp}</div>
              <div style="font-size:11px;color:#be123c;font-weight:600;text-transform:uppercase;">PNP</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${tiposBadges}</div>
          <div style="font-weight:700;font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;padding-top:7px;border-top:1px solid #e2e8f0;">
            Detalle de incidencias
          </div>
          ${buildDetalleRowsCombinado(cluster.puntos)}
        </div>
      `, { maxWidth: 360 });

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
                Fecha: item.date || item.Fecha || '',
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
              Id:       item.id,
              Denuncia: item.complaint_number || '',
              Latitud:  parseFloat(item.latitude),
              Longitud: parseFloat(item.longitude),
              Tipo:     item.modality?.subtype?.type?.name || item.incidence_type || 'PNP',
              Fecha:    item.occurred_at || item.date || item.fecha || '',
              Origen:   'PNP',
            }))
            .filter(p => !isNaN(p.Latitud) && !isNaN(p.Longitud));
        })
        .catch(err => {
          if (err.name === 'AbortError') return [];
          logger.warn('⚠️ Error PNP cluster:', err.message);
          return [];
        });

      Promise.all([...serenosFetches, pnpFetch])
        .then(async resultados => {
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

          const clustersGenerados = await clusterAsync(data, radioCluster);
          if (signal.aborted) return;
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
