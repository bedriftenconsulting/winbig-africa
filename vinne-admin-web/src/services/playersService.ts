import api from '@/lib/api'

export interface Player {
  player_id: string
  name: string
  phone_number: string
  email?: string
  date_registered: string
  account_status: 'active' | 'suspended' | 'banned' | 'pending_verification'
  total_tickets_purchased: number
  total_amount_spent: number
  total_winnings: number
  last_activity: string
  verification_status: 'verified' | 'pending' | 'rejected'
  kyc_level: 'basic' | 'intermediate' | 'advanced'
  wallet_balance: number
  created_at: string
  updated_at: string
}

export interface PlayerStatistics {
  total_players: number
  active_players: number
  suspended_players: number
  banned_players: number
  pending_verification: number
  total_tickets_sold: number
  total_revenue: number
  total_winnings_paid: number
}

export interface PlayerRegistration {
  name: string
  phone_number: string
  email?: string
  password?: string
  verification_method: 'sms' | 'email'
}

export interface PlayerUpdate {
  name?: string
  email?: string
  account_status?: string
  verification_status?: string
  kyc_level?: string
}

class PlayersService {
  /**
   * Get all players with filtering and pagination
   */
  async getPlayers(params?: {
    search?: string
    status?: string
    verification_status?: string
    kyc_level?: string
    page?: number
    limit?: number
  }): Promise<{
    players: Player[]
    total_count: number
    page: number
    limit: number
  }> {
    const response = await api.get('/admin/players', { params })
    return response.data?.data || { players: [], total_count: 0, page: 1, limit: 20 }
  }

  /**
   * Get player statistics
   */
  async getPlayerStatistics(): Promise<PlayerStatistics> {
    const response = await api.get('/admin/players/statistics')
    return response.data?.data || {
      total_players: 0,
      active_players: 0,
      suspended_players: 0,
      banned_players: 0,
      pending_verification: 0,
      total_tickets_sold: 0,
      total_revenue: 0,
      total_winnings_paid: 0,
    }
  }

  /**
   * Get player by ID
   */
  async getPlayerById(playerId: string): Promise<Player> {
    const response = await api.get(`/admin/players/${playerId}`)
    return response.data?.data
  }

  /**
   * Create new player account
   */
  async createPlayer(playerData: PlayerRegistration): Promise<Player> {
    const response = await api.post('/admin/players', playerData)
    return response.data?.data
  }

  /**
   * Update player information
   */
  async updatePlayer(playerId: string, updates: PlayerUpdate): Promise<Player> {
    const response = await api.put(`/admin/players/${playerId}`, updates)
    return response.data?.data
  }

  /**
   * Update player account status
   */
  async updatePlayerStatus(playerId: string, status: string, reason?: string): Promise<void> {
    const response = await api.post(`/admin/players/${playerId}/status`, {
      status,
      reason,
    })
    return response.data
  }

  /**
   * Update player verification status
   */
  async updateVerificationStatus(
    playerId: string, 
    status: string, 
    notes?: string
  ): Promise<void> {
    const response = await api.post(`/admin/players/${playerId}/verification`, {
      verification_status: status,
      notes,
    })
    return response.data
  }

  /**
   * Get player ticket history
   */
  async getPlayerTickets(
    playerId: string,
    params?: {
      game_id?: string
      status?: string
      from_date?: string
      to_date?: string
      page?: number
      limit?: number
    }
  ): Promise<{
    tickets: any[]
    total_count: number
    page: number
    limit: number
  }> {
    const response = await api.get(`/admin/players/${playerId}/tickets`, { params })
    return response.data?.data || { tickets: [], total_count: 0, page: 1, limit: 20 }
  }

  /**
   * Get player transaction history
   */
  async getPlayerTransactions(
    playerId: string,
    params?: {
      type?: string
      from_date?: string
      to_date?: string
      page?: number
      limit?: number
    }
  ): Promise<{
    transactions: any[]
    total_count: number
    page: number
    limit: number
  }> {
    const response = await api.get(`/admin/players/${playerId}/transactions`, { params })
    return response.data?.data || { transactions: [], total_count: 0, page: 1, limit: 20 }
  }

  /**
   * Get player wallet balance and history
   */
  async getPlayerWallet(playerId: string): Promise<{
    balance: number
    pending_balance: number
    total_deposits: number
    total_withdrawals: number
    recent_transactions: any[]
  }> {
    const response = await api.get(`/admin/players/${playerId}/wallet`)
    return response.data?.data || {
      balance: 0,
      pending_balance: 0,
      total_deposits: 0,
      total_withdrawals: 0,
      recent_transactions: [],
    }
  }

  /**
   * Credit player wallet (admin action)
   */
  async creditPlayerWallet(
    playerId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const response = await api.post(`/admin/players/${playerId}/wallet/credit`, {
      amount,
      reason,
    })
    return response.data
  }

  /**
   * Debit player wallet (admin action)
   */
  async debitPlayerWallet(
    playerId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const response = await api.post(`/admin/players/${playerId}/wallet/debit`, {
      amount,
      reason,
    })
    return response.data
  }

  /**
   * Send verification SMS/Email to player
   */
  async sendVerification(
    playerId: string,
    method: 'sms' | 'email'
  ): Promise<void> {
    const response = await api.post(`/admin/players/${playerId}/send-verification`, {
      method,
    })
    return response.data
  }

  /**
   * Reset player password (admin action)
   */
  async resetPlayerPassword(playerId: string): Promise<{ temporary_password: string }> {
    const response = await api.post(`/admin/players/${playerId}/reset-password`)
    return response.data?.data
  }

  /**
   * Export players data
   */
  async exportPlayers(params?: {
    format?: 'csv' | 'xlsx'
    status?: string
    verification_status?: string
    from_date?: string
    to_date?: string
  }): Promise<Blob> {
    const response = await api.get('/admin/players/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  }

  /**
   * Get player activity log
   */
  async getPlayerActivityLog(
    playerId: string,
    params?: {
      action_type?: string
      from_date?: string
      to_date?: string
      page?: number
      limit?: number
    }
  ): Promise<{
    activities: any[]
    total_count: number
    page: number
    limit: number
  }> {
    const response = await api.get(`/admin/players/${playerId}/activity-log`, { params })
    return response.data?.data || { activities: [], total_count: 0, page: 1, limit: 20 }
  }
}

export const playersService = new PlayersService()
export default playersService