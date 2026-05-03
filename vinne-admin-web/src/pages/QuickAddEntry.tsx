import { useState, useEffect } from 'react'
import { CheckCircle, Send, Loader2, AlertCircle, PlusCircle, XCircle, User, Phone, Hash, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { drawService } from '@/services/draws'

type QuickResult = { tickets: string[]; sms_sent: boolean }
type BulkResult = {
  tickets_created: number
  sms_sent: number
  total_entries: number
  results: { phone: string; name: string; quantity: number; tickets: string[]; sms_sent: boolean; error?: string }[]
}
type PendingConfirm = { phone: string; name: string; qty: number }

export default function QuickAddEntry() {
  const [draws, setDraws] = useState<{ id: string; label: string }[]>([])
  const [drawId, setDrawId] = useState('')
  const [entryMode, setEntryMode] = useState<'quick' | 'bulk'>('quick')

  // Quick Add state
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [quickResult, setQuickResult] = useState<QuickResult | null>(null)
  const [quickError, setQuickError] = useState('')
  const [history, setHistory] = useState<{ name: string; phone: string; qty: number; tickets: string[]; sms_sent: boolean }[]>([])
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)

  // Bulk Import state
  const [bulkRawText, setBulkRawText] = useState('')
  const [bulkParsed, setBulkParsed] = useState<{ phone: string; name: string; quantity: number }[]>([])
  const [bulkParseError, setBulkParseError] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  useEffect(() => {
    drawService.getDraws().then(data => {
      const active = (data?.draws ?? []).filter((d: Record<string, unknown>) => {
        const s = String(d.status ?? '').toLowerCase()
        const excluded = ['cancelled', 'completed', 'failed', '3', '4', '5']
        if (excluded.some(x => s.includes(x))) return false
        return s.includes('scheduled') || s.includes('in_progress') || s === '1' || s === '2'
      })
      const mapped = active.map((d: Record<string, unknown>) => {
        const gameName = (d.game_name || d.draw_name || d.name || d.id) as string
        const drawNum = d.draw_number ? `#${d.draw_number}` : ''
        return {
          id: d.id as string,
          label: drawNum ? `${gameName} — Draw ${drawNum}` : gameName,
        }
      })
      setDraws(mapped)
      if (mapped.length > 0) setDrawId(mapped[0].id)
    }).catch(() => {})
  }, [])

  // Called when user clicks "Create & Send SMS" — shows confirmation instead of submitting
  const handleQuickReview = () => {
    if (!phone.trim()) { setQuickError('Phone number required'); return }
    if (!drawId) { setQuickError('No active draw available'); return }
    setQuickError('')
    setPendingConfirm({ phone: phone.trim(), name: name.trim(), qty })
  }

  // Called after user confirms
  const handleQuickSubmit = async () => {
    if (!pendingConfirm) return
    setSubmitting(true)
    setQuickError('')
    try {
      const token = localStorage.getItem('access_token')
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
      const res = await fetch(`${apiBase}/admin/draws/${drawId}/tickets/bulk-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entries: [{ phone: pendingConfirm.phone, name: pendingConfirm.name, quantity: pendingConfirm.qty }] }),
      })
      const data = await res.json()
      const r = (data?.data?.results ?? data?.results)?.[0]
      if (!res.ok || !r) { setQuickError(data?.message || 'Failed to create entries'); setPendingConfirm(null); return }
      const result: QuickResult = { tickets: r.tickets ?? [], sms_sent: r.sms_sent }
      setQuickResult(result)
      setHistory(prev => [{ name: pendingConfirm.name || pendingConfirm.phone, phone: pendingConfirm.phone, qty: pendingConfirm.qty, ...result }, ...prev])
      setPendingConfirm(null)
      toast({ title: 'Done!', description: `${r.tickets?.length} entr${r.tickets?.length === 1 ? 'y' : 'ies'} sent to ${pendingConfirm.phone}` })
    } catch (err) {
      setQuickError('Network error: ' + String(err))
      setPendingConfirm(null)
    } finally {
      setSubmitting(false)
    }
  }

  const resetQuick = () => { setQuickResult(null); setPhone(''); setName(''); setQty(1); setQuickError(''); setPendingConfirm(null) }

  const handleBulkUpload = async () => {
    setBulkConfirmOpen(false)
    setBulkUploading(true)
    try {
      const token = localStorage.getItem('access_token')
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
      const res = await fetch(`${apiBase}/admin/draws/${drawId}/tickets/bulk-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entries: bulkParsed }),
      })
      const text = await res.text()
      let data: Record<string, unknown>
      try { data = JSON.parse(text) } catch { setBulkParseError(`Server error (${res.status}): ${text.slice(0, 200)}`); return }
      if (!res.ok) { setBulkParseError((data?.message as string) || `Upload failed (${res.status})`); return }
      setBulkResult((data?.data ?? data) as BulkResult)
    } catch (err) {
      setBulkParseError('Network error: ' + String(err))
    } finally {
      setBulkUploading(false)
    }
  }

  const bulkTotalEntries = bulkParsed.reduce((s, e) => s + e.quantity, 0)
  const bulkTotalAmount = bulkTotalEntries * 20

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quick Entry</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add entries for cash buyers — created and SMS sent instantly.
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
        <CardContent className="pt-5 space-y-5">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {(['quick', 'bulk'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setEntryMode(mode)}
                className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${entryMode === mode ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode === 'quick' ? 'Quick Add' : 'Bulk Import'}
              </button>
            ))}
          </div>

          {/* ── Quick Add ── */}
          {entryMode === 'quick' && (
            <div className="space-y-4">
              {quickResult ? (
                // ── Success state ──
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-800">
                        {pendingConfirm?.qty ?? qty} {(pendingConfirm?.qty ?? qty) === 1 ? 'Entry' : 'Entries'} Created
                      </span>
                      <Badge className={`ml-auto text-white ${quickResult.sms_sent ? 'bg-green-500 hover:bg-green-500' : 'bg-red-500 hover:bg-red-500'}`}>
                        {quickResult.sms_sent ? 'SMS Sent ✓' : 'SMS Failed'}
                      </Badge>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      <strong>{name || phone}</strong>{name ? ` · ${phone}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickResult.tickets.map((t, i) => (
                        <span key={i} className="font-mono font-semibold text-sm bg-white border border-green-300 rounded-lg px-3 py-1.5">{t}</span>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full gap-2" onClick={resetQuick}>
                    <PlusCircle className="h-4 w-4" /> Next Person
                  </Button>
                </div>
              ) : pendingConfirm ? (
                // ── Confirmation step ──
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                    <p className="text-sm font-semibold text-foreground">Confirm entry details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-semibold font-mono text-sm">{pendingConfirm.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="font-semibold text-sm">{pendingConfirm.name || <span className="text-muted-foreground italic font-normal">Not provided</span>}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Hash className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Entries</p>
                          <p className="font-semibold text-sm">{pendingConfirm.qty}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-green-700">₵</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-semibold text-sm text-green-700">GHS {pendingConfirm.qty * 20}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {quickError && (
                    <p className="text-destructive text-sm flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {quickError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => setPendingConfirm(null)}
                      disabled={submitting}
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleQuickSubmit}
                      disabled={submitting}
                    >
                      {submitting
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                        : <><Send className="h-4 w-4" /> Confirm & Create</>}
                    </Button>
                  </div>
                </div>
              ) : (
                // ── Entry form ──
                <>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Phone <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="0241234567"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setQuickError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleQuickReview()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Name <span className="text-xs text-muted-foreground">(optional)</span></Label>
                      <Input
                        placeholder="John Doe"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuickReview()}
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

                  {quickError && (
                    <p className="text-destructive text-sm flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {quickError}
                    </p>
                  )}

                  <Button
                    onClick={handleQuickReview}
                    disabled={!phone.trim() || !drawId}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Send className="h-4 w-4" /> Review & Create
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── Bulk Import ── */}
          {entryMode === 'bulk' && (
            <div className="space-y-4">
              {!bulkResult ? (
                <>
                  <div className="rounded-lg bg-muted/50 border px-4 py-2.5 text-sm text-muted-foreground">
                    One per line: <span className="font-mono text-foreground font-medium">phone, name, quantity</span>
                    <span className="ml-2 text-xs">— name and quantity optional</span>
                  </div>
                  <Textarea
                    placeholder={`0241234567, John Doe, 2\n0279876543, Jane Smith\n0501112233`}
                    className="font-mono text-sm min-h-[160px]"
                    value={bulkRawText}
                    onChange={e => { setBulkRawText(e.target.value); setBulkParsed([]); setBulkParseError('') }}
                  />

                  {bulkParseError && (
                    <p className="text-destructive text-sm flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> {bulkParseError}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => {
                      const lines = bulkRawText.split('\n').map(l => l.trim()).filter(Boolean)
                      if (!lines.length) { setBulkParseError('Paste at least one phone number'); return }
                      const parsed = lines.map((line, i) => {
                        const parts = line.split(',').map(p => p.trim())
                        if (!parts[0]) { setBulkParseError(`Line ${i + 1}: phone number missing`); return null }
                        return { phone: parts[0], name: parts[1] || '', quantity: parseInt(parts[2] || '1', 10) || 1 }
                      }).filter(Boolean) as { phone: string; name: string; quantity: number }[]
                      setBulkParsed(parsed)
                      setBulkParseError('')
                    }}>
                      Preview ({bulkRawText.split('\n').filter(l => l.trim()).length} lines)
                    </Button>

                    {bulkParsed.length > 0 && (
                      <Button
                        disabled={bulkUploading || !drawId}
                        onClick={() => setBulkConfirmOpen(true)}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" /> Create & Send SMS ({bulkTotalEntries} entries)
                      </Button>
                    )}
                  </div>

                  {bulkParsed.length > 0 && (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkParsed.map((entry, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                              <TableCell className="font-mono text-sm">{entry.phone}</TableCell>
                              <TableCell className="text-sm">{entry.name || <span className="text-muted-foreground">—</span>}</TableCell>
                              <TableCell className="text-center"><Badge variant="secondary">{entry.quantity}</Badge></TableCell>
                              <TableCell className="text-right text-sm">GHS {entry.quantity * 20}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="px-4 py-2.5 border-t bg-muted/30 text-sm flex justify-between items-center">
                        <span className="text-muted-foreground">{bulkParsed.length} recipients</span>
                        <span className="font-semibold">Total: GHS {bulkTotalAmount}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border bg-card p-4 text-center">
                      <p className="text-3xl font-bold text-green-500">{bulkResult.tickets_created}</p>
                      <p className="text-xs text-muted-foreground mt-1">Entries Created</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 text-center">
                      <p className="text-3xl font-bold text-blue-500">{bulkResult.sms_sent}</p>
                      <p className="text-xs text-muted-foreground mt-1">SMS Sent</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4 text-center">
                      <p className="text-3xl font-bold">{bulkResult.total_entries}</p>
                      <p className="text-xs text-muted-foreground mt-1">Recipients</p>
                    </div>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Phone</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Entry Numbers</TableHead>
                          <TableHead className="text-center w-16">SMS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkResult.results?.map((r, i) => (
                          <TableRow key={i} className={r.error ? 'bg-red-50' : ''}>
                            <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                            <TableCell className="text-sm">{r.name || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {r.tickets?.map((t, j) => (
                                  <span key={j} className="font-mono text-xs bg-muted rounded px-2 py-0.5">{t}</span>
                                ))}
                                {!r.tickets?.length && <span className="text-destructive text-xs">{r.error || 'Failed'}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {r.sms_sent
                                ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button variant="outline" onClick={() => { setBulkResult(null); setBulkRawText(''); setBulkParsed([]) }}>
                    Import Another Batch
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add session history */}
      {entryMode === 'quick' && history.length > 0 && (
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

      {/* Bulk Import confirmation dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-2xl font-bold">{bulkParsed.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Recipients</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-2xl font-bold">{bulkTotalEntries}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Entries</p>
              </div>
              <div className="rounded-lg border bg-green-50 border-green-200 p-3">
                <p className="text-2xl font-bold text-green-700">{bulkTotalAmount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">GHS Total</p>
              </div>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground text-center">
              SMS will be sent to all {bulkParsed.length} recipients after creation.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkUploading}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpload} disabled={bulkUploading} className="gap-2">
              {bulkUploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                : <><Send className="h-4 w-4" /> Confirm & Create</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
