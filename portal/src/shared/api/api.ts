import axios from "axios";
import {
  clearAuth,
  getToken,
} from "../utils/auth";
import { apiBaseUrl } from "../config/app";

export const AUTH_EXPIRED_EVENT =
  "farmstaygo:auth-expired";

const api = axios.create({
  baseURL: apiBaseUrl,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const token = getToken();

    if (error.response?.status === 401 && token) {
      clearAuth();

      const loginPath = window.location.pathname.startsWith(
        "/vendor"
      )
        ? "/vendor/login"
        : "/admin/login";

      if (window.location.pathname !== loginPath) {
        window.dispatchEvent(
          new CustomEvent(AUTH_EXPIRED_EVENT, {
            detail: {
              loginPath,
            },
          })
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;
