// API configuration for the vinne microservices backend

// In dev, Vite proxies /api → localhost:4000, so use relative path.
// In production, use the full API URL.
const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL as string) || 'https://api.winbigafrica.com'
  : '';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        // If 401, clear auth so user gets redirected to login
        if (response.status === 401) {
          clearAuth();
          window.location.href = '/signin';
        }
        throw new Error(
          error.message || error.error?.message || error.error ||
          (typeof error === 'string' ? error : `HTTP ${response.status}`)
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(userData: { name: string; email: string; phone: string; password: string }) {
    const phone = userData.phone.replace(/\s+/g, '');
    const nameParts = userData.name.trim().split(/\s+/);
    return this.request<RegisterResponse>('/api/v1/players/register', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phone,
        password: userData.password,
        device_id: 'web_' + Date.now(),
        channel: 'WEBSITE',
        terms_accepted: true,
        marketing_consent: false,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: userData.email,
        device_info: {
          device_type: 'web',
          os: 'web',
          os_version: 'web',
          app_version: '1.0.0',
          user_agent: navigator.userAgent.substring(0, 100),
        },
      }),
    });
  }

  async login(credentials: { email: string; password: string }) {
    // Strip spaces — phone numbers may be formatted with spaces
    const phone = credentials.email.replace(/\s+/g, '');
    return this.request<LoginResponse>('/api/v1/players/login', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phone,
        password: credentials.password,
        device_id: 'web_' + Date.now(),
        channel: 'WEBSITE',
        device_info: {
          device_type: 'web',
          os: 'web',
          os_version: 'web',
          app_version: '1.0.0',
          user_agent: navigator.userAgent.substring(0, 100),
        },
      }),
    });
  }

  async logout(refreshToken: string) {
    return this.request('/api/v1/players/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getProfile(playerId: string) {
    return this.request<{ profile: User }>(`/api/v1/players/${playerId}/profile`);
  }

  // ── Games ─────────────────────────────────────────────────────────────────

  async getActiveGames(): Promise<Game[]> {
    const res = await this.request<{ success?: boolean; data?: { games?: Game[] } } | Game[]>('/api/v1/players/games');
    if (res && !Array.isArray(res) && res.data?.games) return res.data.games;
    if (Array.isArray(res)) return res;
    return [];
  }

  async getGame(gameId: string): Promise<Game> {
    const res = await this.request<{ data?: { game?: Game } } | Game>(`/api/v1/players/games/${gameId}`);
    if (res && !Array.isArray(res) && 'data' in res) return (res.data?.game ?? res.data) as Game;
    return res as Game;
  }

  // ── Tickets ───────────────────────────────────────────────────────────────

  async getMyTickets(playerId: string, params?: { game_id?: string; status?: string; page?: number }) {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => v !== undefined && q.append(k, String(v)));
    }
    const qs = q.toString();
    const res = await this.request<{ success?: boolean; data?: { tickets?: Ticket[]; total?: number } } | Ticket[]>(
      `/api/v1/players/${playerId}/tickets${qs ? `?${qs}` : ''}`
    );
    if (res && !Array.isArray(res) && res.data?.tickets) return res.data.tickets;
    if (Array.isArray(res)) return res;
    return [];
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// ── Response types ────────────────────────────────────────────────────────────

export interface RegisterResponse {
  requires_otp: boolean;
  session_id: string;
  message: string;
}

export interface LoginResponse {
  requires_otp: boolean;
  access_token: string;
  refresh_token: string;
  profile: User;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  created_at: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  phone_verified: boolean;
  email_verified: boolean;
}

export interface Ticket {
  id: string;
  serial_number: string;
  game_code: string;
  game_name?: string;
  game_schedule_id?: string;
  issuer_id: string;
  issuer_type: string;
  customer_phone?: string;
  customer_name?: string;
  total_amount: number | string;  // pesewas (API returns string)
  unit_price: number | string;    // pesewas (API returns string)
  payment_method?: string;
  status: string;                 // issued, validated, won, paid, cancelled, expired, void
  is_winning: boolean;
  winning_amount?: number | string;
  issued_at?: string;
  created_at?: string;
  draw_date?: string;
  // Legacy aliases kept for UI compatibility
  ticket_number?: string;
  game_id?: string;
  player_id?: string;
  purchase_date?: string;
  amount_paid?: number;
}

export interface Game {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  // Pricing — backend uses base_price in pesewas
  base_price: number;
  ticket_price?: number; // alias
  currency?: string;
  // Tickets
  total_tickets?: number;
  sold_tickets?: number;
  max_tickets_per_player?: number;
  // Schedule
  draw_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | string;
  draw_time: string;       // "HH:MM"
  draw_days?: string[];
  sales_cutoff_minutes?: number;
  // Dates (populated on scheduled instances)
  start_date?: string;
  end_date?: string;
  draw_date?: string;
  // Prize / display
  prize_description?: string;
  image_url?: string;
  logo_url?: string;
  brand_color?: string;
  game_format?: string;
  game_category?: string;
}

// ── Auth utilities ────────────────────────────────────────────────────────────

export const isAuthenticated = (): boolean => !!localStorage.getItem('token');

export const getCurrentUser = (): User | null => {
  const s = localStorage.getItem('user');
  return s ? JSON.parse(s) : null;
};

export const clearAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

export default apiClient;
