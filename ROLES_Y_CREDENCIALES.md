# Sistema de Roles y Credenciales

## 🔐 Credenciales de Acceso

### 1. Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin2025$`
- **Rol:** `ADMINISTRATOR`
- **Descripción:** Acceso completo al sistema

### 2. Supervisor
- **Usuario:** `supervisor`
- **Contraseña:** `supervisor2025$`
- **Rol:** `SUPERVISOR`
- **Descripción:** Supervisión y monitoreo del sistema

### 3. Operador
- **Usuario:** `operator`
- **Contraseña:** `cecom2025$`
- **Rol:** `OPERATOR`
- **Descripción:** Operación básica del sistema

---

## 🛠️ Uso del AuthService

### Métodos Disponibles

```javascript
import authService from './services/authService';

// Iniciar sesión
const result = await authService.login('admin', 'admin2025$');

// Cerrar sesión
await authService.logout();

// Obtener usuario actual
const user = authService.getCurrentUser();
// Retorna: { username: 'admin', role: 'ADMINISTRATOR' }

// Obtener token
const token = authService.getToken();

// Verificar autenticación
const isAuth = authService.isAuthenticated();

// Obtener rol del usuario
const role = authService.getUserRole();

// Verificar roles específicos
const isAdmin = authService.isAdmin();
const isSupervisor = authService.isSupervisor();
const isOperator = authService.isOperator();

// Verificar rol específico
const hasRole = authService.hasRole('ADMINISTRATOR');

// Verificar múltiples roles
const canEdit = authService.hasAnyRole(['ADMINISTRATOR', 'SUPERVISOR']);
```

---

## 📋 Ejemplos de Uso en Componentes

### Proteger rutas por rol

```javascript
import { Navigate } from 'react-router-dom';
import authService from './services/authService';

const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !authService.hasAnyRole(allowedRoles)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

// Uso
<Route
  path="/admin"
  element={
    <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
      <AdminPanel />
    </ProtectedRoute>
  }
/>
```

### Mostrar/ocultar elementos según rol

```javascript
import authService from './services/authService';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {authService.isAdmin() && (
        <button>Panel de Administración</button>
      )}

      {authService.hasAnyRole(['ADMINISTRATOR', 'SUPERVISOR']) && (
        <button>Ver Reportes</button>
      )}

      {authService.isAuthenticated() && (
        <button>Ver Mapa</button>
      )}
    </div>
  );
}
```

### Usar con Context API

```javascript
import { useAuth } from './context/AuthContext';

function Header() {
  const { user, logout } = useAuth();

  return (
    <header>
      <span>Bienvenido, {user?.username} ({user?.role})</span>
      <button onClick={logout}>Cerrar Sesión</button>
    </header>
  );
}
```

---

## 🌐 API Endpoints

### Login
```
POST http://192.168.137.217:3022/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin2025$"
}

Respuesta:
{
  "message": "Login exitoso",
  "data": {
    "user": "admin",
    "rol": "ADMINISTRATOR",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Logout
```
POST http://192.168.137.217:3022/api/auth/logout
Authorization: Bearer {token}
```

### Obtener Cámaras Municipales
```
GET http://192.168.137.217:3022/api/municipal?page=0
Authorization: Bearer {token}

Respuesta:
{
  "message": "Registros obtenidos exitosamente",
  "data": {
    "count": 610,
    "data": [...]
  }
}
```

---

## 🔒 Seguridad

- El token JWT se guarda en `localStorage` con la clave `token`
- Los datos del usuario se guardan en `localStorage` con la clave `user`
- El token se envía automáticamente en todas las peticiones al backend usando el header `Authorization: Bearer {token}`
- Si el token expira, el usuario debe iniciar sesión nuevamente

---

## 📝 Notas Importantes

1. **Tokens en .env.local:** No hardcodees tokens en el código. Usa el sistema de login.
2. **Roles case-sensitive:** Los roles son `ADMINISTRATOR`, `SUPERVISOR`, `OPERATOR` (todo en mayúsculas).
3. **Renovación de token:** Si el token expira, el usuario será redirigido al login automáticamente.
4. **Desarrollo local:** Asegúrate de que el backend esté corriendo en `http://192.168.137.217:3022/api/`
