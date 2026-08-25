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
  'PATRIMONIO (DELITO)':                  'pnpPatrimonioTotal',
  'SEGURIDAD PÚBLICA (DELITO)':           'pnpSeguridadPublicaTotal',
  'VIDA, EL CUERPO Y LA SALUD (DELITO)': 'pnpVidaSaludTotal',
  'LIBERTAD (DELITO)':                    'pnpLibertadTotal',
  'ADMINISTRACIÓN PÚBLICA (DELITO)':      'pnpAdminPublicaTotal',
  'TRÁFICO ILÍCITO DE DROGAS':            'pnpTraficoTotal',
  'FAMILIA (DELITO)':                     'pnpFamiliaTotal',
  'MENOR INFRACTOR DE LA LEY PENAL':      'pnpMenorInfractorTotal',
  'FE PÚBLICA (DELITO)':                  'pnpFePublicaTotal',
  'TRANQUILIDAD PÚBLICA (DELITO)':        'pnpTranquilidadTotal',
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

  const incidencias = allIncidencias.filter(i => {
    if (tipo && i.modality?.subtype?.type?.name !== tipo) return false;
    if (filtros?.subtype_id && i.modality?.subtype?.id !== filtros.subtype_id) return false;
    if (filtros?.modality_id && i.modality?.id !== filtros.modality_id) return false;
    const normalizeName = (n) => {
      if (!n) return '';
      return n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    };

    if (filtros?.jurisdiction && normalizeName(i.jurisdiction) !== normalizeName(filtros.jurisdiction)) return false;
    return true;
  });

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

          const sinHora = !item.shift;
          const horaDisplay = sinHora
            ? 'Sin hora'
            : item.occurred_at
              ? new Date(item.occurred_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
              : '-';
          const turnoDisplay = item.shift ? (SHIFT_LABELS[item.shift] || item.shift) : 'Sin turno';

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
                <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>
                  {/* Cabecera */}
                  <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 6, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                      🛡️ {item.modality?.subtype?.type?.name || '—'}
                    </div>
                    {item.modality?.subtype?.name && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {item.modality.subtype.name}
                      </div>
                    )}
                    {item.modality?.name && (
                      <div style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, padding: '1px 6px', display: 'inline-block', marginTop: 3 }}>
                        {item.modality.name}
                      </div>
                    )}
                  </div>
                  {/* Datos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 8px' }}>
                    <span style={{ color: '#64748b', fontSize: 12 }}>N° Denuncia:</span>
                    <span style={{ fontSize: 12 }}>{item.complaint_number || <span style={{ color: '#9ca3af' }}>Sin número</span>}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Turno:</span>
                    <span style={{ fontSize: 12 }}>{turnoDisplay}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Hora:</span>
                    <span style={{ fontSize: 12 }}>{horaDisplay}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Jurisdicción:</span>
                    <span style={{ fontSize: 12 }}>{item.jurisdiction}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Comisaría:</span>
                    <span style={{ fontSize: 12 }}>{item.police_station}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Estado:</span>
                    <span style={{ fontSize: 12 }}>{CASE_STATUS_LABELS[item.case_status] || item.case_status || '—'}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Fecha:</span>
                    <span style={{ fontSize: 12 }}>{item.occurred_at ? new Date(item.occurred_at).toLocaleDateString('es-PE') : '-'}</span>
                  </div>
                  {/* Descripción */}
                  {item.description && (
                    <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#374151' }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.92}>
                <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 12, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.modality?.subtype?.type?.name || '—'}</div>
                  {item.modality?.subtype?.name && <div style={{ color: '#64748b', fontSize: 11 }}>{item.modality.subtype.name}</div>}
                  {item.modality?.name && <div style={{ color: '#2563eb', fontSize: 11 }}>{item.modality.name}</div>}
                  <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{turnoDisplay}</div>
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
