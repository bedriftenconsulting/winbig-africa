import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { adminService, type AuditLog } from '@/services/admin'
import { Activity, Search, X, ChevronLeft, ChevronRight, Monitor, Globe } from 'lucide-react'

const ACTION_OPTIONS = ['login', 'logout', 'create', 'update', 'delete', 'view', 'assign', 'revoke']
const RESOURCE_OPTIONS = ['user', 'role', 'permission', 'draw', 'ticket', 'player', 'game', 'payout']

function actionColor(action: string) {
  switch (action?.toLowerCase()) {
    case 'create':   return 'bg-green-100 text-green-800 border-green-200'
    case 'update':   return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'delete':   return 'bg-red-100 text-red-800 border-red-200'
    case 'login':    return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'logout':   return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'assign':   return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'revoke':   return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default:         return 'bg-muted text-muted-foreground border-border'
  }
}

function statusColor(status: number) {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-800 border-green-200'
  if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AuditLogs() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ user_id: '', action: '', resource: '', start_date: '', end_date: '' })
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, filters],
    queryFn: () => adminService.getAuditLogs(page, 25, filters),
  })

  const set = (key: string, value: string) => { setFilters(p => ({ ...p, [key]: value })); setPage(1) }
  const hasFilters = Object.values(filters).some(Boolean)

  const logs: AuditLog[] = Array.isArray(data?.data) ? data.data : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All admin actions recorded in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{data?.total_count?.toLocaleString() ?? '—'} events</span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Search by user…"
                  value={filters.user_id}
                  onChange={e => set('user_id', e.target.value)}
                />
              </div>
            </div>

            <Select value={filters.action || '__all__'} onValueChange={v => set('action', v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All actions</SelectItem>
                {ACTION_OPTIONS.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.resource || '__all__'} onValueChange={v => set('resource', v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Resource" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All resources</SelectItem>
                {RESOURCE_OPTIONS.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Input type="date" className="h-9 text-sm w-36" value={filters.start_date} onChange={e => set('start_date', e.target.value)} />
              <span className="text-muted-foreground text-xs">–</span>
              <Input type="date" className="h-9 text-sm w-36" value={filters.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setFilters({ user_id: '', action: '', resource: '', start_date: '', end_date: '' }); setPage(1) }}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No audit events found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">When</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Resource</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">IP</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelected(log)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-muted-foreground text-xs">{formatRelativeTime(log.created_at)}</span>
                        <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{new Date(log.created_at).toLocaleTimeString('en-GB')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{log.admin_user?.username || '—'}</p>
                        <p className="text-xs text-muted-foreground">{log.admin_user?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.resource ? (
                          <div>
                            <span className="capitalize text-sm">{log.resource}</span>
                            {log.resource_id && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">{log.resource_id?.slice(0, 12)}…</p>
                            )}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip_address || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor(log.response_status)}`}>
                          {log.response_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.total_count > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total_count)} of {data.total_count.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-1">Page {page} / {data.total_pages}</span>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => p + 1)} disabled={page >= data.total_pages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${actionColor(selected?.action ?? '')}`}>
                {selected?.action}
              </span>
              <span className="capitalize text-base font-medium">{selected?.resource || 'event'}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="font-medium">{selected.admin_user?.username || '—'}</p>
                  <p className="text-xs text-muted-foreground">{selected.admin_user?.email}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{new Date(selected.created_at).toLocaleString('en-GH')}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> IP Address</p>
                  <p className="font-mono">{selected.ip_address || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor(selected.response_status)}`}>
                    {selected.response_status}
                  </span>
                </div>
                {selected.resource_id && (
                  <div className="col-span-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Resource ID</p>
                    <p className="font-mono text-xs break-all">{selected.resource_id}</p>
                  </div>
                )}
              </div>

              {selected.user_agent && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Monitor className="h-3 w-3" /> User Agent</p>
                  <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 break-all leading-relaxed">{selected.user_agent}</p>
                </div>
              )}

              {selected.request_data && Object.keys(selected.request_data).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Request Data</p>
                  <pre className="text-xs bg-muted rounded-md px-3 py-2 overflow-auto max-h-40 leading-relaxed">
                    {JSON.stringify(
                      Object.fromEntries(Object.entries(selected.request_data).filter(([k]) => k !== 'password')),
                      null, 2
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
