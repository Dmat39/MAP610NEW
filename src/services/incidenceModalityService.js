const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async response => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}`);
  }
  return response.json();
};

const incidenceModalityService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search)     params.append('search', filters.search);
    if (filters.subtype_id) params.append('subtype_id', filters.subtype_id);
    if (filters.page)       params.append('page', filters.page);
    if (filters.limit)      params.append('limit', filters.limit);
    const response = await fetch(`${API_URL}incidence-modality?${params}`, { headers: getHeaders() });
    const result = await handleResponse(response);
    return {
      data: result.data?.data || result.data || [],
      count: result.data?.totalCount ?? result.data?.count ?? 0,
      totalPages: result.data?.totalPages ?? 1,
      currentPage: result.data?.currentPage ?? 1,
    };
  },

  async getById(id) {
    const response = await fetch(`${API_URL}incidence-modality/${id}`, { headers: getHeaders() });
    const result = await handleResponse(response);
    return result.data;
  },

  async create(data) {
    const response = await fetch(`${API_URL}incidence-modality`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}incidence-modality/${id}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(id) {
    const response = await fetch(`${API_URL}incidence-modality/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default incidenceModalityService;
