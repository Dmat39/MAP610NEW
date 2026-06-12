const API_URL = import.meta.env.VITE_API_URL;

let _radiosCache = null;
let _radiosCacheAt = 0;
const RADIOS_TTL = 12000; // 12 s — mismo ciclo que el polling

export const obtenerRadiosCercanos = async (lat, lng, metros = 500, filtros = {}) => {
  const token = localStorage.getItem('token');
  let url = `${API_URL}gps-radio/cercanos?lat=${lat}&lng=${lng}&metros=${metros}`;
  const { fechaInicio, fechaFin, horaInicio, horaFin } = filtros;
  if (fechaInicio) url += `&fechaInicio=${fechaInicio}`;
  if (fechaFin)    url += `&fechaFin=${fechaFin}`;
  if (horaInicio)  url += `&horaInicio=${horaInicio}`;
  if (horaFin)     url += `&horaFin=${horaFin}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await response.json();
  return json.data ?? json;
};

export const obtenerHistoricoRadio = async (issi, fechaInicio, horaInicio, fechaFin, horaFin) => {
  const token = localStorage.getItem('token');
  const url = `${API_URL}gps-radio/historico?issi=${encodeURIComponent(issi)}&fechaInicio=${fechaInicio}&horaInicio=${encodeURIComponent(horaInicio)}&fechaFin=${fechaFin}&horaFin=${encodeURIComponent(horaFin)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await response.json();
  return json.data ?? json;
};

export const obtenerKmDias = async (issi, fechaInicio, fechaFin) => {
  const token = localStorage.getItem('token');
  const url = `${API_URL}gps-radio/km-dias?issi=${encodeURIComponent(issi)}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await response.json();
  return json.data ?? json;
};

let _pendingRadios = null;

export const obtenerRadios = async () => {
  const now = Date.now();
  if (_radiosCache && now - _radiosCacheAt < RADIOS_TTL) return _radiosCache;

  // Deduplicar llamadas simultáneas: si ya hay una en vuelo, esperar la misma
  if (_pendingRadios) return _pendingRadios;

  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación.');

  _pendingRadios = fetch(`${API_URL}gps-radio`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }).then(async (response) => {
    _pendingRadios = null;
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      throw new Error('Error al obtener radios GPS');
    }
    const json = await response.json();
    const data = json.data ?? json;
    _radiosCache = data;
    _radiosCacheAt = Date.now();
    return data;
  }).catch(err => { _pendingRadios = null; throw err; });

  return _pendingRadios;
};
