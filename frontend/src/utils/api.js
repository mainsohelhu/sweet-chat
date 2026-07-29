import axios from 'axios';

const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
      return process.env.REACT_APP_API_URL;
    }
    return '/api';
  }
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

const getAuth = () => {
  try { return JSON.parse(localStorage.getItem('sc_auth') || '{}'); } catch { return {}; }
};

api.interceptors.request.use((config) => {
  const token = getAuth().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken } = getAuth();
        if (!refreshToken) throw new Error('no refresh');
        const base = getBaseUrl();
        const res = await axios.post(`${base}/auth/refresh`, { refreshToken });
        const auth = getAuth();
        auth.token = res.data.accessToken;
        auth.refreshToken = res.data.refreshToken;
        localStorage.setItem('sc_auth', JSON.stringify(auth));
        original.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('sc_auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
