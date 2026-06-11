const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const handleResponse = async (response) => {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Error ${response.status}`);
  }
  return response.json();
};

const campaignPointService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search)             params.append('search',   filters.search);
    if (filters.category)           params.append('category', filters.category);
    if (filters.page !== undefined) params.append('page',     filters.page);
    if (filters.limit)              params.append('limit',    filters.limit);
    const result = await fetch(`${API_URL}campaign-point?${params}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
    const apiData = result.data || {};
    return {
      data:        apiData.data        || [],
      count:       apiData.totalCount  || apiData.pageCount || 0,
      totalPages:  apiData.totalPages  || 1,
      currentPage: apiData.currentPage || 1,
    };
  },

  async getCategories() {
    const result = await fetch(`${API_URL}campaign-point/categories`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
    return result.data || [];
  },

  async getById(id) {
    const result = await fetch(`${API_URL}campaign-point/${id}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
    return result.data || result;
  },

  async create(data) {
    return fetch(`${API_URL}campaign-point`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async update(id, data) {
    return fetch(`${API_URL}campaign-point/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id) {
    return fetch(`${API_URL}campaign-point/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

export default campaignPointService;
