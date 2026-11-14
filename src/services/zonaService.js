const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/';

// Lanza un error con el mensaje del backend si la operación falló (antes se ignoraba).
const leer = async (res, porDefecto) => {
  let json = null;
  try { json = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) {
    const msg = Array.isArray(json?.message) ? json.message.join(', ') : json?.message;
    throw new Error(msg || porDefecto);
  }
  return json?.data ?? json;
};

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const obtenerZonas = async () => {
  const res = await fetch(`${API_URL}gps-zona`, { headers: headers() });
  return leer(res, 'No se pudo completar la operación con la zona');
};

export const crearZona = async (zona) => {
  const res = await fetch(`${API_URL}gps-zona`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(zona),
  });
  return leer(res, 'No se pudo completar la operación con la zona');
};

export const actualizarZona = async (id, zona) => {
  const res = await fetch(`${API_URL}gps-zona/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(zona),
  });
  return leer(res, 'No se pudo completar la operación con la zona');
};

export const eliminarZona = async (id) => {
  const res = await fetch(`${API_URL}gps-zona/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return leer(res, 'No se pudo completar la operación con la zona');
};
