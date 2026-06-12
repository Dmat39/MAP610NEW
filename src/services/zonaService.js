const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const obtenerZonas = async () => {
  const res = await fetch(`${API_URL}gps-zona`, { headers: headers() });
  const json = await res.json();
  return json.data ?? json;
};

export const crearZona = async (zona) => {
  const res = await fetch(`${API_URL}gps-zona`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(zona),
  });
  const json = await res.json();
  return json.data ?? json;
};

export const actualizarZona = async (id, zona) => {
  const res = await fetch(`${API_URL}gps-zona/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(zona),
  });
  const json = await res.json();
  return json.data ?? json;
};

export const eliminarZona = async (id) => {
  const res = await fetch(`${API_URL}gps-zona/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const json = await res.json();
  return json.data ?? json;
};
