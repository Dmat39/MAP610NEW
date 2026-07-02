// PanelFiltrosSeguridad.jsx
// Contenedor unificado con pestañas para los filtros de las capas de seguridad.
// Reúne los controles (cámaras, bodycams, radios, rutas) en una sola caja con
// una barra de pestañas; solo se muestra el contenido de la capa seleccionada.
// Recibe `tabs`: [{ id, label, icon, color, render }] ya filtrado a las capas activas.
import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import './PanelFiltrosSeguridad.css';

const PanelFiltrosSeguridad = ({
  tabs = [],
  top = 10,
  mapType = 'leaflet',
  jurisdicciones = [],
  jurisdiccionesSeleccionadas = [],
  onJurisdiccionesChange,
  footer = null,
}) => {
  const validTabs = useMemo(() => tabs.filter(Boolean), [tabs]);
  const [activeId, setActiveId] = useState(validTabs[0]?.id);
  const [jurisColapsado, setJurisColapsado] = useState(true);

  // Si la pestaña activa deja de existir (se apagó su capa), saltar a la primera.
  useEffect(() => {
    if (validTabs.length === 0) return;
    if (!validTabs.some(t => t.id === activeId)) {
      setActiveId(validTabs[0].id);
    }
  }, [validTabs, activeId]);

  if (validTabs.length === 0) return null;

  const seleccionadas = Array.isArray(jurisdiccionesSeleccionadas) ? jurisdiccionesSeleccionadas : [];
  const mostrarJurisdiccion = jurisdicciones.length > 0 && typeof onJurisdiccionesChange === 'function';

  const toggleJurisdiccion = (zona) => {
    if (seleccionadas.includes(zona)) {
      onJurisdiccionesChange(seleccionadas.filter(z => z !== zona));
    } else {
      onJurisdiccionesChange([...seleccionadas, zona]);
    }
  };

  return (
    <div
      className={`pfs-container ${mapType}-mode`}
      style={{
        position: 'fixed',
        left: 'calc(var(--sidebar-width, 70px) + 15px)',
        top,
        zIndex: 1000,
      }}
    >
      {/* 1) Pestañas */}
      <div className="pfs-tabs" role="tablist">
        {validTabs.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            role="tab"
            aria-selected={id === activeId}
            className={`pfs-tab ${id === activeId ? 'active' : ''}`}
            style={id === activeId ? { color, borderBottomColor: color } : undefined}
            onClick={() => setActiveId(id)}
            title={label}
          >
            {Icon && <Icon size={16} />}
            <span className="pfs-tab-label">{label}</span>
          </button>
        ))}
      </div>

      {/* 2) Filtros de la pestaña activa */}
      <div className="pfs-body">
        {validTabs.map(tab => (
          <div
            key={tab.id}
            className="pfs-tab-pane"
            style={{ display: tab.id === activeId ? 'block' : 'none' }}
          >
            {tab.render()}
          </div>
        ))}
      </div>

      {/* 3) Jurisdicción global */}
      {mostrarJurisdiccion && (
        <div className={`pfs-juris ${jurisColapsado ? 'collapsed' : ''}`}>
          <button
            className="pfs-juris-header"
            onClick={() => setJurisColapsado(c => !c)}
            title={jurisColapsado ? 'Expandir jurisdicciones' : 'Colapsar jurisdicciones'}
          >
            <MapPin size={15} />
            <span className="pfs-juris-title">Jurisdicción</span>
            <span className="pfs-juris-value">
              {seleccionadas.length === 0 ? 'Todas' : `${seleccionadas.length} sel.`}
            </span>
            {jurisColapsado ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          {!jurisColapsado && (
            <div className="pfs-juris-list">
              {seleccionadas.length > 0 && (
                <button
                  className="pfs-juris-clear"
                  onClick={() => onJurisdiccionesChange([])}
                >
                  Ver todas
                </button>
              )}
              {jurisdicciones.map(zona => (
                <label key={zona} className="pfs-juris-item">
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(zona)}
                    onChange={() => toggleJurisdiccion(zona)}
                  />
                  <span className="pfs-juris-check" />
                  <span className="pfs-juris-name">{zona}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4) Totales */}
      {footer}
    </div>
  );
};

export default PanelFiltrosSeguridad;
