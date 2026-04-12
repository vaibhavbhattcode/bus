import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleApiError, getErrorMessage, ApiError } from './errorHandler';
import { useAuthStore } from '../store/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PendingRequest {
  promise: Promise<AxiosResponse>;
  timestamp: number;
}

/**
 * ApiClient - Enhanced API client with:
 * - Request deduplication (prevents duplicate concurrent requests)
 * - Exponential backoff retry for failed requests
 * - Automatic token refresh on 401
 * - Request/Response interceptors
 */
class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly DEDUPLICATION_WINDOW = 100; // ms
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // ms

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      withCredentials: true, // Required for httpOnly refresh_token cookie
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: attach access token and deduplication key
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: auto-refresh on 401 + error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
        
        if (!originalRequest) return Promise.reject(error);

        // Handle 401 Unauthorized — attempt silent token refresh
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/')
        ) {
          originalRequest._retry = true;

          if (this.isRefreshing) {
            // Queue additional requests while refresh is in progress
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client.request(originalRequest));
              });
            });
          }

          this.isRefreshing = true;

          try {
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

              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client.request(originalRequest);
            }

            throw new Error('No access token in refresh response');
          } catch (refreshError) {
            this.isRefreshing = false;
            this.refreshSubscribers = [];

            console.warn('[Auth] Token refresh failed — session expired. Redirecting to login.');
            useAuthStore.getState().logout();

            // Show user-friendly toast before redirect
            import('react-hot-toast').then(({ toast }) => {
              toast.error('Your session has expired. Please log in again.', { duration: 4000 });
            });

            if (!window.location.pathname.includes('/login')) {
              setTimeout(() => { window.location.href = '/login'; }, 1500);
            }
            return Promise.reject(refreshError);
          }
        }

        // Retry logic for network errors and 5xx responses
        const shouldRetry = this.shouldRetryRequest(error, originalRequest);
        if (shouldRetry) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          const delay = this.calculateRetryDelay(originalRequest._retryCount);
          
          console.warn(`[API] Retrying request (${originalRequest._retryCount}/${this.MAX_RETRIES}) after ${delay}ms`);
          await this.sleep(delay);
          return this.client.request(originalRequest);
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

  /**
   * Determines if a request should be retried based on error type
   */
  private shouldRetryRequest(error: AxiosError, config: AxiosRequestConfig & { _retryCount?: number }): boolean {
    const retryCount = config._retryCount || 0;
    if (retryCount >= this.MAX_RETRIES) return false;

    // Retry on network errors (no response)
    if (!error.response) return true;

    // Retry on 5xx server errors (except 501 Not Implemented)
    const status = error.response.status;
    if (status >= 500 && status !== 501) return true;

    // Retry on rate limiting (429), but not for auth endpoints (to prevent UI from hanging during lockouts)
    if (status === 429) {
      if (config.url?.includes('/auth/')) return false;
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = this.RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 200; // Add up to 200ms of jitter
    return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  /**
   * Generate a unique key for request deduplication
   */
  private getRequestKey(method: string, url: string, data?: unknown): string {
    return `${method}:${url}:${JSON.stringify(data)}`;
  }

  /**
   * Execute request with deduplication support
   */
  private async executeRequest<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const key = this.getRequestKey(method, url, data);
    const now = Date.now();

    // Check for pending duplicate request
    const pending = this.pendingRequests.get(key);
    if (pending && now - pending.timestamp < this.DEDUPLICATION_WINDOW) {
      console.debug(`[API] Deduplicating request: ${method} ${url}`);
      const response = await pending.promise;
      const responseData = response.data as any;
      return responseData?.success !== undefined ? responseData.data : responseData;
    }

    // Create new request
    const promise = this.client.request({
      method,
      url,
      data,
      ...config,
    });

    // Store pending request
    this.pendingRequests.set(key, { promise, timestamp: now });

    // Cleanup after request completes
    const cleanup = () => {
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, this.DEDUPLICATION_WINDOW);
    };

    try {
      const response = await promise;
      cleanup();
      const responseData = response.data as any;
      return responseData?.success !== undefined ? responseData.data : responseData;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  /** Get typed error message from an unknown error */
  getErrorMessage(error: unknown): string {
    return getErrorMessage(error);
  }

  // HTTP Method wrappers with deduplication and typed responses
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>('get', url, undefined, config);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>('post', url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>('put', url, data, config);
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>('patch', url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeRequest<T>('delete', url, undefined, config);
  }
}

export const api = new ApiClient();
