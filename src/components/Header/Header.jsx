import { useAuth } from '../../context/AuthContext';
import { LogOut, MapPin } from 'lucide-react';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout();
    }
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
            <h1 className="brand-name">Mapa de Incidencias</h1>
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

            <button onClick={handleLogout} className="logout-btn" title="Cerrar sesión">
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
