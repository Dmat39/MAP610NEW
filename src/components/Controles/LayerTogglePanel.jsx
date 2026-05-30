import './LayerTogglePanel.css';
import { Layers, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMapLayout } from '../../context/MapLayoutContext';

const LayerTogglePanel = ({ capas, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState({
    cameras: true,
    incidents: false,
    incidentsPnp: false,
    infrastructure: false,
    tools: false,
    zonas: false,
  });
  const [subgroupsExpanded, setSubgroupsExpanded] = useState({
    robosSubgrupo: false,
    hurtosSubgrupo: false,
    danosSubgrupo: false,
  });
  const toggleSubgroup = key =>
    setSubgroupsExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const { setDrawerOpen } = useMapLayout();

  useEffect(() => {
    setDrawerOpen(isOpen);
  }, [isOpen, setDrawerOpen]);

  const categories = {
    
    cameras: {
      title: 'Cámaras de Seguridad',
      layers: ['camaras', 'camarasVecinales'],
    },
    zonas: {
      title: 'Zonas Geográficas',
      layers: ['zonasCodisec', 'jurisdicciones'],
    },
    incidents: {
      title: 'Incidencias Delictivas',
      subgroups: [
        {
          key: 'robosSubgrupo', label: 'Robos', color: '#1d4ed8',
          layers: ['roboPersonas','roboCasa','roboGanado','roboEmpresas','roboVehiculos','roboAutopartes','roboPasajeros'],
        },
        {
          key: 'hurtosSubgrupo', label: 'Hurtos', color: '#7c3aed',
          layers: ['hurtoPersonas','hurtoCasa','hurtoGanado','hurtoEmpresas','hurtoVehiculos','hurtoPasajeros'],
        },
        {
          key: 'danosSubgrupo', label: 'Daños', color: '#f97316',
          layers: ['danos'],
        },
      ],
      layers: ['extorsiones', 'homicidios', 'feminicidios', 'sicariatos', 'secuestros', 'drogas', 'barras'],
    },
    incidentsPnp: {
      title: 'Incidencias PNP',
      layers: [
        'pnpPatrimonio', 'pnpSeguridadPublica', 'pnpVidaSalud', 'pnpLibertad',
        'pnpAdminPublica', 'pnpTrafico', 'pnpFamilia', 'pnpMenorInfractor',
        'pnpFePublica', 'pnpTranquilidad',
      ],
    },
    infrastructure: {
      title: 'Puntos Estratégicos',
      layers: ['paraderosAutorizados', 'defensaCivil', 'paraderosNoAutorizados', 'residuos', 'sostenimiento', 'actividades', 'comisarias'],
    },
    tools: {
      title: 'Herramientas',
      layers: ['clusters', 'clusterCombinado', 'clusterPNP', 'busquedaDirecciones', 'ubicadorPunto', 'rutas'],
    },
    
  };

  const toggleCategory = key =>
    setCategoriesExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const getCapaByName = name => capas.find(c => c.name === name);

  const handleToggleAll = (e, categoryLayers) => {
    e.stopPropagation();
    const allActive = categoryLayers.every(c => c.visible);
    categoryLayers.forEach(capa => {
      if (allActive ? capa.visible : !capa.visible) onToggle(capa.name);
    });
  };

  const totalActive = capas.filter(c => c.visible).length;

  const visibleCategories = Object.entries(categories).filter(([, cat]) =>
    cat.layers.map(getCapaByName).filter(Boolean).length > 0
  );

  return (
    <>
      {/* Trigger button */}
      <button
        className={`layers-trigger-btn${isOpen ? ' active' : ''}`}
        onClick={() => setIsOpen(true)}
        title="Gestionar capas del mapa"
      >
        <Layers size={17} />
        <span>Capas</span>
        {totalActive > 0 && (
          <span className="trigger-badge">{totalActive}</span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* Drawer */}
      <div className={`layers-drawer${isOpen ? ' open' : ''}`}>
        {/* Drawer header */}
        <div className="drawer-header">
          <div className="drawer-title">
            <Layers size={18} />
            <h3>Capas del Mapa</h3>
          </div>
          <button
            className="drawer-close"
            onClick={() => setIsOpen(false)}
            title="Cerrar"
          >
            <X size={17} />
          </button>
        </div>

        <div className="drawer-meta">
          {totalActive} capa{totalActive !== 1 ? 's' : ''} activa{totalActive !== 1 ? 's' : ''}
        </div>

        {/* Categories */}
        <div className="drawer-body">
          {visibleCategories.map(([key, category]) => {
            const subgroupLayers = (category.subgroups || []).flatMap(sg => sg.layers.map(getCapaByName).filter(Boolean));
            const regularLayers  = category.layers.map(getCapaByName).filter(Boolean);
            const categoryLayers = [...subgroupLayers, ...regularLayers];
            const isCatExpanded = categoriesExpanded[key];
            const activeCount = categoryLayers.filter(c => c.visible).length;
            const allActive = categoryLayers.length > 0 && activeCount === categoryLayers.length;
            const hasActive = activeCount > 0;

            return (
              <div key={key} className="drawer-category">
                <div
                  className={`cat-header${hasActive ? ' has-active' : ''}`}
                  onClick={() => toggleCategory(key)}
                >
                  <div className="cat-left">
                    <ChevronDown
                      size={14}
                      className={`cat-chevron${isCatExpanded ? '' : ' collapsed'}`}
                    />
                    <span className="cat-title">{category.title}</span>
                  </div>
                  <div className="cat-right">
                    <span className={`cat-count${hasActive ? ' has-active' : ''}`}>
                      {activeCount}/{categoryLayers.length}
                    </span>
                    <button
                      className={`cat-toggle-btn${allActive ? ' all-active' : ''}`}
                      onClick={e => handleToggleAll(e, categoryLayers)}
                      title={allActive ? 'Ocultar todas' : 'Mostrar todas'}
                    >
                      {allActive ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                {isCatExpanded && (
                  <div className="cat-layers">
                    {/* Subgrupos expandibles (ej: Robos, Hurtos, Daños) */}
                    {(category.subgroups || []).map(sg => {
                      const sgLayers = sg.layers.map(getCapaByName).filter(Boolean);
                      const sgActive = sgLayers.filter(c => c.visible).length;
                      const sgAll = sgActive === sgLayers.length && sgLayers.length > 0;
                      const isExpanded = subgroupsExpanded[sg.key];
                      return (
                        <div key={sg.key} style={{ marginBottom: 2 }}>
                          {/* Cabecera del subgrupo — mismo estilo que una capa normal */}
                          <div className={`layer-row${sgActive > 0 ? ' has-active' : ''}`}
                            style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}
                              onClick={() => toggleSubgroup(sg.key)}>
                              <ChevronDown size={11} style={{
                                color: '#9ca3af', flexShrink: 0,
                                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.2s',
                              }} />
                              <span className="layer-name">{sg.label}</span>
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>({sgActive}/{sgLayers.length})</span>
                            </div>
                            <button
                              className={`switch${sgAll ? ' on' : ''}`}
                              onClick={e => { e.stopPropagation(); sgLayers.forEach(c => { if (sgAll ? c.visible : !c.visible) onToggle(c.name); }); }}
                              role="switch" aria-checked={sgAll}
                            >
                              <span className="switch-thumb" />
                            </button>
                          </div>
                          {/* Capas individuales del subgrupo */}
                          {isExpanded && (
                            <div style={{ paddingLeft: 16 }}>
                              {sgLayers.map(capa => (
                                <div key={capa.name} className="layer-row">
                                  <span className="layer-name">{capa.label}</span>
                                  <button
                                    className={`switch${capa.visible ? ' on' : ''}`}
                                    onClick={() => onToggle(capa.name)}
                                    role="switch" aria-checked={capa.visible}
                                  >
                                    <span className="switch-thumb" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Capas regulares (sin subgrupos) */}
                    {regularLayers.map(capa => (
                      <div key={capa.name} className="layer-row">
                        <span className="layer-name">{capa.label}</span>
                        <button
                          className={`switch${capa.visible ? ' on' : ''}`}
                          onClick={() => onToggle(capa.name)}
                          aria-label={`${capa.visible ? 'Desactivar' : 'Activar'} ${capa.label}`}
                          role="switch"
                          aria-checked={capa.visible}
                        >
                          <span className="switch-thumb" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LayerTogglePanel;
