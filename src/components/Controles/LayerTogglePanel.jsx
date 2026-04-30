import './LayerTogglePanel.css';
import { Layers, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import authService from '../../services/authService';
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

  const { setDrawerOpen } = useMapLayout();
  const userRole = authService.getUserRole();
  const isOperator = userRole === 'OPERATOR';
  const isPnp = userRole === 'PNP';

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
      layers: ['robos', 'extorsiones', 'homicidios', 'feminicidios', 'sicariatos', 'secuestros', 'drogas', 'barras'],
    },
    incidentsPnp: {
      title: 'Incidencias PNP',
      layers: [
        'pnpRoboAlPaso', 'pnpRoboAgravado', 'pnpDrogas', 'pnpViolenciaFamiliar',
        'pnpAccidente', 'pnpViolenciaSexual', 'pnpHomicidio', 'pnpLesiones',
        'pnpHurto', 'pnpOtros',
      ],
    },
    infrastructure: {
      title: 'Puntos Estratégicos',
      layers: ['paraderosAutorizados', 'defensaCivil', 'paraderosNoAutorizados', 'residuos', 'sostenimiento', 'actividades'],
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

  const visibleCategories = Object.entries(categories).filter(([key, cat]) => {
    if (key === 'incidents' && (isOperator || isPnp)) return false;
    return cat.layers.map(getCapaByName).filter(Boolean).length > 0;
  });

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
            const categoryLayers = category.layers.map(getCapaByName).filter(Boolean);
            const isCatExpanded = categoriesExpanded[key];
            const activeCount = categoryLayers.filter(c => c.visible).length;
            const allActive = activeCount === categoryLayers.length;
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
                    {categoryLayers.map(capa => (
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
