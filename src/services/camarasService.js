const API_URL = import.meta.env.VITE_API_URL;

const camarasService = {
  /**
   * Obtiene todas las cámaras municipales con sus ángulos de visión
   * @param {number} page - Número de página (por defecto 0)
   * @returns {Promise<Object>} Respuesta con las cámaras
   */
  async getCamarasMunicipales(page = 0) {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
      }

      const response = await fetch(`${API_URL}municipal?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido o expirado
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener las cámaras');
      }

      const result = await response.json();
      console.log('Cámaras obtenidas:', result);

      // La API devuelve: { message, data: { count, data: [...] } }
      return {
        count: result.data.count,
        camaras: result.data.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error en getCamarasMunicipales:', error);
      throw error;
    }
  },

  /**
   * Transforma los datos de la API al formato esperado por el mapa
   * @param {Array} camaras - Array de cámaras desde la API
   * @returns {Array} Cámaras transformadas
   */
  transformarCamarasParaMapa(camaras) {
    return camaras.map(camara => ({
      id: camara.id,
      name: camara.name,
      address: camara.address,
      camera: camara.camera,
      latitude: camara.latitude,
      longitude: camara.longitude,
      geometry: camara.geometry, // Polígono del ángulo de visión
      buttom: camara.buttom,
      megaphone: camara.megaphone,
      created_at: camara.created_at,
      updated_at: camara.updated_at,
    }));
  },
};

export default camarasService;
