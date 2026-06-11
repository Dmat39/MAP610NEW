import React from 'react';
import { CircleMarker, LayerGroup, Popup, Tooltip } from 'react-leaflet';
import ClipLoader from 'react-spinners/ClipLoader';
import { useDrogasQuery } from '../../../hooks/useIncidenciasQuery';

// Función para obtener color por turno (mantenida localmente para el renderizado)
const getColorByTurno = (turno = '') => {
  const normalizado = (turno || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  switch (normalizado) {
    case 'turno manana':
      return '#ffd93d';
    case 'turno tarde':
      return '#ff8c42';
    case 'turno noche':
      return '#6c5ce7';
    default:
      return '#74b9ff';
  }
};

const CapaDrogas = ({ visible, filtros = null }) => {
  // Usar TanStack Query para obtener los datos con caché de 12 horas
  const {
    data: drogasFiltrados = [],
    isLoading: loading,
    error,
    isFetching,
  } = useDrogasQuery(filtros, visible);

  // Los eventos de conteo se manejan automáticamente en el hook useDrogasQuery

  if (!visible) return null;

  return (
    <>
      {(loading || isFetching) && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
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
          <ClipLoader size={28} color="#3498db" />
          <span
            style={{
              marginLeft: 12,
              fontSize: '15px',
              fontWeight: '500',
              color: '#2c3e50',
            }}
          >
            {loading ? 'Cargando incidencias de drogas...' : 'Actualizando...'}
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '12px 20px',
            backgroundColor: 'rgba(255, 99, 99, 0.9)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Error cargando drogas: {error.message}
        </div>
      )}

      <LayerGroup>
        {drogasFiltrados.map((item, idx) => {
          const lat = parseFloat(item.Latitud);
          const lng = parseFloat(item.Longitud);
          if (isNaN(lat) || isNaN(lng)) return null;

          const color = getColorByTurno(item.Turno);

          return (
            <CircleMarker
              key={`${item.Latitud}-${item.Longitud}-${idx}`}
              center={[lat, lng]}
              radius={12}
              color={color}
              fillColor={color}
              fillOpacity={0.3}
              weight={2}
              pane="incidenciasPane"
            >
              <Popup>
                <div style={{ fontSize: '13px', maxWidth: '260px' }}>
                  <strong>Drogas</strong>
                  <br />
                  <strong>Cod. Inc.:</strong> {item.codigo_incidencia}
                  <br />
                  <strong>Descripción:</strong>
                  <br />
                  {item.Descripcion}
                  <br />
                  <strong>Fecha:</strong> {item.Fecha}
                  <br />
                  <strong>Hora:</strong> {item.Hora || '-'}
                  <br />
                  <strong>Turno:</strong> {item.Turno}
                  <br />
                  <strong>Horario:</strong> {item.Horario}
                  <br />
                  <strong>Jurisdicción:</strong> {item.Jurisdiccion}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.8}>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{item.Turno}</div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </LayerGroup>
    </>
  );
};

// Optimizar con React.memo para evitar re-renders innecesarios
export default React.memo(CapaDrogas);
