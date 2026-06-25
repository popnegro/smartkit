/**
 * SmartKit API Client
 * Encapsula la comunicación con el backend y gestiona el token JWT.
 */
const API = {
    baseUrl: '/api',
    
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('sk_auth_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('sk_auth_token');
            window.location.href = '/dashboard.html?error=session_expired';
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error en la petición');
        }

        return response.json();
    },

    auth: {
        login: (password) => API.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        })
    },

    screens: {
        getAll: () => API.request('/screens'),
        update: (id, data) => API.request(`/screens/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    },

    kits: {
        save: (kitData) => API.request('/kits', { method: 'POST', body: JSON.stringify(kitData) }),
        get: (id) => API.request(`/kits/${id}`)
    }
};

window.SmartKitAPI = API;