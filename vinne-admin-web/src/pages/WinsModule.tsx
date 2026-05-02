import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye,
  Download,
  Filter,
  Search,
  Trophy,
  PartyPopper
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { formatInGhanaTime } from '@/lib/date-utils'
import { winnerSelectionService, type UnpaidWin, type PaidWin } from '@/services/winnerSelectionService'
import PageHeader from '@/components/ui/page-header'

const WinsModule: React.FC = () => {
  const queryClient = useQueryClient()
  
  // Filter states
  const [selectedTab, setSelectedTab] = useState('unpaid')
  const [gameFilter, setGameFilter] = useState('')
  const [playerFilter, setPlayerFilter] = useState('')
  const [bigWinFilter, setBigWinFilter] = useState<string>('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  
  // Dialog states
  const [selectedWin, setSelectedWin] = useState<UnpaidWin | PaidWin | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [approvalReason, setApprovalReason] = useState('')
  const [approvalNotes, setApprovalNotes] = useState('')
  
  // Delivery confirmation dialog states
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Fetch wins module data
  const { data: winsModule, isLoading } = useQuery({
    queryKey: ['wins-module'],
    queryFn: () => winnerSelectionService.getWinsModule(),
  })

  // Fetch unpaid wins
  const { data: unpaidWinsData, isLoading: unpaidLoading } = useQuery({
    queryKey: ['unpaid-wins', gameFilter, playerFilter, bigWinFilter],
    queryFn: () => winnerSelectionService.getUnpaidWins({
      game_id: gameFilter || undefined,
      player_id: playerFilter || undefined,
      is_big_win: bigWinFilter === 'true' ? true : bigWinFilter === 'false' ? false : undefined,
    }),
  })

  // Fetch paid wins
  const { data: paidWinsData, isLoading: paidLoading } = useQuery({
    queryKey: ['paid-wins', gameFilter, playerFilter, dateFromFilter, dateToFilter],
    queryFn: () => winnerSelectionService.getPaidWins({
      game_id: gameFilter || undefined,
      player_id: playerFilter || undefined,
      from_date: dateFromFilter || undefined,
      to_date: dateToFilter || undefined,
    }),
  })

  // Process payout mutation (cash prizes)
  const processPayoutMutation = useMutation({
    mutationFn: (ticketIds: string[]) => 
      winnerSelectionService.processWinnerPayout(ticketIds, 'auto'),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['unpaid-wins'] })
      queryClient.invalidateQueries({ queryKey: ['paid-wins'] })
      queryClient.invalidateQueries({ queryKey: ['wins-module'] })
      toast({
        title: 'Payout Processed',
        description: `${result.processed_count} payouts processed successfully.`
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Payout Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Mark physical prize as delivered mutation
  const markDeliveredMutation = useMutation({
    mutationFn: (data: { ticketId: string; deliveryDetails: any }) =>
      winnerSelectionService.markPhysicalPrizeDelivered(data.ticketId, data.deliveryDetails),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unpaid-wins'] })
      queryClient.invalidateQueries({ queryKey: ['paid-wins'] })
      queryClient.invalidateQueries({ queryKey: ['wins-module'] })
      setDeliveryDialogOpen(false)
      setSelectedWin(null)
      setDeliveryDate('')
      setRecipientName('')
      setDeliveryNotes('')
      toast({
        title: '🎉 Prize Delivered!',
        description: result.message || 'The prize has been marked as delivered to the winner.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const handleMarkDelivered = () => {
    if (!selectedWin) return
    if (!deliveryDate || !recipientName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in delivery date and recipient name',
        variant: 'destructive'
      })
      return
    }
    markDeliveredMutation.mutate({
      ticketId: selectedWin.ticket_id,
      deliveryDetails: {
        delivery_date: deliveryDate,
        recipient_name: recipientName,
        notes: deliveryNotes,
      }
    })
  }

  // Approve big win mutation
  const approveBigWinMutation = useMutation({
    mutationFn: (data: { ticketId: string; approved: boolean; reason?: string; notes?: string }) =>
      winnerSelectionService.approveBigWinPayout(data.ticketId, {
        approved: data.approved,
        reason: data.reason,
        notes: data.notes
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['unpaid-wins'] })
      queryClient.invalidateQueries({ queryKey: ['wins-module'] })
      setApprovalDialogOpen(false)
      setSelectedWin(null)
      setApprovalReason('')
      setApprovalNotes('')
      toast({
        title: result.success ? 'Big Win Approved' : 'Big Win Rejected',
        description: result.message
      })
    }
  })

  const handleProcessPayout = (ticketIds: string[]) => {
    processPayoutMutation.mutate(ticketIds)
  }

  const handleApproveBigWin = (approved: boolean) => {
    if (!selectedWin) return
    
    approveBigWinMutation.mutate({
      ticketId: selectedWin.ticket_id,
      approved,
      reason: approvalReason,
      notes: approvalNotes
    })
  }

  const filteredUnpaidWins = unpaidWinsData?.wins?.filter(win => {
    if (searchFilter) {
      const search = searchFilter.toLowerCase()
      return (
        win.ticket_number.toLowerCase().includes(search) ||
        win.player_id?.toLowerCase().includes(search) ||
        win.player_name?.toLowerCase().includes(search) ||
        win.game_name?.toLowerCase().includes(search)
      )
    }
    return true
  }) || []

  const filteredPaidWins = paidWinsData?.wins?.filter(win => {
    if (searchFilter) {
      const search = searchFilter.toLowerCase()
      return (
        win.ticket_number.toLowerCase().includes(search) ||
        win.player_id?.toLowerCase().includes(search) ||
        win.player_name?.toLowerCase().includes(search) ||
        win.game_name?.toLowerCase().includes(search)
      )
    }
    return true
  }) || []

  if (isLoading) {
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
        title="Wins Module"
        description="Manage unpaid and paid wins across all games"
        badge="Live"
      >
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid Wins</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {unpaidWinsData?.total_count?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(winsModule?.total_unpaid_amount || 0)} pending
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid Wins</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paidWinsData?.total_count?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(winsModule?.total_paid_amount || 0)} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Big Wins Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredUnpaidWins.filter(win => win.is_big_win).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require manual approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Winning Tickets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((unpaidWinsData?.total_count || 0) + (paidWinsData?.total_count || 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All time winning tickets
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
                  placeholder="Ticket, player, game..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label>Game</Label>
              <Input
                placeholder="Game name or ID"
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Player</Label>
              <Input
                placeholder="Player ID or name"
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Big Win</Label>
              <Select value={bigWinFilter || "all"} onValueChange={(value) => setBigWinFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Big Wins Only</SelectItem>
                  <SelectItem value="false">Normal Wins Only</SelectItem>
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

      {/* Wins Tables */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unpaid">
            Unpaid Wins ({filteredUnpaidWins.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid Wins ({filteredPaidWins.length})
          </TabsTrigger>
        </TabsList>

        {/* Unpaid Wins Tab */}
        <TabsContent value="unpaid" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Unpaid Wins</CardTitle>
                  <CardDescription>
                    Winning tickets awaiting payout processing
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const autoPayoutTickets = filteredUnpaidWins
                        .filter(win => !win.is_big_win && !win.approval_required)
                        .map(win => win.ticket_id)
                      if (autoPayoutTickets.length > 0) {
                        handleProcessPayout(autoPayoutTickets)
                      }
                    }}
                    disabled={processPayoutMutation.isPending || 
                      filteredUnpaidWins.filter(win => !win.is_big_win && !win.approval_required).length === 0}
                  >
                    Process Auto Payouts
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Date Won</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Prize Delivery Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUnpaidWins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No unpaid wins found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUnpaidWins.map((win) => (
                        <TableRow key={win.ticket_id}>
                          <TableCell className="font-mono">{win.ticket_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {win.player_name || win.player_id || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {win.player_id || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{win.game_name}</p>
                              <p className="text-xs text-muted-foreground">{win.game_id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatInGhanaTime(win.won_at, 'PP p')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(win.winning_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              win.payment_status === 'pending' ? 'secondary' :
                              win.payment_status === 'processing' ? 'default' : 'destructive'
                            }>
                              {win.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              win.prize_delivery_status === 'not_delivered' ? 'secondary' :
                              win.prize_delivery_status === 'in_transit' ? 'default' : 'outline'
                            }>
                              {win.prize_delivery_status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {win.is_big_win && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                  Big Win
                                </Badge>
                              )}
                              {win.approval_required && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                  Approval Required
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Win Details</DialogTitle>
                                    <DialogDescription>
                                      Ticket {win.ticket_number}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Ticket ID</Label>
                                        <p className="font-mono text-sm">{win.ticket_id}</p>
                                      </div>
                                      <div>
                                        <Label>Player</Label>
                                        <p className="text-sm">{win.player_name || win.player_id || 'Unknown'}</p>
                                      </div>
                                      <div>
                                        <Label>Game</Label>
                                        <p className="text-sm">{win.game_name}</p>
                                      </div>
                                      <div>
                                        <Label>Winning Amount</Label>
                                        <p className="font-semibold">{formatCurrency(win.winning_amount)}</p>
                                      </div>
                                      <div>
                                        <Label>Won At</Label>
                                        <p className="text-sm">{formatInGhanaTime(win.won_at, 'PPp')}</p>
                                      </div>
                                      <div>
                                        <Label>Payment Status</Label>
                                        <Badge>{win.payment_status}</Badge>
                                      </div>
                                      <div>
                                        <Label>Prize Delivery Status</Label>
                                        <Badge variant="outline">{win.prize_delivery_status.replace('_', ' ')}</Badge>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              {win.is_big_win && win.approval_required && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedWin(win)
                                    setApprovalDialogOpen(true)
                                  }}
                                >
                                  Approve
                                </Button>
                              )}
                              
                              {!win.is_big_win && !win.approval_required && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-green-500 text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    if (win.winning_amount === 0) {
                                      // Physical prize — open delivery confirmation dialog
                                      setSelectedWin(win)
                                      setDeliveryDialogOpen(true)
                                    } else {
                                      // Cash prize — process payout
                                      handleProcessPayout([win.ticket_id])
                                    }
                                  }}
                                  disabled={processPayoutMutation.isPending || markDeliveredMutation.isPending}
                                >
                                  {win.winning_amount === 0 ? '🎁 Mark Delivered' : 'Pay Now'}
                                </Button>
                              )}
                            </div>
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

        {/* Paid Wins Tab */}
        <TabsContent value="paid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paid Wins</CardTitle>
              <CardDescription>
                Successfully processed winning ticket payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Date Won</TableHead>
                      <TableHead>Date Paid</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Prize Delivery Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPaidWins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No paid wins found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPaidWins.map((win) => (
                        <TableRow key={win.ticket_id}>
                          <TableCell className="font-mono">{win.ticket_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {win.player_name || win.player_id || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {win.player_id || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{win.game_name}</p>
                              <p className="text-xs text-muted-foreground">{win.game_id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatInGhanaTime(win.won_at, 'PP p')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatInGhanaTime(win.paid_at, 'PP p')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(win.winning_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{win.payment_status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{win.prize_delivery_status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{win.payout_method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {win.transaction_id}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Paid Win Details</DialogTitle>
                                  <DialogDescription>
                                    Ticket {win.ticket_number}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Ticket ID</Label>
                                      <p className="font-mono text-sm">{win.ticket_id}</p>
                                    </div>
                                    <div>
                                      <Label>Player</Label>
                                      <p className="text-sm">{win.player_name || win.player_id || 'Unknown'}</p>
                                    </div>
                                    <div>
                                      <Label>Game</Label>
                                      <p className="text-sm">{win.game_name}</p>
                                    </div>
                                    <div>
                                      <Label>Winning Amount</Label>
                                      <p className="font-semibold">{formatCurrency(win.winning_amount)}</p>
                                    </div>
                                    <div>
                                      <Label>Won At</Label>
                                      <p className="text-sm">{formatInGhanaTime(win.won_at, 'PPp')}</p>
                                    </div>
                                    <div>
                                      <Label>Paid At</Label>
                                      <p className="text-sm">{formatInGhanaTime(win.paid_at, 'PPp')}</p>
                                    </div>
                                    <div>
                                      <Label>Processed By</Label>
                                      <p className="text-sm">{win.processed_by}</p>
                                    </div>
                                    <div>
                                      <Label>Transaction ID</Label>
                                      <p className="font-mono text-sm">{win.transaction_id}</p>
                                    </div>
                                    <div>
                                      <Label>Payment Status</Label>
                                      <Badge>{win.payment_status}</Badge>
                                    </div>
                                    <div>
                                      <Label>Prize Delivery Status</Label>
                                      <Badge variant="outline">{win.prize_delivery_status}</Badge>
                                    </div>
                                    <div>
                                      <Label>Payout Method</Label>
                                      <Badge>{win.payout_method}</Badge>
                                    </div>
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

      {/* Big Win Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Big Win Approval</DialogTitle>
            <DialogDescription>
              Review and approve/reject big win payout for ticket {selectedWin?.ticket_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWin && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Big Win Alert</AlertTitle>
                <AlertDescription>
                  This winning amount of {formatCurrency(selectedWin.winning_amount)} requires manual approval.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ticket Number</Label>
                  <p className="font-mono">{selectedWin.ticket_number}</p>
                </div>
                <div>
                  <Label>Winning Amount</Label>
                  <p className="font-semibold text-lg">{formatCurrency(selectedWin.winning_amount)}</p>
                </div>
              </div>
              
              <div>
                <Label>Approval Reason</Label>
                <Input
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder="Enter reason for approval/rejection"
                />
              </div>
              
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Additional notes"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApproveBigWin(false)}
              disabled={!approvalReason.trim() || approveBigWinMutation.isPending}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleApproveBigWin(true)}
              disabled={!approvalReason.trim() || approveBigWinMutation.isPending}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Physical Prize Delivery Confirmation Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Confirm Prize Delivery
            </DialogTitle>
            <DialogDescription>
              Record that the prize has been handed to the winner. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedWin && (
            <div className="space-y-4">
              {/* Prize summary */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-yellow-800 font-semibold">
                  <PartyPopper className="h-4 w-4" />
                  {selectedWin.game_name || 'Prize'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ticket</span>
                    <p className="font-mono font-medium">{selectedWin.ticket_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Winner</span>
                    <p className="font-medium">{selectedWin.player_name || selectedWin.player_id || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-mono">{selectedWin.player_name?.startsWith('0') || selectedWin.player_name?.startsWith('233') ? selectedWin.player_name : selectedWin.player_id || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Date */}
              <div>
                <Label>Date Prize Was Handed Over *</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Received By */}
              <div>
                <Label>Received By (Winner's Full Name) *</Label>
                <Input
                  placeholder="e.g. Kwame Mensah"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="e.g. ID verified, winner collected in person at Accra office"
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleMarkDelivered}
              disabled={markDeliveredMutation.isPending || !deliveryDate || !recipientName.trim()}
            >
              {markDeliveredMutation.isPending
                ? 'Saving...'
                : '✓ Confirm — Prize Delivered'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WinsModule