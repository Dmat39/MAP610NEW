const API_URL = import.meta.env.VITE_API_URL;

const camarasMunicipalesAdminService = {
  /**
   * Obtener todas las cámaras municipales con filtros opcionales
   * @param {Object} filters - Filtros opcionales { search, camera, page, limit }
   * @returns {Promise<Object>}
   */
  async getAll(filters = {}) {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      // Agregar filtros si existen
      if (filters.search) params.append('search', filters.search);
      if (filters.camera) params.append('camera', filters.camera);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = `${API_URL}municipal${queryString ? `?${queryString}` : ''}`;

      console.log('🔍 Fetching cámaras municipales from:', url);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.message || 'Error al obtener cámaras municipales');
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      // El backend devuelve: { message: "", data: { data: [...], totalCount: N, ... } }
      let camaras = [];
      let count = 0;

      if (data.data && data.data.data && Array.isArray(data.data.data)) {
        camaras = data.data.data;
        count = data.data.totalCount || camaras.length;
      } else if (Array.isArray(data.data)) {
        camaras = data.data;
        count = camaras.length;
      } else if (Array.isArray(data)) {
        camaras = data;
        count = camaras.length;
      }

      console.log('📊 Cámaras encontradas:', camaras.length);
      console.log('📋 Count total:', count);

      return {
        data: camaras,
        count: count,
      };
    } catch (error) {
      console.error('❌ Error en getAll:', error);
      throw error;
    }
  },

  /**
   * Obtener una cámara municipal específica por ID
   * @param {string} id - UUID de la cámara
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}municipal/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener cámara municipal');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva cámara municipal
   * @param {Object} camaraData - Datos de la cámara
   * @returns {Promise<Object>}
   */
  async create(camaraData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}municipal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(camaraData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear cámara municipal');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en create:', error);
      throw error;
    }
  },

  /**
   * Actualizar una cámara municipal existente
   * @param {string} id - UUID de la cámara
   * @param {Object} camaraData - Datos actualizados
   * @returns {Promise<Object>}
   */
  async update(id, camaraData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}municipal/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(camaraData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar cámara municipal');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en update:', error);
      throw error;
    }
  },

  /**
   * Eliminar (cambiar estado) una cámara municipal
   * @param {string} id - UUID de la cámara
   * @returns {Promise<Object>}
   */
  async delete(id) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}municipal/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al eliminar cámara municipal');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error;
    }
  },

  /**
   * Subir archivo Excel de cámaras municipales
   * @param {File} file - Archivo Excel
   * @returns {Promise<Object>}
   */
  async uploadExcel(file) {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}municipal/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al subir archivo Excel');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en uploadExcel:', error);
      throw error;
    }
  },

  /**
   * Subir archivo JSON de radio de cámaras
   * @param {File} file - Archivo JSON
   * @returns {Promise<Object>}
   */
  async uploadRadius(file) {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}municipal/radius`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al subir archivo de radio');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en uploadRadius:', error);
      throw error;
    }
  },
};

export default camarasMunicipalesAdminService;
