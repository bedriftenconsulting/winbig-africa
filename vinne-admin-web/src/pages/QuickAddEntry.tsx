import { useState, useEffect } from 'react'
import { CheckCircle, Send, Loader2, AlertCircle, PlusCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { drawService } from '@/services/draws'

type EntryResult = { name: string; phone: string; qty: number; tickets: string[]; sms_sent: boolean }

export default function QuickAddEntry() {
  const [draws, setDraws] = useState<{ id: string; label: string }[]>([])
  const [drawId, setDrawId] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<EntryResult | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<EntryResult[]>([])

  useEffect(() => {
    drawService.getDraws().then(data => {
      const active = (data?.draws ?? []).filter((d: Record<string, unknown>) => {
        const s = String(d.status ?? '').toLowerCase()
        return s.includes('scheduled') || s.includes('in_progress') || s === '1' || s === '2'
      })
      const mapped = active.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        label: (d.game_name || d.draw_name || d.name || d.id) as string,
      }))
      setDraws(mapped)
      if (mapped.length > 0) setDrawId(mapped[0].id)
    }).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!phone.trim()) { setError('Phone number required'); return }
    if (!drawId) { setError('No active draw available'); return }
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
      const res = await fetch(`${apiBase}/admin/draws/${drawId}/tickets/bulk-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entries: [{ phone: phone.trim(), name: name.trim(), quantity: qty }] }),
      })
      const data = await res.json()
      const r = (data?.data?.results ?? data?.results)?.[0]
      if (!res.ok || !r) { setError(data?.message || 'Failed to create entries'); return }
      const entry: EntryResult = { name: name.trim() || phone.trim(), phone: phone.trim(), qty, tickets: r.tickets ?? [], sms_sent: r.sms_sent }
      setResult(entry)
      setHistory(prev => [entry, ...prev])
      toast({ title: 'Done!', description: `${r.tickets?.length} entr${r.tickets?.length === 1 ? 'y' : 'ies'} sent to ${phone.trim()}` })
    } catch (err) {
      setError('Network error: ' + String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => { setResult(null); setPhone(''); setName(''); setQty(1); setError('') }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quick Entry</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cash buyer? Enter their details — entry created and SMS sent instantly.
        </p>
      </div>

      {draws.length > 1 && (
        <div className="space-y-1.5">
          <Label>Draw</Label>
          <Select value={drawId} onValueChange={setDrawId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {draws.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {draws.length === 1 && (
        <p className="text-sm text-muted-foreground">
          Draw: <span className="font-medium text-foreground">{draws[0].label}</span>
        </p>
      )}

      <Card>
        <CardContent className="pt-6 space-y-5">
          {!result ? (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Phone <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="0241234567"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Name <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Entries</Label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-10 w-10 text-lg" onClick={() => setQty(q => Math.max(1, q - 1))}>−</Button>
                    <span className="w-10 text-center font-bold text-2xl">{qty}</span>
                    <Button variant="outline" size="icon" className="h-10 w-10 text-lg" onClick={() => setQty(q => Math.min(10, q + 1))}>+</Button>
                    <span className="text-sm text-muted-foreground">
                      × GHS 20 = <strong className="text-foreground">GHS {qty * 20}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-destructive text-sm flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting || !phone.trim() || !drawId}
                className="w-full gap-2"
                size="lg"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  : <><Send className="h-4 w-4" /> Create & Send SMS</>}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-800">
                    {result.qty} {result.qty === 1 ? 'Entry' : 'Entries'} Created
                  </span>
                  <Badge
                    className={`ml-auto text-white ${result.sms_sent ? 'bg-green-500 hover:bg-green-500' : 'bg-red-500 hover:bg-red-500'}`}
                  >
                    {result.sms_sent ? 'SMS Sent ✓' : 'SMS Failed'}
                  </Badge>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  <strong>{result.name}</strong>{result.name !== result.phone ? ` · ${result.phone}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.tickets.map((t, i) => (
                    <span key={i} className="font-mono font-semibold text-sm bg-white border border-green-300 rounded-lg px-3 py-1.5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <Button className="w-full gap-2" onClick={reset}>
                <PlusCircle className="h-4 w-4" /> Next Person
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            This Session — {history.length} {history.length === 1 ? 'person' : 'people'} · {history.reduce((s, h) => s + h.qty, 0)} entries
          </h2>
          <div className="space-y-1.5">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border px-4 py-2.5 bg-card text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{h.name}</span>
                  {h.name !== h.phone && <span className="text-muted-foreground ml-2 text-xs">{h.phone}</span>}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {h.tickets.map((t, j) => (
                    <span key={j} className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">{t}</span>
                  ))}
                </div>
                {h.sms_sent
                  ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
