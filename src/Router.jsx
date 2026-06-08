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
import GestionRoles       from './components/admin/GestionRoles';
import DashboardPNP       from './components/admin/DashboardPNP';
import DashboardSerenos   from './components/admin/DashboardSerenos';
import ReporteIncidencias from './components/admin/ReporteIncidencias';
import GestionComisarias            from './components/admin/GestionComisarias';
import GestionPuntosCampana         from './components/admin/GestionPuntosCampana';
import GestionTiposIncidencia       from './components/admin/GestionTiposIncidencia';
import GestionSubtiposIncidencia    from './components/admin/GestionSubtiposIncidencia';
import GestionModalidadesIncidencia from './components/admin/GestionModalidadesIncidencia';

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
          <Route path="/admin/camaras-vecinales" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR']} moduleKey="camaras-vecinales">
              <GestionCamarasVecinales />
            </ProtectedRoute>
          } />
          <Route path="/admin/camaras-municipales" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR']} moduleKey="camaras-municipales">
              <GestionCamarasMunicipales />
            </ProtectedRoute>
          } />
          <Route path="/admin/usuarios" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN']} moduleKey="usuarios">
              <GestionUsuarios />
            </ProtectedRoute>
          } />
          <Route path="/admin/actividades" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR', 'CODISEC']} moduleKey="actividades">
              <GestionActividades />
            </ProtectedRoute>
          } />
          <Route path="/admin/incidencias-pnp" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR', 'PNP']} moduleKey="incidencias-pnp">
              <GestionIncidenciasPNP />
            </ProtectedRoute>
          } />
          <Route path="/admin/roles" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN']} moduleKey="roles">
              <GestionRoles />
            </ProtectedRoute>
          } />
          <Route path="/admin/auditoria" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN']} moduleKey="auditoria">
              <GestionAuditoria />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/serenos" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR', 'CODISEC']} moduleKey="dashboard-serenos">
              <DashboardSerenos />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/pnp" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR', 'PNP']} moduleKey="dashboard-pnp">
              <DashboardPNP />
            </ProtectedRoute>
          } />
          <Route path="/admin/comisarias" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR']} moduleKey="comisarias">
              <GestionComisarias />
            </ProtectedRoute>
          } />
          <Route path="/admin/puntos-campana" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR']} moduleKey="puntos-campana">
              <GestionPuntosCampana />
            </ProtectedRoute>
          } />
          <Route path="/admin/tipos-incidencia" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR']} moduleKey="tipos-incidencia">
              <GestionTiposIncidencia />
            </ProtectedRoute>
          } />
          <Route path="/admin/subtipos-incidencia" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR']} moduleKey="subtipos-incidencia">
              <GestionSubtiposIncidencia />
            </ProtectedRoute>
          } />
          <Route path="/admin/modalidades-incidencia" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR']} moduleKey="modalidades-incidencia">
              <GestionModalidadesIncidencia />
            </ProtectedRoute>
          } />
          <Route path="/reportes/incidencias" element={
            <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMINISTRATOR', 'SUPERVISOR', 'CODISEC']} moduleKey="reportes-incidencias">
              <ReporteIncidencias />
            </ProtectedRoute>
          } />
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
