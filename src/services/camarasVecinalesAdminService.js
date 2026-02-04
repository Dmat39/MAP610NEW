const API_URL = import.meta.env.VITE_API_URL;

const camarasVecinalesAdminService = {
  /**
   * Obtener todas las cámaras vecinales con filtros opcionales
   * @param {Object} filters - Filtros opcionales { search, brand, mode }
   * @returns {Promise<Array>}
   */
  async getAll(filters = {}) {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      // Agregar filtros si existen
      if (filters.search) params.append('search', filters.search);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.mode) params.append('mode', filters.mode);
      if (filters.page !== undefined && filters.page !== null) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = `${API_URL}communal${queryString ? `?${queryString}` : ''}`;

      // console.log('🔍 Fetching cámaras vecinales from:', url); // COMENTADO: Logging de debugging
      // console.log('🔑 Token:', token ? 'Present' : 'Missing'); // COMENTADO: Logging de debugging

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // console.log('📡 Response status:', response.status); // COMENTADO: Logging de debugging

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.message || 'Error al obtener cámaras vecinales');
      }

      const data = await response.json();
      // console.log('✅ Response data:', data); // COMENTADO: Logging de debugging

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

      // console.log('📊 Cámaras encontradas:', camaras.length); // COMENTADO: Logging de debugging
      // console.log('📋 Count total:', count); // COMENTADO: Logging de debugging

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
   * Obtener una cámara vecinal específica por ID
   * @param {string} id - UUID de la cámara
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}communal/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener cámara vecinal');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva cámara vecinal
   * @param {Object} camaraData - Datos de la cámara
   * @returns {Promise<Object>}
   */
  async create(camaraData) {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}communal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(camaraData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear cámara vecinal');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en create:', error);
      throw error;
    }
  },

  /**
   * Actualizar una cámara vecinal existente
   * @param {string} id - UUID de la cámara
   * @param {Object} camaraData - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async update(id, camaraData) {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}communal/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(camaraData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar cámara vecinal');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en update:', error);
      throw error;
    }
  },

  /**
   * Eliminar/Restaurar una cámara vecinal (cambio de estado)
   * @param {string} id - UUID de la cámara
   * @returns {Promise<Object>}
   */
  async delete(id) {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}communal/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al eliminar cámara vecinal');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error;
    }
  },

  /**
   * Subir archivo GeoJSON con cámaras vecinales
   * @param {File} file - Archivo GeoJSON
   * @returns {Promise<Object>}
   */
  async uploadGeoJSON(file) {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}communal/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al subir archivo GeoJSON');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en uploadGeoJSON:', error);
      throw error;
    }
  },
};

export default camarasVecinalesAdminService;
