import { useEffect, useState } from 'react'
import AdminLayout from '@/components/layouts/AdminLayout'
import { useQuery } from '@tanstack/react-query'
import { gameService } from '@/services/games'
import {
  TrendingUp,
  TrendingDown,
  Ticket,
  DollarSign,
  CheckCircle,
  XCircle,
  Gamepad2,
  Play,
  type LucideIcon,
} from 'lucide-react'

interface DashboardMetrics {
  totalTickets: number
  totalGrossRevenue: number
  totalPaidTickets: number
  totalUnpaidTickets: number
  ticketsChange: number
  revenueChange: number
  paidTicketsChange: number
  unpaidTicketsChange: number
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTickets: 0,
    totalGrossRevenue: 0,
    totalPaidTickets: 0,
    totalUnpaidTickets: 0,
    ticketsChange: 0,
    revenueChange: 0,
    paidTicketsChange: 0,
    unpaidTicketsChange: 0,
  })

  const { data: gamesData } = useQuery({
    queryKey: ['games'],
    queryFn: () => gameService.getGames(1, 100),
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { dashboardService } = await import('@/services/dashboard')
        const dailyMetrics = await dashboardService.getDailyMetrics()
        setMetrics({
          totalTickets: dailyMetrics.metrics.tickets.count,
          totalGrossRevenue: dailyMetrics.metrics.gross_revenue.amount_ghs,
          totalPaidTickets: dailyMetrics.metrics.paid_tickets.count,
          totalUnpaidTickets: dailyMetrics.metrics.unpaid_tickets.count,
          ticketsChange: dailyMetrics.metrics.tickets.change_percentage,
          revenueChange: dailyMetrics.metrics.gross_revenue.change_percentage,
          paidTicketsChange: dailyMetrics.metrics.paid_tickets.change_percentage,
          unpaidTicketsChange: dailyMetrics.metrics.unpaid_tickets.change_percentage,
        })
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-GH').format(num)
  }

  type ChangeType = 'positive' | 'negative' | 'neutral'
  type CardColor = 'indigo' | 'emerald' | 'sky' | 'violet' | 'amber' | 'red'

  interface KPI {
    label: string
    value: string
    change: string
    changeType: ChangeType
    icon: LucideIcon
    color: CardColor
  }

  const colorMap: Record<CardColor, { icon: string }> = {
    indigo:  { icon: 'bg-indigo-100 text-indigo-600' },
    emerald: { icon: 'bg-emerald-100 text-emerald-600' },
    sky:     { icon: 'bg-sky-100 text-sky-600' },
    violet:  { icon: 'bg-violet-100 text-violet-600' },
    amber:   { icon: 'bg-amber-100 text-amber-600' },
    red:     { icon: 'bg-red-100 text-red-600' },
  }

  function KPICard({ label, value, change, changeType, icon: Icon, color }: KPI) {
    const c = colorMap[color]
    return (
      <div className="bg-card rounded-lg p-5 shadow-card hover:shadow-card-hover transition-shadow duration-150">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">{label}</p>
          <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${c.icon}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="text-2xl font-semibold tracking-tight font-mono tabular-nums text-foreground">{value}</p>
        <div className="flex items-center gap-1 mt-2">
          {changeType === 'positive'
            ? <TrendingUp className="h-3 w-3 text-emerald-500" />
            : changeType === 'negative'
              ? <TrendingDown className="h-3 w-3 text-destructive" />
              : <TrendingUp className="h-3 w-3 text-muted-foreground opacity-40" />}
          <span className={`text-xs font-medium ${changeType === 'positive' ? 'text-emerald-600' : changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {change}
          </span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    )
  }

  const totalGames = gamesData?.data?.length || 0
  const activeGames = gamesData?.data?.filter(g => g.status?.toLowerCase() === 'active').length || 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of lottery operations</p>
        </div>

        {/* KPI Cards — 6 metrics in a 2-col / 3-col / 6-col grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            label="Total Games"
            value={formatNumber(totalGames)}
            change={`${totalGames} configured`}
            changeType={totalGames > 0 ? 'positive' : 'neutral'}
            icon={Gamepad2}
            color="indigo"
          />
          <KPICard
            label="Active Games"
            value={formatNumber(activeGames)}
            change={`${activeGames} live`}
            changeType={activeGames > 0 ? 'positive' : 'neutral'}
            icon={Play}
            color="emerald"
          />
          <KPICard
            label="Tickets Sold"
            value={formatNumber(metrics.totalTickets)}
            change={`${metrics.ticketsChange > 0 ? '+' : ''}${metrics.ticketsChange}% daily`}
            changeType={metrics.ticketsChange > 0 ? 'positive' : metrics.ticketsChange < 0 ? 'negative' : 'neutral'}
            icon={Ticket}
            color="sky"
          />
          <KPICard
            label="Revenue"
            value={formatCurrency(metrics.totalGrossRevenue)}
            change={`${metrics.revenueChange > 0 ? '+' : ''}${metrics.revenueChange}% daily`}
            changeType={metrics.revenueChange > 0 ? 'positive' : metrics.revenueChange < 0 ? 'negative' : 'neutral'}
            icon={DollarSign}
            color="violet"
          />
          <KPICard
            label="Paid Wins"
            value={formatNumber(metrics.totalPaidTickets)}
            change={`${metrics.paidTicketsChange > 0 ? '+' : ''}${metrics.paidTicketsChange}% daily`}
            changeType={metrics.paidTicketsChange > 0 ? 'positive' : metrics.paidTicketsChange < 0 ? 'negative' : 'neutral'}
            icon={CheckCircle}
            color="amber"
          />
          <KPICard
            label="Unpaid Wins"
            value={formatNumber(metrics.totalUnpaidTickets)}
            change={`${metrics.unpaidTicketsChange > 0 ? '+' : ''}${metrics.unpaidTicketsChange}% daily`}
            changeType={metrics.unpaidTicketsChange > 0 ? 'negative' : metrics.unpaidTicketsChange < 0 ? 'positive' : 'neutral'}
            icon={XCircle}
            color="red"
          />
        </div>
      </div>
    </AdminLayout>
  )
}
