const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'interior_science_token';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

class ApiClient {
  private accessToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(TOKEN_KEY);
    }
  }

  setToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  getToken(): string | null {
    return this.accessToken;
  }

  async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.json ? JSON.stringify(options.json) : options.body,
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshed = await this.refresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
          body: options.json ? JSON.stringify(options.json) : options.body,
          credentials: 'include',
        });
        if (!retryResponse.ok) {
          throw new ApiError(retryResponse.status, await retryResponse.text());
        }
        return retryResponse.json();
      }
      if (typeof window !== 'undefined') {
        this.setToken(null);
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Session expired');
    }

    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const json = JSON.parse(text);
        message = json.message || text;
      } catch {
        // keep text as-is
      }
      throw new ApiError(response.status, message);
    }

    return response.json();
  }

  private async refresh(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        this.setToken(data.accessToken);
        return true;
      }
    } catch {
      // refresh failed
    }
    this.setToken(null);
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
