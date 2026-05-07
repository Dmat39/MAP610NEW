const API_URL = import.meta.env.VITE_API_URL;

const authService = {
  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error en el inicio de sesión');
      }

      const data = await response.json();
      // console.log('Respuesta del login:', data); // COMENTADO: No exponer datos de login en producción

      // Tu API devuelve: { message, data: { user, rol, token } }
      const apiData = data.data || data;
      const token = apiData.token;

      // Crear objeto de usuario con el formato correcto
      const user = {
        username:         apiData.user,
        role:             apiData.rol || apiData.role,
        custom_role_id:   apiData.custom_role_id || null,
        custom_role_name: apiData.custom_role_name || null,
      };

      // Guardar token
      if (token) {
        localStorage.setItem('token', token);
        // console.log('Token guardado:', token); // COMENTADO: No exponer token en producción
      } else {
        console.warn('No se encontró token en la respuesta');
      }

      // Guardar usuario
      if (user.username) {
        localStorage.setItem('user', JSON.stringify(user));
        // console.log('Usuario guardado:', user); // COMENTADO: No exponer datos de usuario en producción
      } else {
        console.warn('No se encontró información de usuario');
      }

      return { token, user, message: data.message };
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  async logout() {
    try {
      const token = localStorage.getItem('token');

      if (token) {
        await fetch(`${API_URL}auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar localStorage siempre, incluso si falla la petición
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    return null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // Métodos para trabajar con roles
  getUserRole() {
    const user = this.getCurrentUser();
    return user?.role || null;
  },

  isSuperAdmin() {
    return this.getUserRole() === 'SUPERADMIN';
  },

  isAdmin() {
    return this.getUserRole() === 'ADMINISTRATOR' || this.isSuperAdmin();
  },

  isSupervisor() {
    return this.getUserRole() === 'SUPERVISOR';
  },

  isOperator() {
    return this.getUserRole() === 'OPERATOR';
  },

  isPnp() {
    return this.getUserRole() === 'PNP';
  },

  // Verificar si el usuario tiene al menos un rol específico
  hasRole(role) {
    return this.getUserRole() === role;
  },

  // Verificar si tiene uno de varios roles
  hasAnyRole(roles) {
    const userRole = this.getUserRole();
    return roles.includes(userRole);
  },
};

export default authService;
