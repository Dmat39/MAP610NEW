import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut, MapPin, Camera, Map, Video, Users,
  Calendar, ChevronRight, ChevronLeft, Shield, ClipboardList,
  LayoutDashboard, ShieldCheck, KeyRound, Building2,
} from 'lucide-react';
import ConfirmModal from '../Modal/ConfirmModal';
import './Sidebar.css';

const Sidebar = ({ isExpanded, onToggle, isMobile, onClose }) => {
  const { user, logout, hasModuleAccess, customRolePerms } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, left: 0 });
  const userBtnRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = e => {
      if (
        userBtnRef.current && !userBtnRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleToggleUserMenu = () => {
    if (!showUserMenu && userBtnRef.current) {
      const rect = userBtnRef.current.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
    setShowUserMenu(v => !v);
  };

  const role = user?.role?.toUpperCase();
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMINISTRATOR' || isSuperAdmin;
  const isCodisec = role === 'CODISEC';
  const isPnp = role === 'PNP';

  // Si el usuario tiene rol personalizado, los módulos visibles vienen de sus permisos
  const canSeeModule = (moduleKey, fallback) => {
    if (isSuperAdmin) return true;
    if (customRolePerms) return hasModuleAccess(moduleKey);
    return fallback;
  };

  const getRoleLabel = (role) => {
    // Si el usuario tiene un nombre de rol personalizado, mostrarlo directamente
    if (user?.custom_role_name) return user.custom_role_name;
    const map = {
      superadmin:    'Superadmin',
      administrator: 'Administrador',
      admin:         'Administrador',
      supervisor:    'Supervisor',
      codisec:       'CODISEC',
      ceplan:        'CEPLAN',
      operator:      'Operador',
      viewer:        'Visualizador',
      pnp:           'PNP',
    };
    return map[role?.toLowerCase()] || role?.toUpperCase() || role;
  };

  const getInitials = username =>
    username ? username.substring(0, 2).toUpperCase() : 'U';

  const getRoleColor = role => {
    const map = {
      superadmin:    '#dc2626',
      administrator: '#ef4444',
      admin:         '#ef4444',
      supervisor:    '#f59e0b',
      codisec:       '#8b5cf6',
      ceplan:        '#10b981',
      operator:      '#3b82f6',
      viewer:        '#10b981',
      pnp:           '#0ea5e9',
    };
    return map[role?.toLowerCase()] || '#6b7280';
  };

  const navItems = [
    { path: '/',                          icon: Map,            label: 'Mapa',                show: true },
    { path: '/dashboard/serenos',         icon: LayoutDashboard,label: 'Dashboard Serenos',   show: canSeeModule('dashboard-serenos',  isAdmin || isCodisec) },
    { path: '/dashboard/pnp',             icon: ShieldCheck,    label: 'Dashboard PNP',       show: canSeeModule('dashboard-pnp',      isAdmin || isPnp) },
    { path: '/admin/actividades',         icon: Calendar,       label: 'Actividades',          show: canSeeModule('actividades',        isAdmin || isCodisec) },
    { path: '/admin/incidencias-pnp',     icon: Shield,         label: 'Incidencias PNP',     show: canSeeModule('incidencias-pnp',    isAdmin || isPnp) },
    { path: '/admin/camaras-vecinales',   icon: Camera,         label: 'Cám. Vecinales',      show: canSeeModule('camaras-vecinales',  isAdmin) },
    { path: '/admin/camaras-municipales', icon: Video,          label: 'Cám. Municipales',    show: canSeeModule('camaras-municipales',isAdmin) },
    { path: '/admin/comisarias',          icon: Building2,      label: 'Comisarías',           show: canSeeModule('comisarias',          isAdmin) },
    { path: '/admin/usuarios',            icon: Users,          label: 'Usuarios',             show: canSeeModule('usuarios',           isSuperAdmin) },
    { path: '/admin/roles',               icon: KeyRound,       label: 'Roles',                show: canSeeModule('roles',              isSuperAdmin) },
    { path: '/admin/auditoria',           icon: ClipboardList,  label: 'Auditoría',            show: canSeeModule('auditoria',          isSuperAdmin) },
  ].filter(item => item.show);

  return (
    <aside className={`app-sidebar${isExpanded ? ' expanded' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <MapPin size={20} strokeWidth={2.5} />
        </div>
        <span className="sidebar-title">MIT SJL</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => { navigate(path); if (isMobile) onClose?.(); }}
            className={`nav-item${location.pathname === path ? ' active' : ''}`}
            title={!isExpanded ? label : undefined}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer: toggle arriba, avatar abajo */}
      <div className="sidebar-footer">

        {/* Botón toggle: siempre visible, centrado */}
        <div className="sidebar-bottom">
          <button
            className="toggle-btn"
            onClick={onToggle}
            title={isExpanded ? 'Colapsar menú' : 'Expandir menú'}
          >
            {isExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>

        {/* Avatar clickable → dropdown cerrar sesión */}
        <button
          ref={userBtnRef}
          className={`sidebar-user${showUserMenu ? ' active' : ''}`}
          onClick={handleToggleUserMenu}
          title={isExpanded ? undefined : user?.username}
        >
          <div
            className="user-avatar"
            style={{ background: getRoleColor(user?.role) }}
          >
            {getInitials(user?.username)}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-role" style={{ color: getRoleColor(user?.role) }}>
              {getRoleLabel(user?.role)}
            </span>
          </div>
        </button>

      </div>

      {showUserMenu && (
        <div
          ref={dropdownRef}
          className="user-dropdown"
          style={{ bottom: menuPos.bottom, left: menuPos.left }}
        >
          <div className="user-dropdown-profile">
            <div
              className="user-dropdown-avatar"
              style={{ background: getRoleColor(user?.role) }}
            >
              {getInitials(user?.username)}
            </div>
            <div className="user-dropdown-info">
              <span className="user-dropdown-name">{user?.username}</span>
              <span className="user-dropdown-role" style={{ color: getRoleColor(user?.role) }}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>
          <div className="user-dropdown-divider" />
          <button
            className="user-dropdown-item logout"
            onClick={() => { setShowUserMenu(false); setShowLogoutModal(true); }}
          >
            <div className="user-dropdown-item-icon">
              <LogOut size={14} strokeWidth={2.5} />
            </div>
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showLogoutModal}
        onConfirm={async () => { setShowLogoutModal(false); await logout(); }}
        onCancel={() => setShowLogoutModal(false)}
        title="Cerrar Sesión"
        message="¿Estás seguro que deseas cerrar sesión? Tendrás que volver a iniciar sesión para acceder al sistema."
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        type="logout"
      />
    </aside>
  );
};

export default Sidebar;
