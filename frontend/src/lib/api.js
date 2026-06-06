import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return axios(error.config);
        }
      }
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
