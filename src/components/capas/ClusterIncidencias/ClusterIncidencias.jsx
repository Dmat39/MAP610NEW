import React, { useState, useEffect, useRef } from 'react';
import { LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logger } from '../../../utils';
import { useMapContext } from '../../../context/MapContext';
import { useClusterWorker } from '../../../hooks/useClusterWorker';
import {
  obtenerColorCluster,
  contarTiposPorCluster,
} from '../../../utils/clustering.utils.js';

const TIPO_COLORS = {
  'Robo':        { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  'Hurto':       { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  'Daño':        { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
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

// ── Registro global de clusters para el drill-down ───────────────────────────
if (!window.__clusterReg) window.__clusterReg = new Map();

const _applyPopupContent = (circle, html) => {
  // Diferir el cambio de contenido para que Leaflet no detecte
  // el click como "fuera del popup" y lo cierre
  setTimeout(() => {
    const popup = circle.getPopup();
    if (!popup) return;
    popup.setContent(html);
    popup.update();
  }, 0);
};

window.__clusterDetail = (cid, idx) => {
  const entry = window.__clusterReg.get(cid);
  if (!entry) return;
  const sorted = [...entry.puntos].sort((a, b) => {
    if (!a.Fecha && !b.Fecha) return 0;
    if (!a.Fecha) return 1; if (!b.Fecha) return -1;
    return new Date(b.Fecha) - new Date(a.Fecha);
  });
  const p = sorted.slice(0, 10)[idx];
  if (!p) return;
  const c = TIPO_COLORS[p.Tipo] || COLOR_DEF;
  const badge = `<span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;">${p.Tipo}</span>`;
  _applyPopupContent(entry.circle, `
    <div style="font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;max-width:300px;line-height:1.5;">
      <div style="display:flex;align-items:center;gap:8px;padding-bottom:8px;margin-bottom:10px;border-bottom:2px solid #16a34a;">
        <button onclick="event.stopPropagation();window.__clusterList('${cid}')"
          style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;padding:3px 8px;font-size:11px;font-weight:700;color:#374151;white-space:nowrap;">
          ← Volver
        </button>
        <span style="font-weight:700;font-size:13px;color:#1f2937;">Detalle</span>
      </div>
      <div style="margin-bottom:8px;">${badge}</div>
      ${p.Id ? `<div style="margin-bottom:4px;"><span style="font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600;">Código</span><div style="font-size:13px;font-weight:700;color:#1f2937;font-family:monospace;">${p.Id}</div></div>` : ''}
      ${p.Descripcion ? `<div style="margin-bottom:4px;"><span style="font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600;">Descripción</span><div style="font-size:12px;color:#374151;">${p.Descripcion}</div></div>` : ''}
      ${p.Fecha ? `<div style="margin-bottom:4px;"><span style="font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600;">Fecha</span><div style="font-size:12px;color:#374151;">${fmtFecha(p.Fecha)}</div></div>` : ''}
      ${p.Jurisdiccion ? `<div style="margin-bottom:4px;"><span style="font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600;">Jurisdicción</span><div style="font-size:12px;color:#374151;">${p.Jurisdiccion}</div></div>` : ''}
    </div>
  `);
};

window.__clusterList = (cid) => {
  const entry = window.__clusterReg.get(cid);
  if (!entry) return;
  _applyPopupContent(entry.circle, buildListHTML(cid, entry));
};

const buildListHTML = (cid, entry) => {
  const { cluster } = entry;
  const tipoCounts = {};
  cluster.puntos.forEach(p => { tipoCounts[p.Tipo] = (tipoCounts[p.Tipo] || 0) + 1; });
  const tiposBadges = Object.entries(tipoCounts).map(([tipo, cnt]) => {
    const c = TIPO_COLORS[tipo] || COLOR_DEF;
    return `<span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap;">${tipo} ×${cnt}</span>`;
  }).join('');

  const sorted = [...cluster.puntos].sort((a, b) => {
    if (!a.Fecha && !b.Fecha) return 0;
    if (!a.Fecha) return 1; if (!b.Fecha) return -1;
    return new Date(b.Fecha) - new Date(a.Fecha);
  });
  const shown = sorted.slice(0, 10);
  const remaining = sorted.length - shown.length;

  const rows = shown.map((p, idx) => {
    const c = TIPO_COLORS[p.Tipo] || COLOR_DEF;
    const badge = `<span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700;flex-shrink:0;white-space:nowrap;">${p.Tipo}</span>`;
    const idLine = p.Id ? `<div style="font-size:12px;font-weight:600;color:#1f2937;">${p.Id}</div>` : '';
    const fechaLine = p.Fecha ? `<div style="font-size:11px;color:#6b7280;">${fmtFecha(p.Fecha)}</div>` : '';
    return `
      <div onclick="event.stopPropagation();window.__clusterDetail('${cid}',${idx})"
        style="display:flex;align-items:flex-start;gap:7px;padding:5px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;border-radius:4px;transition:background 0.1s;"
        onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='transparent'">
        ${badge}
        <div style="flex:1;min-width:0;">${idLine}${fechaLine}</div>
        <span style="color:#9ca3af;font-size:12px;align-self:center;">›</span>
      </div>`;
  }).join('');

  const masRow = remaining > 0
    ? `<div style="text-align:center;font-size:11px;color:#94a3b8;padding-top:6px;font-style:italic;">+${remaining} incidencia${remaining !== 1 ? 's' : ''} más</div>`
    : '';

  return `
    <div style="font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;max-width:300px;line-height:1.5;">
      <div style="font-weight:700;font-size:14px;color:#1f2937;padding-bottom:6px;margin-bottom:8px;border-bottom:2px solid #16a34a;">
        Cluster de Incidencias
      </div>
      <div style="display:flex;gap:16px;margin-bottom:10px;">
        <span style="color:#374151;"><b>Total:</b> ${cluster.cantidad}</span>
        <span style="color:#6b7280;font-size:12px;">Radio: ${Math.round(cluster.radio)} m</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${tiposBadges}</div>
      <div style="font-weight:600;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;padding-top:6px;border-top:1px solid #e2e8f0;">
        Detalle — clic para ver más
      </div>
      ${rows}${masRow}
    </div>`;
};

const ClusterIncidencias = ({ visible, filtros = null }) => {
  const { radioCluster, tiposIncidenciasCluster, fechasClusters } = useMapContext();
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
    // Limpiar registro anterior de este componente
    window.__clusterReg.forEach((v, k) => { if (v.owner === map._leaflet_id) window.__clusterReg.delete(k); });
    limpiarCirculos();

    clustersData.forEach((cluster, ci) => {
      const colores = obtenerColorCluster(cluster.cantidad);
      const circle = L.circle([cluster.centroide.lat, cluster.centroide.lng], {
        radius: cluster.radio,
        color: colores.color,
        fillColor: colores.fillColor,
        fillOpacity: colores.fillOpacity,
        weight: 4,
        opacity: 1,
        dashArray: null,
      });

      // Registrar el cluster para drill-down
      const cid = `c_${map._leaflet_id}_${ci}_${Date.now()}`;
      const entry = { cluster, circle, puntos: cluster.puntos, owner: map._leaflet_id };
      window.__clusterReg.set(cid, entry);

      circle.bindPopup(buildListHTML(cid, entry), { maxWidth: 320 });

      circle.bindTooltip(
        `<div style="font-family:'Segoe UI',system-ui,sans-serif;font-size:12px;font-weight:600;text-align:center;color:#1f2937;">
          ${cluster.cantidad} incidencias<br/>
          <span style="color:#16a34a;font-size:11px;">${Math.round(cluster.radio)} m radio</span>
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
      // Cancelar request anterior si existe
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);

      const normalizarTexto = t =>
        (t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

      const mapTurno = { 'turno manana': 1, 'turno tarde': 2, 'turno noche': 3 };
      const mapHorario = {
        '00:00 - 01:59': 1, '02:00 - 03:59': 2, '04:00 - 05:59': 3,
        '06:00 - 07:59': 4, '08:00 - 09:59': 5, '10:00 - 11:59': 6,
        '12:00 - 13:59': 7, '14:00 - 15:59': 8, '16:00 - 17:59': 9,
        '18:00 - 19:59': 10, '20:00 - 21:59': 11, '22:00 - 23:59': 12,
        
      };
      const mapJurisdiccion = {
        'caja de agua': 1, zarate: 2, huayrona: 3, 'canto rey': 4,
        'santa elizabeth': 5, bayovar: 6, 'mariscal caceres': 7, '10 de octubre': 8,
      };

      const buildURL = (tipo, subtype) => {
        const API_URL = import.meta.env.VITE_API_URL;
        if (!API_URL) throw new Error('VITE_API_URL no está configurada.');
        const defaultStart = (() => {
          const d = new Date(); d.setDate(d.getDate() - 30);
          return d.toISOString().split('T')[0];
        })();
        const defaultEnd = new Date().toISOString().split('T')[0];
        // Fechas: siempre del panel del cluster (independiente del panel de incidencias)
        const startDate = fechasClusters.fechaInicio || defaultStart;
        const endDate   = fechasClusters.fechaFin    || defaultEnd;
        const params = new URLSearchParams();
        params.append('type', tipo);
        if (subtype) params.append('subtype', subtype);
        params.append('start', startDate);
        params.append('end', endDate);
        params.append('page', '0');
        params.append('limit', '5000');
        const turnoId = mapTurno[normalizarTexto(filtros?.Turno)];
        if (turnoId) params.append('shift', turnoId);
        const horarioId = mapHorario[normalizarTexto(filtros?.Horario)];
        if (horarioId) params.append('schedule', horarioId);
        const jurisdiccionId = mapJurisdiccion[normalizarTexto(filtros?.Jurisdiccion)];
        if (jurisdiccionId) params.append('jurisdiction', jurisdiccionId);
        return `${API_URL}incidence?${params.toString()}`;
      };

      const TOKEN = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

      const todasTipologias = [
        // Robos — clave individual por subtipo
        { tipo: 3, subtype: 10, nombre: 'Robo', key: 'roboPersonas'   },
        { tipo: 3, subtype: 11, nombre: 'Robo', key: 'roboCasa'       },
        { tipo: 3, subtype: 12, nombre: 'Robo', key: 'roboGanado'     },
        { tipo: 3, subtype: 13, nombre: 'Robo', key: 'roboEmpresas'   },
        { tipo: 3, subtype: 14, nombre: 'Robo', key: 'roboVehiculos'  },
        { tipo: 3, subtype: 15, nombre: 'Robo', key: 'roboAutopartes' },
        { tipo: 3, subtype: 16, nombre: 'Robo', key: 'roboPasajeros'  },
        // Hurtos — clave individual por subtipo
        { tipo: 3, subtype: 18, nombre: 'Hurto', key: 'hurtoPersonas'  },
        { tipo: 3, subtype: 19, nombre: 'Hurto', key: 'hurtoCasa'      },
        { tipo: 3, subtype: 20, nombre: 'Hurto', key: 'hurtoGanado'    },
        { tipo: 3, subtype: 21, nombre: 'Hurto', key: 'hurtoEmpresas'  },
        { tipo: 3, subtype: 22, nombre: 'Hurto', key: 'hurtoVehiculos' },
        { tipo: 3, subtype: 23, nombre: 'Hurto', key: 'hurtoPasajeros' },
        // Daños
        { tipo: 3, subtype: 17, nombre: 'Daño', key: 'danos' },
        // Otros tipos
        { tipo: 3, subtype: 24, nombre: 'Extorsión',   key: 'extorsiones' },
        { tipo: 1, subtype: 1,  nombre: 'Homicidio',   key: 'homicidios'  },
        { tipo: 1, subtype: 2,  nombre: 'Feminicidio', key: 'feminicidios'},
        { tipo: 1, subtype: 3,  nombre: 'Sicariato',   key: 'sicariatos'  },
        { tipo: 2, subtype: 6,  nombre: 'Secuestro',   key: 'secuestros'  },
        { tipo: 5, subtype: 28, nombre: 'Drogas',      key: 'drogas'      },
        { tipo: 7, subtype: 31, nombre: 'Barras',      key: 'barras'      },
      ];

      // Si el key no existe en el estado (ej. migración de keys) se incluye por defecto
      const tipologias = todasTipologias.filter(t => tiposIncidenciasCluster[t.key] !== false);

      Promise.all(
        tipologias.map(({ tipo, subtype, nombre }) =>
          fetch(buildURL(tipo, subtype), { headers, signal })
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
        .then(async resultados => {
          if (signal.aborted) return;

          const raw = resultados.flat();
          // Diagnóstico: ver solapamiento entre Robo y Extorsión
          const robosIds = new Set(raw.filter(i => i.Tipo === 'Robo').map(i => i.Id));
          const extorsionDupes = raw.filter(i => i.Tipo === 'Extorsión' && robosIds.has(i.Id));
          logger.log('🔍 RAW total:', raw.length, '| Extorsiones solapadas con Robos:', extorsionDupes.length, '| IDs solapados:', extorsionDupes.map(i => i.Id));

          const seen = new Set();
          const data = raw.filter(item => {
            // Clave de dedup: Id si existe, sino lat+lng exactos (mismo punto = misma incidencia)
            const key = item.Id != null ? String(item.Id) : `${item.Latitud},${item.Longitud}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          logger.log('📊 Datos para clustering:', data.length, 'incidencias (', raw.length - data.length, 'duplicados eliminados)');

          const clustersGenerados = await clusterAsync(data, radioCluster);
          if (signal.aborted) return;
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
  }, [visible, radioCluster, tiposIncidenciasCluster, fechasClusters]);

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
            Generando clusters...
          </span>
        </div>
      )}
      <LayerGroup />
    </>
  );
};

export default React.memo(ClusterIncidencias);
