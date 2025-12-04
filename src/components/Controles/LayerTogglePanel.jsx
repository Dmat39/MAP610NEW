import "./LayerTogglePanel.css";
import { Layers, ChevronDown } from "lucide-react";
import { useState } from "react";

const LayerTogglePanel = ({ capas, onToggle, mapType, onMapTypeChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
        {capas.map((capa) => (
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

        {/* Separador y toggle de mapas */}
       {/*  <div className="map-toggle-separator"></div>
        <div className="map-toggle-section">
          <h5 className="map-toggle-title">Tipo de Mapa</h5>
          <div className="map-toggle-options">
            <label className="map-toggle-option">
              <input
                type="radio"
                name="mapType"
                value="leaflet"
                checked={mapType === 'leaflet'}
                onChange={(e) => onMapTypeChange(e.target.value)}
              />
              <span className="map-toggle-label">
                🍃 Leaflet
              </span>
            </label>

            <label className="map-toggle-option">
              <input
                type="radio"
                name="mapType"
                value="google"
                checked={mapType === 'google'}
                onChange={(e) => onMapTypeChange(e.target.value)}
              />
              <span className="map-toggle-label">
                🗺️ Google Maps
              </span>
            </label>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default LayerTogglePanel;
