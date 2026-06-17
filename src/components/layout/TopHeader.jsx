import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import './TopHeader.css';

const PAGE_META = {
  '/dashboard/serenos':        { title: 'Dashboard Serenos',      sub: 'Estadísticas y métricas operativas' },
  '/dashboard/pnp':            { title: 'Dashboard PNP',          sub: 'Estadísticas de incidencias policiales' },
  '/admin/actividades':        { title: 'Actividades',            sub: 'Gestión de actividades operativas' },
  '/admin/incidencias-pnp':    { title: 'Incidencias PNP',        sub: 'Registro de incidencias policiales' },
  '/admin/camaras-vecinales':  { title: 'Cámaras Vecinales',      sub: 'Gestión de cámaras de vigilancia vecinal' },
  '/admin/camaras-municipales':{ title: 'Cámaras Municipales',    sub: 'Gestión de cámaras de vigilancia municipal' },
  '/admin/usuarios':           { title: 'Usuarios',               sub: 'Gestión de usuarios del sistema' },
  '/admin/auditoria':          { title: 'Auditoría del Sistema',  sub: 'Registro de cambios y acciones' },
  '/admin/radios-gps':         { title: 'Radios GPS',             sub: 'Unidades · Zonas · Historial · Kilometraje' },
  '/admin/comisarias':         { title: 'Comisarías',             sub: 'Gestión de comisarías' },
  '/admin/puntos-campana':     { title: 'Puntos de Obra',         sub: 'Gestión de puntos de campaña' },
  '/admin/tipos-incidencia':   { title: 'Tipos de Incidencia',    sub: 'Gestión de tipos de incidencia' },
  '/admin/subtipos-incidencia':{ title: 'Subtipos de Incidencia', sub: 'Gestión de subtipos de incidencia' },
  '/admin/modalidades-incidencia':{ title: 'Modalidades PNP',     sub: 'Gestión de modalidades de incidencia' },
  '/admin/roles':              { title: 'Roles',                  sub: 'Gestión de roles y permisos' },
  '/reportes/incidencias':     { title: 'Reportes',               sub: 'Reportes de incidencias' },
};

const getRoleLabel = role => {
  const map = {
    superadmin:    'Superadmin',
    administrator: 'Administrador',
    admin:         'Administrador',
    supervisor:    'Supervisor',
    codisec:       'CODISEC',
    ceplan:        'CEPLAN',
    pnp:           'PNP',
  };
  return map[role?.toLowerCase()] || role?.toUpperCase() || '';
};

const getRoleColor = role => {
  const map = {
    superadmin:    '#dc2626',
    administrator: '#ef4444',
    admin:         '#ef4444',
    supervisor:    '#f59e0b',
    codisec:       '#8b5cf6',
    ceplan:        '#10b981',
    pnp:           '#3b82f6',
  };
  return map[role?.toLowerCase()] || '#6b7280';
};

const TopHeader = ({ onMenuToggle, isMobile }) => {
  const location = useLocation();
  const { user } = useAuth();
  const meta = PAGE_META[location.pathname] || { title: 'Sistema', sub: '' };
  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'U';
  const avatarColor = getRoleColor(user?.role);

  const [dateStr, setDateStr] = useState(() =>
    new Date().toLocaleDateString('es-PE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
  );

  useEffect(() => {
    const update = () =>
      setDateStr(new Date().toLocaleDateString('es-PE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      }));
    // Actualizar a medianoche
    const now = new Date();
    const msHastaManana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    const timer = setTimeout(() => { update(); }, msHastaManana);
    return () => clearTimeout(timer);
  }, []);

  return (
    <header className="top-header">
      {isMobile && (
        <button className="top-header-menu-btn" onClick={onMenuToggle} aria-label="Abrir menú">
          <Menu size={20} strokeWidth={2} />
        </button>
      )}
      <div className="top-header-left">
        <h2 className="top-header-title">{meta.title}</h2>
        {meta.sub && <span className="top-header-sub">{meta.sub}</span>}
      </div>

      <div className="top-header-right">
        <span className="top-header-date">{dateStr}</span>

        <div className="top-header-user">
          <div className="top-header-avatar" style={{ background: avatarColor }}>
            {initials}
          </div>
          <div className="top-header-user-info">
            <span className="top-header-username">{user?.username}</span>
            <span className="top-header-role" style={{ color: avatarColor }}>
              {getRoleLabel(user?.role)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
