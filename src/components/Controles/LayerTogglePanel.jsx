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

  // Obtener el rol del usuario
  const userRole = authService.getUserRole();
  const isOperator = userRole === 'OPERATOR';

  // Organizar capas por categorías
  const categories = {
    cameras: {
      title: 'Cámaras de Seguridad',
      layers: ['camaras', 'camarasVecinales']
    },
    incidents: {
      title: 'Incidencias Delictivas',
      layers: ['robos', 'extorsiones', 'homicidios', 'feminicidios', 'sicariatos', 'secuestros', 'drogas', 'barras']
    },
    infrastructure: {
      title: 'Puntos Estratégicos',
      layers: ['paraderosAutorizados', 'defensaCivil', 'paraderosNoAutorizados', 'residuos', 'sostenimiento', 'actividades']
    },
    tools: {
      title: 'Herramientas',
      layers: ['clusters', 'busquedaDirecciones', 'ubicadorPunto', 'rutas']
    },
    zonas: {
      title: 'Zonas Geográficas',
      layers: ['zonasCodisec']
    }
  };

  const toggleCategory = (categoryKey) => {
    setCategoriesExpanded(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const getCapaByName = (name) => {
    return capas.find(capa => capa.name === name);
  };

  // Notificar cambios en el estado de expansión
  useEffect(() => {
    if (onExpandChange) {
      onExpandChange(isExpanded);
    }
  }, [isExpanded, onExpandChange]);

  return (
    <div
      className={`layer-toggle-panel ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="panel-header">
        <div className="header-content">
          <Layers size={18} />
          <h4>Capas del Mapa</h4>
        </div>
        <ChevronDown size={16} className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} />
      </div>

      <div className="panel-controls">
        {Object.entries(categories)
          .filter(([categoryKey, category]) => {
            // Ocultar incidencias delictivas si el usuario es OPERADOR
            if (categoryKey === 'incidents' && isOperator) {
              return false;
            }
            // Ocultar categorías sin capas disponibles (ej: CODISEC)
            const availableLayers = category.layers.map(getCapaByName).filter(Boolean);
            if (availableLayers.length === 0) {
              return false;
            }
            return true;
          })
          .map(([categoryKey, category]) => {
          const categoryLayers = category.layers.map(getCapaByName).filter(Boolean);
          const isExpanded = categoriesExpanded[categoryKey];

          return (
            <div key={categoryKey} className="layer-category">
              <div
                className="category-header"
                onClick={() => toggleCategory(categoryKey)}
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="category-chevron" />
                ) : (
                  <ChevronRight size={14} className="category-chevron" />
                )}
                <span className="category-title">{category.title}</span>
                <span className="category-count">({categoryLayers.length})</span>
              </div>

              {isExpanded && (
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
