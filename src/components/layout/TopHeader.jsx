import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

const TopHeader = () => {
  const location = useLocation();
  const { user } = useAuth();
  const meta = PAGE_META[location.pathname] || { title: 'Sistema', sub: '' };
  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'U';
  const avatarColor = getRoleColor(user?.role);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <header className="top-header">
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
