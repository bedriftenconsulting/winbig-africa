import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Eye, 
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Ticket,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import { formatInGhanaTime } from '@/lib/date-utils'
import PageHeader from '@/components/ui/page-header'

export interface Transaction {
  transaction_id: string
  gateway_transaction_id: string
  type: 'ticket_purchase' | 'commission' | 'refund' | 'payout'
  player_id?: string
  player_name?: string
  retailer_id?: string
  retailer_name?: string
  agent_id?: string
  agent_name?: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'momo' | 'card' | 'bank_transfer' | 'wallet' | 'cash'
  gateway_provider: 'paystack' | 'flutterwave' | 'mtn_momo' | 'vodafone_cash' | 'airteltigo_money'
  reference_id?: string // Ticket ID, Draw ID, etc.
  description: string
  created_at: string
  updated_at: string
  processed_at?: string
  failed_reason?: string
  metadata?: Record<string, unknown>
}

export interface TransactionStatistics {
  total_transactions: number
  total_volume: number
  pending_transactions: number
  pending_volume: number
  completed_transactions: number
  completed_volume: number
  failed_transactions: number
  failed_volume: number
  by_type: {
    ticket_purchases: { count: number; volume: number }
    commissions: { count: number; volume: number }
    refunds: { count: number; volume: number }
    payouts: { count: number; volume: number }
  }
  by_gateway: Record<string, { count: number; volume: number }>
}

import api from '@/lib/api'

const transactionsService = {
  async getTransactions(params?: {
    type?: string
    status?: string
    gateway?: string
    player_id?: string
    from_date?: string
    to_date?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{
    transactions: Transaction[]
    total_count: number
    page: number
    limit: number
  }> {
    try {
      // Fetch player tickets as "ticket_purchase" transactions
      const q: Record<string, string> = {
        issuer_type: 'player',
        page: String(params?.page || 1),
        limit: String(params?.limit || 50),
      }
      if (params?.status) q.status = params.status
      if (params?.player_id) q.issuer_id = params.player_id

      const res = await api.get('/admin/tickets', { params: q })
      const raw: any[] = res.data?.data?.tickets || res.data?.tickets || []
      const total = res.data?.data?.total || res.data?.total || raw.length

      const transactions: Transaction[] = raw.map((t: any) => ({
        transaction_id: t.id || t.ticket_id,
        gateway_transaction_id: t.payment_ref || t.serial_number,
        type: 'ticket_purchase' as const,
        player_id: t.issuer_id,
        player_name: t.customer_name || t.issuer_id,
        amount: Number(t.total_amount || 0),
        currency: 'GHS',
        status: t.status === 'issued' || t.status === 'validated' || t.status === 'won'
          ? 'completed'
          : t.status === 'cancelled' || t.status === 'void'
          ? 'failed'
          : 'completed',
        payment_method: (t.payment_method || 'momo') as Transaction['payment_method'],
        gateway_provider: 'mtn_momo' as const,
        reference_id: t.game_schedule_id,
        description: `Ticket purchase — ${t.game_name || t.game_code} (${t.serial_number})`,
        created_at: t.created_at || t.issued_at,
        updated_at: t.updated_at || t.created_at || t.issued_at,
      }))

      // Apply search filter client-side
      const filtered = params?.search
        ? transactions.filter(tx =>
            tx.transaction_id?.includes(params.search!) ||
            tx.player_name?.toLowerCase().includes(params.search!.toLowerCase()) ||
            tx.description?.toLowerCase().includes(params.search!.toLowerCase())
          )
        : transactions

      return { transactions: filtered, total_count: total, page: params?.page || 1, limit: params?.limit || 50 }
    } catch {
      return { transactions: [], total_count: 0, page: 1, limit: 20 }
    }
  },

  async getTransactionStatistics(): Promise<TransactionStatistics> {
    try {
      const { transactions } = await this.getTransactions({ limit: 500 })
      const completed = transactions.filter(t => t.status === 'completed')
      const failed = transactions.filter(t => t.status === 'failed')
      const pending = transactions.filter(t => t.status === 'pending')
      const sum = (arr: Transaction[]) => arr.reduce((s, t) => s + t.amount, 0)
      return {
        total_transactions: transactions.length,
        total_volume: sum(transactions),
        pending_transactions: pending.length,
        pending_volume: sum(pending),
        completed_transactions: completed.length,
        completed_volume: sum(completed),
        failed_transactions: failed.length,
        failed_volume: sum(failed),
        by_type: {
          ticket_purchases: { count: transactions.length, volume: sum(transactions) },
          commissions: { count: 0, volume: 0 },
          refunds: { count: 0, volume: 0 },
          payouts: { count: 0, volume: 0 },
        },
        by_gateway: {},
      }
    } catch {
      return {
        total_transactions: 0, total_volume: 0,
        pending_transactions: 0, pending_volume: 0,
        completed_transactions: 0, completed_volume: 0,
        failed_transactions: 0, failed_volume: 0,
        by_type: { ticket_purchases: { count: 0, volume: 0 }, commissions: { count: 0, volume: 0 }, refunds: { count: 0, volume: 0 }, payouts: { count: 0, volume: 0 } },
        by_gateway: {},
      }
    }
  }
}

const TransactionsModule: React.FC = () => {
  
  // Filter states
  const [selectedTab, setSelectedTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [gatewayFilter, setGatewayFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', typeFilter, statusFilter, gatewayFilter, searchFilter, dateFromFilter, dateToFilter],
    queryFn: () => transactionsService.getTransactions({
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      gateway: gatewayFilter || undefined,
      search: searchFilter || undefined,
      from_date: dateFromFilter || undefined,
      to_date: dateToFilter || undefined,
    }),
  })

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['transaction-statistics'],
    queryFn: () => transactionsService.getTransactionStatistics(),
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle },
      failed: { variant: 'destructive' as const, label: 'Failed', icon: XCircle },
      cancelled: { variant: 'outline' as const, label: 'Cancelled', icon: AlertCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      ticket_purchase: { variant: 'default' as const, label: 'Ticket Purchase', icon: Ticket },
      commission: { variant: 'secondary' as const, label: 'Commission', icon: TrendingUp },
      refund: { variant: 'outline' as const, label: 'Refund', icon: ArrowDownLeft },
      payout: { variant: 'default' as const, label: 'Payout', icon: ArrowUpRight }
    }
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.ticket_purchase
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filteredTransactions = transactionsData?.transactions?.filter(transaction => {
    if (selectedTab !== 'all' && transaction.type !== selectedTab) return false
    if (searchFilter) {
      const search = searchFilter.toLowerCase()
      return (
        transaction.transaction_id.toLowerCase().includes(search) ||
        transaction.gateway_transaction_id.toLowerCase().includes(search) ||
        transaction.player_name?.toLowerCase().includes(search) ||
        transaction.retailer_name?.toLowerCase().includes(search) ||
        transaction.description.toLowerCase().includes(search)
      )
    }
    return true
  }) || []

  if (transactionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Transactions Module"
        description="Track ticket purchases, commissions, refunds, and payouts across all payment gateways"
        badge="Live"
      >
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Transactions
        </Button>
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.total_transactions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(statistics?.total_volume || 0)} volume
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics?.completed_transactions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(statistics?.completed_volume || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics?.pending_transactions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(statistics?.pending_volume || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics?.failed_transactions?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(statistics?.failed_volume || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.total_transactions 
                ? Math.round((statistics.completed_transactions / statistics.total_transactions) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Transaction success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Transaction ID, gateway ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label>Type</Label>
              <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ticket_purchase">Ticket Purchase</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Gateway</Label>
              <Select value={gatewayFilter || "all"} onValueChange={(value) => setGatewayFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Gateways" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gateways</SelectItem>
                  <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                  <SelectItem value="vodafone_cash">Vodafone Cash</SelectItem>
                  <SelectItem value="airteltigo_money">AirtelTigo Money</SelectItem>
                  <SelectItem value="paystack">Paystack</SelectItem>
                  <SelectItem value="flutterwave">Flutterwave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({transactionsData?.total_count || 0})
          </TabsTrigger>
          <TabsTrigger value="ticket_purchase">
            Purchases ({statistics?.by_type.ticket_purchases.count || 0})
          </TabsTrigger>
          <TabsTrigger value="commission">
            Commissions ({statistics?.by_type.commissions.count || 0})
          </TabsTrigger>
          <TabsTrigger value="refund">
            Refunds ({statistics?.by_type.refunds.count || 0})
          </TabsTrigger>
          <TabsTrigger value="payout">
            Payouts ({statistics?.by_type.payouts.count || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
              <CardDescription>
                {selectedTab === 'all' 
                  ? 'All transaction types across payment gateways'
                  : `${selectedTab.replace('_', ' ')} transactions`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Gateway ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Player/Entity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl text-muted-foreground">📊</div>
                            <div className="text-lg font-medium">No Transactions Found</div>
                            <p className="text-muted-foreground">
                              Transactions will appear here when they are processed through the system.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.transaction_id}>
                          <TableCell className="font-mono font-medium">
                            {transaction.transaction_id}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {transaction.gateway_transaction_id}
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(transaction.type)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {transaction.player_name || transaction.retailer_name || transaction.agent_name || 'System'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.player_id || transaction.retailer_id || transaction.agent_id || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {transaction.gateway_provider.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatInGhanaTime(transaction.created_at, 'PP p')}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Transaction Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for transaction {transaction.transaction_id}
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-6">
                                  {/* Transaction Information */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Transaction ID</Label>
                                      <p className="font-mono text-sm">{transaction.transaction_id}</p>
                                    </div>
                                    <div>
                                      <Label>Gateway Transaction ID</Label>
                                      <p className="font-mono text-sm">{transaction.gateway_transaction_id}</p>
                                    </div>
                                    <div>
                                      <Label>Type</Label>
                                      <div className="mt-1">
                                        {getTypeBadge(transaction.type)}
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <div className="mt-1">
                                        {getStatusBadge(transaction.status)}
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Amount</Label>
                                      <p className="text-lg font-bold">{formatCurrency(transaction.amount)}</p>
                                    </div>
                                    <div>
                                      <Label>Payment Method</Label>
                                      <Badge variant="outline" className="capitalize">
                                        {transaction.payment_method.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Entity Information */}
                                  <div className="grid grid-cols-2 gap-4">
                                    {transaction.player_name && (
                                      <>
                                        <div>
                                          <Label>Player</Label>
                                          <p className="font-medium">{transaction.player_name}</p>
                                        </div>
                                        <div>
                                          <Label>Player ID</Label>
                                          <p className="font-mono text-sm">{transaction.player_id}</p>
                                        </div>
                                      </>
                                    )}
                                    {transaction.retailer_name && (
                                      <>
                                        <div>
                                          <Label>Retailer</Label>
                                          <p className="font-medium">{transaction.retailer_name}</p>
                                        </div>
                                        <div>
                                          <Label>Retailer ID</Label>
                                          <p className="font-mono text-sm">{transaction.retailer_id}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {/* Timing Information */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Created At</Label>
                                      <p>{formatInGhanaTime(transaction.created_at, 'PPp')}</p>
                                    </div>
                                    <div>
                                      <Label>Updated At</Label>
                                      <p>{formatInGhanaTime(transaction.updated_at, 'PPp')}</p>
                                    </div>
                                    {transaction.processed_at && (
                                      <div>
                                        <Label>Processed At</Label>
                                        <p>{formatInGhanaTime(transaction.processed_at, 'PPp')}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Description and Reference */}
                                  <div className="space-y-2">
                                    <div>
                                      <Label>Description</Label>
                                      <p className="text-sm">{transaction.description}</p>
                                    </div>
                                    {transaction.reference_id && (
                                      <div>
                                        <Label>Reference ID</Label>
                                        <p className="font-mono text-sm">{transaction.reference_id}</p>
                                      </div>
                                    )}
                                    {transaction.failed_reason && (
                                      <div>
                                        <Label>Failure Reason</Label>
                                        <Alert variant="destructive" className="mt-1">
                                          <AlertCircle className="h-4 w-4" />
                                          <AlertDescription>
                                            {transaction.failed_reason}
                                          </AlertDescription>
                                        </Alert>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TransactionsModule