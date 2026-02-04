const API_URL = import.meta.env.VITE_API_URL;

const actividadesAdminService = {
  /**
   * Obtener todas las actividades con filtros opcionales
   * @param {Object} filters - Filtros opcionales { search, act_type, page, limit }
   * @returns {Promise<Object>}
   */
  async getAll(filters = {}) {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.act_type) params.append('act_type', filters.act_type);
      if (filters.page !== undefined && filters.page !== null) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const queryString = params.toString();
      const url = `${API_URL}activity${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Error al obtener actividades');
      }

      const data = await response.json();

      let actividades = [];
      let count = 0;

      if (data.data && data.data.data && Array.isArray(data.data.data)) {
        actividades = data.data.data;
        count = data.data.totalCount || actividades.length;
      } else if (Array.isArray(data.data)) {
        actividades = data.data;
        count = actividades.length;
      } else if (Array.isArray(data)) {
        actividades = data;
        count = actividades.length;
      }

      return {
        data: actividades,
        count: count,
      };
    } catch (error) {
      console.error('Error en getAll:', error);
      throw error;
    }
  },

  /**
   * Obtener una actividad específica por ID
   * @param {string} id - UUID de la actividad
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}activity/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener actividad');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva actividad
   * @param {Object} actividadData - Datos de la actividad
   * @returns {Promise<Object>}
   */
  async create(actividadData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(actividadData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al crear actividad');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en create:', error);
      throw error;
    }
  },

  /**
   * Actualizar una actividad existente
   * @param {string} id - UUID de la actividad
   * @param {Object} actividadData - Datos actualizados
   * @returns {Promise<Object>}
   */
  async update(id, actividadData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}activity/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(actividadData),
      });

      console.log('📤 Datos enviados al PATCH:', JSON.stringify(actividadData, null, 2));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response completa:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.message || 'Error al actualizar actividad');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en update:', error);
      throw error;
    }
  },

  /**
   * Eliminar una actividad
   * @param {string} id - UUID de la actividad
   * @returns {Promise<Object>}
   */
  async delete(id) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}activity/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al eliminar actividad');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error;
    }
  },
};

export default actividadesAdminService;
