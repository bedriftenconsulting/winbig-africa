import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Trophy, Ticket, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const API_BASE =
  import.meta.env.MODE === "production"
    ? "https://api.winbigafrica.com"
    : "http://localhost:4000";

interface Winner {
  name: string;
  prize: string;
  serial_number: string;
  draw_date: string;
}

const ResultsPage = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWinners = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/public/winners?limit=50`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setWinners(json?.data?.winners ?? []);
      } catch {
        setError("Unable to load results. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        <h1 className="font-heading text-4xl md:text-5xl text-primary mb-3">
          WINNERS &amp; RESULTS
        </h1>
        <p className="text-muted-foreground mb-10">
          Congratulations to all our winners. Results are published after each draw is committed.
        </p>

        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground py-12">
            <Loader2 className="animate-spin" size={22} />
            <span>Loading results…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 text-destructive py-8">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && winners.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Trophy size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No results yet.</p>
            <p className="text-sm mt-1">Check back after the next draw.</p>
          </div>
        )}

        {!loading && !error && winners.length > 0 && (
          <div className="grid gap-4 max-w-2xl">
            {winners.map((w, i) => (
              <motion.div
                key={w.serial_number || i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-xl p-5 flex items-center gap-4"
              >
                {/* Trophy icon */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="text-primary" size={22} />
                </div>

                {/* Name + prize */}
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-foreground text-lg leading-tight">
                    {w.name}
                  </div>
                  <div className="text-muted-foreground text-sm mt-0.5">
                    {w.prize}
                  </div>
                </div>

                {/* Ticket serial + date */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end text-primary">
                    <Ticket size={13} />
                    <span className="font-mono text-sm">{w.serial_number}</span>
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {w.draw_date}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ResultsPage;
