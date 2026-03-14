"""Auth helper module with token storage."""

// Platform-specific storage adapters
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Web storage adapter (localStorage)
export const webStorageAdapter: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },
};

// Token storage keys
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export class AuthHelper {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  async getToken(): Promise<string | null> {
    return this.storage.getItem(TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    await this.storage.setItem(TOKEN_KEY, token);
  }

  async removeToken(): Promise<void> {
    await this.storage.removeItem(TOKEN_KEY);
  }

  async getUser(): Promise<any | null> {
    const userJson = await this.storage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  async setUser(user: any): Promise<void> {
    await this.storage.setItem(USER_KEY, JSON.stringify(user));
  }

  async removeUser(): Promise<void> {
    await this.storage.removeItem(USER_KEY);
  }

  async clearAuth(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  }
}

// Default web auth helper
export const authHelper = new AuthHelper(webStorageAdapter);
