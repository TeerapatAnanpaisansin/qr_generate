// frontend/src/api/api.js

import axios from "axios";

// use in localhost
// const api = axios.create({ baseURL: "http://localhost:8080" });

// for deploy vercel
const api = axios.create({
  baseURL: import.meta.env.DEV ? "http://localhost:8080" : "/api"
});

// CRITICAL: Request interceptor ALWAYS reads fresh token from localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem("jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[API] Using token for request:', config.url);
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// Response interceptor for debugging
api.interceptors.response.use(
  response => response,
  error => {
    console.error('[API] Request failed:', error.config?.url, error.response?.status);
    throw error;
  }
);

export function setToken(t) {
  if (t) {
    localStorage.setItem("jwt", t);
    api.defaults.headers.common.Authorization = `Bearer ${t}`;
  } else {
    localStorage.removeItem("jwt");
    localStorage.removeItem("role");
    delete api.defaults.headers.common.Authorization;
  }
}

export async function register(payload) {
  console.log('[API] Registering user...');
  
  // FORCE COMPLETE WIPE
  localStorage.clear();
  delete api.defaults.headers.common.Authorization;
  
  const { data } = await api.post("/auth/register", payload);
  
  // Set fresh credentials
  localStorage.setItem("jwt", data.token);
  localStorage.setItem("role", data.user.role);
  api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
  
  console.log('[API] Registered as:', data.user.user_name, 'ID:', data.user.id, 'Role:', data.user.role);
  
  return data;
}

export async function login(payload) {
  console.log('[API] Logging in...');
  
  // FORCE COMPLETE WIPE - critical for preventing stale tokens
  localStorage.clear();
  sessionStorage.clear();
  delete api.defaults.headers.common.Authorization;
  
  const { data } = await api.post("/auth/login", payload);
  
  // Set fresh credentials
  localStorage.setItem("jwt", data.token);
  localStorage.setItem("role", data.user.role);
  api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
  
  console.log('[API] Logged in as:', data.user.user_name, 'ID:', data.user.id, 'Role:', data.user.role);
  console.log('[API] Token stored:', data.token.substring(0, 20) + '...');
  
  return data;
}

export function logout() {
  console.log('[API] Logging out...');
  localStorage.clear();
  sessionStorage.clear();
  delete api.defaults.headers.common.Authorization;
}

export async function createLink({ real_url, code }) {
  const { data } = await api.post("/links", { real_url, code });
  return data;
}

export async function getLinkInfo(code) {
  const { data } = await api.get(`/api/links/${code}`);
  return data;
}

export async function listLinks() {
  const { data } = await api.get("/links");
  return data;
}

export async function deleteLink(id) {
  const { data } = await api.delete(`/links/${id}`);
  return data;
}

export default api;