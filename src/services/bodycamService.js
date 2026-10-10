// Las bodycams se consultan a través del backend (con el JWT del usuario):
// el token de la API externa de bodycams solo vive en el servidor.
const API_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const getJson = async (url, errorMsg) => {
  const response = await fetch(url, { headers: authHeaders() });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message ?? errorMsg);
  return json.data;
};

export const obtenerBodycams = async () => {
  try {
    const data = await getJson(`${API_URL}bodycams`, 'Error al obtener bodycams');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error al obtener bodycams:', error);
    throw error;
  }
};

export const obtenerHistorialBodycam = async (codigo, desde = null, hasta = null, limite = 10000) => {
  try {
    const params = new URLSearchParams({ limite: String(limite) });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    return await getJson(
      `${API_URL}bodycams/${encodeURIComponent(codigo)}/ubicaciones?${params}`,
      'Error al obtener el historial de la bodycam'
    );
  } catch (error) {
    console.error(`Error al obtener historial de la bodycam ${codigo}:`, error);
    throw error;
  }
};
