import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar/Sidebar';
import TopHeader from './components/layout/TopHeader';
import MapView from './MapView';
import GestionCamarasVecinales from './components/admin/GestionCamarasVecinales';
import GestionCamarasMunicipales from './components/admin/GestionCamarasMunicipales';
import GestionUsuarios from './components/admin/GestionUsuarios';
import GestionActividades from './components/admin/GestionActividades';
import GestionIncidenciasPNP from './components/admin/GestionIncidenciasPNP';
import GestionAuditoria    from './components/admin/GestionAuditoria';
import DashboardPNP       from './components/admin/DashboardPNP';
import DashboardSerenos   from './components/admin/DashboardSerenos';

const SIDEBAR_COLLAPSED = '70px';
const SIDEBAR_EXPANDED  = '220px';

const AppLayout = ({ sidebarExpanded, onToggle }) => {
  const location = useLocation();
  const isMapView = location.pathname === '/';

  return (
    <>
      <Sidebar
        isExpanded={sidebarExpanded}
        onToggle={onToggle}
      />
      {!isMapView && <TopHeader />}
      <div className={`main-content${!isMapView ? ' with-top-header' : ''}`}>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/admin/camaras-vecinales" element={<GestionCamarasVecinales />} />
          <Route path="/admin/camaras-municipales" element={<GestionCamarasMunicipales />} />
          <Route path="/admin/usuarios" element={<GestionUsuarios />} />
          <Route path="/admin/actividades" element={<GestionActividades />} />
          <Route path="/admin/incidencias-pnp" element={<GestionIncidenciasPNP />} />
          <Route path="/admin/auditoria"          element={<GestionAuditoria />} />
          <Route path="/dashboard/serenos"       element={<DashboardSerenos />} />
          <Route path="/dashboard/pnp"           element={<DashboardPNP />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
};

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
        <AppLayout
          sidebarExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(p => !p)}
        />
      </ProtectedRoute>
    </BrowserRouter>
  );
};

export default Router;
