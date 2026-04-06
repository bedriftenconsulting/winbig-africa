import { competitions } from "@/lib/competitions";
import CompetitionCard from "./CompetitionCard";

const LiveCompetitions = () => {
  return (
    <section className="py-16">
      <div className="container">
        <h2 className="font-heading text-3xl md:text-4xl text-primary mb-8">LIVE COMPETITIONS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((comp, i) => (
            <CompetitionCard key={comp.id} comp={comp} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveCompetitions;
