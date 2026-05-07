const API_URL = import.meta.env.VITE_API_URL;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateId = (id) => {
  if (!id || !UUID_REGEX.test(String(id))) {
    throw new Error('ID de rol inválido');
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}`);
  }
  return response.json();
};

const rolesService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.page)   params.append('page', filters.page);
    if (filters.limit)  params.append('limit', filters.limit);

    const result = await fetch(`${API_URL}custom-role?${params}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);

    const apiData = result.data || {};
    return {
      data: apiData.data || [],
      count: apiData.totalCount || apiData.pageCount || 0,
      totalPages: apiData.totalPages || 1,
      currentPage: apiData.currentPage || 1,
    };
  },

  async getMine() {
    const result = await fetch(`${API_URL}custom-role/mine`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
    return result.data || result;
  },

  async getById(id) {
    validateId(id);
    const result = await fetch(`${API_URL}custom-role/${id}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
    return result.data || result;
  },

  async seedDefaults() {
    return fetch(`${API_URL}custom-role/seed-defaults`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async create(data) {
    return fetch(`${API_URL}custom-role`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async update(id, data) {
    validateId(id);
    return fetch(`${API_URL}custom-role/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id) {
    validateId(id);
    return fetch(`${API_URL}custom-role/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

export default rolesService;
