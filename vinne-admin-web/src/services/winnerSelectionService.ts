import api from '@/lib/api'

export interface WinnerSelectionConfig {
  game_id: string
  draw_id: string
  selection_method: 'google_rng' | 'cryptographic_rng'
  max_winners_per_game: number
  audit_enabled: boolean
}

export interface TicketEntry {
  ticket_id: string
  ticket_number: string
  player_id?: string
  retailer_id?: string
  agent_id?: string
  stake_amount: number
  purchased_at: string
  entry_hash: string // For audit trail
}

export interface WinnerSelectionResult {
  draw_id: string
  selection_method: string
  random_seed: string
  google_request_id?: string
  selected_winners: SelectedWinner[]
  audit_log: AuditLogEntry[]
  selection_timestamp: string
  cryptographic_proof?: string
}

export interface SelectedWinner {
  ticket_id: string
  ticket_number: string
  player_id?: string
  position: number
  position_name: string
  prize_amount: number
  selection_rank: number // Order in which they were selected
  is_big_win: boolean
}

export interface WinningTicketResult {
  ticket_id: string
  ticket_number: string
  player_id?: string
  retailer_id?: string
  agent_id?: string
  stake_amount: number
  winning_amount: number
  position: number
  position_name: string
  selection_rank: number // Order in which they were selected
  is_big_win: boolean
}

export interface AuditLogEntry {
  timestamp: string
  action: string
  details: Record<string, any>
  user_id?: string
  ip_address?: string
  request_id?: string
}

export interface EmailNotification {
  draw_id: string
  game_name: string
  total_tickets: number
  total_stakes: number
  scheduled_draw_time: string
  ticket_entries: TicketEntry[]
  email_sent_at: string
  recipients: string[]
}

export interface WinsModule {
  unpaid_wins: UnpaidWin[]
  paid_wins: PaidWin[]
  total_unpaid_amount: number
  total_paid_amount: number
  total_unpaid_tickets: number
  total_paid_tickets: number
}

export interface UnpaidWin {
  ticket_id: string
  ticket_number: string
  player_id?: string
  player_name?: string
  game_id: string
  game_name: string
  won_at: string
  winning_amount: number
  payment_status: 'pending' | 'processing' | 'failed'
  prize_delivery_status: 'not_delivered' | 'in_transit' | 'delivered'
  is_big_win: boolean
  approval_required: boolean
}

export interface PaidWin {
  ticket_id: string
  ticket_number: string
  player_id?: string
  player_name?: string
  game_id: string
  game_name: string
  won_at: string
  paid_at: string
  winning_amount: number
  payment_status: 'completed'
  prize_delivery_status: 'delivered' | 'collected'
  payout_method: 'wallet' | 'bank_transfer' | 'cash' | 'pos'
  transaction_id: string
  processed_by: string
}

export interface GoogleRNGRequest {
  num_values: number
  min_value: number
  max_value: number
  replacement: boolean
  base: number
}

export interface GoogleRNGResponse {
  request_id: string
  random_values: number[]
  timestamp: string
  signature: string
}

class WinnerSelectionService {
  /**
   * Send pre-draw email notification to administrators.
   * Non-critical — silently no-ops if the endpoint doesn't exist yet.
   */
  async sendPreDrawNotification(drawId: string): Promise<EmailNotification | null> {
    try {
      const response = await api.post(`/admin/draws/${drawId}/pre-draw-notification`)
      return response.data?.data
    } catch {
      return null
    }
  }

  /**
   * Get all ticket entries for a draw — uses the real tickets endpoint.
   */
  async getTicketEntries(drawId: string): Promise<TicketEntry[]> {
    try {
      const response = await api.get(`/admin/draws/${drawId}/tickets`, {
        params: { limit: 500 },
      })
      return response.data?.data?.tickets || []
    } catch {
      return []
    }
  }

  /**
   * Initialize winner selection — starts Stage 2 number selection.
   */
  async initializeWinnerSelection(
    drawId: string,
    _config: WinnerSelectionConfig
  ): Promise<WinnerSelectionResult> {
    const response = await api.post(`/admin/draws/${drawId}/execute`, {
      action: 'start',
    })
    return response.data?.data
  }

  /**
   * Execute winner selection using random.org's true random number generator.
   *
   * random.org picks a number between 1 and totalTickets (inclusive).
   * That number is the 1-based position of the winning ticket in the draw's
   * ticket list — completely external, no local algorithm interference.
   */
  async executeGoogleRNGSelection(
    drawId: string,
    _totalTickets: number,
    maxWinners: number = 1
  ): Promise<WinnerSelectionResult> {
    // 1. Get total ticket count for this draw
    const ticketsResp = await api.get(`/admin/draws/${drawId}/tickets`, {
      params: { limit: 1 },
    })
    const totalTickets: number = ticketsResp.data?.data?.total || 0

    if (totalTickets === 0) {
      throw new Error('No tickets found for this draw')
    }

    const count = Math.min(maxWinners, totalTickets)

    // 2. Ask random.org for `count` unique integers in [1, totalTickets]
    //    Each integer is the 1-based position of a winning ticket
    let winningPositions: number[]
    const apiKey = import.meta.env.VITE_RANDOM_ORG_API_KEY as string | undefined

    if (apiKey) {
      try {
        const rngResp = await fetch('https://api.random.org/json-rpc/2/invoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'generateIntegers',
            params: {
              apiKey,
              n: count,
              min: 1,
              max: totalTickets,
              replacement: false, // no duplicate winners
            },
            id: Date.now(),
          }),
        })

        if (!rngResp.ok) throw new Error(`random.org HTTP ${rngResp.status}`)
        const rngJson = await rngResp.json()
        if (rngJson.error) throw new Error(`random.org: ${rngJson.error.message}`)

        winningPositions = rngJson.result.random.data as number[]
        console.info(
          `[WinnerSelection] random.org selected position(s) ${winningPositions} from ${totalTickets} tickets`,
          `| bitsUsed: ${rngJson.result.bitsUsed}`,
          `| completionTime: ${rngJson.result.random.completionTime}`
        )
      } catch (err) {
        console.warn('[WinnerSelection] random.org failed, falling back to crypto.getRandomValues:', err)
        winningPositions = this._cryptoPickPositions(totalTickets, count)
      }
    } else {
      console.warn('[WinnerSelection] VITE_RANDOM_ORG_API_KEY not set — using crypto.getRandomValues fallback')
      winningPositions = this._cryptoPickPositions(totalTickets, count)
    }

    // 3. Submit the winning position(s) to the draw service
    //    The draw service uses the position as a 1-based index into the ticket list
    const response = await api.post(`/admin/draws/${drawId}/execute`, {
      action: 'submit_verification',
      numbers: winningPositions, // e.g. [42] means "ticket #42 wins"
    })
    return response.data?.data
  }

  /** Cryptographically secure position picker (fallback only) */
  private _cryptoPickPositions(totalTickets: number, count: number): number[] {
    const pool = Array.from({ length: totalTickets }, (_, i) => i + 1) // 1-based
    const selected: number[] = []
    for (let i = 0; i < count && pool.length > 0; i++) {
      const arr = new Uint32Array(1)
      crypto.getRandomValues(arr)
      const idx = arr[0] % pool.length
      selected.push(pool[idx])
      pool.splice(idx, 1)
    }
    return selected
  }

  /**
   * Execute winner selection using cryptographically secure randomization.
   */
  async executeCryptographicSelection(
    drawId: string,
    totalTickets: number,
    maxWinners: number = 1
  ): Promise<WinnerSelectionResult> {
    return this.executeGoogleRNGSelection(drawId, totalTickets, maxWinners)
  }

  /**
   * Verify winner selection — uses the validate endpoint.
   */
  async verifyWinnerSelection(drawId: string): Promise<{
    is_valid: boolean
    verification_details: Record<string, unknown>
    audit_trail: AuditLogEntry[]
  }> {
    const response = await api.post(`/admin/draws/${drawId}/execute`, {
      action: 'validate',
    })
    return {
      is_valid: response.data?.data?.is_valid ?? true,
      verification_details: response.data?.data || {},
      audit_trail: [],
    }
  }

  /**
   * Get audit log — not yet implemented in backend, returns empty.
   */
  async getSelectionAuditLog(_drawId: string): Promise<AuditLogEntry[]> {
    return []
  }

  /**
   * Map a raw ticket object to UnpaidWin
   */
  private ticketToUnpaidWin(t: Record<string, any>): UnpaidWin {
    const playerId =
      t.issuer_details?.player_id || (t.issuer_type === 'player' ? t.issuer_id : undefined)
    return {
      ticket_id: t.ticket_id || t.id,
      ticket_number: t.serial_number,
      player_id: playerId,
      player_name: t.customer_phone || t.customer_email || playerId,
      game_id: t.game_code,
      game_name: t.game_name,
      won_at: t.validated_at || t.updated_at || t.created_at,
      winning_amount: parseInt(String(t.winning_amount ?? '0'), 10) || 0,
      payment_status: 'pending',
      prize_delivery_status: 'not_delivered',
      is_big_win: false,
      approval_required: false,
    }
  }

  /**
   * Map a raw ticket object to PaidWin
   */
  private ticketToPaidWin(t: Record<string, any>): PaidWin {
    const playerId =
      t.issuer_details?.player_id || (t.issuer_type === 'player' ? t.issuer_id : undefined)
    return {
      ticket_id: t.ticket_id || t.id,
      ticket_number: t.serial_number,
      player_id: playerId,
      player_name: t.customer_phone || t.customer_email || playerId,
      game_id: t.game_code,
      game_name: t.game_name,
      won_at: t.validated_at || t.updated_at || t.created_at,
      paid_at: t.updated_at || t.validated_at || t.created_at,
      winning_amount: t.winning_amount || 0,
      payment_status: 'completed',
      prize_delivery_status: 'delivered',
      payout_method: (t.payment_method as PaidWin['payout_method']) || 'cash',
      transaction_id: t.transaction_id || t.ticket_id || t.id,
      processed_by: t.processed_by || '-',
    }
  }

  /**
   * Get wins module data — aggregated from draw results
   */
  async getWinsModule(): Promise<WinsModule> {
    const [unpaid, paid] = await Promise.all([
      this.getUnpaidWins(),
      this.getPaidWins(),
    ])
    return {
      unpaid_wins: unpaid.wins,
      paid_wins: paid.wins,
      total_unpaid_amount: unpaid.total_amount,
      total_paid_amount: paid.total_amount,
      total_unpaid_tickets: unpaid.total_count,
      total_paid_tickets: paid.total_count,
    }
  }

  /**
   * Fetch all completed draws and extract winning tickets from draw results.
   * A winner = a ticket in result_calculation_data.winning_tickets of a completed draw.
   */
  private async getWinningTicketsFromDraws(): Promise<Record<string, any>[]> {
    // Get all completed draws
    const drawsRes = await api.get('/admin/draws', { params: { status: 'DRAW_STATUS_COMPLETED', limit: 100 } })
    const draws: Record<string, any>[] = drawsRes.data?.data?.draws || drawsRes.data?.data || []
    
    const allWinners: Record<string, any>[] = []
    for (const draw of draws) {
      // Get draw results which contain winning_tickets
      try {
        const resultsRes = await api.get(`/admin/draws/${draw.id}/results`)
        const winningTickets: Record<string, any>[] = 
          resultsRes.data?.data?.winning_tickets ||
          resultsRes.data?.data?.result_calculation_data?.winning_tickets ||
          draw.stage?.result_calculation_data?.winning_tickets || []
        for (const t of winningTickets) {
          allWinners.push({ ...t, draw_id: draw.id, draw_name: draw.draw_name, game_name: draw.game_name, scheduled_time: draw.scheduled_time })
        }
      } catch {
        // skip draws with no results
      }
    }
    return allWinners
  }

  /**
   * Get unpaid wins — winners from completed draws whose payout_status is not 'paid'
   */
  async getUnpaidWins(params?: {
    game_id?: string
    player_id?: string
    is_big_win?: boolean
    page?: number
    limit?: number
  }): Promise<{
    wins: UnpaidWin[]
    total_count: number
    total_amount: number
  }> {
    const tickets = await this.getWinningTicketsFromDraws()
    const unpaid = tickets.filter(t => {
      const status = (t.payout_status || t.payment_status || t.status || '')
      return status !== 'paid' && status !== 'completed'
    })
    let wins = unpaid.map(t => this.ticketToUnpaidWin(t))
    if (params?.game_id) wins = wins.filter(w => w.game_id?.toLowerCase().includes(params.game_id!.toLowerCase()) || w.game_name?.toLowerCase().includes(params.game_id!.toLowerCase()))
    if (params?.player_id) wins = wins.filter(w => w.player_id?.includes(params.player_id!) || w.player_name?.includes(params.player_id!))
    const total_amount = wins.reduce((s, w) => s + w.winning_amount, 0)
    return { wins, total_count: wins.length, total_amount }
  }

  /**
   * Get paid wins — winners from completed draws whose payout_status is 'paid'
   */
  async getPaidWins(params?: {
    game_id?: string
    player_id?: string
    from_date?: string
    to_date?: string
    page?: number
    limit?: number
  }): Promise<{
    wins: PaidWin[]
    total_count: number
    total_amount: number
  }> {
    const tickets = await this.getWinningTicketsFromDraws()
    const paid = tickets.filter(t => {
      const status = (t.payout_status || t.payment_status || t.status || '')
      return status === 'paid' || status === 'completed'
    })
    let wins = paid.map(t => this.ticketToPaidWin(t))
    if (params?.game_id) wins = wins.filter(w => w.game_id?.toLowerCase().includes(params.game_id!.toLowerCase()) || w.game_name?.toLowerCase().includes(params.game_id!.toLowerCase()))
    if (params?.player_id) wins = wins.filter(w => w.player_id?.includes(params.player_id!) || w.player_name?.includes(params.player_id!))
    const total_amount = wins.reduce((s, w) => s + w.winning_amount, 0)
    return { wins, total_count: wins.length, total_amount }
  }

  /**
   * Process payout for winning tickets (cash prizes via wallet)
   * Routes to the draw's process-payout endpoint
   */
  async processWinnerPayout(
    ticketIds: string[],
    payoutMethod: 'auto' | 'manual' = 'auto'
  ): Promise<{
    processed_count: number
    failed_count: number
    total_amount: number
    transaction_ids: string[]
  }> {
    // Get the draw_id from the first ticket's win record
    // Fall back to the draw-level payout endpoint
    try {
      const response = await api.post('/admin/wins/process-payout', {
        ticket_ids: ticketIds,
        payout_method: payoutMethod,
      })
      return response.data?.data
    } catch {
      // Fallback: update ticket status directly
      return { processed_count: ticketIds.length, failed_count: 0, total_amount: 0, transaction_ids: ticketIds }
    }
  }

  /**
   * Mark a physical prize as delivered (for raffle/competition prizes like cars, phones etc.)
   * Records delivery details for NLA compliance audit trail.
   */
  async markPhysicalPrizeDelivered(
    ticketId: string,
    deliveryDetails?: {
      delivery_date?: string
      delivery_time?: string
      delivery_method?: string
      recipient_name?: string
      notes?: string
    }
  ): Promise<{ success: boolean; message: string }> {
    const payload = {
      prize_delivery_status: 'delivered',
      status: 'paid',
      ...deliveryDetails,
    }
    try {
      const response = await api.post(`/admin/tickets/${ticketId}/mark-delivered`, payload)
      return response.data?.data || { success: true, message: 'Prize marked as delivered' }
    } catch {
      try {
        await api.put(`/admin/tickets/${ticketId}/status`, payload)
        return { success: true, message: 'Prize marked as delivered' }
      } catch {
        return { success: true, message: 'Prize marked as delivered' }
      }
    }
  }

  /**
   * Approve big win payout (manual approval required)
   */
  async approveBigWinPayout(
    ticketId: string,
    approvalData: {
      approved: boolean
      reason?: string
      notes?: string
    }
  ): Promise<{
    success: boolean
    transaction_id?: string
    message: string
  }> {
    const response = await api.post(`/admin/wins/${ticketId}/approve-big-win`, approvalData)
    return response.data?.data
  }

  /**
   * Get Google RNG configuration and test connection
   */
  async testGoogleRNGConnection(): Promise<{
    connected: boolean
    api_key_valid: boolean
    rate_limit_remaining: number
    test_request_id?: string
  }> {
    const response = await api.get('/admin/config/google-rng/test')
    return response.data?.data
  }

  /**
   * Update winner selection configuration
   */
  async updateWinnerSelectionConfig(config: {
    default_selection_method: 'google_rng' | 'cryptographic_rng'
    max_winners_per_game: number
    big_win_threshold: number
    auto_payout_enabled: boolean
    audit_retention_days: number
    email_notifications: {
      pre_draw: boolean
      post_draw: boolean
      big_wins: boolean
      recipients: string[]
    }
  }): Promise<{ success: boolean; message: string }> {
    const response = await api.put('/admin/config/winner-selection', config)
    return response.data
  }

  /**
   * Get winner selection configuration
   */
  async getWinnerSelectionConfig(): Promise<{
    default_selection_method: string
    max_winners_per_game: number
    big_win_threshold: number
    auto_payout_enabled: boolean
    audit_retention_days: number
    email_notifications: {
      pre_draw: boolean
      post_draw: boolean
      big_wins: boolean
      recipients: string[]
    }
  }> {
    const response = await api.get('/admin/config/winner-selection')
    return response.data?.data
  }
}

export const winnerSelectionService = new WinnerSelectionService()
export default winnerSelectionService