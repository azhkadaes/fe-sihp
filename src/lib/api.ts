export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
}

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getAuthHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra as Record<string, string>),
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface LoginResponseData {
  user: AuthUser;
  token: AuthToken;
}
