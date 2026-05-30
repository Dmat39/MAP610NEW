import React from 'react';
import { CircleMarker, LayerGroup, Popup, Tooltip } from 'react-leaflet';
import ClipLoader from 'react-spinners/ClipLoader';
import {
  useRoboPersonasQuery, useRoboCasaQuery, useRoboGanadoQuery,
  useRoboEmpresasQuery, useRoboVehiculosQuery, useRoboAutopartesQuery,
  useRoboPasajerosQuery,
  useHurtoPersonasQuery, useHurtoCasaQuery, useHurtoGanadoQuery,
  useHurtoEmpresasQuery, useHurtoVehiculosQuery, useHurtoPasajerosQuery,
  useDanosQuery,
} from '../../../hooks/useIncidenciasQuery';

const getColorByTurno = (turno = '') => {
  const n = (turno || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n === 'turno manana') return '#ffd93d';
  if (n === 'turno tarde')  return '#ff8c42';
  if (n === 'turno noche')  return '#6c5ce7';
  return '#74b9ff';
};

const CapaPatrimonioBase = ({ data = [], loading, error, isFetching, visible, label, emoji }) => {
  if (!visible) return null;
  return (
    <>
      {(loading || isFetching) && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '14px 24px', backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center',
          fontFamily: 'Segoe UI, sans-serif', border: '1px solid rgba(200,200,200,0.6)',
        }}>
          <ClipLoader size={28} color="#3498db" />
          <span style={{ marginLeft: 12, fontSize: 15, fontWeight: 500, color: '#2c3e50' }}>
            {loading ? `Cargando ${label}...` : 'Actualizando...'}
          </span>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '12px 20px', backgroundColor: 'rgba(255,99,99,0.9)',
          color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 500,
        }}>
          Error cargando {label}: {error.message}
        </div>
      )}
      <LayerGroup>
        {data.map((item, idx) => {
          const lat = parseFloat(item.Latitud);
          const lng = parseFloat(item.Longitud);
          if (isNaN(lat) || isNaN(lng)) return null;
          const color = getColorByTurno(item.Turno);
          return (
            <CircleMarker
              key={`${item.Latitud}-${item.Longitud}-${idx}`}
              center={[lat, lng]} radius={12}
              color={color} fillColor={color} fillOpacity={0.3} weight={2}
              pane="incidenciasPane"
            >
              <Popup>
                <div style={{ fontSize: 13, maxWidth: 260 }}>
                  <strong>{emoji} {label}</strong><br />
                  <strong>Cod. Inc.:</strong> {item.codigo_incidencia}<br />
                  <strong>Descripción:</strong><br />{item.Descripcion}<br />
                  <strong>Fecha:</strong> {item.Fecha}<br />
                  <strong>Hora:</strong> {item.Hora || '-'}<br />
                  <strong>Turno:</strong> {item.Turno}<br />
                  <strong>Jurisdicción:</strong> {item.Jurisdiccion}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.8}>
                <div style={{ fontSize: 11, fontWeight: 'bold' }}>{item.Turno}</div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </LayerGroup>
    </>
  );
};

const mk = (useHook, label, emoji) =>
  React.memo(({ visible, filtros }) => {
    const { data = [], isLoading, error, isFetching } = useHook(filtros, visible);
    return <CapaPatrimonioBase data={data} loading={isLoading} error={error} isFetching={isFetching} visible={visible} label={label} emoji={emoji} />;
  });

export const CapaRoboPersonas   = mk(useRoboPersonasQuery,   'Robo a Personas',    '🦹‍♂️');
export const CapaRoboCasa       = mk(useRoboCasaQuery,       'Robo Casa Habitada', '🏠');
export const CapaRoboGanado     = mk(useRoboGanadoQuery,     'Robo de Ganado',     '🐄');
export const CapaRoboEmpresas   = mk(useRoboEmpresasQuery,   'Robo a Empresas',    '🏢');
export const CapaRoboVehiculos  = mk(useRoboVehiculosQuery,  'Robo de Vehículos',  '🚗');
export const CapaRoboAutopartes = mk(useRoboAutopartesQuery, 'Robo de Autopartes', '🔧');
export const CapaRoboPasajeros  = mk(useRoboPasajerosQuery,  'Robo a Pasajeros',   '🚌');
export const CapaHurtoPersonas  = mk(useHurtoPersonasQuery,  'Hurto a Personas',   '👜');
export const CapaHurtoCasa      = mk(useHurtoCasaQuery,      'Hurto Casa Habitada','🏡');
export const CapaHurtoGanado    = mk(useHurtoGanadoQuery,    'Hurto de Ganado',    '🐂');
export const CapaHurtoEmpresas  = mk(useHurtoEmpresasQuery,  'Hurto a Empresas',   '🏪');
export const CapaHurtoVehiculos = mk(useHurtoVehiculosQuery, 'Hurto de Vehículos', '🚙');
export const CapaHurtoPasajeros = mk(useHurtoPasajerosQuery, 'Hurto a Pasajeros',  '🚍');
export const CapaDanos          = mk(useDanosQuery,          'Daños',              '💥');
