import api from '@/lib/api'

// ── Core types ────────────────────────────────────────────────────────────────

export interface Game {
  id: string
  code: string
  name: string
  description?: string
  game_category?: string
  game_format?: string
  game_type?: string          // legacy alias
  type?: string               // legacy alias
  base_price: number          // GHS — ticket price
  ticket_price?: number       // legacy alias for base_price
  total_tickets?: number
  sold_tickets?: number
  max_tickets_per_player: number
  draw_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'special'
  draw_days?: string[]
  draw_time?: string
  sales_cutoff_minutes: number
  multi_draw_enabled: boolean
  max_draws_advance?: number
  organizer?: string
  logo_url?: string
  brand_color?: string
  prize_details?: string
  rules?: string
  start_date?: string
  end_date?: string
  status: string
  version?: number
  created_at?: string
  updated_at?: string
}

export interface CreateGameRequest {
  code: string
  name: string
  description?: string
  draw_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'special'
  draw_days?: string[]
  draw_time?: string
  sales_cutoff_minutes: number
  base_price: number          // GHS
  total_tickets?: number
  max_tickets_per_player: number
  max_tickets_per_transaction?: number
  multi_draw_enabled: boolean
  status?: string
  start_date?: string
  end_date?: string
  prize_details?: string
  rules?: string
  // Required by backend but not shown to user — always competition format
  game_category: 'private'
  format: 'competition'
  organizer: 'winbig_africa'
  bet_types: []
  number_range_min: 1
  number_range_max: 1
  selection_count: 1
}

export interface UpdateGameRequest {
  name?: string
  description?: string
  draw_frequency?: string
  draw_days?: string[]
  draw_time?: string
  sales_cutoff_minutes?: number
  base_price?: number
  total_tickets?: number
  max_tickets_per_player?: number
  multi_draw_enabled?: boolean
  prize_details?: string
  rules?: string
  start_date?: string | null
  end_date?: string | null
}

export interface GameSchedule {
  id: string
  game_id: string
  game_name?: string
  game_code?: string
  game_category?: string
  scheduled_start: string | { seconds: number; nanos?: number }
  scheduled_end: string | { seconds: number; nanos?: number }
  scheduled_draw: string | { seconds: number; nanos?: number }
  frequency: string
  is_active: boolean
  status?: string
  notes?: string
  logo_url?: string
  brand_color?: string
}

export interface UpdateScheduledGameRequest {
  scheduled_end?: string
  scheduled_draw?: string
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
  is_active?: boolean
  notes?: string
}

export interface WeeklyScheduleResponse {
  schedules: GameSchedule[]
  schedules_created: number
  success: boolean
  message: string
}

// ── Service ───────────────────────────────────────────────────────────────────

class GameService {
  async createGame(data: CreateGameRequest): Promise<Game> {
    const payload = {
      ...data,
      // Always force competition format — never lottery
      game_category: 'private',
      format: 'competition',
      organizer: 'winbig_africa',
      bet_types: [],
      number_range_min: 1,
      number_range_max: 100,  // must be > number_range_min
      selection_count: 1,
      max_tickets_per_transaction: data.max_tickets_per_player,
    }
    const response = await api.post('/admin/games', payload)

    // Backend returns 200 even on validation failure — check inner success flag
    const inner = response.data.data
    if (inner && inner.success === false) {
      throw new Error(inner.message || 'Failed to create game')
    }

    const game = inner?.game || inner || response.data
    if (!game || !game.id) {
      throw new Error('Game was not created — no game data returned')
    }
    return game
  }

  async getGames(page = 1, limit = 20): Promise<{ data: Game[]; total: number }> {
    const response = await api.get('/admin/games', { params: { page, limit } })
    const d = response.data.data || {}
    return { data: d.games || [], total: d.total || 0 }
  }

  async getGame(id: string): Promise<Game> {
    const response = await api.get(`/admin/games/${id}`)
    return response.data.data?.game || response.data.data
  }

  async updateGame(id: string, data: UpdateGameRequest): Promise<Game> {
    const response = await api.put(`/admin/games/${id}`, data)
    return response.data.data
  }

  async deleteGame(id: string): Promise<void> {
    await api.delete(`/admin/games/${id}`)
  }

  async activateGame(id: string): Promise<Game> {
    const response = await api.put(`/admin/games/${id}/status`, { status: 'Active' })
    return response.data.data
  }

  async suspendGame(id: string, reason: string): Promise<void> {
    await api.put(`/admin/games/${id}/status`, { status: 'Suspended', reason })
  }

  async generateWeeklySchedule(weekStart?: string): Promise<WeeklyScheduleResponse> {
    const data = weekStart ? { week_start: weekStart } : {}
    const response = await api.post('/admin/scheduling/weekly/generate', data)
    return response.data.data || response.data
  }

  async getWeeklySchedule(weekStart?: string): Promise<GameSchedule[]> {
    const defaultWeekStart = weekStart || '2020-01-01'
    const response = await api.get('/admin/scheduling/weekly', {
      params: { week_start: defaultWeekStart },
    })
    return response.data.data?.schedules || response.data.schedules || []
  }

  async clearWeeklySchedule(weekStart?: string): Promise<{ success: boolean; message: string; schedules_deleted: number }> {
    const params = weekStart ? { week_start: weekStart } : undefined
    const response = await api.delete('/admin/scheduling/weekly/clear', { params })
    return response.data.data || response.data
  }

  async updateScheduledGame(scheduleId: string, data: UpdateScheduledGameRequest): Promise<GameSchedule> {
    const response = await api.put(`/admin/games/schedules/${scheduleId}`, data)
    return response.data.data?.schedule || response.data.data || response.data
  }

  async getScheduleById(scheduleId: string): Promise<GameSchedule> {
    const response = await api.get(`/admin/scheduling/schedules/${scheduleId}`)
    return response.data.data?.schedule || response.data.data || response.data
  }

  async uploadGameLogo(gameId: string, file: File, brandColor?: string): Promise<{ logo_url: string; cdn_url?: string; brand_color?: string }> {
    const formData = new FormData()
    formData.append('file', file)
    if (brandColor) formData.append('brand_color', brandColor)
    const response = await api.post(`/admin/games/${gameId}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
  }

  async deleteGameLogo(gameId: string): Promise<void> {
    await api.delete(`/admin/games/${gameId}/logo`)
  }

  async updateBrandColor(gameId: string, brandColor: string): Promise<Game> {
    const response = await api.patch(`/admin/games/${gameId}/brand-color`, { brand_color: brandColor })
    return response.data.data
  }

  async submitForApproval(gameId: string, notes?: string): Promise<Game> {
    const response = await api.post(`/admin/games/${gameId}/submit-approval`, { notes })
    return response.data.data
  }

  async approveGame(gameId: string, notes?: string): Promise<Game> {
    const response = await api.post(`/admin/games/${gameId}/approve`, { notes })
    return response.data.data
  }

  async rejectGame(gameId: string, reason: string): Promise<Game> {
    const response = await api.post(`/admin/games/${gameId}/reject`, { reason })
    return response.data.data
  }

  // Prize structure (kept for compatibility)
  async getPrizeStructure(gameId: string) {
    const response = await api.get(`/admin/games/${gameId}/prize-structure`)
    return response.data.data
  }

  async updatePrizeStructure(gameId: string, data: unknown) {
    const response = await api.put(`/admin/games/${gameId}/prize-structure`, data)
    return response.data.data
  }
}

export const gameService = new GameService()
