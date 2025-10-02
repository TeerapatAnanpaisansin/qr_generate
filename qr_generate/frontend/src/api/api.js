// frontend/src/api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000
});

/** Always attach the freshest token from localStorage */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

/** Optional: simple error logger */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url ?? "";
    const status = err?.response?.status;
    console.error("[API] Failed:", url, status, err?.response?.data || err?.message);
    throw err;
  }
);

/** Helpers to manage token in one place */
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
  // fresh start to avoid stale tokens
  clearAuth();
  const { data } = await api.post("/auth/register", payload);
  localStorage.setItem("jwt", data.token);
  localStorage.setItem("role", data.user.role);
  api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
  return data;
}

export async function login(payload) {
  clearAuth();
  const { data } = await api.post("/auth/login", payload);
  localStorage.setItem("jwt", data.token);
  localStorage.setItem("role", data.user.role);
  api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
  return data;
}

export function logout() {
  clearAuth();
}

/** Links */
export async function createLink({ real_url, code }) {
  const { data } = await api.post("/links", { real_url, code });
  return data;
}

export async function getLinkInfo(code) {
  // serverless route: GET /api/links/:key
  const { data } = await api.get(`/links/${encodeURIComponent(code)}`);
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
