import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  useRobosQuery,
  useExtorsionesQuery,
  useHomicidiosQuery,
  useFeminicidiosQuery,
  useSicariatosQuery,
  useSecuestrosQuery,
  useDrogasQuery,
  useBarrasQuery,
} from '../../hooks/useIncidenciasQuery';
import { logger } from '../../utils/logger';
import { useMapContext } from '../../context/MapContext';
import {
  realizarClustering,
  obtenerColorCluster,
  contarTiposPorCluster,
} from '../../utils/clustering.utils.js';

const GoogleClusterIncidencias = ({ visible, map, google, filtros = null }) => {
  const { radioCluster, tiposIncidenciasCluster, fechasClusters } = useMapContext();
  const [loading, setLoading] = useState(false);
  const circlesRef = useRef([]);
  const [infoWindow, setInfoWindow] = useState(null);

  const filtrosConFechas = useMemo(() => ({
    ...filtros,
    fechaInicio: filtros?.fechaInicio || fechasClusters.fechaInicio,
    fechaFin: filtros?.fechaFin || fechasClusters.fechaFin,
  }), [filtros, fechasClusters]);

  // Crear InfoWindow una sola vez
  useEffect(() => {
    if (!map || !google || infoWindow) return;
    const newInfoWindow = new google.maps.InfoWindow({
      disableAutoPan: false,
      maxWidth: 300,
      pixelOffset: new google.maps.Size(0, -30),
    });
    setInfoWindow(newInfoWindow);
    return () => newInfoWindow.close();
  }, [map, google, infoWindow]);

  const limpiarCirculos = () => {
    circlesRef.current.forEach(circle => circle?.setMap?.(null));
    circlesRef.current = [];
  };

  const crearCirculosCluster = (clustersData) => {
    if (!map || !google || !infoWindow) return;
    limpiarCirculos();

    clustersData.forEach(cluster => {
      const colores = obtenerColorCluster(cluster.cantidad);

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

        const tiposStr = Object.entries(contarTiposPorCluster(cluster.puntos))
          .map(([tipo, cantidad]) => `${tipo}: ${cantidad}`)
          .join(' | ');

        infoWindow.setContent(`
          <div style="font-size: 13px; max-width: 260px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
              <strong style="color: #333;">🎯 Cluster de Incidencias</strong>
              <button id="close-tooltip-btn" style="background:none;border:none;font-size:16px;cursor:pointer;color:#666;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:3px;" title="Cerrar">×</button>
            </div>
            <div>
              <strong>Cantidad:</strong> ${cluster.cantidad} incidencias<br/>
              <strong>Radio:</strong> ${Math.round(cluster.radio)} metros<br/>
              <strong>Centroide:</strong>
              <div style="margin:5px 0;padding:5px;background:#f8f9fa;border-radius:3px;font-size:12px;">
                Lat: ${cluster.centroide.lat.toFixed(6)}<br/>
                Lng: ${cluster.centroide.lng.toFixed(6)}
              </div>
              <strong>Tipos:</strong>
              <div style="margin:5px 0;padding:5px;background:#f8f9fa;border-radius:3px;font-size:12px;">
                ${tiposStr}
              </div>
            </div>
          </div>
        `);

        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);

        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          const closeBtn = document.getElementById('close-tooltip-btn');
          if (!closeBtn) return;
          closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = '#ff4757';
            closeBtn.style.color = 'white';
          });
          closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
            closeBtn.style.color = '#666';
          });
          closeBtn.addEventListener('click', () => infoWindow.close());
        });
      });

      circlesRef.current.push(circle);
    });
  };

  useEffect(() => {
    if (!visible) limpiarCirculos();
  }, [visible]);

  useEffect(() => () => limpiarCirculos(), []);

  // Hooks de datos
  const robosQuery        = useRobosQuery(filtrosConFechas, visible);
  const extorsionesQuery  = useExtorsionesQuery(filtrosConFechas, visible);
  const homicidiosQuery   = useHomicidiosQuery(filtrosConFechas, visible);
  const feminicidiosQuery = useFeminicidiosQuery(filtrosConFechas, visible);
  const sicariatosQuery   = useSicariatosQuery(filtrosConFechas, visible);
  const secuestrosQuery   = useSecuestrosQuery(filtrosConFechas, visible);
  const drogasQuery       = useDrogasQuery(filtrosConFechas, visible);
  const barrasQuery       = useBarrasQuery(filtrosConFechas, visible);

  // Agrupar estado de todas las queries en un solo objeto para reducir deps del useEffect
  const queriesState = useMemo(() => ({
    isLoading:
      robosQuery.isLoading || extorsionesQuery.isLoading || homicidiosQuery.isLoading ||
      feminicidiosQuery.isLoading || sicariatosQuery.isLoading || secuestrosQuery.isLoading ||
      drogasQuery.isLoading || barrasQuery.isLoading,
    isError:
      robosQuery.isError || extorsionesQuery.isError || homicidiosQuery.isError ||
      feminicidiosQuery.isError || sicariatosQuery.isError || secuestrosQuery.isError ||
      drogasQuery.isError || barrasQuery.isError,
    data: {
      robos:        robosQuery.data        || [],
      extorsiones:  extorsionesQuery.data  || [],
      homicidios:   homicidiosQuery.data   || [],
      feminicidios: feminicidiosQuery.data || [],
      sicariatos:   sicariatosQuery.data   || [],
      secuestros:   secuestrosQuery.data   || [],
      drogas:       drogasQuery.data       || [],
      barras:       barrasQuery.data       || [],
    },
  }), [
    robosQuery.isLoading,        robosQuery.isError,        robosQuery.data,
    extorsionesQuery.isLoading,  extorsionesQuery.isError,  extorsionesQuery.data,
    homicidiosQuery.isLoading,   homicidiosQuery.isError,   homicidiosQuery.data,
    feminicidiosQuery.isLoading, feminicidiosQuery.isError, feminicidiosQuery.data,
    sicariatosQuery.isLoading,   sicariatosQuery.isError,   sicariatosQuery.data,
    secuestrosQuery.isLoading,   secuestrosQuery.isError,   secuestrosQuery.data,
    drogasQuery.isLoading,       drogasQuery.isError,       drogasQuery.data,
    barrasQuery.isLoading,       barrasQuery.isError,       barrasQuery.data,
  ]);

  useEffect(() => {
    if (!visible || !map || !google || !infoWindow) return;

    setLoading(queriesState.isLoading);

    if (queriesState.isError) {
      logger.error('❌ Error cargando datos de incidencias');
      limpiarCirculos();
      window.dispatchEvent(new CustomEvent('clustersGenerados', {
        detail: { totalClusters: 0, totalPuntos: 0, puntosClusteados: 0 },
      }));
      return;
    }

    if (queriesState.isLoading) return;

    const { data } = queriesState;
    const todosLosDatos = [
      ...(tiposIncidenciasCluster.robos        ? data.robos.map(i        => ({ ...i, Tipo: 'Robo' }))        : []),
      ...(tiposIncidenciasCluster.extorsiones  ? data.extorsiones.map(i  => ({ ...i, Tipo: 'Extorsión' }))   : []),
      ...(tiposIncidenciasCluster.homicidios   ? data.homicidios.map(i   => ({ ...i, Tipo: 'Homicidio' }))   : []),
      ...(tiposIncidenciasCluster.feminicidios ? data.feminicidios.map(i => ({ ...i, Tipo: 'Feminicidio' })) : []),
      ...(tiposIncidenciasCluster.sicariatos   ? data.sicariatos.map(i   => ({ ...i, Tipo: 'Sicariato' }))   : []),
      ...(tiposIncidenciasCluster.secuestros   ? data.secuestros.map(i   => ({ ...i, Tipo: 'Secuestro' }))   : []),
      ...(tiposIncidenciasCluster.drogas       ? data.drogas.map(i       => ({ ...i, Tipo: 'Drogas' }))      : []),
      ...(tiposIncidenciasCluster.barras       ? data.barras.map(i       => ({ ...i, Tipo: 'Barras' }))      : []),
    ];

    const puntosValidos = todosLosDatos
      .filter(item => {
        const lat = parseFloat(item.Latitud);
        const lng = parseFloat(item.Longitud);
        return !isNaN(lat) && !isNaN(lng);
      })
      .map((item, index) => ({
        Id: item.Id || index + 1,
        Latitud: parseFloat(item.Latitud),
        Longitud: parseFloat(item.Longitud),
        Tipo: item.Tipo,
      }));

    logger.log('📊 Datos para clustering:', puntosValidos.length, 'puntos');

    if (puntosValidos.length === 0) {
      limpiarCirculos();
      window.dispatchEvent(new CustomEvent('clustersGenerados', {
        detail: { totalClusters: 0, totalPuntos: 0, puntosClusteados: 0 },
      }));
      return;
    }

    const clustersGenerados = realizarClustering(puntosValidos, radioCluster);
    crearCirculosCluster(clustersGenerados);

    const puntosClusteados = clustersGenerados.reduce((s, c) => s + c.cantidad, 0);
    window.dispatchEvent(new CustomEvent('clustersGenerados', {
      detail: {
        totalClusters: clustersGenerados.length,
        totalPuntos: puntosValidos.length,
        puntosClusteados,
      },
    }));
  }, [visible, radioCluster, map, google, infoWindow, tiposIncidenciasCluster, queriesState]);

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
    </>
  );
};

export default GoogleClusterIncidencias;
