import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Info,
  DollarSign,
  Calendar,
  Trophy,
  Edit,
  Pause,
  Archive,
  AlertCircle,
  CheckCircle,
  FileText,
  Ticket,
  TrendingUp,
  Gift,
  Clock,
} from 'lucide-react'
import { formatInGhanaTime } from '@/lib/date-utils'
import { gameService, type Game } from '@/services/games'
import api from '@/lib/api'

interface GameDetailsProps {
  game: Game
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onManageSchedule: () => void
  onManagePrizes: () => void
}

export function GameDetails({
  game,
  isOpen,
  onClose,
  onEdit,
  onManageSchedule,
}: GameDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // Reset to overview tab each time dialog opens
  useEffect(() => { if (isOpen) setActiveTab('overview') }, [isOpen])

  const { data: freshGame, isLoading: gameLoading } = useQuery({
    queryKey: ['game-detail', game.id],
    queryFn: () => gameService.getGame(game.id),
    enabled: isOpen,
    staleTime: 0,
  })

  // Fetch this game's own schedules — the handler already computes tickets_sold live
  // via the ticket service (by schedule_id first, then game_code fallback)
  const { data: gameSchedulesRaw } = useQuery({
    queryKey: ['game-schedules-own', game.id],
    queryFn: async () => {
      const res = await api.get(`/admin/games/${game.id}/schedule`)
      const s = res.data?.data?.schedules || res.data?.data || []
      return Array.isArray(s) ? s : [s]
    },
    enabled: isOpen,
    staleTime: 0,
  })

  const g = freshGame ?? game
  const gameSchedules: { id: string; tickets_sold?: number; scheduled_draw: string | { seconds: number }; is_active: boolean; status?: string }[] = gameSchedulesRaw || []

  // tickets_sold on each schedule is already the live count from the ticket service
  const realEntriesSold = gameSchedules.reduce((sum, s) => sum + (s.tickets_sold || 0), 0)
  const basePrice = g.base_price ?? 0
  const revenue = realEntriesSold * basePrice

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase()
    const map: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ComponentType<{ className?: string }>; label: string }> = {
      ACTIVE:    { variant: 'default',     icon: CheckCircle, label: 'Active' },
      DRAFT:     { variant: 'secondary',   icon: Edit,        label: 'Draft' },
      SUSPENDED: { variant: 'destructive', icon: Pause,       label: 'Suspended' },
      ARCHIVED:  { variant: 'secondary',   icon: Archive,     label: 'Archived' },
    }
    const cfg = map[s] || { variant: 'secondary', icon: AlertCircle, label: status }
    const Icon = cfg.icon
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    )
  }

  const freqLabel = (f: string) =>
    f === 'bi_weekly' ? 'Bi-Weekly' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')

  const fmtDate = (d: string | undefined) =>
    d ? formatInGhanaTime(d, 'PPP') : '—'

  const needsDates = g.draw_frequency === 'special' || g.draw_frequency === 'monthly'
  const drawDate = g.draw_date || g.end_date

  const topPrize = g.prize_details?.[0]?.label ?? '—'

  const statCards = [
    {
      label: 'Entries Sold',
      value: gameLoading && !freshGame ? '…' : realEntriesSold.toLocaleString(),
      sub: 'Paid entries',
      icon: Ticket,
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      label: 'Revenue',
      value: gameLoading && !freshGame ? '…' : `GH₵${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `@ GH₵${basePrice}/entry`,
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      label: 'Entry Price',
      value: `GH₵${basePrice.toFixed(2)}`,
      sub: 'Per draw entry',
      icon: DollarSign,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Top Prize',
      value: topPrize,
      sub: '1st place',
      icon: Gift,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{g.name}</DialogTitle>
              <DialogDescription className="mt-2">
                Game Code: {g.code} • Version: {g.version ?? 1}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(g.status)}
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <Info className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <FileText className="h-4 w-4" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="prizes" className="gap-2">
              <Trophy className="h-4 w-4" />
              Prizes
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-5 mt-4">

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
                    <div className={`w-8 h-8 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground truncate">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* Competition info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Competition Details</CardTitle>
              </CardHeader>
              <CardContent>
                {gameLoading && !freshGame ? (
                  <div className="text-sm text-muted-foreground py-4">Loading…</div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Draw Frequency</p>
                      <p className="font-medium">{freqLabel(g.draw_frequency ?? '')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Sales Cutoff</p>
                      <p className="font-medium">{g.sales_cutoff_minutes} minutes before draw</p>
                    </div>
                    {needsDates && drawDate && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Draw Date</p>
                        <p className="font-medium">{fmtDate(drawDate)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Capacity</p>
                      <p className="font-medium">{g.total_tickets ? g.total_tickets.toLocaleString() : 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Created</p>
                      <p className="font-medium">{fmtDate(g.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Last Updated</p>
                      <p className="font-medium">{fmtDate(g.updated_at)}</p>
                    </div>
                  </div>
                )}
                {g.description && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm leading-relaxed">{g.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Rules ── */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Competition Rules</CardTitle>
                <CardDescription>Terms and conditions for participants</CardDescription>
              </CardHeader>
              <CardContent>
                {g.rules ? (
                  <p className="text-sm whitespace-pre-wrap">{g.rules}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No rules configured for this competition.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pricing ── */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Limits</CardTitle>
                <CardDescription>Entry pricing and purchase limits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Entry Price</p>
                      <p className="text-2xl font-bold">
                        GH₵{(g.base_price ?? g.ticket_price ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Max Entries per Player</p>
                      <p className="text-lg font-medium">{g.max_tickets_per_player}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Capacity</p>
                      <p className="text-lg font-medium">{g.total_tickets ? g.total_tickets.toLocaleString() : 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue Potential</p>
                      <p className="text-lg font-medium">
                        {g.total_tickets
                          ? `GH₵${((g.total_tickets ?? 0) * (g.base_price ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : 'Unlimited'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Schedule ── */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Draw Schedule</CardTitle>
                    <CardDescription>Timing configuration and upcoming draws</CardDescription>
                  </div>
                  <Button size="sm" onClick={onManageSchedule}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Manage Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Frequency</p>
                    <p className="font-medium">{freqLabel(g.draw_frequency ?? '')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Draw Time</p>
                    <p className="font-medium">{g.draw_time || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sales Cutoff</p>
                    <p className="font-medium">{g.sales_cutoff_minutes} min before draw</p>
                  </div>
                </div>

                {needsDates && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Draw Date</p>
                      <p className="font-medium">{fmtDate(drawDate)}</p>
                    </div>
                  </div>
                )}

                {g.draw_days && g.draw_days.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Draw Days</p>
                    <div className="flex gap-2 flex-wrap">
                      {g.draw_days.map(day => (
                        <Badge key={day} variant="secondary">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="font-medium mb-3">Scheduled Draws</p>
                  {gameSchedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No draws scheduled yet. Use Manage Schedule to generate them.</p>
                  ) : (
                    <div className="space-y-2">
                      {gameSchedules.slice(0, 5).map((s: { id: string; scheduled_draw: string | { seconds: number }; is_active: boolean; status?: string }) => {
                        const dTime = typeof s.scheduled_draw === 'string'
                          ? s.scheduled_draw
                          : new Date((s.scheduled_draw as { seconds: number }).seconds * 1000).toISOString()
                        return (
                          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{formatInGhanaTime(dTime, 'PPP')}</p>
                                <p className="text-xs text-muted-foreground">{formatInGhanaTime(dTime, 'p')} Ghana time</p>
                              </div>
                            </div>
                            <Badge variant={s.is_active ? 'default' : 'secondary'}>
                              {s.status || (s.is_active ? 'Scheduled' : 'Inactive')}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Prizes ── */}
          <TabsContent value="prizes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prize Structure</CardTitle>
                <CardDescription>Competition prizes by rank</CardDescription>
              </CardHeader>
              <CardContent>
                {!g.prize_details || g.prize_details.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No prizes configured for this competition.</p>
                    <Button variant="outline" className="mt-4" onClick={onEdit}>
                      Edit Competition to Add Prizes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {g.prize_details.map((prize, idx) => (
                      <div key={prize.rank} className={`flex items-start gap-4 p-4 rounded-xl border ${idx === 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : ''}`}>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold shrink-0 text-sm
                          ${idx === 0 ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'}`}>
                          #{prize.rank}
                        </div>
                        <div>
                          <p className="font-semibold">{prize.label}</p>
                          {prize.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{prize.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
