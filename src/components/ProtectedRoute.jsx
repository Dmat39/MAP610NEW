import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

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

  // Si se especifican roles permitidos, verificar que el usuario tenga uno de ellos
  if (allowedRoles.length > 0 && user?.role) {
    const userRole = user.role.toLowerCase();
    const hasPermission = allowedRoles.some(role => role.toLowerCase() === userRole);

    if (!hasPermission) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            gap: '16px',
          }}
        >
          <h2 style={{ color: '#c33', margin: 0 }}>Acceso Denegado</h2>
          <p style={{ color: '#666', margin: 0 }}>
            No tienes permisos para acceder a esta sección
          </p>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
