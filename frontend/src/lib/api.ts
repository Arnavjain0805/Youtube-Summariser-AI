import type {
  ApiKey,
  AuthResponse,
  Chat,
  ChatMeta,
  Preferences,
  User,
} from '../types'

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787'

const TOKEN_KEY = 'yt_token'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { ...headers, ...(opts.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, 'Network error. Is the API running?')
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // keep default message
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/api/auth/me'),

  getChats: () => request<{ chats: ChatMeta[] }>('/api/chats'),
  getChat: (id: string) => request<{ chat: Chat }>(`/api/chats/${id}`),
  summarize: (url: string, tone?: string) =>
    request<{ chat: Chat }>('/api/chats', { method: 'POST', body: JSON.stringify({ url, tone }) }),
  sendMessage: (id: string, content: string) =>
    request<{ messages: Chat['messages'] }>(`/api/chats/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  deleteChat: (id: string) => request<{ ok: boolean }>(`/api/chats/${id}`, { method: 'DELETE' }),

  getPreferences: () => request<{ preferences: Preferences }>('/api/preferences'),
  savePreferences: (prefs: Partial<Preferences>) =>
    request<{ preferences: Preferences }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),

  getKeys: () => request<{ keys: ApiKey[] }>('/api/keys'),
  createKey: (name: string) =>
    request<{ key: string; message: string; createdAt: string }>('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  revokeKey: (id: string) => request<{ ok: boolean }>(`/api/keys/${id}`, { method: 'DELETE' }),

  getProfile: () => request<{ user: User }>('/api/profile'),
  updateProfile: (name: string) =>
    request<{ user: User }>('/api/profile', { method: 'PUT', body: JSON.stringify({ name }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/api/profile/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}
