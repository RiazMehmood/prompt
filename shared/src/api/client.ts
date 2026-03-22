/**
 * Shared API client with JWT auth header injection and refresh token handling.
 * Used by both frontend (Next.js) and mobile (React Native).
 */
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, LoginResponse } from '../types/api';

// Token storage interface — implemented differently per platform
// Frontend: localStorage / cookies | Mobile: @react-native-async-storage/async-storage
export interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
}

// Simple in-memory fallback (not secure for production)
class InMemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async getAccessToken() { return this.accessToken; }
  async getRefreshToken() { return this.refreshToken; }
  async setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
  }
  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

export class ApiClient {
  private client: AxiosInstance;
  private storage: TokenStorage;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor(baseURL: string, storage?: TokenStorage) {
    this.storage = storage ?? new InMemoryTokenStorage();
    this.client = axios.create({
      baseURL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });
    this._setupInterceptors();
  }

  private _setupInterceptors(): void {
    // Request: inject JWT
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.storage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response: handle 401 with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config as AxiosRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const newToken = await this._refreshAccessToken();
            original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
            return this.client(original);
          } catch {
            await this.storage.clearTokens();
            return Promise.reject(error);
          }
        }
        return Promise.reject(this._normalizeError(error));
      },
    );
  }

  private async _refreshAccessToken(): Promise<string> {
    if (this.isRefreshing) {
      return new Promise((resolve) => this.refreshQueue.push(resolve));
    }
    this.isRefreshing = true;
    try {
      const refreshToken = await this.storage.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      const res = await this.client.post<LoginResponse>('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefresh } = res.data;
      await this.storage.setTokens(accessToken, newRefresh);
      this.refreshQueue.forEach((cb) => cb(accessToken));
      return accessToken;
    } finally {
      this.isRefreshing = false;
      this.refreshQueue = [];
    }
  }

  private _normalizeError(error: unknown): ApiError {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      return error.response.data.error as ApiError;
    }
    return { code: 'NETWORK_ERROR', message: 'Network request failed' };
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.get<T>(path, config);
    return res.data;
  }

  async post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.post<T>(path, data, config);
    return res.data;
  }

  async put<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.put<T>(path, data, config);
    return res.data;
  }

  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.delete<T>(path, config);
    return res.data;
  }

  async postForm<T>(path: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.post<T>(path, formData, {
      ...config,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  setTokens(accessToken: string, refreshToken: string): Promise<void> {
    return this.storage.setTokens(accessToken, refreshToken);
  }

  clearTokens(): Promise<void> {
    return this.storage.clearTokens();
  }
}

// Default client instance — configure baseURL from environment
// Frontend:  process.env.NEXT_PUBLIC_API_BASE_URL
// Mobile:    process.env.API_BASE_URL (via react-native-config)
export function createApiClient(baseURL: string, storage?: TokenStorage): ApiClient {
  return new ApiClient(baseURL, storage);
}
