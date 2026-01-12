const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Auth API
export const authApi = {
  signup: (email: string, password: string, name: string) =>
    apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  signin: (email: string, password: string) =>
    apiFetch('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: (token: string) =>
    apiFetch('/auth/me', { token }),
};

// Timer API
export const timerApi = {
  start: (token: string, notes?: string) =>
    apiFetch('/timer/start', {
      method: 'POST',
      body: JSON.stringify({ notes }),
      token,
    }),

  stop: (token: string, id: string) =>
    apiFetch(`/timer/stop/${id}`, {
      method: 'POST',
      token,
    }),

  getActive: (token: string) =>
    apiFetch('/timer/active', { token }),

  getSessions: (token: string, limit = 20, offset = 0) =>
    apiFetch(`/timer/sessions?limit=${limit}&offset=${offset}`, { token }),

  updateNotes: (token: string, id: string, notes: string) =>
    apiFetch(`/timer/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
      token,
    }),

  deleteSession: (token: string, id: string) =>
    apiFetch(`/timer/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// Calendar API
export const calendarApi = {
  getDaily: (token: string, date: string) =>
    apiFetch(`/calendar/daily/${date}`, { token }),

  getRange: (token: string, start: string, end: string) =>
    apiFetch(`/calendar/range?start=${start}&end=${end}`, { token }),

  getContributions: (token: string) =>
    apiFetch('/calendar/contributions', { token }),

  getMonthly: (token: string, year: number, month: number) =>
    apiFetch(`/calendar/monthly/${year}/${month}`, { token }),
};
