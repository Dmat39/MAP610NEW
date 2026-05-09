const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
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

const comisariasService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const result = await fetch(`${API_URL}comisaria?${params}`, {
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

  async getById(id) {
    const result = await fetch(`${API_URL}comisaria/${id}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
    return result.data || result;
  },

  async create(data) {
    return fetch(`${API_URL}comisaria`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async update(id, data) {
    return fetch(`${API_URL}comisaria/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id) {
    return fetch(`${API_URL}comisaria/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

export default comisariasService;
