window.SmartKitApi = (() => {
  const baseUrl = window.APP_CONFIG?.api?.baseUrl || '';
  let token = sessionStorage.getItem('sk_api_token') || '';

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      credentials: 'include'
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'API request failed');
    if (response.status === 204) return null;
    return response.json();
  }

  return {
    async login(email, password) {
      const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      token = data.token;
      sessionStorage.setItem('sk_api_token', token);
      return data.user;
    },
    async screens() {
      const data = await request('/api/screens');
      return data.screens || [];
    },
    async saveScreens(screens) {
      const data = await request('/api/screens', { method: 'PUT', body: JSON.stringify({ screens }) });
      return data.screens || [];
    },
    async createMediaKit(payload) {
      const data = await request('/api/media-kits', { method: 'POST', body: JSON.stringify(payload) });
      return data.mediaKit;
    },
    async mediaKit(id) {
      const data = await request(`/api/media-kits/${encodeURIComponent(id)}`);
      return data.mediaKit;
    }
  };
})();
