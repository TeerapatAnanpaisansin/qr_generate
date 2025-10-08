import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Always attach freshest token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err?.config?.url ?? "";
    const status = err?.response?.status;
    console.error("[API]", status, url, err?.response?.data || err?.message);
    throw err;
  }
);

export function setToken(token) {
  if (token) {
    localStorage.setItem("jwt", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    clearAuth();
  }
}
export function clearAuth() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("role");
  delete api.defaults.headers.common.Authorization;
}

/** Auth */
export async function register(payload) {
  clearAuth();
  const { data } = await api.post("/auth/register", payload);
  setToken(data.token);
  localStorage.setItem("role", data.user.role);
  return data;
}
export async function login(payload) {
  clearAuth();
  const { data } = await api.post("/auth/login", payload);
  setToken(data.token);
  localStorage.setItem("role", data.user.role);
  return data;
}
export function logout() { clearAuth(); }

/** Links */
export async function createLink({ real_url, code }) {
  const { data } = await api.post("/links", { real_url, code });
  return data;
}
export async function listLinks() {
  const { data } = await api.get("/links");
  return data;
}
export async function deleteLink(key) {
  const { data } = await api.delete(`/links/${encodeURIComponent(key)}`);
  return data;
}

export default api;
