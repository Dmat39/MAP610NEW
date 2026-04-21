import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut, MapPin, Camera, Map, Video, Users,
  Calendar, ChevronRight, ChevronLeft,
} from 'lucide-react';
import ConfirmModal from '../Modal/ConfirmModal';
import './Sidebar.css';

const Sidebar = ({ isExpanded, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isAdmin =
    user?.role?.toLowerCase() === 'administrator' ||
    user?.role?.toLowerCase() === 'admin';
  const isCodisec = user?.role?.toUpperCase() === 'CODISEC';

  const getRoleLabel = role => {
    const map = {
      administrator: 'Administrador',
      admin: 'Administrador',
      supervisor: 'Supervisor',
      codisec: 'CODISEC',
      ceplan: 'CEPLAN',
    };
    return map[role?.toLowerCase()] || role;
  };

  const getInitials = username =>
    username ? username.substring(0, 2).toUpperCase() : 'U';

  const getRoleColor = role => {
    const map = {
      administrator: '#ef4444',
      admin: '#ef4444',
      supervisor: '#f59e0b',
      codisec: '#8b5cf6',
      ceplan: '#10b981',
    };
    return map[role?.toLowerCase()] || '#6b7280';
  };

  const navItems = [
    { path: '/', icon: Map, label: 'Mapa', show: true },
    { path: '/admin/actividades', icon: Calendar, label: 'Actividades', show: isAdmin || isCodisec },
    { path: '/admin/camaras-vecinales', icon: Camera, label: 'Cám. Vecinales', show: isAdmin },
    { path: '/admin/camaras-municipales', icon: Video, label: 'Cám. Municipales', show: isAdmin },
    { path: '/admin/usuarios', icon: Users, label: 'Usuarios', show: isAdmin },
  ].filter(item => item.show);

  return (
    <aside className={`app-sidebar${isExpanded ? ' expanded' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <MapPin size={20} strokeWidth={2.5} />
        </div>
        <span className="sidebar-title">MAPA CECOM</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`nav-item${location.pathname === path ? ' active' : ''}`}
            title={!isExpanded ? label : undefined}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer: user info + toggle */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            className="user-avatar"
            style={{ background: getRoleColor(user?.role) }}
          >
            {getInitials(user?.username)}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span
              className="user-role"
              style={{ color: getRoleColor(user?.role) }}
            >
              {getRoleLabel(user?.role)}
            </span>
          </div>
          <button
            className="logout-btn"
            onClick={() => setShowLogoutModal(true)}
            title="Cerrar sesión"
          >
            <LogOut size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="sidebar-bottom">
          <span className="app-version">v2.0.0</span>
          <button
            className="toggle-btn"
            onClick={onToggle}
            title={isExpanded ? 'Colapsar menú' : 'Expandir menú'}
          >
            {isExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </div>

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
