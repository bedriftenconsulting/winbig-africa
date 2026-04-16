import { apiClient } from '@/lib/api-client'
import type { Transaction, TransactionStatistics } from '@/pages/TransactionsModule'

export interface GetTransactionsParams {
  type?: string
  status?: string
  gateway?: string
  player_id?: string
  retailer_id?: string
  agent_id?: string
  from_date?: string
  to_date?: string
  search?: string
  page?: number
  limit?: number
}

export interface GetTransactionsResponse {
  transactions: Transaction[]
  total_count: number
  page: number
  limit: number
  total_pages: number
}

export interface ProcessTransactionParams {
  transaction_id: string
  action: 'approve' | 'reject' | 'retry'
  reason?: string
}

export interface RefundTransactionParams {
  transaction_id: string
  reason: string
  refund_amount?: number // If partial refund
}

export interface TransactionExportParams {
  type?: string
  status?: string
  gateway?: string
  from_date?: string
  to_date?: string
  format: 'csv' | 'excel' | 'pdf'
}

/**
 * Transactions Service
 * Handles all transaction-related API calls including:
 * - Fetching transactions with filtering and pagination
 * - Getting transaction statistics and analytics
 * - Processing transaction actions (approve, reject, retry)
 * - Handling refunds and reversals
 * - Exporting transaction data
 */
export const transactionsService = {
  /**
   * Get paginated list of transactions with optional filtering
   */
  async getTransactions(params: GetTransactionsParams = {}): Promise<GetTransactionsResponse> {
    const searchParams = new URLSearchParams()
    
    // Add all non-empty parameters to search params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await apiClient.get(`/admin/transactions?${searchParams.toString()}`)
    return response.data
  },

  /**
   * Get detailed transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<Transaction> {
    const response = await apiClient.get(`/admin/transactions/${transactionId}`)
    return response.data.data
  },

  /**
   * Get transaction statistics and analytics
   */
  async getTransactionStatistics(params?: {
    from_date?: string
    to_date?: string
    type?: string
    gateway?: string
  }): Promise<TransactionStatistics> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get(`/admin/transactions/statistics?${searchParams.toString()}`)
    return response.data.data
  },

  /**
   * Process a transaction (approve, reject, retry)
   */
  async processTransaction(params: ProcessTransactionParams): Promise<Transaction> {
    const response = await apiClient.post(`/admin/transactions/${params.transaction_id}/process`, {
      action: params.action,
      reason: params.reason
    })
    return response.data.data
  },

  /**
   * Initiate a refund for a transaction
   */
  async refundTransaction(params: RefundTransactionParams): Promise<Transaction> {
    const response = await apiClient.post(`/admin/transactions/${params.transaction_id}/refund`, {
      reason: params.reason,
      refund_amount: params.refund_amount
    })
    return response.data.data
  },

  /**
   * Retry a failed transaction
   */
  async retryTransaction(transactionId: string, reason?: string): Promise<Transaction> {
    const response = await apiClient.post(`/admin/transactions/${transactionId}/retry`, {
      reason
    })
    return response.data.data
  },

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(transactionId: string, reason: string): Promise<Transaction> {
    const response = await apiClient.post(`/admin/transactions/${transactionId}/cancel`, {
      reason
    })
    return response.data.data
  },

  /**
   * Get transaction audit trail
   */
  async getTransactionAuditTrail(transactionId: string): Promise<{
    transaction_id: string
    audit_entries: Array<{
      id: string
      action: string
      performed_by: string
      performed_at: string
      details: Record<string, unknown>
      ip_address?: string
      user_agent?: string
    }>
  }> {
    const response = await apiClient.get(`/admin/transactions/${transactionId}/audit`)
    return response.data.data
  },

  /**
   * Export transactions data
   */
  async exportTransactions(params: TransactionExportParams): Promise<Blob> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await apiClient.get(`/admin/transactions/export?${searchParams.toString()}`, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Get transaction summary by date range
   */
  async getTransactionSummary(params: {
    from_date: string
    to_date: string
    group_by?: 'day' | 'week' | 'month'
  }): Promise<{
    summary: Array<{
      date: string
      total_transactions: number
      total_volume: number
      by_type: Record<string, { count: number; volume: number }>
      by_status: Record<string, { count: number; volume: number }>
      by_gateway: Record<string, { count: number; volume: number }>
    }>
  }> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })

    const response = await apiClient.get(`/admin/transactions/summary?${searchParams.toString()}`)
    return response.data.data
  },

  /**
   * Get gateway-specific transaction details
   */
  async getGatewayTransactionDetails(gatewayTransactionId: string, gateway: string): Promise<{
    gateway_transaction_id: string
    gateway_provider: string
    gateway_status: string
    gateway_response: Record<string, unknown>
    gateway_fees: number
    gateway_reference: string
    last_updated: string
  }> {
    const response = await apiClient.get(`/admin/transactions/gateway/${gateway}/${gatewayTransactionId}`)
    return response.data.data
  },

  /**
   * Reconcile transactions with gateway
   */
  async reconcileTransactions(params: {
    gateway: string
    from_date: string
    to_date: string
  }): Promise<{
    reconciliation_id: string
    gateway: string
    date_range: { from: string; to: string }
    total_transactions: number
    matched_transactions: number
    unmatched_transactions: number
    discrepancies: Array<{
      transaction_id: string
      issue: string
      our_status: string
      gateway_status: string
      our_amount: number
      gateway_amount: number
    }>
    started_at: string
    completed_at?: string
    status: 'pending' | 'completed' | 'failed'
  }> {
    const response = await apiClient.post('/admin/transactions/reconcile', params)
    return response.data.data
  },

  /**
   * Get reconciliation history
   */
  async getReconciliationHistory(params?: {
    gateway?: string
    from_date?: string
    to_date?: string
    page?: number
    limit?: number
  }): Promise<{
    reconciliations: Array<{
      reconciliation_id: string
      gateway: string
      date_range: { from: string; to: string }
      total_transactions: number
      matched_transactions: number
      unmatched_transactions: number
      status: string
      started_at: string
      completed_at?: string
      created_by: string
    }>
    total_count: number
    page: number
    limit: number
  }> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
    }

    const response = await apiClient.get(`/admin/transactions/reconciliations?${searchParams.toString()}`)
    return response.data.data
  }
}

export default transactionsService