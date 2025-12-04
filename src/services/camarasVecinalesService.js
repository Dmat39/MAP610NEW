/**
 * Servicio para gestionar las cámaras vecinales (communal)
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const camarasVecinalesService = {
  /**
   * Obtener todas las cámaras vecinales
   * @returns {Promise<Object>} - { count: number, camaras: Array }
   */
  async getCamarasVecinales() {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
      }

      const response = await fetch(`${API_URL}/communal`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token expirado o inválido
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }

      if (!response.ok) {
        throw new Error(`Error al obtener cámaras vecinales: ${response.status}`);
      }

      const result = await response.json();

      // El backend retorna: { message: "...", data: { count: ..., data: [...] } }
      return {
        count: result.data?.count || 0,
        camaras: result.data?.data || []
      };
    } catch (error) {
      console.error('Error en getCamarasVecinales:', error);
      throw error;
    }
  }
};

export default camarasVecinalesService;
