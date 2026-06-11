import authService from './authService';

const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${authService.getToken()}`,
});

const auditService = {
  async getAll({ entity, action, search, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (entity) params.append('entity', entity);
    if (action) params.append('action', action);
    if (search) params.append('search', search);
    params.append('page', page);
    params.append('limit', limit);

    const res = await fetch(`${API_URL}audit?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Error al obtener registros de auditoría');
    const json = await res.json();
    return json.data ?? json;
  },
};

export default auditService;
