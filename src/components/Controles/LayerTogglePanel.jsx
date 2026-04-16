import "./LayerTogglePanel.css";
import { Layers, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import authService from "../../services/authService";

const LayerTogglePanel = ({ capas, onToggle, mapType, onMapTypeChange, onExpandChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState({
    cameras: true,
    incidents: false,
    infrastructure: false,
    tools: false,
    zonas: true,
  });

  const userRole = authService.getUserRole();
  const isOperator = userRole === 'OPERATOR';

  const categories = {
    cameras: {
      title: 'Cámaras de Seguridad',
      layers: ['camaras', 'camarasVecinales'],
    },
    incidents: {
      title: 'Incidencias Delictivas',
      layers: ['robos', 'extorsiones', 'homicidios', 'feminicidios', 'sicariatos', 'secuestros', 'drogas', 'barras'],
    },
    infrastructure: {
      title: 'Puntos Estratégicos',
      layers: ['paraderosAutorizados', 'defensaCivil', 'paraderosNoAutorizados', 'residuos', 'sostenimiento', 'actividades'],
    },
    tools: {
      title: 'Herramientas',
      layers: ['clusters', 'busquedaDirecciones', 'ubicadorPunto', 'rutas'],
    },
    zonas: {
      title: 'Zonas Geográficas',
      layers: ['zonasCodisec'],
    },
  };

  const toggleCategory = (categoryKey) => {
    setCategoriesExpanded(prev => ({ ...prev, [categoryKey]: !prev[categoryKey] }));
  };

  const getCapaByName = (name) => capas.find(capa => capa.name === name);

  // Activar/desactivar todas las capas de una categoría
  const handleToggleAll = (e, categoryLayers) => {
    e.stopPropagation();
    const allActive = categoryLayers.every(capa => capa.visible);
    categoryLayers.forEach(capa => {
      if (allActive ? capa.visible : !capa.visible) {
        onToggle(capa.name);
      }
    });
  };

  // Total de capas activas en todo el panel (para badge en header)
  const totalActive = capas.filter(c => c.visible).length;

  useEffect(() => {
    if (onExpandChange) onExpandChange(isExpanded);
  }, [isExpanded, onExpandChange]);

  return (
    <div
      className={`layer-toggle-panel ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header con badge de activas cuando está colapsado */}
      <div className="panel-header">
        <div className="header-content">
          <Layers size={18} />
          <h4>Capas del Mapa</h4>
        </div>
        <div className="header-right">
          {!isExpanded && totalActive > 0 && (
            <span className="active-badge" title={`${totalActive} capa${totalActive !== 1 ? 's' : ''} activa${totalActive !== 1 ? 's' : ''}`}>
              {totalActive}
            </span>
          )}
          <ChevronDown size={16} className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} />
        </div>
      </div>

      <div className="panel-controls">
        {Object.entries(categories)
          .filter(([categoryKey, category]) => {
            if (categoryKey === 'incidents' && isOperator) return false;
            const availableLayers = category.layers.map(getCapaByName).filter(Boolean);
            return availableLayers.length > 0;
          })
          .map(([categoryKey, category]) => {
            const categoryLayers = category.layers.map(getCapaByName).filter(Boolean);
            const isCatExpanded = categoriesExpanded[categoryKey];
            const activeCount = categoryLayers.filter(c => c.visible).length;
            const allActive = activeCount === categoryLayers.length;
            const hasActive = activeCount > 0;

            return (
              <div key={categoryKey} className="layer-category">
                <div className={`category-header ${hasActive ? 'has-active' : ''}`}>
                  {/* Lado izquierdo — colapsa/expande al hacer clic */}
                  <div className="category-header-left" onClick={() => toggleCategory(categoryKey)}>
                    {isCatExpanded
                      ? <ChevronDown size={14} className="category-chevron" />
                      : <ChevronRight size={14} className="category-chevron" />
                    }
                    <span className="category-title">{category.title}</span>
                  </div>

                  {/* Lado derecho — contador y toggle-all */}
                  <div className="category-header-right">
                    <span className={`category-count ${hasActive ? 'has-active' : ''}`}>
                      {activeCount}/{categoryLayers.length}
                    </span>
                    <button
                      className={`category-toggle-all ${allActive ? 'all-active' : hasActive ? 'partial' : ''}`}
                      onClick={(e) => handleToggleAll(e, categoryLayers)}
                      title={allActive ? 'Desactivar todas' : 'Activar todas'}
                    >
                      {allActive ? '−' : '+'}
                    </button>
                  </div>
                </div>

                {isCatExpanded && (
                  <div className="category-layers">
                    {categoryLayers.map((capa) => (
                      <label key={capa.name} className="layer-checkbox">
                        <input
                          type="checkbox"
                          checked={capa.visible}
                          onChange={() => onToggle(capa.name)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="layer-label">{capa.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default LayerTogglePanel;
