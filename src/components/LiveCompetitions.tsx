import { useGames } from "@/hooks/useGames";
import CompetitionCard from "./CompetitionCard";

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-border bg-card animate-pulse">
    <div className="aspect-[4/3] bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-2 bg-muted rounded w-full mt-2" />
    </div>
  </div>
);

const LiveCompetitions = () => {
  const { competitions, loading, isReal } = useGames();

  return (
    <section className="py-16 section-light">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading text-3xl md:text-4xl text-[hsl(0_0%_10%)] tracking-wide">
            LIVE COMPETITIONS
          </h2>
          {isReal && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live from backend
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-20 text-[hsl(0_0%_40%)]">
            <p className="text-xl font-heading">No active competitions right now.</p>
            <p className="text-sm mt-2">New draws are added regularly — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((comp, i) => (
              <CompetitionCard key={comp.id} comp={comp} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LiveCompetitions;
