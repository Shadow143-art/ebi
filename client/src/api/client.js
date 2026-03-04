import axios from "axios";

const envApiBase = String(import.meta.env.VITE_API_URL || "").trim();
const isLocalApi = /localhost|127\.0\.0\.1/i.test(envApiBase);

// Safety: never bake localhost API into production builds.
const API_BASE =
  (!import.meta.env.DEV && isLocalApi ? "" : envApiBase) ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

export const api = axios.create({
  baseURL: API_BASE
});

export const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};
