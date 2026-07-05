/**
 * Nagrik — api.js
 * Centralized fetch wrapper with automatic JWT injection.
 * All API calls go through this module.
 */

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '';

let API_BASE;
if (isLocal) {
    API_BASE = 'http://127.0.0.1:8000/api';
} else if (window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com')) {
    // If deployed to Firebase, use the Google Cloud Run backend
    API_BASE = 'https://<YOUR-CLOUD-RUN-URL>.a.run.app/api';
} else {
    // If deployed to Vercel/Render, keep using the Render backend
    API_BASE = 'https://community-hero-api.onrender.com/api';
}

/** Get the stored JWT token */
function getToken() {
  return localStorage.getItem('Nagrik_token');
}

/** Core fetch wrapper — automatically injects Authorization header */
async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  // Don't set Content-Type for FormData (browser handles boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.detail || JSON.stringify(errData);
    } catch (_) {}
    throw new Error(errMsg);
  }

  // Return null for 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

// ── Auth ──────────────────────────────────────────────────────────

const api = {
  auth: {
    register: (name, email, password) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),

    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    me: () => request('/auth/me'),
  },

  // ── Issues ──────────────────────────────────────────────────────

  issues: {
    list: (params = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ).toString();
      return request(`/issues${qs ? '?' + qs : ''}`);
    },

    create: (formData) =>
      request('/issues', {
        method: 'POST',
        body: formData, // FormData for multipart
        headers: {}, // let browser set content-type with boundary
      }),

    get: (id) => request(`/issues/${id}`),

    updateStatus: (id, status, resolutionImageFile = null) => {
      const fd = new FormData();
      fd.append('status', status);
      if (resolutionImageFile) fd.append('resolution_image', resolutionImageFile);
      return request(`/issues/${id}/status`, {
        method: 'PATCH',
        body: fd,
        headers: {},
      });
    },

    aiPreview: (imageFile) => {
      const fd = new FormData();
      fd.append('image', imageFile);
      return request('/issues/ai-preview', { method: 'POST', body: fd, headers: {} });
    },

    communityAssessment: (id) => request(`/issues/${id}/community-assessment`),

    microVerify: (id, payload) =>
      request(`/issues/${id}/micro-verify`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // ── Votes ────────────────────────────────────────────────────────

  votes: {
    cast: (issueId, type) =>
      request(`/issues/${issueId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      }),

    remove: (issueId, type = 'upvote') =>
      request(`/issues/${issueId}/vote?vote_type=${type}`, { method: 'DELETE' }),
  },

  // ── Comments ─────────────────────────────────────────────────────

  comments: {
    list: (issueId) => request(`/issues/${issueId}/comments`),
    post: (issueId, body, isAuthorityUpdate = false) =>
      request(`/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body, is_authority_update: isAuthorityUpdate }),
      }),
  },

  // ── Analytics ────────────────────────────────────────────────────

  insights: {
    stats: () => request('/insights/stats'),
    heatmap: () => request('/insights/heatmap'),
    predictions: () => request('/insights/predictions'),
    generateDigest: () => request('/admin/generate-digest', { method: 'POST' }),
    area: (name) => request(`/insights/area?name=${encodeURIComponent(name)}`),
  },

  // ── Users ────────────────────────────────────────────────────────

  users: {
    profile: (userId) => request(`/users/${userId}/profile`),
  },

  // ── Notifications ────────────────────────────────────────────────
  
  notifications: {
    list: () => request('/notifications'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
    subscribe: (issueId) => request(`/notifications/issues/${issueId}/subscribe`, { method: 'POST' }),
    unsubscribe: (issueId) => request(`/notifications/issues/${issueId}/unsubscribe`, { method: 'POST' }),
  },

  // ── Authority ────────────────────────────────────────────────────
  
  authority: {
    optimizeRoute: (startLat, startLng, category = null) =>
      request('/authority/optimize-route', {
        method: 'POST',
        body: JSON.stringify({ category, start_lat: startLat, start_lng: startLng }),
      }),
  },

  // ── Admin ────────────────────────────────────────────────────────
  
  admin: {
    seedDemo: () => request('/admin/seed-demo', { method: 'POST' }),
  },
};

export default api;
export { API_BASE };
