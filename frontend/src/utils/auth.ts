// Shared auth helpers used across all role dashboards

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') ?? localStorage.getItem('admin_token');
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_user') ?? localStorage.getItem('admin_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  localStorage.removeItem('domain_name');
}

export function roleHomePath(role: string): string {
  switch (role) {
    case 'root_admin':   return '/admin/analytics';
    case 'domain_admin': return '/domain-admin';
    case 'institute_admin': return '/institute/dashboard';
    case 'staff':        return '/staff';
    case 'user':         return '/user/chat';
    default:             return '/login';
  }
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  domain_id?: string;
  institute_id?: string;
  subscription_tier?: string;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeader(),
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === 'string' ? detail :
      typeof detail === 'object' && detail !== null ? (detail.message ?? JSON.stringify(detail)) :
      data?.error?.message ?? 'Request failed';
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}
