import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';

const ProtectedRoute = ({ children, allowedRoles = [], moduleKey = null }) => {
  const { user, isAuthenticated, loading, hasModuleAccess, customRolePerms } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#666',
        }}
      >
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const isSuperAdmin = user?.role?.toUpperCase() === 'SUPERADMIN';

  // SUPERADMIN tiene acceso total sin restricciones
  if (isSuperAdmin) return children;

  // Usuario con rol personalizado: sus permisos mandan completamente
  if (customRolePerms) {
    if (moduleKey && !hasModuleAccess(moduleKey)) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  // Usuario sin rol personalizado: usa el enum rol como antes
  if (allowedRoles.length > 0) {
    const userRole = user?.role;
    const hasPermission = userRole && allowedRoles.some(r => r.toUpperCase() === userRole.toUpperCase());
    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
