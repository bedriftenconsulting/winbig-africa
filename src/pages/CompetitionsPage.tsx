import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompetitionCard from "@/components/CompetitionCard";
import { useGames } from "@/hooks/useGames";

const SkeletonCard = () => (
  <div className="rounded-xl overflow-hidden border border-border bg-card animate-pulse">
    <div className="aspect-[4/3] bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  </div>
);

const CompetitionsPage = () => {
  const { competitions, loading } = useGames();

  const ending  = competitions.filter(c => c.tag === "Ending Soon");
  const active  = competitions.filter(c => c.tag === "LIVE");
  const other   = competitions.filter(c => c.tag !== "LIVE" && c.tag !== "Ending Soon");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container pt-24 pb-16">
        <h1 className="font-heading text-4xl md:text-5xl text-primary mb-10">ALL COMPETITIONS</h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-heading text-2xl text-muted-foreground">No active competitions right now.</p>
            <p className="text-muted-foreground mt-2">Check back soon — new draws are added regularly.</p>
          </div>
        ) : (
          <>
            {ending.length > 0 && (
              <section className="mb-12">
                <h2 className="font-heading text-2xl text-accent mb-4">Ending Soon</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ending.map((c, i) => <CompetitionCard key={c.id} comp={c} index={i} />)}
                </div>
              </section>
            )}
            {active.length > 0 && (
              <section className="mb-12">
                <h2 className="font-heading text-2xl text-primary mb-4">Live Now</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {active.map((c, i) => <CompetitionCard key={c.id} comp={c} index={i} />)}
                </div>
              </section>
            )}
            {other.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl text-muted-foreground mb-4">Upcoming</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {other.map((c, i) => <CompetitionCard key={c.id} comp={c} index={i} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CompetitionsPage;
