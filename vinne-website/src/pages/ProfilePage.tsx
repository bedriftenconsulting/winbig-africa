import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Phone, Calendar, Ticket, LogOut, Loader2, CreditCard, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OtpLogin from "@/components/OtpLogin";
import { toast } from "@/hooks/use-toast";
import { 
  getToken, 
  getPlayerId, 
  fetchPlayerTickets, 
  fetchPlayerTransactions, 
  fetchWalletBalance,
  type ApiTicket, 
  type ApiTransaction,
  type LoginResponse 
} from "@/lib/api";

interface Profile {
  id: string;
  phone: string;
  name?: string;
  created_at?: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tickets" | "transactions">("tickets");

  useEffect(() => {
    const token = getToken();
    const playerId = getPlayerId();
    
    if (token && playerId) {
      setIsAuthenticated(true);
      loadPlayerData(playerId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadPlayerData = async (playerId: string) => {
    try {
      // Load profile data from localStorage and API
      const phone = localStorage.getItem("player_phone") || "";
      const name = localStorage.getItem("player_name") || "";
      
      setProfile({
        id: playerId,
        phone,
        name,
        created_at: new Date().toISOString() // Fallback
      });

      // Load tickets, transactions, and balance
      const [ticketsData, transactionsData, balanceData] = await Promise.all([
        fetchPlayerTickets(playerId).catch(() => []),
        fetchPlayerTransactions(playerId).catch(() => []),
        fetchWalletBalance(playerId).catch(() => 0)
      ]);

      setTickets(ticketsData);
      setTransactions(transactionsData);
      setBalance(balanceData);
    } catch (error) {
      console.error("Failed to load player data:", error);
      toast({ 
        title: "Failed to load data", 
        description: "Some information may not be available",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (response: LoginResponse) => {
    if (response.data) {
      setIsAuthenticated(true);
      setProfile({
        id: response.data.player.id,
        phone: response.data.player.phone,
        name: response.data.player.name
      });
      loadPlayerData(response.data.player.id);
      toast({ title: "Welcome back!", description: "You're now signed in." });
    }
  };

  const handleLoginError = (error: string) => {
    toast({ title: "Sign in failed", description: error, variant: "destructive" });
  };

  const signOut = () => {
    localStorage.removeItem("player_token");
    localStorage.removeItem("player_id");
    localStorage.removeItem("player_phone");
    localStorage.removeItem("player_name");
    setIsAuthenticated(false);
    setProfile(null);
    setTickets([]);
    setTransactions([]);
    setBalance(0);
    navigate("/");
    window.dispatchEvent(new Event("storage"));
  };

  const formatCurrency = (amount: number) => {
    return `GHS ${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith("233")) {
      return phone.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8">
            <OtpLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName = profile?.name || "Player";
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "P";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container pt-24 pb-16 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shrink-0">
            <span className="font-heading text-2xl text-primary">{initials}</span>
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-2xl text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{formatPhone(profile?.phone || "")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Wallet Balance</p>
            <p className="font-heading text-xl text-primary">{formatCurrency(balance)}</p>
          </div>
          <button 
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary border border-border hover:border-primary/50 px-3 py-2 rounded-lg transition"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ticket size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading text-foreground">{tickets.length}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-heading text-foreground">{transactions.length}</p>
                <p className="text-sm text-muted-foreground">Transactions</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Trophy size={18} className="text-gold" />
              </div>
              <div>
                <p className="text-2xl font-heading text-foreground">
                  {tickets.filter(t => t.status === "WON").length}
                </p>
                <p className="text-sm text-muted-foreground">Wins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === "tickets"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Ticket size={16} />
                My Tickets ({tickets.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === "transactions"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CreditCard size={16} />
                Transactions ({transactions.length})
              </div>
            </button>
          </div>

          <div className="p-6">
            {activeTab === "tickets" ? (
              <div className="space-y-4">
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Ticket size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading text-lg text-foreground mb-2">No tickets yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start playing to see your tickets here
                    </p>
                    <Link
                      to="/competitions"
                      className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:brightness-110 transition"
                    >
                      <Trophy size={16} />
                      Browse Competitions
                    </Link>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div key={ticket.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-foreground">{ticket.game_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Draw #{ticket.draw_number} • {ticket.game_code}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ticket.status === "WON" 
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : ticket.status === "LOST"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            Numbers: {ticket.bet_lines.map(line => line.line_number).join(", ")}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">
                          {formatCurrency(ticket.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading text-lg text-foreground mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground">
                      Your payment history will appear here
                    </p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{transaction.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                            {transaction.reference && ` • ${transaction.reference}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === "CREDIT" ? "text-green-500" : "text-red-500"
                          }`}>
                            {transaction.type === "CREDIT" ? "+" : "-"}{formatCurrency(transaction.amount)}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status === "COMPLETED"
                              ? "bg-green-500/10 text-green-500"
                              : transaction.status === "FAILED"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Link
            to="/competitions"
            className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                <Trophy size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg text-foreground">Enter Competition</h3>
                <p className="text-sm text-muted-foreground">Browse active games and buy tickets</p>
              </div>
            </div>
          </Link>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Phone size={20} className="text-green-500" />
              </div>
              <div>
                <h3 className="font-heading text-lg text-foreground">USSD Access</h3>
                <p className="text-sm text-muted-foreground">
                  Dial <span className="font-mono font-bold text-primary">*899*92#</span> to play via mobile
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;