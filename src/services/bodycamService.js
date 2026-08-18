import axios from 'axios';

const API_URL = import.meta.env.VITE_BODYCAM_API_URL || 'https://gps-bodycam.munisjl.gob.pe:8087';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Inyectar el Token JWT del usuario dinámicamente en cada petición
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const obtenerBodycams = async () => {
  try {
    const response = await apiClient.get('/api/bodycams');
    return response.data;
  } catch (error) {
    console.error('Error al obtener bodycams:', error);
    throw error;
  }
};

export const obtenerHistorialBodycam = async (codigo, desde = null, hasta = null, limite = 10000) => {
  try {
    let url = `/api/ubicaciones/${codigo}?limite=${limite}`;
    if (desde) url += `&desde=${encodeURIComponent(desde)}`;
    if (hasta) url += `&hasta=${encodeURIComponent(hasta)}`;
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener historial de la bodycam ${codigo}:`, error);
    throw error;
  }
};
