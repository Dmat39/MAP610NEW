import React, { useEffect } from 'react';
import { CircleMarker, LayerGroup, Popup, Tooltip } from 'react-leaflet';
import ClipLoader from 'react-spinners/ClipLoader';
import { usePnpIncidenciasQuery } from '../../../hooks/usePnpIncidenciasQuery';

const SHIFT_COLORS = {
  MORNING:   '#ffd93d',
  AFTERNOON: '#ff8c42',
  NIGHT:     '#6c5ce7',
};

const TIPO_EVENTS = {
  'Robo al paso':                    'pnpRoboAlPasoTotal',
  'Robo agravado':                   'pnpRoboAgravadoTotal',
  'Microcomercialización de drogas': 'pnpDrogasTotal',
  'Violencia familiar':              'pnpViolenciaFamiliarTotal',
  'Accidente de tránsito':           'pnpAccidenteTotal',
  'Violencia sexual':                'pnpViolenciaSexualTotal',
  'Homicidio':                       'pnpHomicidioTotal',
  'Lesiones':                        'pnpLesionesTotal',
  'Hurto':                           'pnpHurtoTotal',
  'Otros':                           'pnpOtrosTotal',
};

const SHIFT_LABELS = {
  MORNING:   'Turno Mañana',
  AFTERNOON: 'Turno Tarde',
  NIGHT:     'Turno Noche',
};

const CASE_STATUS_LABELS = {
  INVESTIGATING: 'En investigación',
  REFERRED:      'Derivado',
  CLOSED:        'Cerrado',
};


const CapaIncidenciasPNP = ({ visible, filtros = null, tipo }) => {
  const {
    data: allIncidencias = [],
    isLoading,
    isFetching,
    error,
  } = usePnpIncidenciasQuery(filtros, visible);

  const incidencias = tipo
    ? allIncidencias.filter(i => i.incidence_type === tipo)
    : allIncidencias;

  useEffect(() => {
    if (!visible || !tipo) return;
    const eventName = TIPO_EVENTS[tipo];
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName, { detail: incidencias.length }));
    }
  }, [incidencias.length, visible, tipo]);

  // Reset counter to 0 when hidden
  useEffect(() => {
    if (visible || !tipo) return;
    const eventName = TIPO_EVENTS[tipo];
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName, { detail: 0 }));
    }
  }, [visible, tipo]);

  if (!visible) return null;

  return (
    <>
      {(isLoading || isFetching) && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '14px 24px',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255,255,255,0.75)',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid rgba(200,200,200,0.6)',
          }}
        >
          <ClipLoader size={28} color="#3498db" />
          <span style={{ marginLeft: 12, fontSize: '15px', fontWeight: '500', color: '#2c3e50' }}>
            Cargando incidencias PNP...
          </span>
        </div>
      )}

      {error && !isFetching && (
        <div
          style={{
            position: 'absolute', top: '70px', left: '50%',
            transform: 'translateX(-50%)', zIndex: 9999,
            padding: '12px 20px', backgroundColor: 'rgba(255,99,99,0.9)',
            color: 'white', borderRadius: '8px', fontSize: '14px',
          }}
        >
          Error cargando incidencias PNP
        </div>
      )}

      <LayerGroup>
        {incidencias.map((item, idx) => {
          const lat = parseFloat(item.latitude);
          const lng = parseFloat(item.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const color = SHIFT_COLORS[item.shift] || '#74b9ff';

          return (
            <CircleMarker
              key={`pnp-${tipo}-${item.id || idx}`}
              center={[lat, lng]}
              radius={12}
              color={color}
              fillColor={color}
              fillOpacity={0.3}
              weight={2}
            >
              <Popup>
                <div style={{ fontSize: '13px', maxWidth: '260px' }}>
                  <strong>🛡️ {item.incidence_type}</strong>
                  <br />
                  <strong>N° Denuncia:</strong>{' '}
                  {item.complaint_number || <span style={{ color: '#9ca3af' }}>Sin número</span>}
                  <br />
                  <strong>Descripción:</strong>
                  <br />
                  {item.description}
                  <br />
                  <strong>Turno:</strong> {SHIFT_LABELS[item.shift] || item.shift}
                  <br />
                  <strong>Horario:</strong> {item.horario || '-'}
                  <br />
                  <strong>Jurisdicción:</strong> {item.jurisdiction}
                  <br />
                  <strong>Comisaría:</strong> {item.police_station}
                  <br />
                  <strong>Estado:</strong> {CASE_STATUS_LABELS[item.case_status] || item.case_status}
                  <br />
                  <strong>Fecha:</strong>{' '}
                  {item.occurred_at ? new Date(item.occurred_at).toLocaleDateString('es-PE') : '-'}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.85}>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                  {item.incidence_type} — {SHIFT_LABELS[item.shift]}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </LayerGroup>
    </>
  );
};

export default React.memo(CapaIncidenciasPNP);
