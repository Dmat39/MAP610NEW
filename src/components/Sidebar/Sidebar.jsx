import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, MapPin, ChevronDown, User } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout();
    }
  };

  const getRoleLabel = role => {
    const roles = {
      administrator: 'Administrador',
      admin: 'Administrador',
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="app-sidebar">
      {/* Logo and Title */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <MapPin size={24} strokeWidth={2.5} />
        </div>
        <h1 className="sidebar-title">Mapa de Incidencias</h1>
      </div>

      {/* User Section */}
      <div className="sidebar-user" ref={dropdownRef}>
        <button
          className="user-trigger"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
        >
          <div className="user-avatar" style={{ background: getRoleColor(user?.role) }}>
            {getInitials(user?.username)}
          </div>
          <ChevronDown
            size={16}
            className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="user-dropdown">
            <div className="dropdown-header">
              <div className="dropdown-avatar" style={{ background: getRoleColor(user?.role) }}>
                {getInitials(user?.username)}
              </div>
              <div className="dropdown-info">
                <span className="dropdown-name">{user?.username}</span>
                <span className="dropdown-role" style={{ color: getRoleColor(user?.role) }}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            </div>

            <div className="dropdown-divider" />

            <button onClick={handleLogout} className="dropdown-item logout-item">
              <LogOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation or other items can go here */}
      <nav className="sidebar-nav">
        {/* Add navigation items if needed */}
      </nav>

      {/* Bottom Section */}
      <div className="sidebar-footer">
        <div className="app-version">v1.0.0</div>
      </div>
    </aside>
  );
};

export default Sidebar;
