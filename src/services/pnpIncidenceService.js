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

const pnpIncidenceService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.shift) params.append('shift', filters.shift);
    if (filters.incidence_type) params.append('incidence_type', filters.incidence_type);
    if (filters.police_station) params.append('police_station', filters.police_station);
    if (filters.case_status) params.append('case_status', filters.case_status);
    if (filters.jurisdiction) params.append('jurisdiction', filters.jurisdiction);
    if (filters.no_shift) params.append('no_shift', filters.no_shift);
    if (filters.start) params.append('start', filters.start);
    if (filters.end) params.append('end', filters.end);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await fetch(`${API_URL}pnp-incidence?${params}`, {
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return {
      data: result.data?.data || result.data || [],
      count: result.data?.totalCount ?? result.data?.count ?? 0,
      totalPages: result.data?.totalPages ?? 1,
      currentPage: result.data?.currentPage ?? 1,
    };
  },

  async getById(id) {
    const response = await fetch(`${API_URL}pnp-incidence/${id}`, {
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return result.data;
  },

  async create(data) {
    const response = await fetch(`${API_URL}pnp-incidence`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}pnp-incidence/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(id) {
    const response = await fetch(`${API_URL}pnp-incidence/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default pnpIncidenceService;
