const API_URL = import.meta.env.VITE_API_URL;

const usuariosService = {
  /**
   * Obtener todos los usuarios con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {string} filters.search - Búsqueda por nombre de usuario o email
   * @param {string} filters.role - Filtro por rol
   * @param {number} filters.page - Número de página
   * @param {number} filters.limit - Límite de resultados por página
   * @returns {Promise<Object>} Lista de usuarios y conteo total
   */
  async getAll(filters = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('rol', filters.role);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await fetch(`${API_URL}user?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar usuarios');
      }

      const result = await response.json();

      // La API devuelve: { message, data: { data: [], currentPage, pageCount, totalCount, totalPages } }
      const apiData = result.data || {};

      return {
        data: apiData.data || [],
        count: apiData.totalCount || apiData.pageCount || 0,
      };
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw new Error(error.message || 'Error al cargar usuarios');
    }
  },

  /**
   * Obtener un usuario por ID
   * @param {string|number} id - ID del usuario
   * @returns {Promise<Object>} Datos del usuario
   */
  async getById(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}user/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar el usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw new Error(error.message || 'Error al cargar el usuario');
    }
  },

  /**
   * Crear un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.username - Nombre de usuario
   * @param {string} userData.email - Correo electrónico
   * @param {string} userData.password - Contraseña
   * @param {string} userData.role - Rol del usuario
   * @returns {Promise<Object>} Usuario creado
   */
  async create(userData) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear el usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw new Error(error.message || 'Error al crear el usuario');
    }
  },

  /**
   * Actualizar un usuario existente
   * @param {string|number} id - ID del usuario
   * @param {Object} userData - Datos del usuario a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  async update(id, userData) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Si la contraseña está vacía, no la incluimos en la petición
      const dataToSend = { ...userData };
      if (!dataToSend.password || dataToSend.password === '') {
        delete dataToSend.password;
      }

      const response = await fetch(`${API_URL}user/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar el usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw new Error(error.message || 'Error al actualizar el usuario');
    }
  },

  /**
   * Eliminar un usuario
   * @param {string|number} id - ID del usuario
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  async delete(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_URL}user/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al eliminar el usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw new Error(error.message || 'Error al eliminar el usuario');
    }
  },
};

export default usuariosService;
