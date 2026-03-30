import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002/api/v1';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cleo_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('cleo_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// Projects
export const projectsApi = {
  list: () => api.get('/projects').then((r) => r.data),
  get: (id: string) => api.get(`/projects/${id}`).then((r) => r.data),
  create: (data: { title: string; sourceType: string; sourceUrl?: string }) =>
    api.post('/projects', data).then((r) => r.data),
  upload: (title: string, file: File, onProgress?: (p: number) => void) => {
    const form = new FormData();
    form.append('title', title);
    form.append('video', file);
    return api.post('/projects/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then((r) => r.data);
  },
  remove: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
};

// Clips
export const clipsApi = {
  get: (id: string) => api.get(`/clips/${id}`).then((r) => r.data),
  streamUrl: (id: string) => `${BASE}/clips/${id}/stream`,
  publish: (id: string) => api.post(`/clips/${id}/publish`).then((r) => r.data),
  remove: (id: string) => api.delete(`/clips/${id}`).then((r) => r.data),
};

// Admin
export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  listTenants: () => api.get('/admin/tenants').then((r) => r.data),
  getTenant: (id: string) => api.get(`/admin/tenants/${id}`).then((r) => r.data),
  createTenant: (data: {
    name: string; slug: string; ownerName: string;
    ownerEmail: string; ownerPassword: string; plan?: string;
  }) => api.post('/admin/tenants', data).then((r) => r.data),
  updateTenant: (id: string, data: { name?: string; plan?: string; active?: boolean }) =>
    api.put(`/admin/tenants/${id}`, data).then((r) => r.data),
  deleteTenant: (id: string) => api.delete(`/admin/tenants/${id}`).then((r) => r.data),
  impersonate: (id: string) => api.post(`/admin/tenants/${id}/impersonate`).then((r) => r.data),
};

// Clips publish
export const publishApi = {
  publish: (clipId: string, platform: 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK') =>
    api.post(`/clips/${clipId}/publish?platform=${platform}`).then((r) => r.data),
};

// Instagram
export const instagramApi = {
  status: () => api.get('/instagram/status').then((r) => r.data),
  authUrl: () => api.get('/instagram/auth-url').then((r) => r.data),
  disconnect: () => api.delete('/instagram/disconnect').then((r) => r.data),
};

// YouTube
export const youtubeApi = {
  status: () => api.get('/youtube/status').then((r) => r.data),
  authUrl: () => api.get('/youtube/auth-url').then((r) => r.data),
  disconnect: () => api.delete('/youtube/disconnect').then((r) => r.data),
};

// TikTok
export const tiktokApi = {
  status: () => api.get('/tiktok/status').then((r) => r.data),
  authUrl: () => api.get('/tiktok/auth-url').then((r) => r.data),
  disconnect: () => api.delete('/tiktok/disconnect').then((r) => r.data),
};

// Marketplace
export const marketplaceApi = {
  list: (params?: { platform?: string; category?: string; sort?: string }) =>
    api.get('/marketplace/clips', { params }).then((r) => r.data),
  get: (clipId: string) =>
    api.get(`/marketplace/clips/${clipId}`).then((r) => r.data),
  claim: (clipId: string) =>
    api.post(`/marketplace/clips/${clipId}/claim`).then((r) => r.data),
};

// Claims (Clipper)
export const claimsApi = {
  list: () => api.get('/clipper/claims').then((r) => r.data),
  get: (id: string) => api.get(`/clipper/claims/${id}`).then((r) => r.data),
  submit: (id: string, socialUrl: string) =>
    api.post(`/clipper/claims/${id}/submit`, { socialUrl }).then((r) => r.data),
  submitMulti: (claimId: string, urls: { platform: string; url: string }[]) =>
    api.post(`/claims/${claimId}/submissions`, { urls }).then((r) => r.data),
};

// Clipper Dashboard
export const clipperApi = {
  dashboard: () => api.get('/clipper/dashboard').then((r) => r.data),
  earnings: () => api.get('/clipper/earnings').then((r) => r.data),
};

// Campaigns (Infoproductor)
export const campaignsApi = {
  list: () => api.get('/infoproductor/campaigns').then((r) => r.data),
  get: (id: string) => api.get(`/infoproductor/campaigns/${id}`).then((r) => r.data),
  create: (data: {
    title: string; description: string; budget: number;
    cpmRate: number; clipIds: string[];
  }) => api.post('/infoproductor/campaigns', data).then((r) => r.data),
};
