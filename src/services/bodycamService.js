import axios from 'axios';

const API_URL = import.meta.env.VITE_BODYCAM_API_URL || 'http://gps-bodycam.munisjl.gob.pe:8087';
const API_TOKEN = import.meta.env.VITE_BODYCAM_API_TOKEN || 'cecom2026';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`
  }
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
