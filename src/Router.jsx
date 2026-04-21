import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar/Sidebar';
import MapView from './MapView';
import GestionCamarasVecinales from './components/admin/GestionCamarasVecinales';
import GestionCamarasMunicipales from './components/admin/GestionCamarasMunicipales';
import GestionUsuarios from './components/admin/GestionUsuarios';
import GestionActividades from './components/admin/GestionActividades';

const SIDEBAR_COLLAPSED = '70px';
const SIDEBAR_EXPANDED  = '220px';

const Router = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      sidebarExpanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED
    );
  }, [sidebarExpanded]);

  return (
    <BrowserRouter>
      <ProtectedRoute>
        <Sidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(p => !p)}
        />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/admin/camaras-vecinales" element={<GestionCamarasVecinales />} />
            <Route path="/admin/camaras-municipales" element={<GestionCamarasMunicipales />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
            <Route path="/admin/actividades" element={<GestionActividades />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ProtectedRoute>
    </BrowserRouter>
  );
};

export default Router;
