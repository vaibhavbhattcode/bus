import axios, { AxiosError, AxiosInstance } from 'axios';
import { handleApiError, getErrorMessage, ApiError } from './errorHandler';
import { useAuthStore } from '../store/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      // Required so the browser sends the httpOnly refresh_token cookie to the server
      withCredentials: true,
    });

    // ─── Request interceptor: attach access token from memory ───────────────
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken ?? localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ─── Response interceptor: auto-refresh on 401 ──────────────────────────
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized — attempt silent token refresh
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !(originalRequest as any)._retry &&
          !originalRequest.url?.includes('/auth/')
        ) {
          (originalRequest as any)._retry = true;

          if (this.isRefreshing) {
            // Queue additional requests while refresh is in progress
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client.request(originalRequest));
              });
            });
          }

          this.isRefreshing = true;

          try {
            // The httpOnly cookie is sent automatically via withCredentials.
            // No need to read or send refreshToken from JS.
            const response = await axios.post(
              `${API_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            );

            const newAccessToken: string =
              response.data?.access_token ?? response.data?.accessToken ?? '';

            if (newAccessToken) {
              useAuthStore.getState().setAccessToken(newAccessToken);
              this.isRefreshing = false;
              this.onRefreshed(newAccessToken);
              this.refreshSubscribers = [];

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client.request(originalRequest);
            }

            throw new Error('No access token in refresh response');
          } catch (refreshError) {
            this.isRefreshing = false;
            this.refreshSubscribers = [];

            console.warn('[Auth] Token refresh failed — session expired. Redirecting to login.');
            useAuthStore.getState().logout();

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        // Show toast for unexpected API errors (skip 401 and expected 404s)
        const isProviderProfileEndpoint = error.config?.url?.includes('/providers/profile');
        if (
          error.response?.status !== 401 &&
          !(error.response?.status === 404 && isProviderProfileEndpoint)
        ) {
          handleApiError(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  /** Get typed error message from an unknown error */
  getErrorMessage(error: unknown): string {
    return getErrorMessage(error);
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<{ success: boolean; data: T } | T>(url, config);
    const data = response.data as any;
    return data?.success !== undefined ? data.data : data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<{ success: boolean; data: T } | T>(url, data, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<{ success: boolean; data: T } | T>(url, data, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<{ success: boolean; data: T } | T>(url, data, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<{ success: boolean; data: T } | T>(url, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }
}

export const api = new ApiClient();

import axios, { AxiosError, AxiosInstance } from 'axios';
import { handleApiError, getErrorMessage, ApiError } from './errorHandler';
import { useAuthStore } from '../store/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      // Required so the browser sends the httpOnly refresh_token cookie to the server
      withCredentials: true,
    });

    // ─── Request interceptor: attach access token from memory ───────────────
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ─── Response interceptor: auto-refresh on 401 ──────────────────────────
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized — attempt silent token refresh
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !(originalRequest as any)._retry &&
          !originalRequest.url?.includes('/auth/')
        ) {
          (originalRequest as any)._retry = true;

          if (this.isRefreshing) {
            // Queue additional requests while refresh is in progress
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client.request(originalRequest));
              });
            });
          }

          this.isRefreshing = true;

          try {
            // The httpOnly cookie is sent automatically via withCredentials.
            // No need to read or send refreshToken from JS.
            const response = await axios.post(
              `${API_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            );

            const newAccessToken: string =
              response.data?.access_token ?? response.data?.accessToken ?? '';

            if (newAccessToken) {
              useAuthStore.getState().setAccessToken(newAccessToken);
              this.isRefreshing = false;
              this.onRefreshed(newAccessToken);
              this.refreshSubscribers = [];

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client.request(originalRequest);
            }

            throw new Error('No access token in refresh response');
          } catch (refreshError) {
            this.isRefreshing = false;
            this.refreshSubscribers = [];

            console.warn('[Auth] Token refresh failed — session expired. Redirecting to login.');
            useAuthStore.getState().logout();

            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        // Show toast for unexpected API errors (skip 401 and expected 404s)
        const isProviderProfileEndpoint = error.config?.url?.includes('/providers/profile');
        if (
          error.response?.status !== 401 &&
          !(error.response?.status === 404 && isProviderProfileEndpoint)
        ) {
          handleApiError(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  /** Get typed error message from an unknown error */
  getErrorMessage(error: unknown): string {
    return getErrorMessage(error);
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<{ success: boolean; data: T } | T>(url, config);
    const data = response.data as any;
    return data?.success !== undefined ? data.data : data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<{ success: boolean; data: T } | T>(url, data, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<{ success: boolean; data: T } | T>(url, data, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<{ success: boolean; data: T } | T>(url, data, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<{ success: boolean; data: T } | T>(url, config);
    const responseData = response.data as any;
    return responseData?.success !== undefined ? responseData.data : responseData;
  }
}

export const api = new ApiClient();
