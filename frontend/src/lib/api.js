import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bv_session_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If backend is still starting up, retry the request automatically
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      if (!error.config._retryCount) error.config._retryCount = 0;
      if (error.config._retryCount < 20) {
        error.config._retryCount += 1;
        await new Promise((r) => setTimeout(r, 500));
        return api.request(error.config);
      } else {
        window.dispatchEvent(new Event("connection-failed"));
      }
    }

    // If it's a 401 and NOT an auth route, log the user out
    const isAuthRoute = error.config?.url?.includes("/api/auth/");
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("bv_session_token");
      localStorage.removeItem("bv_user");
      window.location.hash = "#/";
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export default api;
