import React, { useState, useEffect } from 'react';
import { Camera, Video, Radio, Route } from 'lucide-react';
import './PanelRecursos.css';

const PanelRecursos = ({
  capasVisibles,
  childrenCamaras,
  childrenBodycams,
  childrenRadios,
  childrenRutasVehiculos,
  childrenRutasBodycams,
  mapType = 'leaflet'
}) => {
  const [activeTab, setActiveTab] = useState(null);

  const tabs = [
    { id: 'camaras', label: 'Cámaras', icon: <Camera size={15} />, visible: capasVisibles.camaras },
    { id: 'bodycams', label: 'Bodycams', icon: <Video size={15} />, visible: capasVisibles.bodycams },
    { id: 'radios', label: 'Radios', icon: <Radio size={15} />, visible: capasVisibles.radios },
    { id: 'rutas', label: 'Rutas', icon: <Route size={15} />, visible: capasVisibles.rutas || capasVisibles.rutasBodycams }
  ].filter(t => t.visible);

  useEffect(() => {
    if (tabs.length > 0) {
      if (!activeTab || !tabs.find(t => t.id === activeTab)) {
        setActiveTab(tabs[0].id);
      }
    } else {
      setActiveTab(null);
    }
  }, [tabs, activeTab]);

  if (tabs.length === 0) return null;

  return (
    <div className={`panel-recursos-container ${mapType}-mode`}>
      <div className="panel-recursos-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`pr-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="pr-tab-icon" style={{ color: activeTab === tab.id ? '#16a34a' : '#6b7280' }}>
              {tab.icon}
            </span>
            <span className="pr-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="panel-recursos-content">
        {activeTab === 'camaras' && childrenCamaras}
        {activeTab === 'bodycams' && childrenBodycams}
        {activeTab === 'radios' && childrenRadios}
        {activeTab === 'rutas' && (
          <div className="pr-rutas-container">
            {capasVisibles.rutas && childrenRutasVehiculos}
            {capasVisibles.rutas && capasVisibles.rutasBodycams && <hr className="pr-divider" />}
            {capasVisibles.rutasBodycams && childrenRutasBodycams}
          </div>
        )}
      </div>
    </div>
  );
};

export default PanelRecursos;
