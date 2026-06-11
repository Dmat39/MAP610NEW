import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, MapPin } from 'lucide-react';
import ConfirmModal from '../Modal/ConfirmModal';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const getRoleLabel = role => {
    const roles = {
      administrator: 'Admin',
      admin: 'Admin',
      supervisor: 'Supervisor',
      ceplan: 'CEPLAN',
    };
    return roles[role?.toLowerCase()] || role;
  };

  const getInitials = username => {
    if (!username) return 'U';
    return username.substring(0, 2).toUpperCase();
  };

  const getRoleColor = role => {
    const colors = {
      administrator: '#ef4444',
      admin: '#ef4444',
      supervisor: '#f59e0b',
      ceplan: '#10b981',
    };
    return colors[role?.toLowerCase()] || '#6b7280';
  };

  return (
    <header className="app-header">
      <div className="header-glass">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-logo">
              <MapPin size={18} strokeWidth={2.5} />
            </div>
            <h1 className="brand-name">Mapa de Inteligencia Territorial SJL</h1>
          </div>

          <div className="user-section">
            <div className="user-badge">
              <div className="user-avatar" style={{ background: getRoleColor(user?.role) }}>
                {getInitials(user?.username)}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.username}</span>
                <span className="user-role" style={{ color: getRoleColor(user?.role) }}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            </div>

            <button onClick={handleLogoutClick} className="logout-btn" title="Cerrar sesión">
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        title="Cerrar Sesión"
        message="¿Estás seguro que deseas cerrar sesión? Tendrás que volver a iniciar sesión para acceder al sistema."
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        type="logout"
      />
    </header>
  );
};

export default Header;
