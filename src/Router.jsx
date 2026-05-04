import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
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
const SIDEBAR_HIDDEN    = '0px';
const MOBILE_BREAKPOINT = 768;

const AppLayout = ({ sidebarExpanded, onToggle, onClose, isMobile }) => {
  const location = useLocation();
  const isMapView = location.pathname === '/';

  useEffect(() => {
    if (isMobile) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isMobile]);

  return (
    <>
      <Sidebar
        isExpanded={sidebarExpanded}
        onToggle={onToggle}
        isMobile={isMobile}
        onClose={onClose}
      />

      {isMobile && sidebarExpanded && (
        <div className="sidebar-mobile-overlay" onClick={onClose} />
      )}

      {isMobile && isMapView && !sidebarExpanded && (
        <button
          className="mobile-menu-fab"
          onClick={onToggle}
          aria-label="Abrir menú"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
      )}

      {!isMapView && <TopHeader onMenuToggle={onToggle} isMobile={isMobile} />}

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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) setSidebarExpanded(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const width = isMobile
      ? SIDEBAR_HIDDEN
      : sidebarExpanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;
    document.documentElement.style.setProperty('--sidebar-width', width);
  }, [sidebarExpanded, isMobile]);

  return (
    <BrowserRouter>
      <ProtectedRoute>
        <AppLayout
          sidebarExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(p => !p)}
          onClose={() => setSidebarExpanded(false)}
          isMobile={isMobile}
        />
      </ProtectedRoute>
    </BrowserRouter>
  );
};

export default Router;
