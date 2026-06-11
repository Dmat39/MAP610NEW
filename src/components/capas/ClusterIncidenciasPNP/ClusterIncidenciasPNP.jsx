import React, { useState, useEffect, useRef } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils';
import { realizarClustering } from '../../../utils/clustering.utils.js';

// ─── Colores por tipo de incidencia PNP ────────────────────────────────────────
const TIPO_COLORS = {
  'PATRIMONIO (DELITO)':                  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'SEGURIDAD PÚBLICA (DELITO)':           { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  'VIDA, EL CUERPO Y LA SALUD (DELITO)': { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
  'LIBERTAD (DELITO)':                    { bg: '#fdf2f8', color: '#a21caf', border: '#f5d0fe' },
  'ADMINISTRACIÓN PÚBLICA (DELITO)':      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'TRÁFICO ILÍCITO DE DROGAS':            { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'FAMILIA (DELITO)':                     { bg: '#faf5ff', color: '#7c3aed', border: '#ede9fe' },
  'MENOR INFRACTOR DE LA LEY PENAL':      { bg: '#fefce8', color: '#a16207', border: '#fef08a' },
  'FE PÚBLICA (DELITO)':                  { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  'TRANQUILIDAD PÚBLICA (DELITO)':        { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
};
const COLOR_DEF = { bg: '#f8fafc', color: '#374151', border: '#e2e8f0' };

// Paleta azul policial — diferencia visualmente del cluster de serenos (amarillo/rojo)
const obtenerColorClusterPNP = cantidad => {
  if (cantidad <= 3) return { color: '#2563eb', fillColor: '#93c5fd', fillOpacity: 0.30 };
  if (cantidad <= 6) return { color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.40 };
  return             { color: '#1e3a8a', fillColor: '#1d4ed8', fillOpacity: 0.50 };
};

const fmtFecha = d => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return isNaN(dt) ? String(d) : dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(d); }
};

const buildDetalleRows = puntos => {
  const sorted = [...puntos].sort((a, b) => {
    if (!a.Fecha && !b.Fecha) return 0;
    if (!a.Fecha) return 1;
    if (!b.Fecha) return -1;
    return new Date(b.Fecha) - new Date(a.Fecha);
  });
  const shown     = sorted.slice(0, 10);
  const remaining = sorted.length - shown.length;

  const rows = shown.map(p => {
    const denuncia = p.Denuncia
      ? `<div style="font-size:12px;font-weight:700;color:#1f2937;">N° ${p.Denuncia}</div>`
      : `<div style="font-size:11px;color:#9ca3af;font-style:italic;">Sin N° denuncia</div>`;
    const fecha    = p.Fecha ? `<div style="font-size:11px;color:#94a3b8;">${fmtFecha(p.Fecha)}</div>` : '';
    return `<div style="padding:5px 0;border-bottom:1px solid #f1f5f9;">${denuncia}${fecha}</div>`;
  }).join('');

  const masRow = remaining > 0
    ? `<div style="text-align:center;font-size:11px;color:#94a3b8;padding-top:6px;font-style:italic;">+${remaining} incidencia${remaining !== 1 ? 's' : ''} más</div>`
    : '';

  return rows + masRow;
};

// ─── Componente ────────────────────────────────────────────────────────────────

const ClusterIncidenciasPNP = ({ visible, radio = 50, fechas }) => {
  const [loading, setLoading] = useState(false);
  const map             = useMap();
  const circlesRef      = useRef([]);
  const abortRef        = useRef(null);

  const limpiar = () => {
    circlesRef.current.forEach(c => { if (map.hasLayer(c)) map.removeLayer(c); });
    circlesRef.current = [];
  };

  const dibujarClusters = clusters => {
    limpiar();
    clusters.forEach(cluster => {
      const colores = obtenerColorClusterPNP(cluster.cantidad);

      const circle = L.circle([cluster.centroide.lat, cluster.centroide.lng], {
        radius:      cluster.radio,
        color:       colores.color,
        fillColor:   colores.fillColor,
        fillOpacity: colores.fillOpacity,
        weight:      3,
        opacity:     1,
        dashArray:   '8,4',
      });

      // Conteo por tipo
      const tipoCounts = {};
      cluster.puntos.forEach(p => { tipoCounts[p.Tipo] = (tipoCounts[p.Tipo] || 0) + 1; });
      const tiposBadges = Object.entries(tipoCounts)
        .map(([tipo, cnt]) => {
          const c = TIPO_COLORS[tipo] || COLOR_DEF;
          return `<span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap;">${tipo} ×${cnt}</span>`;
        }).join('');

      circle.bindPopup(`
        <div style="font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;max-width:300px;line-height:1.5;">
          <div style="font-weight:700;font-size:14px;color:#1f2937;padding-bottom:6px;margin-bottom:8px;border-bottom:2px solid #2563eb;display:flex;align-items:center;gap:6px;">
            <span style="font-size:16px;">🚔</span> Cluster Incidencias PNP
          </div>
          <div style="display:flex;gap:16px;margin-bottom:10px;">
            <span style="color:#374151;"><b>Total:</b> ${cluster.cantidad}</span>
            <span style="color:#6b7280;font-size:12px;">Radio: ${Math.round(cluster.radio)} m</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${tiposBadges}</div>
          <div style="font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;padding-top:6px;border-top:1px solid #e2e8f0;">
            Detalle
          </div>
          ${buildDetalleRows(cluster.puntos)}
        </div>
      `, { maxWidth: 320 });

      circle.bindTooltip(
        `<div style="font-family:'Segoe UI',system-ui,sans-serif;font-size:12px;font-weight:600;text-align:center;color:#1f2937;">
          🚔 ${cluster.cantidad} incidencias PNP<br/>
          <span style="color:#2563eb;font-size:11px;">${Math.round(cluster.radio)} m radio</span>
        </div>`,
        { direction: 'top', offset: [0, -10], opacity: 0.95 }
      );

      circle.addTo(map);
      circlesRef.current.push(circle);
    });
  };

  useEffect(() => { if (!visible) limpiar(); }, [visible]);
  useEffect(() => () => { limpiar(); abortRef.current?.abort(); }, []);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        if (!API_URL) throw new Error('VITE_API_URL no configurada');

        const hoy     = new Date().toISOString().split('T')[0];
        const hace30  = new Date(); hace30.setDate(hace30.getDate() - 30);
        const defStart = hace30.toISOString().split('T')[0];

        const params = new URLSearchParams({
          limit: '5000',
          page:  '1',
          start: fechas?.fechaInicio || defStart,
          end:   fechas?.fechaFin    || hoy,
        });

        const token   = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const res    = await fetch(`${API_URL}pnp-incidence?${params}`, { headers, signal });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const result = await res.json();

        const raw = result.data?.data || result.data || [];
        const data = raw
          .map(item => ({
            Latitud:      parseFloat(item.latitude),
            Longitud:     parseFloat(item.longitude),
            Tipo:         item.modality?.subtype?.type?.name || 'Sin clasificar',
            Denuncia:     item.complaint_number  || '',
            Jurisdiccion: item.jurisdiction      || '',
            Fecha:        item.occurred_at       || item.created_at,
          }))
          .filter(item => !isNaN(item.Latitud) && !isNaN(item.Longitud));

        const clusters = realizarClustering(data, radio);
        dibujarClusters(clusters);

        window.dispatchEvent(new CustomEvent('clustersPNPGenerados', {
          detail: {
            totalClusters:   clusters.length,
            totalPuntos:     data.length,
            puntosClusteados: clusters.reduce((s, c) => s + c.cantidad, 0),
          },
        }));
      } catch (err) {
        if (err.name === 'AbortError') return;
        logger.error('❌ Error cargando cluster PNP:', err);
        limpiar();
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }, 300);

    return () => { clearTimeout(timer); abortRef.current?.abort(); };
  }, [visible, radio, fechas]);

  if (!visible) return null;

  return (
    <>
      {loading && (
        <div style={{
          position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '14px 24px', backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center',
          fontFamily: 'Segoe UI, sans-serif', border: '1px solid rgba(200,200,200,0.6)',
        }}>
          <div style={{
            width: '20px', height: '20px',
            border: '2px solid #e2e8f0', borderTop: '2px solid #2563eb',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
          }} />
          <span style={{ marginLeft: 12, fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Generando clusters PNP...
          </span>
        </div>
      )}
      <LayerGroup />
    </>
  );
};

export default React.memo(ClusterIncidenciasPNP);
