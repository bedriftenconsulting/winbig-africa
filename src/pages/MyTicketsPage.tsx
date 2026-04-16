import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Calendar, Trophy, Clock, ArrowRight, ChevronDown, Shield, X, CreditCard, Hash, Gamepad2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, type Ticket as TicketType } from "@/lib/api";

const statusColor: Record<string, string> = {
  issued:    "bg-green-500/10 text-green-400 border-green-500/20",
  active:    "bg-green-500/10 text-green-400 border-green-500/20",
  won:       "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  winning:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  expired:   "bg-muted text-muted-foreground border-border",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const formatDate = (val?: string) => {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
};

type GameGroup = {
  game_code: string;
  game_name: string;
  draw_date?: string;
  tickets: TicketType[];
};

// ── Ticket Detail Modal ───────────────────────────────────────────────────────
const TicketDetailModal = ({ ticket, onClose }: { ticket: TicketType; onClose: () => void }) => {
  const amountGHS = (Number(ticket.total_amount || 0) / 100).toFixed(2);
  const winGHS    = ticket.winning_amount ? (Number(ticket.winning_amount) / 100).toFixed(2) : null;
  const date      = formatDate(ticket.issued_at || ticket.created_at);
  const drawDate  = formatDate((ticket as any).draw_date);
  const verCode   = (ticket as any).security_features?.verification_code;

  const rows: [string, string | undefined][] = [
    ["Serial Number",    ticket.serial_number],
    ["Game",             ticket.game_name || ticket.game_code],
    ["Status",           ticket.status],
    ["Amount Paid",      `GHS ${amountGHS}`],
    ...(winGHS ? [["Winning Amount", `GHS ${winGHS}`] as [string, string]] : []),
    ["Payment Method",   ticket.payment_method?.replace(/_/g, " ")],
    ["Issued",           date],
    ["Draw Date",        drawDate !== "—" ? drawDate : undefined],
    ...(verCode ? [["Verification Code", verCode] as [string, string]] : []),
    ["Ticket ID",        ticket.id],
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Ticket className="text-primary" size={18} />
              <span className="font-heading text-foreground font-semibold">Ticket Details</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
              <X size={18} />
            </button>
          </div>

          {/* Serial + status hero */}
          <div className="px-5 py-4 bg-primary/5 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Serial Number</p>
              <p className="font-mono text-primary font-bold text-lg tracking-wider">{ticket.serial_number}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {ticket.is_winning && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">🏆 Winner</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor[ticket.status] ?? statusColor.expired}`}>
                {ticket.status}
              </span>
            </div>
          </div>

          {/* Detail rows */}
          <div className="divide-y divide-border/60 px-5">
            {rows.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-medium text-foreground font-mono max-w-[55%] text-right truncate">{value}</span>
              </div>
            ))}
          </div>

          <div className="px-5 py-4">
            <button onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition">
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const MyTicketsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    apiClient.getMyTickets(user.id)
      .then(data => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Group tickets by game_code
  const groups: GameGroup[] = Object.values(
    tickets.reduce<Record<string, GameGroup>>((acc, t) => {
      const key = t.game_code || 'unknown';
      if (!acc[key]) acc[key] = { game_code: key, game_name: t.game_name || key, draw_date: (t as any).draw_date, tickets: [] };
      acc[key].tickets.push(t);
      return acc;
    }, {})
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 pb-16 text-center">
          <Ticket className="mx-auto mb-4 text-muted-foreground" size={48} />
          <h1 className="font-heading text-2xl text-foreground mb-2">Sign in to view your tickets</h1>
          <p className="text-muted-foreground mb-6">You need an account to track your competition entries.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/signin" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:brightness-110 transition">Sign In</Link>
            <Link to="/signup" className="border border-primary text-primary px-6 py-2 rounded-lg font-semibold hover:bg-primary/10 transition">Create Account</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Ticket className="text-primary" size={28} />
            <div>
              <h1 className="font-heading text-3xl text-foreground">My Tickets</h1>
              <p className="text-muted-foreground text-sm">{tickets.length} {tickets.length === 1 ? 'entry' : 'entries'} across {groups.length} {groups.length === 1 ? 'competition' : 'competitions'}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-20">
              <Ticket className="mx-auto mb-4 text-muted-foreground" size={56} />
              <h2 className="font-heading text-xl text-foreground mb-2">No tickets yet</h2>
              <p className="text-muted-foreground mb-6">Enter a competition to see your tickets here.</p>
              <Link to="/competitions"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:brightness-110 transition">
                Browse Competitions <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => {
                const isOpen = expanded === group.game_code;
                const anyWinner = group.tickets.some(t => t.is_winning);
                const totalPaid = group.tickets.reduce((s, t) => s + Number(t.total_amount || 0), 0);
                const statuses = [...new Set(group.tickets.map(t => t.status))];
                const primaryStatus = statuses.includes('won') ? 'won' : statuses.includes('issued') ? 'issued' : statuses[0];

                return (
                  <motion.div key={group.game_code} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`bg-card border rounded-xl overflow-hidden transition-colors ${isOpen ? 'border-primary/50' : 'border-border hover:border-primary/30'}`}>

                    {/* Header — always visible */}
                    <button className="w-full text-left p-5" onClick={() => setExpanded(isOpen ? null : group.game_code)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-heading text-foreground font-semibold text-base">{group.game_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Ticket size={11} /> {group.tickets.length} {group.tickets.length === 1 ? 'ticket' : 'tickets'}</span>
                            <span className="flex items-center gap-1"><Trophy size={11} /> GHS {(totalPaid / 100).toFixed(2)}</span>
                            {group.draw_date && <span className="flex items-center gap-1"><Calendar size={11} /> Draw {formatDate(group.draw_date)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {anyWinner && <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Winner 🎉</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor[primaryStatus] ?? statusColor.expired}`}>
                            {primaryStatus}
                          </span>
                          <ChevronDown size={15} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </button>

                    {/* Ticket list — expandable */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="border-t border-border divide-y divide-border/60">
                            {group.tickets.map((ticket, idx) => (
                              <button key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className="w-full px-5 py-3 flex items-center justify-between text-sm hover:bg-primary/5 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground text-xs w-5 text-right">{idx + 1}</span>
                                  <span className="font-mono text-primary font-semibold text-xs">{ticket.serial_number}</span>
                                  {ticket.is_winning && <span className="text-yellow-400 text-xs">🏆 Winner</span>}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {(ticket as any).security_features?.verification_code && (
                                    <span className="flex items-center gap-1 font-mono">
                                      <Shield size={10} /> {(ticket as any).security_features.verification_code}
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded-full border capitalize ${statusColor[ticket.status] ?? statusColor.expired}`}>
                                    {ticket.status}
                                  </span>
                                  <ArrowRight size={12} className="opacity-40" />
                                </div>
                              </button>
                            ))}
                          </div>
                          {group.draw_date && (
                            <div className="px-5 py-3 flex items-center gap-1.5 text-xs text-green-400 border-t border-border/60 bg-green-500/5">
                              <Clock size={11} /> Draw on {formatDate(group.draw_date)} — good luck!
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
      <Footer />

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
};

export default MyTicketsPage;
